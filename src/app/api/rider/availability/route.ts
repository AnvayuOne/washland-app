import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const authResult = await requireRole(["RIDER"])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const rider = await prisma.user.findUnique({
      where: { id: authResult.id },
      select: {
        id: true,
        isAvailable: true,
      },
    })

    if (!rider) {
      return NextResponse.json({ success: false, error: "Rider not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      isAvailable: rider.isAvailable,
    })
  } catch (error) {
    console.error("rider availability GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to read availability" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireRole(["RIDER"])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    if (typeof body?.isAvailable !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isAvailable must be a boolean" },
        { status: 400 }
      )
    }

    const updatedRider = await prisma.user.update({
      where: { id: authResult.id },
      data: {
        isAvailable: body.isAvailable,
      },
      select: {
        id: true,
        isAvailable: true,
      },
    })

    return NextResponse.json({
      success: true,
      isAvailable: updatedRider.isAvailable,
    })
  } catch (error) {
    console.error("rider availability POST error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update availability" },
      { status: 500 }
    )
  }
}
