const { PrismaClient } = require('@prisma/client')

async function createSampleServices() {
  const prisma = new PrismaClient()

  try {
    console.log('Creating sample services...')

    const services = [
      {
        name: 'Wash & Iron Shirt',
        description: 'Professional washing and ironing service for shirts',
        basePrice: 50,
        category: 'Regular Wash'
      },
      {
        name: 'Wash & Iron Trouser',
        description: 'Professional washing and ironing service for trousers',
        basePrice: 60,
        category: 'Regular Wash'
      },
      {
        name: 'Wash & Iron Kurta',
        description: 'Specialized washing and ironing for traditional kurtas',
        basePrice: 80,
        category: 'Ethnic Wear'
      },
      {
        name: 'Wash & Iron Saree',
        description: 'Delicate washing and ironing service for sarees',
        basePrice: 150,
        category: 'Delicate Wash'
      },
      {
        name: 'Dry Cleaning Suit',
        description: 'Professional dry cleaning service for suits',
        basePrice: 300,
        category: 'Dry Cleaning'
      },
      {
        name: 'Wash & Iron Bedsheet',
        description: 'Washing and ironing service for bedsheets',
        basePrice: 100,
        category: 'Household'
      },
      {
        name: 'Wash & Iron Towel',
        description: 'Washing and ironing service for towels',
        basePrice: 30,
        category: 'Household'
      },
      {
        name: 'Wash & Iron Blanket',
        description: 'Specialized washing and ironing for blankets',
        basePrice: 200,
        category: 'Household'
      }
    ]

    for (const service of services) {
      await prisma.service.create({
        data: service
      })
      console.log(`Created service: ${service.name}`)
    }

    console.log('Sample services created successfully!')
  } catch (error) {
    console.error('Error creating sample services:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleServices()