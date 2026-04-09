'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Crown, Flame, Loader2, TreePine } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  getProgressRanking,
  getStreakRanking,
  getXpRanking,
  type RankingResult,
} from '@/actions/ranking'

/**
 * 랭킹 다이얼로그 — 3가지 메트릭(진도/스트릭/XP) 공용 컴포넌트.
 *
 * - `metric === 'progress'`: 진도 랭킹, 탭 없음, scopeId = skillTreeId
 * - `metric === 'streak' | 'xp'`: 스쿨/클래스 탭 있음
 */

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: 'progress' | 'streak' | 'xp'
  /** progress인 경우 skillTreeId, 그 외는 default scope의 id */
  scopeId: string
  /** streak/xp 탭용: 사용자의 스쿨/클래스 목록 */
  availableScopes?: {
    schools: Array<{ id: string; name: string }>
    classes: Array<{ id: string; name: string }>
  }
}

type Scope = { type: 'school' | 'class'; id: string; label: string }

export function RankingDialog({
  open,
  onOpenChange,
  metric,
  scopeId,
  availableScopes,
}: Props) {
  const [result, setResult] = useState<RankingResult | null>(null)
  const [loading, setLoading] = useState(false)

  // 탭 선택 상태 (streak/xp 전용)
  const [tabValue, setTabValue] = useState<string>('')
  const [scopes, setScopes] = useState<Scope[]>([])

  // 탭 구성: 스쿨 + 클래스를 모두 탭으로
  useEffect(() => {
    if (metric === 'progress') {
      setScopes([])
      return
    }
    const s: Scope[] = []
    availableScopes?.schools.forEach(sc => s.push({ type: 'school', id: sc.id, label: sc.name }))
    availableScopes?.classes.forEach(cl => s.push({ type: 'class', id: cl.id, label: cl.name }))
    setScopes(s)
    if (s.length > 0 && !tabValue) {
      setTabValue(`${s[0].type}:${s[0].id}`)
    }
  }, [metric, availableScopes, tabValue])

  // 랭킹 로드
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)

    const load = async (): Promise<void> => {
      let res
      if (metric === 'progress') {
        res = await getProgressRanking(scopeId)
      } else {
        // streak or xp — 탭 scope 사용
        const selected = tabValue
          ? scopes.find(s => `${s.type}:${s.id}` === tabValue)
          : scopes[0]
        if (!selected) {
          setLoading(false)
          setResult(null)
          return
        }
        res = metric === 'streak'
          ? await getStreakRanking(selected.type, selected.id)
          : await getXpRanking(selected.type, selected.id)
      }

      if (cancelled) return
      if (res?.data) setResult(res.data)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [open, metric, scopeId, tabValue, scopes])

  const title = {
    progress: '📊 스킬트리 진도 랭킹',
    streak: '🔥 학습 스트릭 랭킹',
    xp: '🏆 경험치 랭킹',
  }[metric]

  const description = {
    progress: '같은 스킬트리를 학습 중인 학생들의 진도 순위',
    streak: '연속 학습일 순위',
    xp: 'XP(경험치) 순위',
  }[metric]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* 탭 (streak/xp만) */}
        {metric !== 'progress' && scopes.length > 1 && (
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="w-full">
              {scopes.map(s => (
                <TabsTrigger
                  key={`${s.type}:${s.id}`}
                  value={`${s.type}:${s.id}`}
                  className="flex-1 text-xs"
                >
                  {s.type === 'school' ? '🏫 ' : '📚 '}
                  <span className="truncate">{s.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {scopes.map(s => (
              <TabsContent key={`${s.type}:${s.id}`} value={`${s.type}:${s.id}`} />
            ))}
          </Tabs>
        )}

        {/* 랭킹 리스트 */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
            </div>
          ) : !result || result.entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              아직 랭킹 데이터가 없습니다.
            </p>
          ) : (
            <RankingList result={result} metric={metric} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RankingList({
  result,
  metric,
}: {
  result: RankingResult
  metric: 'progress' | 'streak' | 'xp'
}) {
  return (
    <div className="space-y-1.5">
      {/* 스코프 라벨 */}
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          {metric === 'progress' && <TreePine className="h-3 w-3" />}
          {result.scopeLabel}
        </span>
        <span>총 {result.totalCount}명</span>
      </div>

      {/* TOP N 리스트 */}
      <ul className="space-y-1.5">
        {result.entries.slice(0, 30).map(entry => {
          const isMe = result.myEntry?.student_id === entry.student_id
          return <RankingRow key={entry.student_id} entry={entry} metric={metric} isMe={isMe} />
        })}
      </ul>

      {/* 내 순위가 top 30 밖인 경우 하이라이트 */}
      {result.myEntry && result.myRank !== null && result.myRank > 30 && (
        <>
          <div className="my-2 text-center text-xs text-gray-400">⋯</div>
          <RankingRow entry={result.myEntry} metric={metric} isMe />
        </>
      )}
    </div>
  )
}

function RankingRow({
  entry,
  metric,
  isMe,
}: {
  entry: RankingResult['entries'][number]
  metric: 'progress' | 'streak' | 'xp'
  isMe: boolean
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        isMe
          ? 'border-[#6366F1] bg-[#6366F1]/5 shadow-sm dark:bg-[#6366F1]/10'
          : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'
      }`}
    >
      {/* 순위 아이콘 */}
      <RankBadge rank={entry.rank} />

      {/* 아바타 */}
      {entry.avatar_url ? (
        <Image
          src={entry.avatar_url}
          alt={entry.nickname ?? entry.name}
          width={32}
          height={32}
          unoptimized
          className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white dark:border-gray-700"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-800">
          {(entry.nickname ?? entry.name)[0]}
        </div>
      )}

      {/* 닉네임 (fallback: 이름) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`truncate font-semibold ${isMe ? 'text-[#6366F1]' : ''}`}>
            {entry.nickname ?? entry.name}
          </span>
          {isMe && (
            <Badge className="shrink-0 bg-[#6366F1] px-1.5 py-0 text-[9px]">나</Badge>
          )}
        </div>
        {/* progress: 진도 바 */}
        {metric === 'progress' && (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#A855F7]"
                style={{ width: `${entry.value}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] text-gray-500">{entry.detail}</span>
          </div>
        )}
      </div>

      {/* 우측 값 */}
      <div className="shrink-0 text-right">
        {metric === 'progress' && (
          <span className="text-base font-bold text-[#6366F1]">{entry.value}%</span>
        )}
        {metric === 'streak' && (
          <span className="flex items-center gap-1 text-base font-bold text-[#F59E0B]">
            <Flame className="h-4 w-4 fill-[#F59E0B]" />
            {entry.value}일
          </span>
        )}
        {metric === 'xp' && (
          <div className="flex flex-col items-end">
            <span className="text-base font-bold text-[#10B981]">
              {entry.value.toLocaleString()} XP
            </span>
            {entry.level !== undefined && (
              <span className="text-[10px] text-gray-500">Lv.{entry.level}</span>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-lg shadow-sm">
        <Crown className="h-4 w-4 fill-white text-white" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-sm font-bold text-white shadow-sm">
        🥈
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-sm font-bold text-white shadow-sm">
        🥉
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      {rank}
    </div>
  )
}

