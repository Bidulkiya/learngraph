import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Supabase Auth email confirmation callback.
 * 사용자가 이메일의 인증 링크를 클릭하면 이 라우트로 redirect되며,
 * Supabase의 인증 세션을 교환한다.
 *
 * 지원하는 파라미터:
 * - ?code=xxx  → PKCE 플로우 (exchangeCodeForSession)
 * - ?token_hash=xxx&type=xxx  → OTP/인증 링크 (verifyOtp)
 *
 * 인증 성공 시 원래 요청한 `next` 경로로 이동 (기본: /login?verified=true).
 * 실패 시 /login?error=auth_callback_failed로 이동.
 *
 * Open redirect 방어: next 파라미터는 반드시 '/' 로 시작하는 내부 경로만 허용.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const rawNext = searchParams.get("next") ?? "/login?verified=true"

  // Open redirect 방어: 외부 URL이나 프로토콜-상대 경로 차단
  const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/login?verified=true"

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored — cookie write may fail in some contexts
          }
        },
      },
    }
  )

  // 1. PKCE 플로우 (code 파라미터)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // 2. OTP/인증 링크 플로우 (token_hash + type)
  if (tokenHash && type) {
    const validTypes = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const
    type ValidType = typeof validTypes[number]
    if ((validTypes as readonly string[]).includes(type)) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as ValidType,
        token_hash: tokenHash,
      })
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`)
      }
    }
  }

  // If no code/token or exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
