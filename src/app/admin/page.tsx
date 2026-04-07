import { BarChart3 } from 'lucide-react'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getAdminDashboardData } from '@/actions/dashboard'
import { ProgressCard } from '@/components/dashboard/ProgressCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const { data } = await getAdminDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile.name} 관리자님 👋
        </h1>
        <p className="mt-1 text-gray-500">플랫폼 전체 현황을 모니터링하세요</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressCard
          label="교사 수"
          value={data?.totalTeachers ?? 0}
          icon="GraduationCap"
          iconColor="#10B981"
          subtitle="등록 교사"
        />
        <ProgressCard
          label="학생 수"
          value={data?.totalStudents ?? 0}
          icon="Users"
          iconColor="#4F6BF6"
          subtitle="등록 학생"
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
    </div>
  )
}
