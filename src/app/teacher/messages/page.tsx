import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { MessengerView } from '@/components/shared/MessengerView'

export default async function TeacherMessagesPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null
  return <MessengerView currentUserId={profile.id} />
}
