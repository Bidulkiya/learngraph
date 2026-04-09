"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Shield,
  TreePine,
  Users,
  ClipboardList,
  School,
  KeyRound,
  BookX,
  Mic,
  Megaphone,
  Mail,
  Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "teacher" | "student" | "admin" | "parent"

type MenuKey = 'messages' | 'tutor' | 'dashboard' | 'classes' | 'skill-tree' | 'quizzes' | 'recording' | 'join' | 'wrong-answers' | 'groups' | 'schools' | 'announcements' | 'link-student'

interface SidebarProps {
  role: Role
  unreadMessageCount?: number
}

interface MenuItem {
  key: MenuKey
  href: string
  label: string
  icon: React.ElementType
}

// 주의: 교사 메뉴에서 'AI 튜터' 항목을 제거함 (교사는 스킬트리 노드 편집 > AI 테스트 탭으로 체험)
const menuItems: Record<Role, MenuItem[]> = {
  teacher: [
    { key: 'dashboard', href: "/teacher", label: "대시보드", icon: LayoutDashboard },
    { key: 'classes', href: "/teacher/classes", label: "내 클래스", icon: Users },
    { key: 'skill-tree', href: "/teacher/skill-tree", label: "스킬트리 관리", icon: TreePine },
    { key: 'quizzes', href: "/teacher/quizzes", label: "퀴즈 관리", icon: ClipboardList },
    { key: 'recording', href: "/teacher/recording", label: "수업 녹음", icon: Mic },
    { key: 'messages', href: "/teacher/messages", label: "메시지", icon: Mail },
    { key: 'join', href: "/teacher/join", label: "스쿨 가입", icon: KeyRound },
  ],
  student: [
    { key: 'dashboard', href: "/student", label: "대시보드", icon: LayoutDashboard },
    { key: 'skill-tree', href: "/student/skill-tree", label: "내 학습", icon: TreePine },
    { key: 'wrong-answers', href: "/student/wrong-answers", label: "오답 노트", icon: BookX },
    { key: 'groups', href: "/student/groups", label: "스터디 그룹", icon: Users },
    { key: 'tutor', href: "/student/tutor", label: "AI 튜터", icon: MessageSquare },
    { key: 'messages', href: "/student/messages", label: "메시지", icon: Mail },
    { key: 'join', href: "/student/join", label: "코드로 가입", icon: KeyRound },
  ],
  admin: [
    { key: 'dashboard', href: "/admin", label: "대시보드", icon: LayoutDashboard },
    { key: 'schools', href: "/admin/schools", label: "스쿨 관리", icon: School },
    { key: 'announcements', href: "/admin/announcements", label: "공지사항", icon: Megaphone },
    { key: 'messages', href: "/admin/messages", label: "메시지", icon: Mail },
  ],
  parent: [
    { key: 'dashboard', href: "/parent", label: "자녀 학습 현황", icon: LayoutDashboard },
    { key: 'link-student', href: "/parent/link", label: "자녀 연결", icon: KeyRound },
  ],
}

const roleConfig: Record<Role, { label: string; color: string; icon: React.ElementType }> = {
  teacher: { label: "교사", color: "text-[#10B981]", icon: GraduationCap },
  student: { label: "학생", color: "text-[#4F6BF6]", icon: BookOpen },
  admin: { label: "운영자", color: "text-[#F59E0B]", icon: Shield },
  parent: { label: "학부모", color: "text-pink-500", icon: Heart },
}

export function Sidebar({ role, unreadMessageCount = 0 }: SidebarProps) {
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
          const showBadge = item.key === 'messages' && unreadMessageCount > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#4F6BF6]/10 text-[#4F6BF6] dark:bg-[#4F6BF6]/20"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
