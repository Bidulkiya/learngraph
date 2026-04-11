import { DashboardShell } from "@/components/layout/DashboardShell"
import { RoleGuard, getCurrentProfile } from "@/components/layout/RoleGuard"
import { DemoBanner } from "@/components/layout/DemoBanner"

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  return (
    <RoleGuard allowedRole="parent">
      <DashboardShell
        role="parent"
        userId={profile?.id}
        userName={profile?.name}
        nickname={profile?.nickname}
        avatarUrl={profile?.avatar_url}
      >
        <DemoBanner email={profile?.email} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 dark:bg-gray-900">
          {children}
        </main>
      </DashboardShell>
    </RoleGuard>
  )
}
