import Link from 'next/link'
import { LogoSymbol } from '@/components/Logo'

/**
 * 404 페이지 — 존재하지 않는 라우트 접근 시.
 * Server Component로 동작.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#6366F1]/5 via-white to-[#A855F7]/5 px-4 text-center dark:from-[#6366F1]/10 dark:via-gray-950 dark:to-[#A855F7]/10">
      <LogoSymbol size={64} />
      <h1 className="mt-6 text-6xl font-bold text-gray-900 dark:text-white">
        404
      </h1>
      <h2 className="mt-2 text-xl font-semibold text-gray-700 dark:text-gray-300">
        페이지를 찾을 수 없습니다
      </h2>
      <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
        URL을 다시 확인해주세요.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#6366F1] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#6366F1]/90 hover:shadow-xl"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
