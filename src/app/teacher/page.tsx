import { GraduationCap } from "lucide-react"

export default function TeacherDashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10B981]/10">
        <GraduationCap className="h-8 w-8 text-[#10B981]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">교사 대시보드</h1>
      <p className="text-gray-500 dark:text-gray-400">스킬트리를 생성하고 학생들의 학습을 관리하세요</p>
    </div>
  )
}
