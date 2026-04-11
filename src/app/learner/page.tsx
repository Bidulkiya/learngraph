import { Suspense } from 'react'
import { ClipboardCheck, Target, RotateCcw, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getStudentDashboardData } from '@/actions/dashboard'
import { getMyAchievements } from '@/actions/achievements'
import { getTodayReviews } from '@/actions/reminders'
import { WeeklyPlanCard } from '@/components/student/WeeklyPlanCard'
import { EmotionMiniCard } from '@/components/student/EmotionMiniCard'
import { ReviewItemActions } from '@/components/student/ReviewItemActions'

export default async function LearnerDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const dashboardRes = await getStudentDashboardData(profile.id)
  const data = dashboardRes.data

  const level = data?.level ?? 1
  const xp = data?.xp ?? 0
  const xpIntoLevel = xp % 100
  const totalNodes = data?.totalNodes ?? 0
  const completedNodes = data?.completedNodes ?? 0
  const progressPercent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile.nickname ?? profile.name}님 👋
        </h1>
        <p className="mt-1 text-gray-500">오늘도 자기주도 학습을 이어가보세요</p>
      </div>

      {/* Level + XP */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1]">
              <span className="text-xl font-bold text-white">Lv.{level}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">경험치</span>
                <span className="text-sm text-gray-500">{xpIntoLevel} / 100 XP ({xp} 총)</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] transition-all"
                  style={{ width: `${xpIntoLevel}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">내 진도</p>
            <p className="mt-1 text-2xl font-bold text-[#8B5CF6]">{progressPercent}%</p>
            <p className="text-xs text-gray-400">{completedNodes}/{totalNodes} 노드</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">학습 스트릭</p>
            <p className="mt-1 text-2xl font-bold text-[#F59E0B]">{data?.streakDays ?? 0}일</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">총 XP</p>
            <p className="mt-1 text-2xl font-bold text-[#10B981]">{xp.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <EmotionMiniCard />
      <WeeklyPlanCard />

      {/* 복습 */}
      <Suspense fallback={<Card><CardContent className="py-6"><div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></CardContent></Card>}>
        <LearnerReviews />
      </Suspense>

      {/* 업적 */}
      <Suspense fallback={<Card><CardContent className="py-6"><div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></CardContent></Card>}>
        <LearnerAchievements />
      </Suspense>

      {/* 최근 퀴즈 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-[#8B5CF6]" />
            최근 퀴즈 결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentAttempts.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              아직 퀴즈 기록이 없습니다. 스킬트리를 만들고 퀴즈를 풀어보세요!
            </p>
          ) : (
            <ul className="space-y-2">
              {data?.recentAttempts.map((a, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border p-2 text-sm dark:border-gray-800">
                  <span className="font-medium">{a.node_title}</span>
                  <Badge variant={a.is_correct ? 'default' : 'destructive'} className={a.is_correct ? 'bg-[#10B981]' : ''}>
                    {a.is_correct ? '정답' : '오답'} {a.score}점
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function LearnerReviews() {
  const reviewsRes = await getTodayReviews()
  const reviews = reviewsRes.data ?? []
  if (reviews.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <RotateCcw className="h-4 w-4 text-[#F59E0B]" />
          오늘의 복습 ({reviews.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {reviews.slice(0, 5).map(r => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm dark:border-gray-800">
              <span className="font-medium">{r.node_title}</span>
              <ReviewItemActions reviewId={r.id} nodeId={r.node_id} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

async function LearnerAchievements() {
  const achievementsRes = await getMyAchievements()
  const achievements = achievementsRes.data ?? []
  const earned = achievements.filter(a => a.earned)

  return (
    <Link href="/learner/achievements" className="block">
      <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-[#8B5CF6]" />
            내 업적 ({earned.length}/{achievements.length})
          </CardTitle>
          <span className="text-xs text-[#8B5CF6]">전체 보기 →</span>
        </CardHeader>
        <CardContent>
          {earned.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              첫 스킬트리를 만들고 퀴즈를 풀어 첫 업적을 달성하세요!
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {earned.slice(0, 6).map(a => (
                <div key={a.id} className="flex flex-col items-center gap-1 rounded-lg border-2 border-[#8B5CF6]/40 bg-gradient-to-br from-[#8B5CF6]/10 to-[#6366F1]/5 p-3 text-center shadow-sm">
                  <span className="text-2xl">{a.icon}</span>
                  <span className="line-clamp-1 text-xs font-medium">{a.title}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
