/**
 * 대시보드 로딩 스켈레톤.
 *
 * Next.js 16 App Router의 loading.tsx에서 사용하여 서버 데이터가 도착하기 전에
 * 레이아웃(사이드바/헤더)은 즉시 표시하고 콘텐츠 영역만 스켈레톤을 보여준다.
 *
 * 스타일: 펄스 애니메이션 + 카드 모양 회색 박스로 "로딩 중"임을 인지시킨다.
 */

interface SkeletonBoxProps {
  className?: string
}

function SkeletonBox({ className = '' }: SkeletonBoxProps): React.ReactElement {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  )
}

/**
 * 교사 대시보드용 스켈레톤 — 헤더 + 통계 카드 4개 + 차트 + 리스트
 */
export function TeacherDashboardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonBox className="h-8 w-64" />
        <SkeletonBox className="mt-2 h-4 w-80" />
      </div>

      {/* 스쿨 카드 */}
      <div className="rounded-lg border p-5 dark:border-gray-800">
        <SkeletonBox className="h-5 w-32" />
        <SkeletonBox className="mt-3 h-12 w-full" />
      </div>

      {/* 통계 카드 4개 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border p-5 dark:border-gray-800">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="mt-3 h-8 w-16" />
            <SkeletonBox className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>

      {/* 2열 카드 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-5 dark:border-gray-800">
          <SkeletonBox className="h-5 w-32" />
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map(i => (
              <SkeletonBox key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-5 dark:border-gray-800">
          <SkeletonBox className="h-5 w-32" />
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map(i => (
              <SkeletonBox key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* 큰 차트 영역 */}
      <div className="rounded-lg border p-5 dark:border-gray-800">
        <SkeletonBox className="h-5 w-40" />
        <SkeletonBox className="mt-4 h-64 w-full" />
      </div>
    </div>
  )
}

/**
 * 학생 대시보드용 스켈레톤
 */
export function StudentDashboardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonBox className="h-8 w-64" />
        <SkeletonBox className="mt-2 h-4 w-80" />
      </div>

      {/* 레벨 카드 */}
      <div className="rounded-lg border p-5 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <SkeletonBox className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-3 w-full" />
            <SkeletonBox className="h-2 w-3/4" />
          </div>
        </div>
      </div>

      {/* 통계 카드 4개 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border p-5 dark:border-gray-800">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      {/* 주간 계획 */}
      <div className="rounded-lg border p-5 dark:border-gray-800">
        <SkeletonBox className="h-5 w-40" />
        <SkeletonBox className="mt-4 h-32 w-full" />
      </div>

      {/* 오늘의 미션 */}
      <div className="rounded-lg border p-5 dark:border-gray-800">
        <SkeletonBox className="h-5 w-32" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map(i => (
            <SkeletonBox key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 스킬트리 리스트용 스켈레톤
 */
export function SkillTreeListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonBox className="h-8 w-48" />
        <SkeletonBox className="mt-2 h-4 w-64" />
      </div>

      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-lg border p-5 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-5 w-40" />
            <SkeletonBox className="h-5 w-16" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map(j => (
              <SkeletonBox key={j} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 일반 페이지용 간단한 스켈레톤 (퀴즈 관리, 스킬트리 편집 등)
 */
export function SimplePageSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonBox className="h-8 w-48" />
        <SkeletonBox className="mt-2 h-4 w-72" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <SkeletonBox key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  )
}
