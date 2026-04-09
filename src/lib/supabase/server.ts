import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
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
            // Server Component read-only — ignored
          }
        },
      },
    }
  )
}

/**
 * 동일 React request lifecycle에서 `supabase.auth.getUser()`를 메모이즈한다.
 *
 * 대시보드 페이지가 Promise.all로 7개 이상의 Server Action을 동시 호출하면
 * 각 action마다 `getUser()`가 별도 네트워크 요청을 보내서 Supabase /auth/v1/user
 * 엔드포인트가 7번 두들겨진다. 이 wrapper를 통하면 동일 SSR request 내에서
 * 단 한 번만 실행되어 로딩 시간이 대폭 단축된다.
 *
 * 사용 패턴:
 * ```ts
 * const user = await getCachedUser()
 * if (!user) return { error: '인증이 필요합니다.' }
 * ```
 */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
