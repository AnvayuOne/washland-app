import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      where: {
        status: 'ACTIVE'
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
        // We need to add lat/lon to the store model if it doesn't exist, 
        // for now we'll mock them or return null if schema doesn't have them yet.
        // Checking schema, Store model might not have lat/lon. 
        // Let's check what fields we have in schema.prisma first to be safe.
      }
    })

    // Transform for frontend
    const formattedStores = stores.map(store => ({
      ...store,
      pincode: store.zipCode,
      lat: null, // Placeholder - needed for distance calc
      lon: null, // Placeholder
      hours: { // Placeholder default hours
        weekday: '9:00 AM - 9:00 PM',
        saturday: '9:00 AM - 9:00 PM',
        sunday: '10:00 AM - 6:00 PM'
      },
      services: ['Dry Cleaning', 'Laundry', 'Ironing'] // Placeholder
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