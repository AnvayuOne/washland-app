import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'

// Simple geocoding function using OpenStreetMap Nominatim (free, no API key needed)
async function geocodeAddress(address: string, city: string, state: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const query = `${address}, ${city}, ${state}`.replace(/\s+/g, '+')
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Washland-App/1.0'
        }
      }
    )

    if (!response.ok) {
      console.warn(`Geocoding failed for ${query}: ${response.status}`)
      return null
    }

    const data = await response.json()
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      }
    }

    console.warn(`No geocoding results for ${query}`)
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

export async function GET() {
  try {
    // Fetch active stores from database
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        email: true
      }
    })

    // Add coordinates to each store using geocoding
    const storesWithCoords = await Promise.all(
      stores.map(async (store) => {
        const coords = await geocodeAddress(store.address, store.city, store.state)

        // Return store with coordinates (fallback to null if geocoding fails)
        return {
          id: store.id,
          name: store.name,
          address: store.address,
          city: store.city,
          state: store.state,
          pincode: store.zipCode,
          phone: store.phone,
          email: store.email,
          lat: coords?.lat || null,
          lon: coords?.lon || null,
          hours: {
            weekday: '7:00 AM - 8:00 PM', // Default hours since not in DB
            saturday: '8:00 AM - 6:00 PM',
            sunday: '9:00 AM - 5:00 PM'
          },
          services: ['Dry Cleaning', 'Laundry', 'Alterations'] // Default services since not in DB
        }
      })
    )

    return NextResponse.json(storesWithCoords)
  } catch (err: any) {
    console.error('Stores with coordinates GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
  }
}