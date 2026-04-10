import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * 빈 상태(Empty State) 안내 컴포넌트.
 *
 * 데이터가 없을 때 구체적인 행동 유도 안내를 표시한다.
 * 아이콘 + 제목 + 설명 + CTA 버튼 조합.
 */

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  /** CTA 버튼 (링크 기반) */
  actionHref?: string
  actionLabel?: string
  /** CTA 버튼 (클릭 기반) — actionHref보다 우선 */
  onAction?: () => void
  /** 부가 설명 */
  detail?: string
  /** 카드 패딩 크기 */
  compact?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  detail,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-6' : 'py-10'}`}>
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {title}
      </h3>
      <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {detail && (
        <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
          {detail}
        </p>
      )}
      {(actionHref || onAction) && actionLabel && (
        <div className="mt-4">
          {onAction ? (
            <Button size="sm" onClick={onAction} className="bg-[#6366F1] hover:bg-[#6366F1]/90">
              {actionLabel}
            </Button>
          ) : actionHref ? (
            <Link href={actionHref}>
              <Button size="sm" className="bg-[#6366F1] hover:bg-[#6366F1]/90">
                {actionLabel}
              </Button>
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
