import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function FranchiseIndexPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (role === "FRANCHISE_ADMIN") {
    redirect("/franchise/dashboard")
  }

  redirect("/franchise/login")
}
