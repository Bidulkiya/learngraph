"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  MessageSquare,
  Shield,
  TreePine,
  Trophy,
  Users,
  BarChart3,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "teacher" | "student" | "admin"

interface SidebarProps {
  role: Role
}

const menuItems: Record<Role, Array<{ href: string; label: string; icon: React.ElementType }>> = {
  teacher: [
    { href: "/teacher", label: "대시보드", icon: LayoutDashboard },
    { href: "/teacher/skill-tree", label: "스킬트리 관리", icon: TreePine },
    { href: "/teacher/quizzes", label: "퀴즈 관리", icon: ClipboardList },
  ],
  student: [
    { href: "/student", label: "대시보드", icon: LayoutDashboard },
    { href: "/student/skill-tree", label: "내 스킬트리", icon: TreePine },
    { href: "/student/tutor", label: "AI 튜터", icon: MessageSquare },
  ],
  admin: [
    { href: "/admin", label: "대시보드", icon: LayoutDashboard },
    { href: "/admin/templates", label: "마스터 템플릿", icon: Library },
    { href: "/admin/analytics", label: "전체 분석", icon: BarChart3 },
    { href: "/admin/users", label: "사용자 관리", icon: Users },
  ],
}

const roleConfig: Record<Role, { label: string; color: string; icon: React.ElementType }> = {
  teacher: { label: "교사", color: "text-[#10B981]", icon: GraduationCap },
  student: { label: "학생", color: "text-[#4F6BF6]", icon: BookOpen },
  admin: { label: "운영자", color: "text-[#F59E0B]", icon: Shield },
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const config = roleConfig[role]
  const items = menuItems[role]
  const RoleIcon = config.icon

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC]">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Learn<span className="text-[#4F6BF6]">Graph</span>
        </span>
      </Link>

      {/* Role Badge */}
      <div className="flex items-center gap-2 px-5 py-3">
        <RoleIcon className={cn("h-4 w-4", config.color)} />
        <span className={cn("text-sm font-medium", config.color)}>{config.label} 모드</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#4F6BF6]/10 text-[#4F6BF6] dark:bg-[#4F6BF6]/20"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
