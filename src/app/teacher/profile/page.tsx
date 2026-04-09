import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getProfile } from '@/actions/profile'
import { getMyClasses, getMySchoolMemberships } from '@/actions/school'
import { TeacherProfileForm } from './TeacherProfileForm'

export default async function TeacherProfilePage() {
  const current = await getCurrentProfile()
  if (!current) redirect('/login')
  if (current.role !== 'teacher') redirect(`/${current.role}`)

  const [profileRes, classesRes, schoolsRes] = await Promise.all([
    getProfile(),
    getMyClasses(),
    getMySchoolMemberships(),
  ])

  if (!profileRes.data) redirect('/teacher')

  const classes = (classesRes.data ?? []).map(c => ({ id: c.id, name: c.name }))
  const schools = (schoolsRes.data ?? [])
    .filter(s => s.role === 'teacher' && s.status === 'approved')
    .map(s => ({ id: s.school_id, name: s.school_name }))

  return (
    <TeacherProfileForm
      initial={profileRes.data}
      classes={classes}
      schools={schools}
    />
  )
}
