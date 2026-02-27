const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function createCustomerUser() {
  const prisma = new PrismaClient()

  try {
    const email = 'customer@washland.com'
    const password = 'customer123'
    const firstName = 'John'
    const lastName = 'Doe'

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      console.log('Customer user already exists:', existing.email)
      return
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        firstName,
        lastName,
        phone: '9876543210',
        role: 'CUSTOMER',
        isActive: true
      }
    })

    console.log('Created customer user:', { id: user.id, email: user.email, role: user.role })
    console.log('Customer Login Credentials:')
    console.log('Email: customer@washland.com')
    console.log('Password: customer123')

  } catch (error) {
    console.error('Error creating customer user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createCustomerUser()