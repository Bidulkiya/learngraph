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
  Award,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoSymbol } from "@/components/Logo"

type Role = "teacher" | "student" | "admin" | "parent" | "learner"

type MenuKey = 'messages' | 'tutor' | 'dashboard' | 'classes' | 'skill-tree' | 'quizzes' | 'recording' | 'join' | 'wrong-answers' | 'groups' | 'schools' | 'announcements' | 'link-student' | 'achievements' | 'profile'

interface SidebarProps {
  role: Role
  unreadMessageCount?: number
  /** 모바일 오버레이 상태 (DashboardShell이 관리) */
  mobileOpen?: boolean
  /** 모바일 메뉴 항목 클릭 시 사이드바 닫기 */
  onMobileClose?: () => void
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
    { key: 'achievements', href: "/student/achievements", label: "업적", icon: Award },
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
  learner: [
    { key: 'dashboard', href: "/learner", label: "대시보드", icon: LayoutDashboard },
    { key: 'skill-tree', href: "/learner/skill-tree", label: "내 스킬트리", icon: TreePine },
    { key: 'tutor', href: "/learner/tutor", label: "AI 튜터", icon: MessageSquare },
    { key: 'recording', href: "/learner/recording", label: "녹음으로 만들기", icon: Mic },
    { key: 'achievements', href: "/learner/achievements", label: "업적", icon: Award },
  ],
}

const roleConfig: Record<Role, { label: string; color: string; icon: React.ElementType }> = {
  teacher: { label: "교사", color: "text-[#10B981]", icon: GraduationCap },
  student: { label: "학생", color: "text-[#4F6BF6]", icon: BookOpen },
  admin: { label: "운영자", color: "text-[#F59E0B]", icon: Shield },
  parent: { label: "학부모", color: "text-pink-500", icon: Heart },
  learner: { label: "독학러", color: "text-[#8B5CF6]", icon: BookOpen },
}

export function Sidebar({
  role,
  unreadMessageCount = 0,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()
  const config = roleConfig[role]
  const items = menuItems[role]
  const RoleIcon = config.icon

  return (
    <aside
      className={cn(
        "flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950",
        // 모바일: fixed overlay + transform 슬라이드 (z-50으로 backdrop 위)
        "fixed inset-y-0 left-0 z-50 h-full transform transition-transform duration-300 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        // 데스크톱 (md+): 정적 flex item으로 복귀, 항상 보임
        "md:static md:h-auto md:translate-x-0 md:transition-none",
      )}
      aria-hidden={!mobileOpen ? "true" : undefined}
    >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={onMobileClose}
        >
          <LogoSymbol size={32} />
          <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Node<span className="text-[#6366F1]">Bloom</span>
          </span>
        </Link>
        {/* 모바일 닫기 버튼 */}
        <button
          type="button"
          onClick={onMobileClose}
          className="-mr-2 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 md:hidden dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label="사이드바 닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Role Badge */}
      <div className="flex items-center gap-2 px-5 py-3">
        <RoleIcon className={cn("h-4 w-4", config.color)} />
        <span className={cn("text-sm font-medium", config.color)}>{config.label} 모드</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href))
          const Icon = item.icon
          const showBadge = item.key === 'messages' && unreadMessageCount > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              title={item.label}
              className={cn(
                // min-h-11 = 44px for mobile touch target
                "relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
