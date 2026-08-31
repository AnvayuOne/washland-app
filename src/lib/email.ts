import nodemailer from 'nodemailer'
import { randomBytes } from 'crypto'

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Generate a random temporary password
export function generateTempPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Generate a password reset token
export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  tempPassword?: string
): Promise<boolean> {
  try {
    const transporter = createTransporter()

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@washland.com',
      to: email,
      subject: 'Washland - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Washland Password Reset</h2>
          <p>Hello,</p>
          <p>You have been set up as an administrator for Washland. To access your account, please reset your password.</p>

          ${tempPassword ? `
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 2px 4px; border-radius: 3px;">${tempPassword}</code>
              <br><small style="color: #6b7280;">Please change this password after logging in.</small>
            </div>
          ` : ''}

          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Reset Password
          </a>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>

          <p>This link will expire in 24 hours.</p>

          <p>If you didn't request this password reset, please ignore this email.</p>

          <p>Best regards,<br>Washland Team</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return false
  }
}

// Send welcome email with temporary password
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
  tempPassword: string,
  role: string
): Promise<boolean> {
  try {
    const transporter = createTransporter()

    const loginUrl = `${process.env.NEXTAUTH_URL}/auth/signin`

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@washland.com',
      to: email,
      subject: 'Welcome to Washland - Your Account is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Welcome to Washland!</h2>
          <p>Hello ${firstName} ${lastName},</p>
          <p>Your ${role.toLowerCase().replace('_', ' ')} account has been created successfully.</p>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Your login credentials:</strong><br>
            <strong>Email:</strong> ${email}<br>
            <strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 2px 4px; border-radius: 3px;">${tempPassword}</code>
          </div>

          <p>Please log in and change your password immediately:</p>
          <a href="${loginUrl}" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Login to Washland
          </a>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${loginUrl}</p>

          <p>For security reasons, please change your password after your first login.</p>

          <p>If you have any questions, please contact our support team.</p>

          <p>Best regards,<br>Washland Team</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return false
  }
}