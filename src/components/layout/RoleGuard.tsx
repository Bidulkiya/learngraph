import { cache } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
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
 * cache()는 Next.js Server Component에서 동일 request 내 결과를 자동 메모이즈한다.
 * profile 조회에 admin client를 쓰는 이유: anon client는 RLS 때문에 추가 쿼리가
 * 발생할 수 있고, getUser() 인증이 이미 통과한 상태이므로 service_role로 직접 조회.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
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
