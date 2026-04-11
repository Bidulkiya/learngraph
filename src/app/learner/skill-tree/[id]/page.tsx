import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { StudentSkillTreeView } from '@/app/student/skill-tree/[id]/StudentSkillTreeView'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Learner 스킬트리 탐험 — 학생 뷰 재사용.
 * learner는 본인이 만든 스킬트리를 본인이 풀므로 권한 체크는 created_by 확인.
 */
export default async function LearnerSkillTreeExplorePage({ params }: Props) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) return null
  const admin = createAdminClient()

  const { data: tree } = await admin
    .from('skill_trees')
    .select('id, title, description, subject_hint, created_by')
    .eq('id', id)
    .single()

  if (!tree) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">스킬트리를 찾을 수 없습니다</p>
      </div>
    )
  }

  // 본인이 만든 스킬트리만 접근 가능
  if (tree.created_by !== profile.id) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">이 스킬트리에 접근할 권한이 없습니다</p>
      </div>
    )
  }

  const [{ data: nodes }, { data: edges }, { data: progress }] = await Promise.all([
    admin
      .from('nodes')
      .select('id, title, description, difficulty, order_index, position_x, position_y')
      .eq('skill_tree_id', id)
      .order('order_index'),
    admin
      .from('node_edges')
      .select('id, source_node_id, target_node_id, label')
      .eq('skill_tree_id', id),
    admin
      .from('student_progress')
      .select('node_id, status')
      .eq('skill_tree_id', id)
      .eq('student_id', profile.id),
  ])

  const progressMap = new Map<string, string>()
  progress?.forEach(p => progressMap.set(p.node_id, p.status))

  const d3Nodes = (nodes ?? []).map(n => {
    let status = progressMap.get(n.id) ?? 'locked'
    if (!progressMap.has(n.id)) {
      const hasIncoming = edges?.some(e => e.target_node_id === n.id)
      if (!hasIncoming) status = 'available'
    }
    return {
      id: n.id,
      title: n.title,
      description: n.description ?? '',
      difficulty: n.difficulty ?? 1,
      status: status as 'locked' | 'available' | 'in_progress' | 'completed',
      x: n.position_x ?? undefined,
      y: n.position_y ?? undefined,
    }
  })

  const d3Edges = (edges ?? []).map(e => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    label: e.label,
  }))

  return (
    <StudentSkillTreeView
      treeTitle={tree.title}
      treeDescription={tree.description ?? ''}
      theme={tree.subject_hint ?? 'default'}
      nodes={d3Nodes}
      edges={d3Edges}
    />
  )
}
