import { BookOpen, TreePine, Trophy, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getCurrentProfile } from "@/components/layout/RoleGuard"

export default async function StudentDashboard() {
  const profile = await getCurrentProfile()

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profile?.name} 학생 👋
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          스킬트리를 탐험하고 퀴즈를 풀어 노드를 언락하세요
        </p>
      </div>

      {/* Level & XP */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#4F6BF6]/10">
            <span className="text-xl font-bold text-[#4F6BF6]">Lv.{profile?.level ?? 1}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">경험치</span>
              <span className="text-sm text-gray-500">{profile?.xp ?? 0} XP</span>
            </div>
            <Progress value={((profile?.xp ?? 0) % 100)} className="mt-2 h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">내 스킬트리</CardTitle>
            <TreePine className="h-4 w-4 text-[#4F6BF6]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-500">참여 중인 스킬트리가 없습니다</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">언락한 노드</CardTitle>
            <Zap className="h-4 w-4 text-[#F59E0B]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-gray-500">노드를 풀어 진도를 높이세요</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">학습 스트릭</CardTitle>
            <Trophy className="h-4 w-4 text-[#10B981]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile?.streak_days ?? 0}일</p>
            <p className="text-xs text-gray-500">연속 학습 일수</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
