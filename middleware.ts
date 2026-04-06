import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_ROUTES = ["/teacher", "/student", "/admin"]

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

  // IMPORTANT: getUser() validates server-side (not getSession which reads JWT only)
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect 시 supabaseResponse의 갱신된 세션 쿠키를 복사
  function redirectTo(path: string): NextResponse {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  // 1. Unauthenticated → /login
  if (!user && isProtectedRoute) {
    return redirectTo("/login")
  }

  // 2. Authenticated user on /login or /signup → dashboard
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role || "student"
    return redirectTo(`/${role}`)
  }

  // 3. Role mismatch → correct dashboard
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role
    if (role) {
      if (pathname.startsWith("/teacher") && role !== "teacher") return redirectTo(`/${role}`)
      if (pathname.startsWith("/student") && role !== "student") return redirectTo(`/${role}`)
      if (pathname.startsWith("/admin") && role !== "admin") return redirectTo(`/${role}`)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sounds|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
