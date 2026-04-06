import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Protected route prefixes that require authentication
const PROTECTED_ROUTES = ["/teacher", "/student", "/admin"]
// Public routes that skip auth
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/callback"]

export async function middleware(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: use getUser() not getSession() — getUser() validates server-side
  const { data: { user } } = await supabase.auth.getUser()

  // Check if current path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route)

  // 1. Unauthenticated user accessing protected route → redirect to /login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // 2. Authenticated user on /login or /signup → redirect to their dashboard
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role || "student"
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }

  // 3. Role-based routing — ensure users can only access their role's routes
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role

    if (role) {
      // Redirect if accessing wrong role route
      if (pathname.startsWith("/teacher") && role !== "teacher") {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
      if (pathname.startsWith("/student") && role !== "student") {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
      if (pathname.startsWith("/admin") && role !== "admin") {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sounds|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
