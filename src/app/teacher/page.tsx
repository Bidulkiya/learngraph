import { GraduationCap, TreePine, Users, ClipboardList } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentProfile } from "@/components/layout/RoleGuard"

export default async function TeacherDashboard() {
  const profile = await getCurrentProfile()

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile?.name} 선생님 👋
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          스킬트리를 생성하고 학생들의 학습을 관리하세요
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">내 스킬트리</CardTitle>
            <TreePine className="h-4 w-4 text-[#10B981]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-500">아직 생성된 스킬트리가 없습니다</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">수강 학생</CardTitle>
            <Users className="h-4 w-4 text-[#4F6BF6]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-500">수업에 참여한 학생이 없습니다</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">퀴즈 수</CardTitle>
            <ClipboardList className="h-4 w-4 text-[#7C5CFC]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-500">생성된 퀴즈가 없습니다</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
