import { getTutorHistory } from '@/actions/tutor'
import { ChatInterface } from '@/components/tutor/ChatInterface'

export default async function StudentTutorPage() {
  const { data: messages } = await getTutorHistory()

  return <ChatInterface initialMessages={messages ?? []} />
}
