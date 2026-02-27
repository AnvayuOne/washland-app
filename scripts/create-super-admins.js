const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function createSuperAdmins() {
  const prisma = new PrismaClient()

  const superAdmins = [
    {
      email: 'kondapur@washlandlaundry.in',
      password: 'admin123',
      firstName: 'Kondapur',
      lastName: 'Admin'
    },
    {
      email: 'admin@washlandlaundry.in',
      password: 'admin123',
      firstName: 'Washland',
      lastName: 'Super Admin'
    }
  ]

  try {
    console.log('Creating SUPER ADMIN users...')

    for (const adminData of superAdmins) {
      const { email, password, firstName, lastName } = adminData

      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        console.log(`✅ User already exists: ${existing.email} (${existing.role})`)
        continue
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'SUPER_ADMIN',
          isActive: true
        }
      })

      console.log(`✅ Created SUPER ADMIN: ${user.email} (${user.firstName} ${user.lastName})`)
    }

    console.log('\n🎉 All SUPER ADMIN users created successfully!')
    console.log('Login credentials:')
    console.log('  kondapur@washlandlaundry.in / admin123')
    console.log('  admin@washlandlaundry.in / admin123')

  } catch (err) {
    console.error('❌ Error creating super admins:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperAdmins()