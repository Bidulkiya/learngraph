import { cache } from "react"
import { redirect } from "next/navigation"
import { getCachedUser } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Role, Profile } from "@/types/user"

interface RoleGuardProps {
  allowedRole: Role
  children: React.ReactNode
}

/**
 * 동일한 React request lifecycle 내에서 profile 조회를 캐싱한다.
 * RoleGuard, getCurrentProfile, getUnreadSummary 등이 같은 페이지 로드에서
 * profiles 테이블을 3-4번 중복 조회하던 문제 해결.
 *
 * 내부에서 `getCachedUser()`를 사용하므로 Server Action들이 같은 SSR request
 * 내에서 `getCachedUser()`를 호출해도 auth/v1/user 네트워크 요청이 한 번만 발생.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCachedUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, name, role, avatar_url, level, xp, streak_days, last_active_at, created_at, learning_style, nickname, nickname_changed_at, avatar_seed, avatar_change_count, grade, bio, interests, subject")
    .eq("id", user.id)
    .single()

  return profile as Profile | null
})

/**
 * Server Component that verifies the current user has the required role.
 * 동일 request 내에서 getCurrentProfile()을 재사용하므로 추가 쿼리 없음.
 */
export async function RoleGuard({ allowedRole, children }: RoleGuardProps): Promise<React.ReactElement> {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (profile.role !== allowedRole) {
    redirect(`/${profile.role}`)
  }

  return <>{children}</>
}
