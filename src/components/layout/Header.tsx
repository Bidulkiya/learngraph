"use client"

import { useRouter } from "next/navigation"
import { LogOut, Menu, Moon, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { StudyTimer } from "@/components/student/StudyTimer"
import { LogoSymbol } from "@/components/Logo"
import type { Role } from "@/types/user"

interface HeaderProps {
  role: Role
  userName?: string
  nickname?: string | null
  avatarUrl?: string | null
  /** 모바일 햄버거 버튼 클릭 시 콜백 (DashboardShell에서 주입) */
  onMenuClick?: () => void
}

const roleLabels: Record<Role, string> = {
  teacher: "교사",
  student: "학생",
  admin: "운영자",
  parent: "학부모",
}

const roleBadgeColors: Record<Role, string> = {
  teacher: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
  student: "bg-[#4F6BF6]/10 text-[#4F6BF6] border-[#4F6BF6]/30",
  admin: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
  parent: "bg-pink-500/10 text-pink-500 border-pink-300",
}

// 프로필 페이지 경로 (parent/admin은 프로필 페이지 없음 → undefined)
const profilePathByRole: Partial<Record<Role, string>> = {
  student: '/student/profile',
  teacher: '/teacher/profile',
}

export function Header({
  role,
  userName = "사용자",
  nickname,
  avatarUrl,
  onMenuClick,
}: HeaderProps) {
  const router = useRouter()
  // 초기값을 렌더 시점이 아니라 lazy initializer로 — useEffect 카스케이드 제거
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains("dark")
  })
  const [loggingOut, setLoggingOut] = useState(false)

  // 표시용: 닉네임이 있으면 우선, 없으면 이름
  const displayName = nickname || userName
  const initial = (displayName?.[0] ?? '?').toUpperCase()

  function toggleDarkMode(): void {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
  }

  async function handleLogout(): Promise<void> {
    setLoggingOut(true)
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const profilePath = profilePathByRole[role]

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-6 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* 모바일 햄버거 버튼 */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9 md:hidden"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* 모바일 전용 로고 심볼 (사이드바가 숨겨진 상태에서 브랜드 유지) */}
        <div className="md:hidden">
          <LogoSymbol size={24} />
        </div>

        {/* 데스크톱 타이틀 */}
        <h2 className="hidden truncate text-sm font-medium text-gray-500 md:block dark:text-gray-400">
          {roleLabels[role]} 대시보드
        </h2>
        <Badge variant="outline" className={`shrink-0 text-[10px] sm:text-xs ${roleBadgeColors[role]}`}>
          {roleLabels[role]}
        </Badge>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Study timer (학생 only) */}
        {role === 'student' && <StudyTimer />}

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-9 w-9"
          aria-label={dark ? "라이트 모드" : "다크 모드"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent sm:gap-2 sm:px-2">
            <Avatar className="h-7 w-7">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-xs">{initial}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[140px] truncate font-medium text-gray-700 sm:inline dark:text-gray-300">
              {displayName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuItem
              disabled={!profilePath}
              onClick={() => { if (profilePath) router.push(profilePath) }}
            >
              <User className="mr-2 h-4 w-4" />
              프로필
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? "로그아웃 중..." : "로그아웃"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
