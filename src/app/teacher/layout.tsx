import { DashboardShell } from "@/components/layout/DashboardShell"
import { RoleGuard, getCurrentProfile } from "@/components/layout/RoleGuard"
import { MessageNotifier } from "@/components/layout/MessageNotifier"
import { DemoBanner } from "@/components/layout/DemoBanner"
import { DemoTutorial } from "@/components/layout/DemoTutorial"
import { getUnreadSummary } from "@/actions/messages"
import { isDemoAccount } from "@/lib/demo"

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profile, unreadRes] = await Promise.all([
    getCurrentProfile(),
    getUnreadSummary(),
  ])

  const unread = unreadRes.data ?? { totalUnread: 0, latestUnread: null }
  const isDemo = isDemoAccount(profile?.email)

  return (
    <RoleGuard allowedRole="teacher">
      <DashboardShell
        role="teacher"
        userName={profile?.name}
        nickname={profile?.nickname}
        avatarUrl={profile?.avatar_url}
        unreadMessageCount={unread.totalUnread}
      >
        <DemoBanner email={profile?.email} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 dark:bg-gray-900">
          {children}
        </main>
      </DashboardShell>
      {isDemo && <DemoTutorial role="teacher" />}
      <MessageNotifier
        role="teacher"
        latestUnread={unread.latestUnread}
        totalUnread={unread.totalUnread}
        isDemo={isDemo}
      />
    </RoleGuard>
  )
}
