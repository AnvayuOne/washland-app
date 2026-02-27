import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const heroContent = await prisma.heroContent.findFirst({
            where: { isActive: true },
            include: {
                offers: true
            }
        })

        if (!heroContent) {
            return NextResponse.json({ data: null })
        }

        return NextResponse.json({ data: heroContent })
    } catch (error) {
        console.error('Error fetching public hero content:', error)
        return NextResponse.json(
            { error: 'Failed to fetch hero content' },
            { status: 500 }
        )
    }
}
