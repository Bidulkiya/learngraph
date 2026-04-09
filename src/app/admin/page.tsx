import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getAnnouncements } from '@/actions/announcements'
import {
  getAdminContextHierarchy,
  getAdminFilteredDashboard,
} from '@/actions/dashboard-filters'
import { AdminDashboardView } from './AdminDashboardView'

export default async function AdminDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  // 병렬로 컨텍스트 + 초기 대시보드 데이터 + 공지 조회
  const [contextRes, initialDataRes, annRes] = await Promise.all([
    getAdminContextHierarchy(),
    getAdminFilteredDashboard({}),
    getAnnouncements(undefined, { unreadOnly: true }),
  ])

  const context = contextRes.data ?? { classes: [], teachers: [], skillTrees: [] }
  const initialData = initialDataRes.data ?? {
    overview: {
      totalSchools: 0,
      totalClasses: 0,
      totalTeachers: 0,
      totalStudents: 0,
      totalSkillTrees: 0,
    },
    classProgress: [],
    riskBuckets: { low: 0, medium: 0, high: 0, critical: 0 },
    emotionBuckets: { confident: 0, neutral: 0, struggling: 0, frustrated: 0, unknown: 0 },
    teacherActivity: [],
  }
  const announcements = annRes.data ?? []

  return (
    <AdminDashboardView
      profileName={profile.name}
      contextClasses={context.classes}
      contextTeachers={context.teachers}
      contextSkillTrees={context.skillTrees}
      initialData={initialData}
      announcements={announcements}
    />
  )
}
