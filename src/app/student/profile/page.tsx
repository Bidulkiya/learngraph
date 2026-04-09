import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getProfile } from '@/actions/profile'
import { StudentProfileForm } from './StudentProfileForm'

export default async function StudentProfilePage() {
  const current = await getCurrentProfile()
  if (!current) redirect('/login')
  if (current.role !== 'student') redirect(`/${current.role}`)

  const res = await getProfile()
  if (!res.data) redirect('/student')

  return <StudentProfileForm initial={res.data} />
}
