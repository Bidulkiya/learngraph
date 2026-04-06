import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { RoleGuard, getCurrentProfile } from "@/components/layout/RoleGuard"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  return (
    <RoleGuard allowedRole="admin">
      <div className="flex h-screen">
        <Sidebar role="admin" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header role="admin" userName={profile?.name} />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
