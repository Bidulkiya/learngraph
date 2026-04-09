'use client'

import Image from 'next/image'
import { GraduationCap, TreePine, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * 교사 활동 현황 카드 (운영자 대시보드).
 * 선택한 범위의 교사들이 최근 스킬트리를 만들었는지, 비활동 교사 알림.
 */

interface TeacherActivity {
  teacher_id: string
  teacher_name: string
  teacher_nickname: string | null
  teacher_avatar_url?: string | null
  skill_tree_count: number
  last_active_at: string | null
  is_inactive: boolean
}

interface Props {
  activities: TeacherActivity[]
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '활동 없음'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  return `${Math.floor(days / 30)}개월 전`
}

export function AdminTeacherActivityCard({ activities }: Props) {
  const inactiveCount = activities.filter(a => a.is_inactive).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[#10B981]" />
            교사 활동 현황
          </span>
          {inactiveCount > 0 && (
            <Badge className="bg-yellow-500 text-white text-[10px]">
              비활동 {inactiveCount}명
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            표시할 교사가 없습니다
          </p>
        ) : (
          <ul className="space-y-2">
            {activities.map(a => (
              <li
                key={a.teacher_id}
                className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm ${
                  a.is_inactive
                    ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30'
                    : 'dark:border-gray-800'
                }`}
              >
                {a.teacher_avatar_url ? (
                  <Image
                    src={a.teacher_avatar_url}
                    alt={a.teacher_nickname ?? a.teacher_name}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white dark:border-gray-700"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10B981]/10 text-[#10B981]">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">
                      {a.teacher_nickname ?? a.teacher_name}
                    </span>
                    {a.is_inactive && (
                      <AlertCircle className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <TreePine className="h-3 w-3" />
                      {a.skill_tree_count}개 트리
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(a.last_active_at)}
                    </span>
                  </div>
                </div>
                {a.is_inactive && (
                  <Badge className="shrink-0 bg-yellow-200 text-yellow-800 text-[10px]">
                    비활동
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
