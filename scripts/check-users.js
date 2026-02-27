const { PrismaClient } = require('@prisma/client')

async function checkUsers() {
  const prisma = new PrismaClient()

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        managedStores: {
          select: {
            id: true,
            name: true
          }
        },
        managedFranchises: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('Users in database:')
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - Active: ${user.isActive}`)
      if (user.managedStores.length > 0) {
        console.log(`  Managed stores: ${user.managedStores.map(s => s.name).join(', ')}`)
      }
      if (user.managedFranchises.length > 0) {
        console.log(`  Managed franchises: ${user.managedFranchises.map(f => f.name).join(', ')}`)
      }
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()