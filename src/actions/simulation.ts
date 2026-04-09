'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import { simulationSchema, type SimulationOutput } from '@/lib/ai/schemas'
import { SIMULATION_PROMPT } from '@/lib/ai/prompts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

/**
 * 스킬트리를 100명의 가상 학생이 학습한다고 가정하고 시뮬레이션.
 * 교사 권한 필요.
 */
export async function simulateSkillTree(
  skillTreeId: string
): Promise<{ data?: SimulationOutput; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(skillTreeId)) return { error: '유효하지 않은 스킬트리 ID입니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()

    // 1. 권한 체크: 교사 소유자 또는 클래스 담당 교사
    const { data: tree } = await admin
      .from('skill_trees')
      .select('id, title, description, subject_hint, created_by, class_id')
      .eq('id', skillTreeId)
      .maybeSingle()
    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    let allowed = tree.created_by === user.id
    if (!allowed && tree.class_id) {
      const { data: cls } = await admin
        .from('classes')
        .select('teacher_id')
        .eq('id', tree.class_id)
        .maybeSingle()
      if (cls?.teacher_id === user.id) allowed = true
    }
    // admin도 허용
    if (!allowed) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role === 'admin') allowed = true
    }
    if (!allowed) return { error: '이 스킬트리를 시뮬레이션할 권한이 없습니다.' }

    // 2. 노드 + 엣지 + 퀴즈 데이터 조회
    const [nodesRes, edgesRes] = await Promise.all([
      admin
        .from('nodes')
        .select('id, title, description, difficulty, order_index')
        .eq('skill_tree_id', skillTreeId)
        .order('order_index'),
      admin
        .from('node_edges')
        .select('source_node_id, target_node_id')
        .eq('skill_tree_id', skillTreeId),
    ])

    const nodes = nodesRes.data ?? []
    const edges = edgesRes.data ?? []

    if (nodes.length === 0) return { error: '시뮬레이션할 노드가 없습니다.' }

    // 노드별 퀴즈 수
    const nodeIds = nodes.map(n => n.id)
    const { data: quizzes } = await admin
      .from('quizzes')
      .select('node_id, difficulty, question_type')
      .in('node_id', nodeIds)

    const quizCountByNode = new Map<string, number>()
    quizzes?.forEach(q => {
      quizCountByNode.set(q.node_id, (quizCountByNode.get(q.node_id) ?? 0) + 1)
    })

    // 노드 ID → 제목 매핑 (엣지 표시용)
    const nodeTitleMap = new Map(nodes.map(n => [n.id, n.title]))

    const nodesText = nodes.map((n, i) => {
      const quizCount = quizCountByNode.get(n.id) ?? 0
      return `${i + 1}. [난이도 ${n.difficulty}] ${n.title} — ${n.description ?? ''} (퀴즈 ${quizCount}개)`
    }).join('\n')

    const edgesText = edges
      .map(e => {
        const from = nodeTitleMap.get(e.source_node_id) ?? '?'
        const to = nodeTitleMap.get(e.target_node_id) ?? '?'
        return `${from} → ${to}`
      })
      .join('\n')

    const treeData = `
스킬트리: ${tree.title}
주제: ${tree.subject_hint ?? '일반'}
설명: ${tree.description ?? ''}

노드 (${nodes.length}개):
${nodesText}

선수지식 관계 (${edges.length}개):
${edgesText || '(없음)'}
`

    if (treeData.length > 30_000) {
      return { error: '스킬트리가 너무 커서 시뮬레이션할 수 없습니다 (최대 30,000자).' }
    }

    // 3. AI 시뮬레이션
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: simulationSchema,
      prompt: SIMULATION_PROMPT(treeData),
    })

    return { data: object }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[simulateSkillTree]', msg)
    return { error: '시뮬레이션 실패: ' + msg }
  }
}
