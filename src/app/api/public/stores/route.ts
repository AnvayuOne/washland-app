import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        email: true,
        franchise: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const formattedStores = stores.map(store => ({
      id: store.id,
      name: store.name,
      address: store.address,
      city: store.city,
      state: store.state,
      zipCode: store.zipCode,
      phone: store.phone,
      email: store.email || '',
      franchise: store.franchise,
      pincode: store.zipCode,
      lat: null,
      lon: null,
      hours: {
        weekday: '9:00 AM - 9:00 PM',
        saturday: '9:00 AM - 9:00 PM',
        sunday: '10:00 AM - 6:00 PM'
      },
      services: ['Dry Cleaning', 'Laundry', 'Ironing']
    }))

    return NextResponse.json(formattedStores)
  } catch (error) {
    console.error('Error fetching public stores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}
