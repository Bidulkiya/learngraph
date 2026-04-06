import { Shield } from "lucide-react"

export default function AdminDashboard() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F59E0B]/10">
        <Shield className="h-8 w-8 text-[#F59E0B]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">운영자 대시보드</h1>
      <p className="text-gray-500 dark:text-gray-400">마스터 템플릿을 관리하고 전체 플랫폼을 분석하세요</p>
    </div>
  )
}
