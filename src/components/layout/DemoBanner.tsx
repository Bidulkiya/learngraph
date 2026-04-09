import Link from 'next/link'
import { isDemoAccount } from '@/lib/demo'

interface DemoBannerProps {
  email: string | null | undefined
}

/**
 * 데모 계정으로 로그인했을 때 모든 페이지 상단에 표시되는 배너.
 * 데모 계정이 아니면 null을 반환하여 아무것도 렌더링하지 않는다.
 *
 * Server Component로 동작하므로 hydration 비용 없음.
 * 데모 계정 판별은 서버에서 한 번만 수행한다.
 */
export function DemoBanner({ email }: DemoBannerProps) {
  if (!isDemoAccount(email)) return null

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
        <Link
          href="/signup"
          className="shrink-0 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#4F6BF6] shadow-sm transition-all hover:bg-white hover:shadow sm:px-3.5 sm:text-xs"
        >
          회원가입 →
        </Link>
      </div>
    </div>
  )
}
