'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { Role } from '@/types/user'

/**
 * 대시보드 공용 레이아웃 쉘 (모바일 반응형).
 *
 * 데스크톱 (md, 768px+):
 *   좌측 고정 사이드바 + 우측 메인 콘텐츠의 flex 레이아웃
 *
 * 모바일 (md 미만):
 *   사이드바는 기본 숨김 (화면 밖 transform)
 *   햄버거 버튼 클릭 → 사이드바가 fixed overlay로 슬라이드 인
 *   배경 딤(backdrop) 클릭 시 닫힘
 *   라우트 변경 시 자동 닫힘
 *   body 스크롤 락 (사이드바 열린 동안)
 *
 * 4개 role 레이아웃(student/teacher/admin/parent)에서 공용으로 재사용.
 */

interface Props {
  role: Role
  userName?: string
  nickname?: string | null
  avatarUrl?: string | null
  unreadMessageCount?: number
  children: React.ReactNode
}

export function DashboardShell({
  role,
  userName,
  nickname,
  avatarUrl,
  unreadMessageCount = 0,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // 라우트 변경 시 사이드바 자동 닫기 (mobile UX)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])
  /* eslint-enable react-hooks/set-state-in-effect */

  // 사이드바 열린 동안 body 스크롤 락 (mobile only)
  useEffect(() => {
    if (typeof document === 'undefined') return
    // 데스크톱에서는 스크롤 락 불필요
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (!isMobile) return

    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  // Esc 키로 사이드바 닫기
  useEffect(() => {
    if (!sidebarOpen) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sidebarOpen])

  return (
    <div className="flex h-screen">
      {/* 모바일 백드롭 (딤 처리) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 — 데스크톱: 정적 flex item, 모바일: fixed overlay */}
      <Sidebar
        role={role}
        unreadMessageCount={unreadMessageCount}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* 메인 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          role={role}
          userName={userName}
          nickname={nickname}
          avatarUrl={avatarUrl}
          onMenuClick={() => setSidebarOpen(true)}
        />
        {children}
      </div>
    </div>
  )
}
