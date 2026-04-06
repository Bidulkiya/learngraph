import { Shield, Users, TreePine, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentProfile } from "@/components/layout/RoleGuard"

export default async function AdminDashboard() {
  const profile = await getCurrentProfile()

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile?.name} 관리자님 👋
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          플랫폼 전체를 모니터링하고 마스터 템플릿을 관리하세요
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">전체 사용자</CardTitle>
            <Users className="h-4 w-4 text-[#F59E0B]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-500">등록된 사용자</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">스킬트리 수</CardTitle>
            <TreePine className="h-4 w-4 text-[#10B981]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-500">생성된 스킬트리</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">마스터 템플릿</CardTitle>
            <Shield className="h-4 w-4 text-[#7C5CFC]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-500">공유 가능한 템플릿</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">평균 언락률</CardTitle>
            <BarChart3 className="h-4 w-4 text-[#4F6BF6]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0%</p>
            <p className="text-xs text-gray-500">전체 학생 평균</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
