'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Home, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoSymbol } from '@/components/Logo'

/**
 * 전역 에러 바운더리 페이지.
 * Next.js App Router에서 런타임 에러 발생 시 자동으로 이 컴포넌트가 표시된다.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 px-4 text-center dark:from-red-950/20 dark:via-gray-950 dark:to-orange-950/20">
      <LogoSymbol size={64} />
      <div className="mt-6 flex items-center gap-2">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          문제가 발생했습니다
        </h1>
      </div>
      <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
        일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        문제가 지속되면 새로고침하거나 홈으로 돌아가세요.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-gray-400">
          오류 코드: {error.digest}
        </p>
      )}
      <div className="mt-8 flex gap-3">
        <Button
          onClick={reset}
          className="bg-[#6366F1] hover:bg-[#6366F1]/90"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          다시 시도
        </Button>
        <Link href="/">
          <Button variant="outline">
            <Home className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Button>
        </Link>
      </div>
    </div>
  )
}
