'use client'

import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * 위험 버킷 분포 (운영자 대시보드).
 * 범위 내 학생들의 위험 수준(low/medium/high/critical) 분포를 바 차트로.
 */

interface Props {
  buckets: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

const LABELS = {
  low: { label: '낮음', color: '#10B981', emoji: '🟢' },
  medium: { label: '보통', color: '#F59E0B', emoji: '🟡' },
  high: { label: '높음', color: '#F97316', emoji: '🟠' },
  critical: { label: '매우 높음', color: '#EF4444', emoji: '🔴' },
} as const

export function AdminRiskBucketCard({ buckets }: Props) {
  const total = buckets.low + buckets.medium + buckets.high + buckets.critical
  const critical = buckets.critical + buckets.high

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            학생 위험 분포
          </span>
          {critical > 0 && (
            <Badge className="bg-red-500 text-white">{critical}명 주의</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            위험 데이터가 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map(key => {
              const count = buckets[key]
              const rate = total > 0 ? Math.round((count / total) * 100) : 0
              const config = LABELS[key]
              return (
                <div key={key} className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0 flex items-center gap-1">
                    {config.emoji} {config.label}
                  </span>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${rate}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-gray-500">
                    {count}명 ({rate}%)
                  </span>
                </div>
              )
            })}
            <div className="mt-3 pt-2 border-t text-right text-xs text-gray-500 dark:border-gray-800">
              총 {total}명 · 위험군 {critical}명 ({total > 0 ? Math.round((critical / total) * 100) : 0}%)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
