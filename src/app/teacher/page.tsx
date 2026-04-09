import Link from 'next/link'
import { ClipboardCheck, School as SchoolIcon, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getTeacherDashboardData } from '@/actions/dashboard'
import { getMyClasses, getMySchoolMemberships } from '@/actions/school'
import { getAnnouncements } from '@/actions/announcements'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProgressCard } from '@/components/dashboard/ProgressCard'
import { HeatmapChart } from '@/components/dashboard/HeatmapChart'
import { RiskAlert } from '@/components/dashboard/RiskAlert'
import { RiskAlertCard } from '@/components/dashboard/RiskAlertCard'
import { EmotionOverviewCard } from '@/components/dashboard/EmotionOverviewCard'
import { StudentGroupsCard } from '@/components/dashboard/StudentGroupsCard'
import { WeeklyBriefingCard } from '@/components/dashboard/WeeklyBriefingCard'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'

export default async function TeacherDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  // 모든 최상위 쿼리를 단일 Promise.all로 병렬화 — firstTree 조회도 함께
  const admin = createAdminClient()
  const [{ data }, classesRes, annRes, schoolsRes, firstTreeRes] = await Promise.all([
    getTeacherDashboardData(profile.id),
    getMyClasses(),
    getAnnouncements(undefined, { unreadOnly: true }),
    getMySchoolMemberships(),
    admin
      .from('skill_trees')
      .select('id')
      .eq('created_by', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const myClasses = (classesRes.data ?? []).map(c => ({ id: c.id, name: c.name }))
  const announcements = (annRes.data ?? []).filter(a => a.target_role === 'all' || a.target_role === 'teacher')
  const mySchools = (schoolsRes.data ?? []).filter(s => s.role === 'teacher' && s.status === 'approved')
  const defaultSkillTreeId = firstTreeRes.data?.id as string | undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile.name} 선생님 👋
        </h1>
        <p className="mt-1 text-gray-500">스킬트리와 학생 학습 현황을 확인하세요</p>
      </div>

      <AnnouncementBanner announcements={announcements} />

      {/* Phase 10: 주간 브리핑 */}
      <WeeklyBriefingCard classes={myClasses} />

      {/* 내 스쿨 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <SchoolIcon className="h-4 w-4 text-[#10B981]" />
            내 스쿨 ({mySchools.length})
          </CardTitle>
          <Link href="/teacher/join">
            <Button size="sm" variant="outline">
              <KeyRound className="mr-1 h-3.5 w-3.5" />
              스쿨 가입
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {mySchools.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-400">아직 소속된 스쿨이 없습니다</p>
              <p className="mt-1 text-xs text-gray-500">
                운영자에게 받은 교사 초대 코드로 가입해주세요
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {mySchools.map(s => (
                <li
                  key={s.school_id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm dark:border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <SchoolIcon className="h-4 w-4 text-[#10B981]" />
                    <span className="font-medium">{s.school_name}</span>
                  </div>
                  <Badge variant="secondary" className="bg-[#10B981]/10 text-[#10B981]">
                    가입됨
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressCard
          label="내 스킬트리"
          value={data?.skillTreeCount ?? 0}
          icon="TreePine"
          iconColor="#10B981"
          subtitle="생성한 스킬트리"
        />
        <ProgressCard
          label="수강 학생"
          value={data?.totalStudents ?? 0}
          icon="Users"
          iconColor="#4F6BF6"
          subtitle="고유 학생 수"
        />
        <ProgressCard
          label="평균 언락률"
          value={`${data?.avgUnlockRate ?? 0}%`}
          icon="Zap"
          iconColor="#7C5CFC"
          progress={data?.avgUnlockRate ?? 0}
        />
        <ProgressCard
          label="위험군 학생"
          value={data?.riskStudentCount ?? 0}
          icon="AlertTriangle"
          iconColor="#F59E0B"
          subtitle="주의 필요"
        />
      </div>

      {/* Phase 9: 감정 + 위험 경보 (특색 기능) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EmotionOverviewCard classes={myClasses} defaultSkillTreeId={defaultSkillTreeId} />
        <RiskAlertCard classes={myClasses} />
      </div>

      <StudentGroupsCard classes={myClasses} />

      {/* Chart + Risk */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HeatmapChart data={data?.nodeUnlockChart ?? []} />
        </div>
        <RiskAlert students={data?.riskStudents ?? []} />
      </div>

      {/* Recent attempts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-[#4F6BF6]" />
            최근 퀴즈 시도
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentAttempts.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">아직 시도 기록이 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {data?.recentAttempts.map((a, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border p-2 text-sm dark:border-gray-800">
                  <div>
                    <span className="font-medium">{a.student_name}</span>
                    <span className="ml-2 text-gray-500">— {a.node_title}</span>
                  </div>
                  <Badge variant={a.is_correct ? 'default' : 'destructive'} className={a.is_correct ? 'bg-[#10B981]' : ''}>
                    {a.score}점
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
