import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { defaultPricing } from '@/lib/defaults'

export async function GET() {
  try {
    // Fetch active services from database
    const services = await prisma.service.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        createdAt: 'desc' // or any other ordering
      },
      take: 6 // Limit to 6 for the homepage display
    })

    if (services.length === 0) {
      // Fallback to default pricing if no services in DB
      return NextResponse.json({ data: defaultPricing })
    }

    // Transform DB services to frontend pricing format
    const pricingData = services.map(service => ({
      id: service.id,
      title: service.name,
      description: service.description || '',
      price: service.basePrice,
      unit: '/ item' // You might want to add a 'unit' field to Service model in future
    }))

    return NextResponse.json({ data: pricingData })
  } catch (error) {
    console.error('Error fetching pricing:', error)
    // Fallback on error
    return NextResponse.json({ data: defaultPricing })
  }
}
