import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { defaultPricing } from '@/lib/defaults'
import { sanitizePublicServiceDescription } from '@/lib/public-service-description'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : null
    const take = parsedLimit && parsedLimit > 0 ? parsedLimit : undefined

    // Fetch active services from database
    const services = await prisma.service.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc' // or any other ordering
      },
      ...(take ? { take } : {})
    })

    if (services.length === 0) {
      // Fallback to default pricing if no services in DB
      return NextResponse.json({ data: take ? defaultPricing.slice(0, take) : defaultPricing })
    }

    // Transform DB services to frontend pricing format
    const pricingData = services.map(service => ({
      id: service.id,
      title: service.name,
      description: sanitizePublicServiceDescription(service.description),
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
