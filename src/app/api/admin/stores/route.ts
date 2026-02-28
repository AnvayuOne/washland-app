import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../src/lib/hybrid-auth'
import { hashPassword } from '../../../../../src/lib/password'
import { checkUserDuplicates, getDuplicateErrorMessage } from '../../../../../src/lib/user-validation'
import { UserRole } from '@prisma/client'
import { logActivity } from '../../../../../src/lib/activity-logger'
import { generateTempPassword, sendWelcomeEmail, generateResetToken } from '../../../../../src/lib/email'

export async function GET(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { searchParams } = new URL(req.url)
    const franchiseId = searchParams.get('franchiseId')

    const stores = await prisma.store.findMany({
      where: franchiseId ? { franchiseId } : {},
      include: { 
        franchise: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        }, 
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(stores)
  } catch (err) {
    console.error('stores GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const body = await req.json()
    const { 
      name, 
      address, 
      city, 
      state, 
      pincode, 
      phone, 
      franchiseId,
      managerFirstName,
      managerLastName,
      managerEmail,
      managerPhone
    } = body

    // Validate required fields including manager details
    if (!name || !address || !city || !franchiseId) {
      return NextResponse.json({ error: 'Name, address, city, and franchise are required' }, { status: 400 })
    }

    if (!managerFirstName || !managerLastName || !managerEmail || !managerPhone) {
      return NextResponse.json({ 
        error: 'Store manager details (first name, last name, email, and phone) are required' 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(managerEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate franchise exists
    const franchise = await prisma.franchise.findUnique({
      where: { id: franchiseId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!franchise) {
      return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    let admin = null
    let isNewAdmin = false
    
    // Check if user already exists
    admin = await prisma.user.findUnique({
      where: { email: managerEmail },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true
      }
    })
    
    if (admin) {
      // Update existing user to STORE_ADMIN role and update details
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { 
          role: UserRole.STORE_ADMIN,
          firstName: managerFirstName,
          lastName: managerLastName,
          phone: managerPhone,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true
        }
      })
    } else {
      // Check for duplicates before creating new user
      const duplicateCheck = await checkUserDuplicates(managerEmail, managerPhone)
      if (duplicateCheck.isDuplicate) {
        const errorMessage = getDuplicateErrorMessage(duplicateCheck)
        return NextResponse.json({ 
          error: errorMessage,
          field: duplicateCheck.field,
          type: 'duplicate'
        }, { status: 400 })
      }

      // Generate a temporary password for the new admin
      const tempPassword = generateTempPassword()
      const hashedPassword = await hashPassword(tempPassword)
      
      // Create new STORE_ADMIN user
      admin = await prisma.user.create({
        data: {
          email: managerEmail,
          password: hashedPassword,
          firstName: managerFirstName,
          lastName: managerLastName,
          phone: managerPhone,
          role: UserRole.STORE_ADMIN,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true
        }
      })
      isNewAdmin = true
      
      // Send welcome email with temporary password
      await sendWelcomeEmail(managerEmail, managerFirstName, managerLastName, tempPassword, 'Store Manager')
      
      // Create password reset token for first login
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

    const store = await prisma.store.create({
      data: {
        name,
        address,
        city,
        state: state || '',
        zipCode: pincode || '',
        phone: phone || '',
        franchiseId,
        adminId: admin.id, // Always assign the store admin
        isActive: true
      },
      include: {
        franchise: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    // Log the store creation activity
    await logActivity({
      type: 'STORE_CREATED',
      description: `New store "${name}" added to ${franchise.name} franchise`,
      userId: (auth as any)?.id || null,
      metadata: {
        storeId: store.id,
        storeName: name,
        franchiseId: franchise.id,
        franchiseName: franchise.name,
        adminId: admin.id,
        adminEmail: managerEmail,
        city: city
      }
    })

    return NextResponse.json({
      store,
      adminCreated: isNewAdmin,
      adminEmail: managerEmail
    })
  } catch (err) {
    console.error('stores POST error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
