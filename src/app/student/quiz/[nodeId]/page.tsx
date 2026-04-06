import { createServerClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { QuizSession } from './QuizSession'

interface Props {
  params: Promise<{ nodeId: string }>
}

export default async function QuizPage({ params }: Props) {
  const { nodeId } = await params
  const profile = await getCurrentProfile()
  const supabase = await createServerClient()

  // Get node info
  const { data: node } = await supabase
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
