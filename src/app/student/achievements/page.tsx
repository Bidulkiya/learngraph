import { redirect } from 'next/navigation'
import { Award, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getMyAchievements, type UserAchievement, type AchievementCategory } from '@/actions/achievements'
import { AchievementTabs } from './AchievementTabs'

export default async function AchievementsPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null
  if (profile.role !== 'student') redirect(`/${profile.role}`)

  const res = await getMyAchievements()
  const achievements = res.data ?? []

  const earned = achievements.filter(a => a.earned)
  const totalEarned = earned.length
  const totalCount = achievements.length
  const earnedPercent = totalCount > 0
    ? Math.round((totalEarned / totalCount) * 100)
    : 0
  const earnedXp = earned.reduce((sum, a) => sum + a.xp_reward, 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <Award className="h-6 w-6 text-[#7C5CFC]" />
          내 업적
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          학습 여정에서 얻은 모든 업적을 모아볼 수 있어요
        </p>
      </div>

      {/* 진행률 요약 카드 */}
      <Card className="border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#6366F1]/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#7C5CFC]">달성 현황</p>
              <h2 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {totalEarned}
                <span className="text-xl text-gray-400">/{totalCount}</span>
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                총 {earnedXp.toLocaleString()} XP 획득
              </p>
            </div>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-lg dark:bg-gray-900">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#7C5CFC]">
                  {earnedPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* 진행률 바 */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#6366F1] transition-all"
              style={{ width: `${earnedPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 업적 없음 */}
      {achievements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Lock className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">업적 데이터를 불러올 수 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <AchievementTabs achievements={achievements} />
      )}
    </div>
  )
}

// Re-export for other consumers if needed
export type { UserAchievement, AchievementCategory }
