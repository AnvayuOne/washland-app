const { PrismaClient } = require('@prisma/client')

async function checkStores() {
  const prisma = new PrismaClient()

  try {
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        admin: {
          select: {
            email: true,
            role: true
          }
        },
        franchise: {
          select: {
            name: true
          }
        }
      }
    })

    console.log('Stores in database:')
    stores.forEach(store => {
      console.log(`- ${store.name} (ID: ${store.id})`)
      console.log(`  Admin: ${store.admin?.email} (${store.admin?.role})`)
      console.log(`  Franchise: ${store.franchise?.name}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStores()