import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import type { Role, Profile } from "@/types/user"

interface RoleGuardProps {
  allowedRole: Role
  children: React.ReactNode
}

/**
 * Server Component that verifies the current user has the required role.
 * If not authenticated or wrong role, redirects appropriately.
 * Returns children along with the user's profile data.
 *
 * Usage in layout.tsx:
 *   <RoleGuard allowedRole="teacher">{children}</RoleGuard>
 */
export async function RoleGuard({ allowedRole, children }: RoleGuardProps): Promise<React.ReactElement> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  if (profile.role !== allowedRole) {
    redirect(`/${profile.role}`)
  }

  return <>{children}</>
}

/**
 * Helper to get the current user's profile in Server Components.
 * Returns null if not authenticated.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return profile as Profile | null
}
