'use client'

import { Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * 감정 버킷 분포 (운영자 대시보드).
 * 범위 내 학생들의 감정 분포 파이 스타일 바.
 */

interface Props {
  buckets: {
    confident: number
    neutral: number
    struggling: number
    frustrated: number
    unknown: number
  }
}

const LABELS = {
  confident: { label: '자신감', color: '#10B981', emoji: '😊' },
  neutral: { label: '보통', color: '#6B7280', emoji: '😐' },
  struggling: { label: '고전', color: '#F59E0B', emoji: '😟' },
  frustrated: { label: '좌절', color: '#EF4444', emoji: '😰' },
  unknown: { label: '미분석', color: '#D1D5DB', emoji: '⚪' },
} as const

export function AdminEmotionBucketCard({ buckets }: Props) {
  const total =
    buckets.confident +
    buckets.neutral +
    buckets.struggling +
    buckets.frustrated +
    buckets.unknown

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 text-pink-500" />
          학생 감정 분포
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            감정 데이터가 없습니다
          </p>
        ) : (
          <>
            {/* 가로 스택 바 */}
            <div className="flex h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map(key => {
                const count = buckets[key]
                const rate = total > 0 ? (count / total) * 100 : 0
                if (rate === 0) return null
                return (
                  <div
                    key={key}
                    className="h-full transition-all"
                    style={{
                      width: `${rate}%`,
                      backgroundColor: LABELS[key].color,
                    }}
                    title={`${LABELS[key].label}: ${count}명`}
                  />
                )
              })}
            </div>

            {/* 레전드 */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map(key => {
                const count = buckets[key]
                const rate = total > 0 ? Math.round((count / total) * 100) : 0
                if (count === 0) return null
                const config = LABELS[key]
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="shrink-0">{config.emoji}</span>
                    <span className="truncate font-medium">{config.label}</span>
                    <span className="shrink-0 text-gray-500">
                      {count}명 ({rate}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
