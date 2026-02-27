const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkActivities() {
  try {
    console.log('Checking activities in database...')

    const activities = await prisma.activity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    console.log(`Found ${activities.length} activities:`)
    activities.forEach((activity, index) => {
      console.log(`${index + 1}. [${activity.type}] ${activity.description}`)
      console.log(`   User: ${activity.user ? `${activity.user.firstName} ${activity.user.lastName} (${activity.user.email})` : 'System'}`)
      console.log(`   Time: ${activity.createdAt}`)
      console.log(`   Metadata: ${JSON.stringify(activity.metadata, null, 2)}`)
      console.log('---')
    })

  } catch (error) {
    console.error('Error checking activities:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkActivities()