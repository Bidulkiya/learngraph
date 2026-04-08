import { BarChart3 } from 'lucide-react'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getAdminDashboardData } from '@/actions/dashboard'
import { getMySchools } from '@/actions/school'
import { getTeacherActivity } from '@/actions/analysis'
import { getAnnouncements } from '@/actions/announcements'
import { ProgressCard } from '@/components/dashboard/ProgressCard'
import { ClickableStatCard } from '@/components/dashboard/ClickableStatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BottleneckCard } from '@/components/dashboard/BottleneckCard'
import { TeacherActivityCard } from '@/components/dashboard/TeacherActivityCard'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'

export default async function AdminDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const [{ data }, schoolsRes, annRes] = await Promise.all([
    getAdminDashboardData(),
    getMySchools(),
    getAnnouncements(undefined, { unreadOnly: true }),
  ])
  const schools = (schoolsRes.data ?? []).map(s => ({ id: s.id, name: s.name }))
  const announcements = annRes.data ?? []

  // 첫 번째 스쿨의 교사 활동 가져오기
  const firstSchoolId = schools[0]?.id
  const teacherActivityRes = firstSchoolId
    ? await getTeacherActivity(firstSchoolId)
    : { data: [] }
  const activities = teacherActivityRes.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile.name} 관리자님 👋
        </h1>
        <p className="mt-1 text-gray-500">플랫폼 전체 현황을 모니터링하세요</p>
      </div>

      <AnnouncementBanner announcements={announcements} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ClickableStatCard
          label="등록된 선생"
          value={data?.totalTeachers ?? 0}
          iconType="teacher"
          iconColor="#10B981"
          subtitle="클릭하여 명단 확인"
          members={data?.teacherList ?? []}
        />
        <ClickableStatCard
          label="등록된 학생"
          value={data?.totalStudents ?? 0}
          iconType="student"
          iconColor="#4F6BF6"
          subtitle="클릭하여 명단 확인"
          members={data?.studentList ?? []}
        />
        <ProgressCard
          label="스킬트리 수"
          value={data?.totalSkillTrees ?? 0}
          icon="TreePine"
          iconColor="#7C5CFC"
          subtitle="생성된 스킬트리"
        />
        <ProgressCard
          label="퀴즈 시도"
          value={data?.totalQuizAttempts ?? 0}
          icon="ClipboardCheck"
          iconColor="#F59E0B"
          subtitle="전체 시도 수"
        />
      </div>

      {/* Overall unlock rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-[#4F6BF6]" />
            전체 평균 언락률
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] transition-all"
                  style={{ width: `${data?.avgUnlockRate ?? 0}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-[#4F6BF6]">{data?.avgUnlockRate ?? 0}%</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">모든 학생의 평균 노드 언락률</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <BottleneckCard schools={schools} />
        <TeacherActivityCard activities={activities} />
      </div>
    </div>
  )
}
