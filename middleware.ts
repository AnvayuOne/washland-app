import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Intended protection:
// - Public: /auth/* and role login pages (/admin/login, /rider/login)
// - Protected: all other /admin/*, /rider/*, /customer/*,
//   and private API namespaces (/api/admin/*, /api/customer/*, /api/rider/*, /api/inventory/*)
const PUBLIC_ROUTE_PREFIXES = ["/auth/"]
const PUBLIC_EXACT_ROUTES = [
  "/denied",
  "/admin/login",
  "/washland/login",
  "/franchise/login",
  "/rider/login",
  "/api/admin/store-login"
]

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_EXACT_ROUTES.includes(pathname) ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

function dashboardForRole(role?: string) {
  switch (role) {
    case "SUPER_ADMIN":
    case "FRANCHISE_ADMIN":
    case "STORE_ADMIN":
      return "/admin/dashboard"
    case "CUSTOMER":
      return "/customer/dashboard"
    case "RIDER":
      return "/rider/dashboard"
    default:
      return "/"
  }
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const role = token?.role as string | undefined
    const { pathname } = req.nextUrl
    const isApiRoute = pathname.startsWith("/api/")

    // Keep login/auth routes public, but send already-authenticated users to their own dashboard.
    if (isPublicRoute(pathname)) {
      if (role && PUBLIC_EXACT_ROUTES.includes(pathname)) {
        const target = dashboardForRole(role)
        if (target !== pathname) {
          return NextResponse.redirect(new URL(target, req.url))
        }
      }
      return NextResponse.next()
    }

    const enforceRole = (allowedRoles: string[]) => {
      if (!role) {
        if (isApiRoute) {
          return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }
        return NextResponse.redirect(new URL("/auth/signin", req.url))
      }
      if (!allowedRoles.includes(role)) {
        if (isApiRoute) {
          return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
        }
        return NextResponse.redirect(new URL("/denied", req.url))
      }
      return NextResponse.next()
    }

    if (pathname.startsWith("/washland") || pathname.startsWith("/franchise")) {
      return enforceRole(["SUPER_ADMIN", "STORE_ADMIN", "FRANCHISE_ADMIN"])
    }

    if (pathname.startsWith("/admin")) {
      return enforceRole(["SUPER_ADMIN", "STORE_ADMIN", "FRANCHISE_ADMIN"])
    }

    if (pathname.startsWith("/rider")) {
      return enforceRole(["RIDER"])
    }

    if (pathname.startsWith("/customer")) {
      return enforceRole(["CUSTOMER"])
    }

    if (pathname.startsWith("/api/admin")) {
      return enforceRole(["SUPER_ADMIN", "STORE_ADMIN", "FRANCHISE_ADMIN"])
    }

    if (pathname.startsWith("/api/customer")) {
      return enforceRole(["CUSTOMER"])
    }

    if (pathname.startsWith("/api/rider")) {
      return enforceRole(["RIDER"])
    }

    if (pathname.startsWith("/api/inventory")) {
      return enforceRole(["SUPER_ADMIN", "FRANCHISE_ADMIN", "STORE_ADMIN"])
    }

    return NextResponse.next()
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname
        if (isPublicRoute(pathname)) {
          return true
        }
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/washland/:path*",
    "/franchise/:path*",
    "/rider/:path*",
    "/customer/:path*",
    "/api/admin/:path*",
    "/api/customer/:path*",
    "/api/rider/:path*",
    "/api/franchise/:path*",
    "/api/inventory/:path*"
  ]
}
