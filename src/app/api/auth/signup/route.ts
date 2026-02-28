import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { checkUserDuplicates, getDuplicateErrorMessage } from "@/lib/user-validation"
import { z } from "zod"
import { logActivity } from "@/lib/activity-logger"
import { Prisma } from "@prisma/client"

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  referralCode: z.string().optional()
})

function isMissingReferralCodeColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const prismaError = error as { code?: string; meta?: unknown; message?: string }
  if (prismaError.code !== "P2022") return false

  const details = `${prismaError.message || ""} ${JSON.stringify(prismaError.meta || {})}`
  return details.includes("users.referralCode")
}

let referralCodeColumnAvailabilityCache: boolean | null = null

async function hasReferralCodeColumn(): Promise<boolean> {
  if (referralCodeColumnAvailabilityCache !== null) {
    return referralCodeColumnAvailabilityCache
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'referralCode'
      ) AS "exists"
    `

    referralCodeColumnAvailabilityCache = rows[0]?.exists === true
    return referralCodeColumnAvailabilityCache
  } catch {
    // If metadata check fails for any reason, fall back to safe mode.
    referralCodeColumnAvailabilityCache = false
    return false
  }
}

// Helper to generate a unique referral code
async function generateReferralCode(firstName: string): Promise<string> {
  const prefix = firstName.substring(0, 3).toUpperCase()
  const random = Math.floor(1000 + Math.random() * 9000)
  const code = `${prefix}${random}`

  // Check uniqueness
  const exists = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true }
  })
  if (exists) {
    return generateReferralCode(firstName) // Retry
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check for duplicate email and phone
    const duplicateCheck = await checkUserDuplicates(validatedData.email, validatedData.phone)
    if (duplicateCheck.isDuplicate) {
      const errorMessage = getDuplicateErrorMessage(duplicateCheck)
      return NextResponse.json(
        {
          error: errorMessage,
          field: duplicateCheck.field,
          type: 'duplicate'
        },
        { status: 400 }
      )
    }

    // Process Referral if provided (gracefully skip if DB schema is behind and referralCode column is missing)
    let referralCodeColumnAvailable = await hasReferralCodeColumn()
    let referrerId = null
    if (validatedData.referralCode && referralCodeColumnAvailable) {
      try {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: validatedData.referralCode },
          select: { id: true }
        })
        if (referrer) {
          referrerId = referrer.id
        }
      } catch (error) {
        if (isMissingReferralCodeColumnError(error)) {
          referralCodeColumnAvailable = false
          referralCodeColumnAvailabilityCache = false
          referrerId = null
        } else {
          throw error
        }
      }
      // Note: If invalid code, we just ignore it for now (or could return error)
    }

    // Generate new code for this user when the referralCode column exists.
    let newReferralCode: string | null = null
    if (referralCodeColumnAvailable) {
      try {
        newReferralCode = await generateReferralCode(validatedData.firstName)
      } catch (error) {
        if (isMissingReferralCodeColumnError(error)) {
          referralCodeColumnAvailable = false
          referralCodeColumnAvailabilityCache = false
          newReferralCode = null
          referrerId = null
        } else {
          throw error
        }
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create user (default role is CUSTOMER)
    // Using transaction to create User AND Referral link if applicable
    const result = await prisma.$transaction(async (tx) => {
      const userCreateData: Prisma.UserCreateInput = {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        password: hashedPassword,
        phone: validatedData.phone ?? null,
        role: "CUSTOMER",
        ...(referralCodeColumnAvailable && newReferralCode ? { referralCode: newReferralCode } : {})
      }

      const user = await tx.user.create({
        data: userCreateData,
        select: referralCodeColumnAvailable ? {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          referralCode: true
        } : {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true
        }
      })

      // If referrer exists, create the link
      if (referrerId && referralCodeColumnAvailable) {
        // Double check no partial uniqueness constraint fail on Referral table
        try {
          await tx.referral.create({
            data: {
              code: validatedData.referralCode!, // The code used
              referrerId: referrerId,
              referredId: user.id,
              status: 'PENDING'
            }
          })
        } catch (e) {
          console.error("Failed to create referral record", e)
          // Swallow error so user creation still succeeds? Or fail?
          // Better to log and continue so signup isn't blocked by referral glitch
        }
      }

      return user as {
        id: string
        firstName: string
        lastName: string
        email: string
        role: string
        createdAt: Date
        referralCode?: string | null
      }
    })

    // Log the user registration activity
    await logActivity({
      type: 'USER_REGISTERED',
      description: `New customer "${validatedData.firstName} ${validatedData.lastName}" registered`,
      userId: result.id,
      metadata: {
        userId: result.id,
        email: validatedData.email,
        role: result.role,
        referralUsed: !!referrerId
      }
    })

    return NextResponse.json(
      {
        message: "User created successfully",
        user: result,
        warning: referralCodeColumnAvailable ? null : "Referral code features are temporarily disabled until DB migrations are applied."
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
