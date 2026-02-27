const { PrismaClient, ActivityType } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleActivities() {
  try {
    console.log('Creating sample activities...')

    // Get some existing users for activities
    const users = await prisma.user.findMany({ take: 5 })

    const activities = [
      {
        type: ActivityType.FRANCHISE_CREATED,
        description: 'New franchise "CleanCorp Bangalore" was created',
        userId: users[0]?.id || null,
        metadata: { franchiseName: 'CleanCorp Bangalore', location: 'Bangalore' }
      },
      {
        type: ActivityType.STORE_CREATED,
        description: 'New store "Downtown Laundry" added to CleanCorp franchise',
        userId: users[1]?.id || null,
        metadata: { storeName: 'Downtown Laundry', franchiseId: 'franchise-1' }
      },
      {
        type: ActivityType.USER_REGISTERED,
        description: 'New customer "John Smith" registered',
        userId: users[2]?.id || null,
        metadata: { customerName: 'John Smith', email: 'john@example.com' }
      },
      {
        type: ActivityType.ORDER_PLACED,
        description: 'Order #ORD-2024-001 placed for ₹2,450',
        userId: users[3]?.id || null,
        metadata: { orderNumber: 'ORD-2024-001', amount: 2450 }
      },
      {
        type: ActivityType.ORDER_COMPLETED,
        description: 'Order #ORD-2024-001 completed and delivered',
        userId: users[4]?.id || null,
        metadata: { orderNumber: 'ORD-2024-001', amount: 2450 }
      },
      {
        type: ActivityType.PAYMENT_RECEIVED,
        description: 'Payment of ₹1,250 received from customer',
        userId: users[0]?.id || null,
        metadata: { amount: 1250, paymentMethod: 'Online' }
      },
      {
        type: ActivityType.SUBSCRIPTION_CREATED,
        description: 'Monthly subscription plan purchased by customer',
        userId: users[1]?.id || null,
        metadata: { planName: 'Premium Monthly', price: 999 }
      },
      {
        type: ActivityType.REFERRAL_REWARDED,
        description: 'Referral bonus of ₹100 credited to wallet',
        userId: users[2]?.id || null,
        metadata: { bonusAmount: 100, referrerName: 'Jane Doe' }
      }
    ]

    // Create activities with different timestamps
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i]
      const createdAt = new Date(Date.now() - (i * 2 * 60 * 60 * 1000)) // 2 hours apart

      await prisma.activity.create({
        data: {
          ...activity,
          createdAt
        }
      })
    }

    console.log('Sample activities created successfully!')
  } catch (error) {
    console.error('Error creating sample activities:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleActivities()