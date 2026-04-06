import { BookOpen } from "lucide-react"

export default function StudentDashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4F6BF6]/10">
        <BookOpen className="h-8 w-8 text-[#4F6BF6]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">학생 대시보드</h1>
      <p className="text-gray-500 dark:text-gray-400">스킬트리를 탐험하고 퀴즈를 풀어 노드를 언락하세요</p>
    </div>
  )
}
