const { PrismaClient } = require('@prisma/client')

async function createSampleData() {
  const prisma = new PrismaClient()

  try {
    console.log('Creating sample franchise and store...')

    // Create a franchise
    const franchise = await prisma.franchise.create({
      data: {
        name: 'Washland Hyderabad',
        description: 'Washland franchise for Hyderabad region',
        adminId: 'cmhj8dxpa0000w7tcgampnh3e' // The super admin we created earlier
      }
    })

    console.log(`Created franchise: ${franchise.name}`)

    // Create a store admin user
    const storeAdmin = await prisma.user.create({
      data: {
        email: 'admin@washland.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin123
        firstName: 'Store',
        lastName: 'Admin',
        phone: '9876543210',
        role: 'STORE_ADMIN',
        isActive: true
      }
    })

    console.log(`Created store admin: ${storeAdmin.email}`)

    // Create a store
    const store = await prisma.store.create({
      data: {
        name: 'Washland Kondapur',
        address: '123 MG Road, Kondapur',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500084',
        phone: '040-12345678',
        email: 'kondapur@washland.com',
        franchiseId: franchise.id,
        adminId: storeAdmin.id,
        isActive: true
      }
    })

    console.log(`Created store: ${store.name}`)

    // Create store services (link services to the store)
    const services = await prisma.service.findMany()
    for (const service of services) {
      await prisma.storeService.create({
        data: {
          storeId: store.id,
          serviceId: service.id,
          price: service.basePrice,
          isActive: true
        }
      })
    }

    console.log(`Created ${services.length} store services`)

    console.log('\nSample data created successfully!')
    console.log('Store Admin Login:')
    console.log('Email: admin@washland.com')
    console.log('Password: admin123')
    console.log('Store: Washland Kondapur')

  } catch (error) {
    console.error('Error creating sample data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleData()