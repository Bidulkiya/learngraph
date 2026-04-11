import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getProfile } from '@/actions/profile'
import { isDemoAccount } from '@/lib/demo'
import { StudentProfileForm } from '@/app/student/profile/StudentProfileForm'

export default async function LearnerProfilePage() {
  const current = await getCurrentProfile()
  if (!current) redirect('/login')
  if (current.role !== 'learner') redirect(`/${current.role}`)

  const res = await getProfile()
  if (!res.data) redirect('/learner')

  return (
    <StudentProfileForm
      initial={res.data}
      isDemo={isDemoAccount(current.email)}
    />
  )
}
