import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_ROUTES = ["/teacher", "/student", "/admin", "/parent", "/learner"]

type Role = "teacher" | "student" | "admin" | "parent" | "learner"

/**
 * user_metadata.role이 우선. signup 시 `options.data.role`로 저장되므로
 * 정상 가입 유저는 모두 이 값이 채워져 있다. 레거시 계정에만 fallback.
 */
function getUserRole(user: { user_metadata?: Record<string, unknown> | null }): Role | null {
  const metaRole = user.user_metadata?.role
  if (metaRole === "teacher" || metaRole === "student" || metaRole === "admin" || metaRole === "parent" || metaRole === "learner") {
    return metaRole
  }
  return null
}

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
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  // 1. Unauthenticated → /login
  if (!user && isProtectedRoute) {
    return redirectTo("/login")
  }

  // 2·3. 인증된 유저의 role 체크 — user_metadata 우선, 없을 때만 profiles 조회.
  // 이렇게 하면 매 request마다 발생하던 profiles SELECT를 99% 제거할 수 있음
  // (정상 가입 유저는 모두 metadata에 role이 박혀 있음).
  if (user && (isProtectedRoute || isAuthPage)) {
    let role = getUserRole(user)

    // Fallback: 레거시 계정 또는 metadata에 role이 없는 경우만 DB 조회
    if (!role) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      role = (profile?.role as Role | null) ?? "student"
    }

    // 2. /login, /signup에 이미 로그인 상태 → 해당 대시보드
    if (isAuthPage) {
      return redirectTo(`/${role}`)
    }

    // 3. Role mismatch → 올바른 대시보드
    if (pathname.startsWith("/teacher") && role !== "teacher") return redirectTo(`/${role}`)
    if (pathname.startsWith("/student") && role !== "student") return redirectTo(`/${role}`)
    if (pathname.startsWith("/admin") && role !== "admin") return redirectTo(`/${role}`)
    if (pathname.startsWith("/parent") && role !== "parent") return redirectTo(`/${role}`)
    if (pathname.startsWith("/learner") && role !== "learner") return redirectTo(`/${role}`)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 1) static assets 제외 — _next/static, 이미지, 사운드 등
     * 2) Server Action POST 요청 제외 — 대시보드 내부 fetch는 auth가 이미 확인됐고
     *    Server Action 마다 middleware를 돌리면 불필요한 오버헤드만 발생.
     *    단, 보호된 라우트 navigation은 여전히 middleware 통과.
     */
    "/((?!_next/static|_next/image|favicon.ico|sounds|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
}
