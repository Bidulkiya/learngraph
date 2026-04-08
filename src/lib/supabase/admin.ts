import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client using service_role key.
 * Bypasses RLS — use only in Server Actions / Server Components for write operations
 * where the user has already been authenticated via getUser().
 *
 * Security guard: service_role key는 서버에서만 사용 가능해야 한다.
 * 클라이언트 번들에 이 파일이 포함되면 런타임 에러를 던져 노출을 방지한다.
 * (Next.js는 process.env가 클라이언트에 없으므로 대부분 방어되지만 추가 방어층)
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient must only be called on the server. This is a security violation.')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin client is missing required env vars.')
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
