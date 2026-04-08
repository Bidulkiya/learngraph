'use client'

import { useState, useEffect } from 'react'
import { Heart, TrendingUp, Flame, BookOpen, Loader2, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getChildDashboard } from '@/actions/parent'
import { toast } from 'sonner'

interface Child {
  student_id: string
  student_name: string
  student_email: string
}

interface Props {
  parentName: string
  students: Child[]
}

interface DashboardData {
  student_name: string
  level: number
  xp: number
  streak_days: number
  weekly_study_minutes: number
  progress: { completed: number; total: number }
  recent_attempts: Array<{ node_title: string; is_correct: boolean; score: number; attempted_at: string }>
  emotion: { mood: string; mood_score: number | null; insights: string | null } | null
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_factors: string[]
  weekly_chart: Array<{ day: string; minutes: number }>
}

const moodEmoji: Record<string, string> = {
  confident: '😊',
  neutral: '😐',
  struggling: '😟',
  frustrated: '😰',
}
const moodLabel: Record<string, string> = {
  confident: '자신감',
  neutral: '보통',
  struggling: '고전 중',
  frustrated: '좌절',
}

const riskLabel: Record<string, string> = {
  low: '안정',
  medium: '주의',
  high: '관심 필요',
  critical: '즉시 관심',
}
const riskColor: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
}

export function ParentDashboardView({ parentName, students }: Props) {
  const [selectedChild, setSelectedChild] = useState<string>(students[0]?.student_id ?? '')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedChild) return
    let cancelled = false
    setLoading(true)
    setData(null)
    getChildDashboard(selectedChild).then(res => {
      if (cancelled) return
      if (res.error) {
        toast.error(res.error)
      } else if (res.data) {
        setData(res.data)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedChild])
  /* eslint-enable react-hooks/set-state-in-effect */

  const progressPercent = data && data.progress.total > 0
    ? Math.round((data.progress.completed / data.progress.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            안녕하세요, {parentName} 학부모님 👋
          </h1>
          <p className="mt-1 text-gray-500">자녀의 학습을 함께 응원해주세요</p>
        </div>
        {students.length > 1 && (
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            {students.map(c => (
              <option key={c.student_id} value={c.student_id}>{c.student_name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
        </div>
      ) : !data ? (
        <p className="py-8 text-center text-sm text-gray-400">데이터를 불러올 수 없습니다</p>
      ) : (
        <>
          {/* Stats 4 cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  레벨 · 경험치
                </div>
                <p className="mt-1 text-2xl font-bold">Lv.{data.level}</p>
                <p className="text-xs text-gray-500">{data.xp} XP</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <BookOpen className="h-3.5 w-3.5" />
                  진도율
                </div>
                <p className="mt-1 text-2xl font-bold">{progressPercent}%</p>
                <p className="text-xs text-gray-500">
                  {data.progress.completed}/{data.progress.total} 노드
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Flame className="h-3.5 w-3.5" />
                  학습 스트릭
                </div>
                <p className="mt-1 text-2xl font-bold">{data.streak_days}일</p>
                <p className="text-xs text-gray-500">연속 학습</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Heart className="h-3.5 w-3.5" />
                  주간 학습
                </div>
                <p className="mt-1 text-2xl font-bold">{data.weekly_study_minutes}분</p>
                <p className="text-xs text-gray-500">이번 주 누적</p>
              </CardContent>
            </Card>
          </div>

          {/* 주간 학습 시간 차트 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">주간 학습 시간</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekly_chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="minutes" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 감정 리포트 */}
            {data.emotion && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Heart className="h-4 w-4 text-pink-500" />
                    자녀의 학습 감정
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-3xl">{moodEmoji[data.emotion.mood] ?? '🤔'}</span>
                    <div>
                      <p className="font-semibold">{moodLabel[data.emotion.mood] ?? '-'}</p>
                      {data.emotion.mood_score != null && (
                        <p className="text-xs text-gray-500">{data.emotion.mood_score}점 / 100</p>
                      )}
                    </div>
                  </div>
                  {data.emotion.insights && (
                    <p className="rounded-lg bg-pink-50 p-3 text-sm text-gray-700 dark:bg-pink-950/30 dark:text-gray-300">
                      {data.emotion.insights}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 위험 알림 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  학습 상태 알림
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2">
                  <Badge variant="outline" className={riskColor[data.risk_level]}>
                    {riskLabel[data.risk_level]}
                  </Badge>
                </div>
                {data.risk_factors.length === 0 ? (
                  <p className="text-sm text-gray-500">특별한 이슈가 없습니다 👍</p>
                ) : (
                  <ul className="ml-5 list-disc text-xs text-gray-600 dark:text-gray-400">
                    {data.risk_factors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 최근 퀴즈 결과 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">최근 퀴즈 결과</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_attempts.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">아직 퀴즈 기록이 없습니다</p>
              ) : (
                <ul className="space-y-2">
                  {data.recent_attempts.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-2 text-sm dark:border-gray-800"
                    >
                      <span className="font-medium">{a.node_title}</span>
                      <Badge
                        variant={a.is_correct ? 'default' : 'destructive'}
                        className={a.is_correct ? 'bg-[#10B981]' : ''}
                      >
                        {a.is_correct ? '정답' : '오답'} {a.score}점
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
