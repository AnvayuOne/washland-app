import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    console.log('Fetching hero content...');
    
    // Check if prisma client has the heroContent model
    if (!prisma.heroContent) {
      console.error('HeroContent model not available in Prisma client');
      return NextResponse.json(getDefaultHeroContent());
    }

    const heroContent = await prisma.heroContent.findFirst({
      where: { isActive: true },
      include: {
        images: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        offers: {
          where: { 
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!heroContent) {
      console.log('No active hero content found, returning default');
      return NextResponse.json(getDefaultHeroContent());
    }

    console.log('Hero content fetched successfully');
    return NextResponse.json(heroContent);
  } catch (error) {
    console.error('Error fetching hero content:', error);
    // Return default content on error
    return NextResponse.json(getDefaultHeroContent());
  }
}

function getDefaultHeroContent() {
  return {
    title: "Premium Dry Cleaning &",
    subtitle: "Laundry Services",
    description: "Experience the convenience of professional cleaning with our premium dry cleaning and laundry services. From everyday garments to special occasion wear, we handle your clothes with expert care.",
    primaryBtnText: "Book Service Now",
    primaryBtnLink: "/book-service",
    secondaryBtnText: "Find Stores",
    secondaryBtnLink: "/locations",
    images: [
      {
        imageUrl: "/hero-laundry-1.svg",
        altText: "Professional Laundry Service",
        position: "right"
      }
    ],
    offers: [
      {
        title: "50% OFF First Order",
        description: "New Customer Special",
        discountText: "50% OFF",
        imageUrl: "/offer-first-order.svg"
      }
    ]
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role as string | undefined;

    // POST is admin-only and must use trusted NextAuth session state.
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['SUPER_ADMIN', 'STORE_ADMIN'].includes(role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // First, deactivate all existing hero content
    await prisma.heroContent.updateMany({
      data: { isActive: false }
    });

    // Create new hero content
    const heroContent = await prisma.heroContent.create({
      data: {
        title: body.title,
        subtitle: body.subtitle,
        description: body.description,
        primaryBtnText: body.primaryBtnText || "Book Service Now",
        primaryBtnLink: body.primaryBtnLink || "/book-service",
        secondaryBtnText: body.secondaryBtnText || "Find Stores", 
        secondaryBtnLink: body.secondaryBtnLink || "/locations",
        isActive: true,
        displayOrder: body.displayOrder || 0,
        images: {
          create: (body.images || []).map((img: any, index: number) => ({
            imageUrl: img.imageUrl,
            altText: img.altText,
            position: img.position || "right",
            displayOrder: index,
            isActive: true
          }))
        },
        offers: {
          create: (body.offers || []).map((offer: any, index: number) => ({
            title: offer.title,
            description: offer.description,
            discountText: offer.discountText,
            imageUrl: offer.imageUrl,
            linkUrl: offer.linkUrl,
            isActive: true,
            displayOrder: index,
            expiresAt: offer.expiresAt ? new Date(offer.expiresAt) : null
          }))
        }
      },
      include: {
        images: true,
        offers: true
      }
    });

    return NextResponse.json(heroContent);
  } catch (error) {
    console.error('Error creating hero content:', error);
    return NextResponse.json(
      { error: 'Failed to create hero content' },
      { status: 500 }
    );
  }
}
