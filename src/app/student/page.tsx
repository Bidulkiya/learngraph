import Link from 'next/link'
import { Trophy, TreePine, Flame, ClipboardCheck, Target, RotateCcw, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getStudentDashboardData } from '@/actions/dashboard'
import { getTodayMissions } from '@/actions/missions'
import { getMyAchievements } from '@/actions/achievements'
import { getTodayReviews } from '@/actions/reminders'
import { ProgressCard } from '@/components/dashboard/ProgressCard'

export default async function StudentDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const [dashboardRes, missionsRes, achievementsRes, reviewsRes] = await Promise.all([
    getStudentDashboardData(profile.id),
    getTodayMissions(),
    getMyAchievements(),
    getTodayReviews(),
  ])

  const data = dashboardRes.data
  const missions = missionsRes.data ?? []
  const achievements = achievementsRes.data ?? []
  const reviews = reviewsRes.data ?? []

  const level = data?.level ?? 1
  const xp = data?.xp ?? 0
  const xpIntoLevel = xp % 100
  const totalNodes = data?.totalNodes ?? 0
  const completedNodes = data?.completedNodes ?? 0
  const progressPercent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  const earnedAchievements = achievements.filter(a => a.earned)
  const lockedAchievements = achievements.filter(a => !a.earned)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile.name} 학생 👋
        </h1>
        <p className="mt-1 text-gray-500">오늘도 학습을 이어가보세요</p>
      </div>

      {/* Level + XP */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC]">
              <span className="text-xl font-bold text-white">Lv.{level}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">경험치</span>
                <span className="text-sm text-gray-500">
                  {xpIntoLevel} / 100 XP ({xp} 총)
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] transition-all"
                  style={{ width: `${xpIntoLevel}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">다음 레벨까지 {data?.xpToNextLevel ?? 100} XP</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ProgressCard
          label="내 스킬트리 진도"
          value={`${completedNodes}/${totalNodes}`}
          icon={TreePine}
          iconColor="#4F6BF6"
          progress={progressPercent}
          subtitle={`${progressPercent}% 완료`}
        />
        <ProgressCard
          label="학습 스트릭"
          value={`${data?.streakDays ?? 0}일`}
          icon={Flame}
          iconColor="#F59E0B"
          subtitle="연속 학습"
        />
        <ProgressCard
          label="총 경험치"
          value={xp}
          icon={Trophy}
          iconColor="#10B981"
          subtitle={`Lv.${level}`}
        />
      </div>

      {/* 오늘의 미션 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-[#4F6BF6]" />
            오늘의 미션
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <p className="py-2 text-sm text-gray-400">미션을 불러오는 중...</p>
          ) : (
            <ul className="space-y-2">
              {missions.map(m => {
                const pct = Math.round((m.progress / m.target) * 100)
                return (
                  <li
                    key={m.id}
                    className={`rounded-lg border p-3 ${m.completed ? 'border-[#10B981] bg-green-50 dark:bg-green-950/30' : 'dark:border-gray-800'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full bg-[#4F6BF6] transition-all"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {m.progress}/{m.target}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`ml-3 ${m.completed ? 'bg-[#10B981] text-white' : ''}`}
                      >
                        {m.completed ? '✓ 완료' : `+${m.xp_reward} XP`}
                      </Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 복습 추천 */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4 text-[#F59E0B]" />
              복습 추천
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reviews.slice(0, 3).map(r => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border bg-yellow-50 p-3 text-sm dark:border-gray-800 dark:bg-yellow-950/30"
                >
                  <span className="font-medium">{r.node_title}을 복습하세요!</span>
                  <Link href={`/student/quiz/${r.node_id}`}>
                    <Button size="sm" variant="outline">
                      복습하기
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 내 업적 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-[#7C5CFC]" />
            내 업적 ({earnedAchievements.length}/{achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {earnedAchievements.map(a => (
              <div
                key={a.id}
                className="flex flex-col items-center gap-1 rounded-lg border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#4F6BF6]/5 p-3 text-center"
                title={a.description}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-medium">{a.title}</span>
              </div>
            ))}
            {lockedAchievements.slice(0, 5 - (earnedAchievements.length % 5)).map(a => (
              <div
                key={a.id}
                className="flex flex-col items-center gap-1 rounded-lg border bg-gray-50 p-3 text-center opacity-50 dark:border-gray-800 dark:bg-gray-900"
                title={a.description}
              >
                <span className="text-2xl grayscale">{a.icon}</span>
                <span className="text-xs font-medium text-gray-500">???</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Quiz Attempts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-[#4F6BF6]" />
            최근 퀴즈 결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentAttempts.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">아직 퀴즈 기록이 없습니다</p>
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
