import { fetchSkillTreeDetail } from '@/actions/skill-tree'
import { TeacherSkillTreeView } from './TeacherSkillTreeView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TeacherSkillTreeDetailPage({ params }: Props) {
  const { id } = await params
  const result = await fetchSkillTreeDetail(id)

  if (result.error || !result.data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">스킬트리를 불러올 수 없습니다: {result.error}</p>
      </div>
    )
  }

  const { tree, nodes, edges } = result.data

  // Map DB data to D3 format
  const d3Nodes = nodes.map(n => ({
    id: n.id,
    title: n.title,
    description: n.description ?? '',
    difficulty: n.difficulty ?? 1,
    status: 'available' as const,
    x: n.position_x ?? undefined,
    y: n.position_y ?? undefined,
  }))

  const d3Edges = edges.map(e => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    label: e.label,
  }))

  return (
    <TeacherSkillTreeView
      treeId={tree.id}
      treeTitle={tree.title}
      treeDescription={tree.description ?? ''}
      initialNodes={d3Nodes}
      initialEdges={d3Edges}
    />
  )
}
