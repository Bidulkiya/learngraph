import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { RoleGuard, getCurrentProfile } from "@/components/layout/RoleGuard"
import { MessageNotifier } from "@/components/layout/MessageNotifier"
import { DemoBanner } from "@/components/layout/DemoBanner"
import { getUnreadSummary } from "@/actions/messages"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profile, unreadRes] = await Promise.all([
    getCurrentProfile(),
    getUnreadSummary(),
  ])

  const unread = unreadRes.data ?? { totalUnread: 0, latestUnread: null }

  return (
    <RoleGuard allowedRole="admin">
      <div className="flex h-screen">
        <Sidebar role="admin" unreadMessageCount={unread.totalUnread} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header role="admin" userName={profile?.name} />
          <DemoBanner email={profile?.email} />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
      <MessageNotifier
        role="admin"
        latestUnread={unread.latestUnread}
        totalUnread={unread.totalUnread}
      />
    </RoleGuard>
  )
}
