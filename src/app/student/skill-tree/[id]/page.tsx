import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { StudentSkillTreeView } from './StudentSkillTreeView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function StudentSkillTreeExplorePage({ params }: Props) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) return null
  const admin = createAdminClient()

  const { data: tree } = await admin
    .from('skill_trees')
    .select('*')
    .eq('id', id)
    .single()

  if (!tree) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">스킬트리를 찾을 수 없습니다</p>
      </div>
    )
  }

  // 권한 체크: 학생은 자기가 승인받은 클래스의 스킬트리만 접근 가능
  if (tree.class_id) {
    const { data: enrollment } = await admin
      .from('class_enrollments')
      .select('status')
      .eq('class_id', tree.class_id)
      .eq('student_id', profile.id)
      .maybeSingle()

    if (!enrollment || enrollment.status !== 'approved') {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="text-red-500">이 스킬트리에 접근할 권한이 없습니다</p>
          <p className="text-sm text-gray-500">
            해당 클래스에 수강신청 후 승인을 받아야 접근할 수 있습니다
          </p>
        </div>
      )
    }
  }

  const { data: nodes } = await admin
    .from('nodes')
    .select('*')
    .eq('skill_tree_id', id)
    .order('order_index')

  const { data: edges } = await admin
    .from('node_edges')
    .select('*')
    .eq('skill_tree_id', id)

  // Fetch student progress
  const { data: progress } = await admin
    .from('student_progress')
    .select('*')
    .eq('skill_tree_id', id)
    .eq('student_id', profile?.id ?? '')

  // Map progress to node status
  const progressMap = new Map<string, string>()
  progress?.forEach(p => progressMap.set(p.node_id, p.status))

  const d3Nodes = (nodes ?? []).map(n => {
    // If no progress entry, root nodes (no incoming edges) are available, others locked
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
