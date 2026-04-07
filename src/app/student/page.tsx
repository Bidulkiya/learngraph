import { Zap, Trophy, TreePine, Flame, ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getStudentDashboardData } from '@/actions/dashboard'
import { ProgressCard } from '@/components/dashboard/ProgressCard'

export default async function StudentDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const { data } = await getStudentDashboardData(profile.id)

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
