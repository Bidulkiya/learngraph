import { getTutorHistory } from '@/actions/tutor'
import { ChatInterface } from '@/components/tutor/ChatInterface'

interface Props {
  searchParams: Promise<{ nodeId?: string }>
}

export default async function StudentTutorPage({ searchParams }: Props) {
  const params = await searchParams
  const { data: messages } = await getTutorHistory()

  return <ChatInterface initialMessages={messages ?? []} nodeId={params.nodeId} />
}
