import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardCheck, Target, RotateCcw, Award, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStudentDashboardData } from '@/actions/dashboard'
import { getTodayMissions } from '@/actions/missions'
import { getMyAchievements } from '@/actions/achievements'
import { getTodayReviews } from '@/actions/reminders'
import { getAnnouncements } from '@/actions/announcements'
import { getMyFeed } from '@/actions/feed'
import { getMyCertificates } from '@/actions/certificate'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'
import { WeeklyPlanCard } from '@/components/student/WeeklyPlanCard'
import { ClickableStatCards } from '@/components/student/ClickableStatCards'
import { ActivityFeed } from '@/components/feed/ActivityFeed'
import { ConceptMapCard } from '@/components/dashboard/ConceptMapCard'
import { ParentInviteCard } from '@/components/student/ParentInviteCard'
import { MyCertificatesCard } from '@/components/student/MyCertificatesCard'

const STYLE_INFO: Record<string, { emoji: string; label: string }> = {
  visual: { emoji: '👁️', label: '시각형' },
  textual: { emoji: '📖', label: '텍스트형' },
  practical: { emoji: '💪', label: '실습형' },
}

export default async function StudentDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  // 학습 스타일 미진단 학생 → 온보딩으로
  if (!profile.learning_style) {
    redirect('/student/onboarding')
  }

  const admin = createAdminClient()

  // 진도 랭킹에 사용할 primary skill tree — 학생이 approved된 클래스의
  // 첫 published 스킬트리를 기본 선택
  const { data: firstEnrollment } = await admin
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', profile.id)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle()
  let primarySkillTreeId: string | null = null
  if (firstEnrollment?.class_id) {
    const { data: firstTree } = await admin
      .from('skill_trees')
      .select('id')
      .eq('class_id', firstEnrollment.class_id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    primarySkillTreeId = firstTree?.id ?? null
  }

  const [dashboardRes, missionsRes, achievementsRes, reviewsRes, annRes, feedRes, certsRes] = await Promise.all([
    getStudentDashboardData(profile.id),
    getTodayMissions(),
    getMyAchievements(),
    getTodayReviews(),
    getAnnouncements(undefined, { unreadOnly: true }),
    getMyFeed(),
    getMyCertificates(),
  ])
  const certificates = certsRes.data ?? []

  const data = dashboardRes.data
  const missions = missionsRes.data ?? []
  const achievements = achievementsRes.data ?? []
  const reviews = reviewsRes.data ?? []
  const announcements = (annRes.data ?? []).filter(a => a.target_role === 'all' || a.target_role === 'student')
  const feed = feedRes.data ?? []

  const level = data?.level ?? 1
  const xp = data?.xp ?? 0
  const xpIntoLevel = xp % 100
  const totalNodes = data?.totalNodes ?? 0
  const completedNodes = data?.completedNodes ?? 0
  const progressPercent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  const earnedAchievements = achievements.filter(a => a.earned)
  const lockedAchievements = achievements.filter(a => !a.earned)

  const styleInfo = profile.learning_style ? STYLE_INFO[profile.learning_style] : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            안녕하세요, {profile.name} 학생 👋
          </h1>
          <p className="mt-1 flex items-center gap-2 text-gray-500">
            오늘도 학습을 이어가보세요
            {styleInfo && (
              <Badge variant="outline" className="ml-1 bg-[#4F6BF6]/5 text-xs">
                {styleInfo.emoji} 내 학습 스타일: {styleInfo.label}
              </Badge>
            )}
          </p>
        </div>
        <Link href="/student/onboarding">
          <Button size="sm" variant="ghost" className="text-xs text-gray-500 hover:text-[#4F6BF6]">
            <Sparkles className="mr-1 h-3 w-3" />
            재진단
          </Button>
        </Link>
      </div>

      <AnnouncementBanner announcements={announcements} />

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

      {/* Stats — 클릭하여 랭킹 보기 */}
      <ClickableStatCards
        completedNodes={completedNodes}
        totalNodes={totalNodes}
        progressPercent={progressPercent}
        streakDays={data?.streakDays ?? 0}
        xp={xp}
        level={level}
        primarySkillTreeId={primarySkillTreeId}
      />

      <WeeklyPlanCard />

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

      {/* 복습 추천 — 긴급도별 색상 표시 */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4 text-[#F59E0B]" />
              오늘의 복습 ({reviews.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reviews.slice(0, 5).map(r => {
                const urgencyConfig = {
                  overdue: {
                    bg: 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
                    badge: 'bg-red-500 text-white',
                    label: '기한 지남',
                  },
                  today: {
                    bg: 'border-yellow-300 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30',
                    badge: 'bg-yellow-500 text-white',
                    label: '오늘',
                  },
                  soon: {
                    bg: 'border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
                    badge: 'bg-green-500 text-white',
                    label: '여유',
                  },
                }[r.urgency]
                return (
                  <li
                    key={r.id}
                    className={`flex items-center justify-between rounded-lg border p-3 text-sm ${urgencyConfig.bg}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={urgencyConfig.badge}>{urgencyConfig.label}</Badge>
                      <span className="font-medium">{r.node_title}</span>
                    </div>
                    <Link href={`/student/quiz/${r.node_id}`}>
                      <Button size="sm" variant="outline">
                        복습하기
                      </Button>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Phase 9: 크로스커리큘럼 지식 맵 */}
      <ConceptMapCard studentId={profile.id} />

      {/* Phase 10: 수료 인증서 + 학부모 초대 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MyCertificatesCard certificates={certificates} studentName={profile.name} />
        <ParentInviteCard />
      </div>

      {/* 내 업적 — 대시보드 요약 카드 (최근 획득 3개 + 전체 링크) */}
      <Link href="/student/achievements" className="block">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-[#7C5CFC]" />
              내 업적 ({earnedAchievements.length}/{achievements.length})
            </CardTitle>
            <span className="text-xs text-[#7C5CFC]">전체 보기 →</span>
          </CardHeader>
          <CardContent>
            {earnedAchievements.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                첫 업적을 달성해보세요! 노드 1개를 언락하면 🌱 첫 걸음 업적을 얻어요.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {/* 최근 획득 업적 3개 하이라이트 + 나머지 자리 locked */}
                {earnedAchievements
                  .slice()
                  .sort((a, b) => {
                    const ta = a.earned_at ? new Date(a.earned_at).getTime() : 0
                    const tb = b.earned_at ? new Date(b.earned_at).getTime() : 0
                    return tb - ta
                  })
                  .slice(0, 3)
                  .map(a => (
                    <div
                      key={a.id}
                      className="flex flex-col items-center gap-1 rounded-lg border-2 border-[#7C5CFC]/40 bg-gradient-to-br from-[#7C5CFC]/10 to-[#6366F1]/5 p-3 text-center shadow-sm"
                      title={a.description}
                    >
                      <span className="text-2xl">{a.icon}</span>
                      <span className="line-clamp-1 text-xs font-medium">{a.title}</span>
                    </div>
                  ))}
                {/* 다음 도전 locked 슬롯 3개 */}
                {lockedAchievements
                  .filter(a => !a.is_hidden)
                  .slice(0, 6 - Math.min(earnedAchievements.length, 3))
                  .map(a => (
                    <div
                      key={a.id}
                      className="flex flex-col items-center gap-1 rounded-lg border bg-gray-50 p-3 text-center opacity-50 dark:border-gray-800 dark:bg-gray-900"
                      title={a.description}
                    >
                      <span className="text-2xl grayscale">{a.icon}</span>
                      <span className="line-clamp-1 text-xs font-medium text-gray-500">???</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      <ActivityFeed initialFeed={feed} />

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
