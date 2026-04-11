import { getTutorHistory } from '@/actions/tutor'
import { ChatInterface } from '@/components/tutor/ChatInterface'

interface Props {
  searchParams: Promise<{ nodeId?: string }>
}

/**
 * 독학러 AI 튜터 페이지 — 학생 튜터와 동일 구조.
 * 노드 ID를 URL 파라미터로 전달하면 해당 노드 컨텍스트로 대화.
 */
export default async function LearnerTutorPage({ searchParams }: Props) {
  const params = await searchParams
  const { data: messages } = await getTutorHistory()

  return <ChatInterface initialMessages={messages ?? []} nodeId={params.nodeId} />
}
