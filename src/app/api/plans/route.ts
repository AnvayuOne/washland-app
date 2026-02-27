import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { toPlanResponse } from "@/lib/subscription-utils"

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: [{ price: "asc" }, { createdAt: "desc" }],
    })

    return apiSuccess({ plans: plans.map(toPlanResponse) })
  } catch (error) {
    console.error("Error fetching public plans:", error)
    return apiError("Failed to fetch plans", 500)
  }
}
