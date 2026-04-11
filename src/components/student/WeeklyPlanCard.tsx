'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Loader2,
  Calendar,
  Trophy,
  PartyPopper,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  getWeeklyPlanWithMissions,
  getPreviousWeekSummary,
  type WeeklyPlanWithMissions,
  type WeeklyPlanMission,
} from '@/actions/coach'
import type { WeeklyPlanDay } from '@/lib/ai/schemas'

// 요일 표시용 상수
const DAY_LABELS: Record<WeeklyPlanDay, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
}
const DAY_ORDER: WeeklyPlanDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function WeeklyPlanCard() {
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [data, setData] = useState<WeeklyPlanWithMissions | null>(null)

  // 지난주 요약 (새 주 월요일에 표시)
  const [lastWeek, setLastWeek] = useState<{
    weekStart: string
    completedCount: number
    totalCount: number
    progressPercent: number
    bonusAwarded: boolean
  } | null>(null)
  const [showLastWeekDialog, setShowLastWeekDialog] = useState(false)


  // 초기 로드
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    setLoadingInitial(true)

    Promise.all([
      getWeeklyPlanWithMissions(false),
      getPreviousWeekSummary(),
    ]).then(([planRes, prevRes]) => {
      if (cancelled) return
      if (planRes.data) setData(planRes.data)
      if (prevRes.data) setLastWeek(prevRes.data)
      setLoadingInitial(false)
    })

    return () => { cancelled = true }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleRegenerate = async (): Promise<void> => {
    setGenerating(true)
    const res = await getWeeklyPlanWithMissions(true)
    setGenerating(false)
    if (res.error || !res.data) {
      toast.error(res.error ?? '계획 생성 실패')
      return
    }
    setData(res.data)
    toast.success('주간 계획이 새로 생성되었습니다')
  }

  const handleStartNewWeek = async (): Promise<void> => {
    setShowLastWeekDialog(true)
  }

  const confirmNewWeek = async (): Promise<void> => {
    setShowLastWeekDialog(false)
    setLastWeek(null) // "새 주 시작하기" 버튼 숨김
    await handleRegenerate()
  }

  if (loadingInitial) {
    return (
      <Card className="border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#6366F1]/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#7C5CFC]" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.plan.plan.length === 0) {
    return (
      <Card className="border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#6366F1]/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
            AI 학습 코치
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI가 당신의 진도와 약점을 분석해서 이번 주 최적 학습 계획을 세워드립니다
          </p>
          <Button
            onClick={handleRegenerate}
            disabled={generating}
            className="bg-[#7C5CFC] hover:bg-[#7C5CFC]/90"
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="mr-2 h-4 w-4" />
            )}
            이번 주 계획 받기
          </Button>
        </CardContent>
      </Card>
    )
  }

  const todayIsMonday = DAY_ORDER[0] === data.today
  const shouldShowNewWeekBtn = lastWeek && todayIsMonday

  // 요일별 미션 그룹핑
  const missionsByDay = groupByDay(data.missions)
  const daysInPlan = data.plan.plan.map(p => p.day)
  const dayReasons: Record<WeeklyPlanDay, string> = {} as Record<WeeklyPlanDay, string>
  data.plan.plan.forEach(p => { dayReasons[p.day] = p.reason })

  return (
    <>
      <Card className="border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#6366F1]/5">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
              AI 학습 코치
              {data.allCompleted && (
                <Badge className="bg-[#10B981] text-white">
                  <Trophy className="mr-1 h-3 w-3" />
                  주간 완주!
                </Badge>
              )}
            </CardTitle>
            {shouldShowNewWeekBtn && (
              <Button
                size="sm"
                onClick={handleStartNewWeek}
                className="h-7 bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] text-xs"
              >
                <PartyPopper className="mr-1 h-3 w-3" />
                새 계획 시작
              </Button>
            )}
          </div>

          {/* 진행률 바 */}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] transition-all"
                style={{ width: `${data.progressPercent}%` }}
              />
            </div>
            <span className="font-semibold text-[#7C5CFC]">
              {data.completedCount}/{data.totalCount}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {daysInPlan.map(day => {
            const dayMissions = missionsByDay.get(day) ?? []
            // 미션 없는 요일 = 쉬는 날
            if (dayMissions.length === 0) {
              const isToday = day === data.today
              return (
                <div
                  key={day}
                  className={`rounded-lg border p-3 ${
                    isToday
                      ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                      : 'border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☕</span>
                      <span className={`text-xs font-semibold ${isToday ? 'text-green-700 dark:text-green-300' : 'text-gray-500'}`}>
                        {DAY_LABELS[day]} {isToday && '(오늘)'}
                      </span>
                    </div>
                    <span className="text-xs text-green-600">✓ 쉬는 날</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    오늘은 쉬는 날! 충분히 쉬고 내일 다시 달려요 💪
                  </p>
                </div>
              )
            }
            return (
              <DayMissionRow
                key={day}
                day={day}
                missions={dayMissions}
                reason={dayReasons[day]}
                today={data.today}
              />
            )
          })}

          {data.plan.motivation && (
            <div className="mt-3 rounded-lg border-l-4 border-[#7C5CFC] bg-[#7C5CFC]/5 p-3">
              <p className="text-sm italic text-gray-700 dark:text-gray-300">
                💜 {data.plan.motivation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 지난주 요약 → 새 주 시작 다이얼로그 */}
      <Dialog open={showLastWeekDialog} onOpenChange={setShowLastWeekDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-[#7C5CFC]" />
              새 주가 시작되었어요!
            </DialogTitle>
            <DialogDescription>지난주 학습 결과를 확인해볼까요?</DialogDescription>
          </DialogHeader>

          {lastWeek && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-gradient-to-br from-[#7C5CFC]/5 to-[#6366F1]/5 p-4 text-center">
                <div className="mb-2 text-xs text-gray-500">지난주 완료율</div>
                <div className="text-3xl font-bold text-[#7C5CFC]">
                  {lastWeek.progressPercent}%
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {lastWeek.completedCount}/{lastWeek.totalCount} 미션
                </div>
              </div>
              {lastWeek.bonusAwarded && (
                <div className="flex items-center gap-2 rounded-lg bg-[#10B981]/10 p-3 text-sm text-[#10B981]">
                  <Trophy className="h-4 w-4" />
                  <span>주간 완주 보너스 +100 XP 지급되었습니다!</span>
                </div>
              )}
              <Button
                onClick={confirmNewWeek}
                disabled={generating}
                className="w-full bg-gradient-to-r from-[#7C5CFC] to-[#6366F1]"
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                이번 주 계획 받기
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  )
}

// ============================================
// 요일별 행
// ============================================

function DayMissionRow({
  day,
  missions,
  reason,
  today,
}: {
  day: WeeklyPlanDay
  missions: WeeklyPlanMission[]
  reason: string | undefined
  today: WeeklyPlanDay
}) {
  const dayIdx = DAY_ORDER.indexOf(day)
  const todayIdx = DAY_ORDER.indexOf(today)
  const isToday = day === today
  const isPast = dayIdx < todayIdx
  const isFuture = dayIdx > todayIdx

  const allCompleted = missions.every(m => m.completed)
  const anyCompleted = missions.some(m => m.completed)

  // 상태별 스타일
  let statusColor = '#7C5CFC'
  let statusText = ''
  let cardBg = 'bg-white dark:bg-gray-900'

  if (allCompleted) {
    statusColor = '#10B981'
    statusText = '잘했어요! ✅'
    cardBg = 'bg-[#10B981]/5 border-[#10B981]/30'
  } else if (isPast && !anyCompleted) {
    statusColor = '#9CA3AF'
    statusText = '괜찮아요, 다음에 도전해봐요! 💪'
    cardBg = 'bg-gray-50 dark:bg-gray-900/50 opacity-75'
  } else if (isToday) {
    statusColor = '#F59E0B'
    statusText = '오늘의 목표! 🎯'
    cardBg = 'bg-[#F59E0B]/5 border-[#F59E0B]/40 ring-1 ring-[#F59E0B]/30'
  } else if (isFuture) {
    statusColor = '#6366F1'
  }

  return (
    <div className={`rounded-lg border p-3 transition-all ${cardBg}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="font-bold"
            style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
          >
            {DAY_LABELS[day]}요일
          </Badge>
          {statusText && (
            <span className="text-xs font-medium" style={{ color: statusColor }}>
              {statusText}
            </span>
          )}
        </div>
      </div>

      <ul className="space-y-1">
        {missions.map(m => (
          <li key={m.id} className="flex items-start gap-2">
            {m.completed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
            )}
            <Link
              href={`/student/quiz/${m.node_id}`}
              className={`flex-1 text-sm transition-colors hover:underline ${
                m.completed
                  ? 'text-gray-500 line-through'
                  : 'font-medium text-gray-900 hover:text-[#6366F1] dark:text-white'
              }`}
            >
              {m.node_title}
            </Link>
          </li>
        ))}
      </ul>

      {reason && !isPast && (
        <p className="mt-2 line-clamp-2 text-[11px] text-gray-500">{reason}</p>
      )}
    </div>
  )
}

function groupByDay(missions: WeeklyPlanMission[]): Map<WeeklyPlanDay, WeeklyPlanMission[]> {
  const map = new Map<WeeklyPlanDay, WeeklyPlanMission[]>()
  for (const m of missions) {
    const list = map.get(m.day) ?? []
    list.push(m)
    map.set(m.day, list)
  }
  return map
}
