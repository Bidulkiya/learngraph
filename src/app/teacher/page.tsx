import { ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getTeacherDashboardData } from '@/actions/dashboard'
import { getMyClasses } from '@/actions/school'
import { getAnnouncements } from '@/actions/announcements'
import { ProgressCard } from '@/components/dashboard/ProgressCard'
import { HeatmapChart } from '@/components/dashboard/HeatmapChart'
import { RiskAlert } from '@/components/dashboard/RiskAlert'
import { StudentGroupsCard } from '@/components/dashboard/StudentGroupsCard'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'

export default async function TeacherDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const [{ data }, classesRes, annRes] = await Promise.all([
    getTeacherDashboardData(profile.id),
    getMyClasses(),
    getAnnouncements(),
  ])
  const myClasses = (classesRes.data ?? []).map(c => ({ id: c.id, name: c.name }))
  const announcements = (annRes.data ?? []).filter(a => a.target_role === 'all' || a.target_role === 'teacher')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile.name} 선생님 👋
        </h1>
        <p className="mt-1 text-gray-500">스킬트리와 학생 학습 현황을 확인하세요</p>
      </div>

      <AnnouncementBanner announcements={announcements} />

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
