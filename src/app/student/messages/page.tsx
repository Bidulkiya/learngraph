import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { MessengerView } from '@/components/shared/MessengerView'

export default async function StudentMessagesPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null
  return <MessengerView currentUserId={profile.id} />
}
