'use client'

import { useEffect, useState } from 'react'
import { TreePine, Flame, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { RankingDialog } from '@/components/dashboard/RankingDialog'
import { getMyRankingScopes } from '@/actions/ranking'

interface Props {
  completedNodes: number
  totalNodes: number
  progressPercent: number
  streakDays: number
  xp: number
  level: number
  /** 진도 랭킹에 사용할 스킬트리 ID — 학생이 가장 활발히 학습 중인 스킬트리 */
  primarySkillTreeId: string | null
}

type DialogMetric = 'progress' | 'streak' | 'xp' | null

/**
 * 학생 대시보드의 3개 통계 카드를 클릭 가능하게 만든 래퍼.
 * 카드 클릭 → RankingDialog 오픈.
 */
export function ClickableStatCards({
  completedNodes,
  totalNodes,
  progressPercent,
  streakDays,
  xp,
  level,
  primarySkillTreeId,
}: Props) {
  const [openMetric, setOpenMetric] = useState<DialogMetric>(null)
  const [scopes, setScopes] = useState<{
    schools: Array<{ id: string; name: string }>
    classes: Array<{ id: string; name: string }>
  }>({ schools: [], classes: [] })

  // 한 번만 스코프 로드
  useEffect(() => {
    getMyRankingScopes().then(res => {
      if (res.data) {
        setScopes({
          schools: res.data.schools,
          classes: res.data.classes.map(c => ({ id: c.id, name: c.name })),
        })
      }
    })
  }, [])

  // dialog에 쓰일 기본 scopeId
  const defaultStreakXpScope =
    scopes.classes[0]?.id ?? scopes.schools[0]?.id ?? ''

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCardButton
          label="내 스킬트리 진도"
          value={`${completedNodes}/${totalNodes}`}
          icon={<TreePine className="h-5 w-5" />}
          iconBg="#4F6BF6"
          subtitle={`${progressPercent}% 완료`}
          progressBar={progressPercent}
          onClick={() => primarySkillTreeId && setOpenMetric('progress')}
          disabled={!primarySkillTreeId}
        />
        <StatCardButton
          label="학습 스트릭"
          value={`${streakDays}일`}
          icon={<Flame className="h-5 w-5" />}
          iconBg="#F59E0B"
          subtitle="연속 학습 · 랭킹 보기"
          onClick={() => setOpenMetric('streak')}
        />
        <StatCardButton
          label="총 경험치"
          value={xp.toLocaleString()}
          icon={<Trophy className="h-5 w-5" />}
          iconBg="#10B981"
          subtitle={`Lv.${level} · 랭킹 보기`}
          onClick={() => setOpenMetric('xp')}
        />
      </div>

      {openMetric === 'progress' && primarySkillTreeId && (
        <RankingDialog
          open
          onOpenChange={(v) => !v && setOpenMetric(null)}
          metric="progress"
          scopeId={primarySkillTreeId}
        />
      )}
      {openMetric === 'streak' && (
        <RankingDialog
          open
          onOpenChange={(v) => !v && setOpenMetric(null)}
          metric="streak"
          scopeId={defaultStreakXpScope}
          availableScopes={scopes}
        />
      )}
      {openMetric === 'xp' && (
        <RankingDialog
          open
          onOpenChange={(v) => !v && setOpenMetric(null)}
          metric="xp"
          scopeId={defaultStreakXpScope}
          availableScopes={scopes}
        />
      )}
    </>
  )
}

function StatCardButton({
  label,
  value,
  icon,
  iconBg,
  subtitle,
  progressBar,
  onClick,
  disabled,
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  subtitle: string
  progressBar?: number
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group text-left disabled:cursor-not-allowed"
    >
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-disabled:opacity-60 group-disabled:translate-y-0 group-disabled:shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 group-hover:text-[#6366F1]">
                {subtitle} {!disabled && '→'}
              </p>
            </div>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110"
              style={{ backgroundColor: iconBg, boxShadow: `0 6px 20px ${iconBg}30` }}
            >
              {icon}
            </div>
          </div>
          {progressBar !== undefined && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] transition-all"
                style={{ width: `${progressBar}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  )
}
