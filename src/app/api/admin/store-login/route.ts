import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, storeId } = body
    
    console.log('Store login attempt:', { 
      email, 
      hasPassword: !!password, 
      storeId, 
      storeIdType: typeof storeId
    })

    // Validation
    if (!email || !password) {
      console.log('Email/password validation failed:', { email: !!email, password: !!password })
      return NextResponse.json(
        { 
          error: "Email and password are required",
          type: "validation_error"
        },
        { status: 400 }
      )
    }

    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
      console.log('Store ID validation failed:', { storeId, type: typeof storeId })
      return NextResponse.json(
        { 
          error: "Please select a valid store",
          type: "validation_error"
        },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
        managedStores: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            adminId: true,
            franchiseId: true,
            franchise: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        },
        managedFranchises: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            stores: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
                adminId: true,
                franchiseId: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { 
          error: "Invalid email or password",
          type: "invalid_credentials"
        },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { 
          error: "Account is deactivated. Please contact support.",
          type: "account_deactivated"
        },
        { status: 403 }
      )
    }

    // Verify password
    if (!user.password) {
      return NextResponse.json(
        { 
          error: "Account not set up. Please contact your administrator.",
          type: "account_setup_required"
        },
        { status: 403 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          error: "Invalid email or password",
          type: "invalid_credentials"
        },
        { status: 401 }
      )
    }

    // Check if user has access to the selected store
    const requestedStore = await prisma.store.findUnique({
      where: { id: storeId },
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
        }
      }
    })

    if (!requestedStore) {
      return NextResponse.json(
        { 
          error: "Selected store not found",
          type: "store_not_found"
        },
        { status: 404 }
      )
    }

    // Determine if user has access to this store
    let hasAccess = false
    let accessReason = ""

    switch (user.role) {
      case 'SUPER_ADMIN':
        hasAccess = true
        accessReason = "Super admin access"
        break
        
      case 'FRANCHISE_ADMIN':
        // Check if user manages the franchise that owns this store
        const managesFranchise = user.managedFranchises?.some(
          franchise => franchise.id === requestedStore.franchiseId
        )
        if (managesFranchise) {
          hasAccess = true
          accessReason = "Franchise admin access"
        }
        break
        
      case 'STORE_ADMIN':
        // Check if user is assigned as admin to this specific store
        if (requestedStore.adminId === user.id) {
          hasAccess = true
          accessReason = "Store admin access"
        }
        break
        
      default:
        hasAccess = false
    }

    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: "You do not have access to the selected store",
          type: "store_access_denied"
        },
        { status: 403 }
      )
    }

    // Successful login - return user info and store details
    const responseData = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      storeId: requestedStore.id,
      storeName: requestedStore.name,
      storeCity: requestedStore.city,
      franchiseName: requestedStore.franchise.name,
      accessReason
    }

    // Log successful login
    console.log(`Store login successful: ${user.email} -> ${requestedStore.name} (${accessReason})`)

    return NextResponse.json(responseData, { status: 200 })

  } catch (error) {
    console.error("Store login error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: "Internal server error",
        type: "server_error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
