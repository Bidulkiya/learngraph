'use client'

import { isDemoAccount } from '@/lib/demo'
import { createBrowserClient } from '@/lib/supabase/client'

interface DemoBannerProps {
  email: string | null | undefined
}

/**
 * 데모 계정으로 로그인했을 때 모든 페이지 상단에 표시되는 배너.
 * 데모 계정이 아니면 null을 반환하여 아무것도 렌더링하지 않는다.
 *
 * Client Component로 전환 — "회원가입 →" 버튼 클릭 시 signOut() 후 /signup으로 이동해야
 * middleware의 "인증된 유저 → /dashboard 리디렉트"를 우회하기 위해.
 */
export function DemoBanner({ email }: DemoBannerProps) {
  if (!isDemoAccount(email)) return null

  const handleSignup = async (): Promise<void> => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // 세션이 없어도 OK
    }
    window.location.href = '/signup'
  }

  return (
    <div className="sticky top-0 z-30 w-full border-b border-blue-300/40 bg-gradient-to-r from-[#4F6BF6] via-[#5A78F8] to-[#7C5CFC] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 text-xs sm:gap-3 sm:px-4 sm:py-2.5 sm:text-sm">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base">🎮</span>
          <span className="truncate font-semibold">체험 모드</span>
          <span className="hidden text-white/85 sm:inline">
            — 둘러보기만 가능합니다. 데이터가 저장되지 않아요.
          </span>
        </div>
        <button
          type="button"
          onClick={handleSignup}
          className="shrink-0 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#4F6BF6] shadow-sm transition-all hover:bg-white hover:shadow sm:px-3.5 sm:text-xs"
        >
          회원가입 →
        </button>
      </div>
    </div>
  )
}
