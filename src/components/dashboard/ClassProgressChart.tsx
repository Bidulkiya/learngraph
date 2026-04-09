'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'

/**
 * 클래스별 평균 진도율 비교 차트 (운영자 대시보드용).
 *
 * 입력: 클래스 목록 + 각 클래스의 평균 진도율 (0-100)
 * 출력: 가로 바 차트 — 상위 3개는 초록색, 하위 3개는 빨간색 강조
 */

interface ClassProgressEntry {
  class_id: string
  class_name: string
  avg_progress: number
  student_count: number
}

interface Props {
  entries: ClassProgressEntry[]
}

export function ClassProgressChart({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-[#4F6BF6]" />
            클래스별 진도 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-gray-400">
            표시할 클래스가 없습니다
          </p>
        </CardContent>
      </Card>
    )
  }

  // 진도율 기준 내림차순 정렬
  const sorted = [...entries].sort((a, b) => b.avg_progress - a.avg_progress)
  const top3Ids = new Set(sorted.slice(0, 3).map(e => e.class_id))
  const bottom3Ids = new Set(sorted.slice(-3).map(e => e.class_id))

  const avgOfAll = Math.round(
    entries.reduce((sum, e) => sum + e.avg_progress, 0) / entries.length,
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#4F6BF6]" />
            클래스별 진도 비교
          </span>
          <Badge variant="secondary" className="text-xs">
            전체 평균 {avgOfAll}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.map(entry => {
            const isTop = top3Ids.has(entry.class_id) && sorted.length > 3
            const isBottom = bottom3Ids.has(entry.class_id) && !isTop && sorted.length > 3

            let barColor = 'from-[#4F6BF6] to-[#7C5CFC]'
            let textColor = 'text-[#4F6BF6]'
            if (isTop) {
              barColor = 'from-[#10B981] to-[#34D399]'
              textColor = 'text-[#10B981]'
            } else if (isBottom) {
              barColor = 'from-red-500 to-red-400'
              textColor = 'text-red-600 dark:text-red-400'
            }

            return (
              <div key={entry.class_id} className="flex items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate font-medium ${isBottom ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {isTop && '🏆 '}
                      {isBottom && '⚠️ '}
                      {entry.class_name}
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-500">
                      학생 {entry.student_count}명
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all`}
                      style={{ width: `${entry.avg_progress}%` }}
                    />
                  </div>
                </div>
                <span className={`shrink-0 w-12 text-right text-sm font-bold ${textColor}`}>
                  {entry.avg_progress}%
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
