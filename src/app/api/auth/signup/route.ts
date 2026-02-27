import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { checkUserDuplicates, getDuplicateErrorMessage } from "@/lib/user-validation"
import { z } from "zod"
import { logActivity } from "@/lib/activity-logger"

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  referralCode: z.string().optional()
})

// Helper to generate a unique referral code
async function generateReferralCode(firstName: string): Promise<string> {
  const prefix = firstName.substring(0, 3).toUpperCase()
  const random = Math.floor(1000 + Math.random() * 9000)
  const code = `${prefix}${random}`

  // Check uniqueness
  const exists = await prisma.user.findUnique({ where: { referralCode: code } })
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

    // Process Referral if provided
    let referrerId = null
    if (validatedData.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: validatedData.referralCode }
      })
      if (referrer) {
        referrerId = referrer.id
      }
      // Note: If invalid code, we just ignore it for now (or could return error)
    }

    // Generate new code for this user
    const newReferralCode = await generateReferralCode(validatedData.firstName)

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create user (default role is CUSTOMER)
    // Using transaction to create User AND Referral link if applicable
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          password: hashedPassword,
          phone: validatedData.phone,
          role: "CUSTOMER",
          referralCode: newReferralCode
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          referralCode: true
        }
      })

      // If referrer exists, create the link
      if (referrerId) {
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

      return user
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
      { message: "User created successfully", user: result },
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