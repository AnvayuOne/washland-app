import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { sendPasswordResetEmail, generateResetToken } from '../../../../lib/email'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true
      }
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account with this email exists, a password reset link has been sent.'
      })
    }

    // Generate reset token
    const resetToken = generateResetToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Save reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt
      }
    })

    // Send email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken)

    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email)
      // Still return success for security
    }

    return NextResponse.json({
      message: 'If an account with this email exists, a password reset link has been sent.'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
