import { TeacherDashboardSkeleton } from '@/components/layout/DashboardSkeleton'

/**
 * /teacher 대시보드 로딩 스켈레톤.
 * Next.js가 서버 데이터 fetch 중에 즉시 표시한다.
 */
export default function TeacherDashboardLoading(): React.ReactElement {
  return <TeacherDashboardSkeleton />
}
