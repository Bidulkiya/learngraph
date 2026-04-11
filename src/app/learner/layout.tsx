import { DashboardShell } from "@/components/layout/DashboardShell"
import { RoleGuard, getCurrentProfile } from "@/components/layout/RoleGuard"
import { DemoBanner } from "@/components/layout/DemoBanner"
import { DemoTutorial } from "@/components/layout/DemoTutorial"
import { isDemoAccount } from "@/lib/demo"

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()
  const isDemo = isDemoAccount(profile?.email)

  return (
    <RoleGuard allowedRole="learner">
      <DashboardShell
        role="learner"
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
      {isDemo && <DemoTutorial role="learner" />}
    </RoleGuard>
  )
}
