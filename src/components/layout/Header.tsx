"use client"

import { useRouter } from "next/navigation"
import { LogOut, Moon, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { StudyTimer } from "@/components/student/StudyTimer"
import type { Role } from "@/types/user"

interface HeaderProps {
  role: Role
  userName?: string
}

const roleLabels: Record<Role, string> = {
  teacher: "교사",
  student: "학생",
  admin: "운영자",
}

const roleBadgeColors: Record<Role, string> = {
  teacher: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
  student: "bg-[#4F6BF6]/10 text-[#4F6BF6] border-[#4F6BF6]/30",
  admin: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
}

export function Header({ role, userName = "사용자" }: HeaderProps) {
  const router = useRouter()
  // 초기값을 렌더 시점이 아니라 lazy initializer로 — useEffect 카스케이드 제거
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains("dark")
  })
  const [loggingOut, setLoggingOut] = useState(false)

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

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {roleLabels[role]} 대시보드
        </h2>
        <Badge variant="outline" className={roleBadgeColors[role]}>
          {roleLabels[role]}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {/* Study timer (학생 only) */}
        {role === 'student' && <StudyTimer />}

        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-9 w-9">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{userName[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuItem>
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
