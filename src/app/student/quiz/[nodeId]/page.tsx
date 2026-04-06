import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { QuizSession } from './QuizSession'

interface Props {
  params: Promise<{ nodeId: string }>
}

export default async function QuizPage({ params }: Props) {
  const { nodeId } = await params
  await getCurrentProfile()

  const admin = createAdminClient()
  const { data: node } = await admin
    .from('nodes')
    .select('*, skill_trees(title)')
    .eq('id', nodeId)
    .single()

  if (!node) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">노드를 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <QuizSession
      nodeId={nodeId}
      nodeTitle={node.title}
      nodeDescription={node.description ?? ''}
      nodeDifficulty={node.difficulty ?? 1}
      skillTreeId={node.skill_tree_id}
    />
  )
}
