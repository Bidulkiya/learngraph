import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getTeacherDashboardData } from '@/actions/dashboard'
import { getMySchoolMemberships } from '@/actions/school'
import { getAnnouncements } from '@/actions/announcements'
import { getTeacherContextHierarchy } from '@/actions/dashboard-filters'
import { TeacherDashboardView } from './TeacherDashboardView'

export default async function TeacherDashboard() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  // 모든 최상위 쿼리를 단일 Promise.all로 병렬화
  const [{ data }, annRes, schoolsRes, contextRes] = await Promise.all([
    getTeacherDashboardData(profile.id),
    getAnnouncements(undefined, { unreadOnly: true }),
    getMySchoolMemberships(),
    getTeacherContextHierarchy(),
  ])

  const announcements = (annRes.data ?? []).filter(
    a => a.target_role === 'all' || a.target_role === 'teacher',
  )
  const mySchools = (schoolsRes.data ?? []).filter(
    s => s.role === 'teacher' && s.status === 'approved',
  )
  const context = contextRes.data ?? { classes: [], skillTrees: [] }

  return (
    <TeacherDashboardView
      profileName={profile.name}
      dashboardData={data ?? null}
      contextClasses={context.classes}
      contextSkillTrees={context.skillTrees}
      mySchools={mySchools}
      announcements={announcements}
    />
  )
}
