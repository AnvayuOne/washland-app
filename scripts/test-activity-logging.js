const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testActivityLogging() {
  try {
    console.log('Testing activity logging...')

    // Create a test franchise
    const franchise = await prisma.franchise.create({
      data: {
        name: 'Test Franchise',
        description: 'Test franchise for activity logging',
        adminId: 'test-admin-id' // This will fail but that's ok for testing
      }
    }).catch(() => {
      console.log('Franchise creation test skipped (expected to fail without proper admin)')
    })

    // Check if activities were created
    const activities = await prisma.activity.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })

    console.log('Recent activities:', activities.length)
    activities.forEach(activity => {
      console.log(`- ${activity.type}: ${activity.description}`)
    })

  } catch (error) {
    console.error('Error testing activity logging:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testActivityLogging()