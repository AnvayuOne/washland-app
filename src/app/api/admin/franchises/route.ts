import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../src/lib/hybrid-auth'
import { checkUserDuplicates, getDuplicateErrorMessage } from '../../../../../src/lib/user-validation'
import { UserRole } from '@prisma/client'
import { logActivity } from '../../../../../src/lib/activity-logger'
import { hashPassword } from '../../../../../src/lib/password'
import { generateTempPassword, sendWelcomeEmail, generateResetToken } from '../../../../../src/lib/email'

export async function GET() {
  try {
    console.log('Franchises API called')
    // For GET requests without request object, use original auth method
    const auth = await requireAdminHybrid(undefined, ['SUPER_ADMIN'])
    console.log('Auth result:', auth)
    
    if (auth instanceof NextResponse && auth.status === 401) {
      console.log('Auth failed:', auth)
      return auth
    }

    console.log('Fetching franchises from database...')
    const franchises = await prisma.franchise.findMany({ 
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        stores: {
          select: {
            id: true
          }
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    console.log('Raw franchises from DB:', franchises.length, 'items')
    
    // Transform the data to match frontend interface
    const transformedFranchises = franchises.map(franchise => ({
      id: franchise.id,
      name: franchise.name,
      description: franchise.description,
      admin: franchise.admin ? {
        firstName: franchise.admin.firstName,
        lastName: franchise.admin.lastName,
        email: franchise.admin.email
      } : null,
      storeCount: franchise.stores.length,
      isActive: franchise.isActive,
      createdAt: franchise.createdAt.toISOString()
    }))
    
    console.log('Transformed franchises:', transformedFranchises.length, 'items')
    return NextResponse.json(transformedFranchises)
  } catch (err) {
    console.error('franchises GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const body = await req.json()
    const { name, description, adminFirstName, adminLastName, adminEmail, adminPhone } = body
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    if (!adminFirstName || !adminLastName || !adminEmail) {
      return NextResponse.json({ error: 'Admin details (first name, last name, email) are required' }, { status: 400 })
    }

    // Check if admin user already exists
    let admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: {
        id: true,
        email: true,
        role: true
      }
    })
    
    if (admin) {
      // User exists, update role to FRANCHISE_ADMIN if needed
      if (admin.role !== 'FRANCHISE_ADMIN') {
        admin = await prisma.user.update({
          where: { id: admin.id },
          data: { role: 'FRANCHISE_ADMIN' },
          select: {
            id: true,
            email: true,
            role: true
          }
        })
      }
    } else {
      // Check for duplicates before creating new user
      const duplicateCheck = await checkUserDuplicates(adminEmail, adminPhone)
      if (duplicateCheck.isDuplicate) {
        const errorMessage = getDuplicateErrorMessage(duplicateCheck)
        return NextResponse.json({ 
          error: errorMessage,
          field: duplicateCheck.field,
          type: 'duplicate'
        }, { status: 400 })
      }

      // Generate temporary password
      const tempPassword = generateTempPassword()
      const hashedPassword = await hashPassword(tempPassword)

      // Create new FRANCHISE_ADMIN user
      admin = await prisma.user.create({ 
        data: { 
          email: adminEmail, 
          password: hashedPassword,
          firstName: adminFirstName,
          lastName: adminLastName,
          phone: adminPhone || '',
          role: UserRole.FRANCHISE_ADMIN, 
          isActive: true 
        },
        select: {
          id: true,
          email: true,
          role: true
        }
      })

      // Send welcome email with temporary password
      const emailSent = await sendWelcomeEmail(
        adminEmail,
        adminFirstName,
        adminLastName,
        tempPassword,
        'Franchise Admin'
      )

      if (!emailSent) {
        console.error('Failed to send welcome email to franchise admin:', adminEmail)
        // Continue anyway - user can still reset password
      }

      // Create password reset token for additional security
      const resetToken = generateResetToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      await (prisma as any).passwordResetToken.create({
        data: {
          token: resetToken,
          userId: admin.id,
          expiresAt
        }
      })
    }

    const franchise = await prisma.franchise.create({ 
      data: { 
        name, 
        description: description || '', 
        adminId: admin.id 
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        stores: {
          select: {
            id: true
          }
        }
      }
    })

    // Log the franchise creation activity
    await logActivity({
      type: 'FRANCHISE_CREATED',
      description: `New franchise "${name}" was created`,
      userId: (auth as any)?.id || null,
      metadata: {
        franchiseId: franchise.id,
        franchiseName: name,
        adminId: admin.id,
        adminEmail: admin.email
      }
    })
    
    return NextResponse.json(franchise)
  } catch (err) {
    console.error('franchises POST error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
