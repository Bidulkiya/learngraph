import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getMyGroups } from '@/actions/study-group'
import { getMyClasses } from '@/actions/school'
import { StudyGroupsView } from './StudyGroupsView'

export default async function StudyGroupsPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const [groupsRes, classesRes] = await Promise.all([
    getMyGroups(),
    getMyClasses(),
  ])

  return (
    <StudyGroupsView
      initialGroups={groupsRes.data ?? []}
      classes={(classesRes.data ?? []).map(c => ({ id: c.id, name: c.name }))}
      currentUserId={profile.id}
    />
  )
}
