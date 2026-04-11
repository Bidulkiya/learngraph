import { Card, CardContent } from '@/components/ui/card'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getMyAchievements } from '@/actions/achievements'
import { AchievementTabs } from '@/app/student/achievements/AchievementTabs'

/**
 * 독학러 업적 페이지 — 학생 업적과 동일한 UI.
 */
export default async function LearnerAchievementsPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const res = await getMyAchievements()
  const achievements = res.data ?? []

  const earnedCount = achievements.filter(a => a.earned).length
  const totalCount = achievements.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">내 업적</h1>
        <p className="mt-1 text-gray-500">
          {earnedCount}/{totalCount}개 달성 · 퀴즈를 풀고 업적을 모아보세요!
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">전체 진행률</span>
            <span className="text-[#8B5CF6] font-bold">
              {totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] transition-all"
              style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <AchievementTabs achievements={achievements} />
    </div>
  )
}
