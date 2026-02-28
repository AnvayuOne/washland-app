import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const userCount = await prisma.user.count()
    
    // Try to find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@washlandlaundry.in' },
      select: {
        id: true,
        role: true,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      userCount,
      testUserExists: !!testUser,
      testUserRole: testUser?.role,
      testUserActive: testUser?.isActive
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        role: true,
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' })
    }

    const isValid = await bcrypt.compare(password, user.password)

    return NextResponse.json({
      success: true,
      userExists: true,
      passwordValid: isValid,
      userRole: user.role,
      userActive: user.isActive
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
