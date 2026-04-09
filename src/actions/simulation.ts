'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import {
  simulationSchema,
  skillTreeSchema,
  type SimulationOutput,
} from '@/lib/ai/schemas'
import {
  SIMULATION_PROMPT,
  IMPROVE_SKILL_TREE_PROMPT,
} from '@/lib/ai/prompts'
import { embedAndStoreDocument } from '@/lib/ai/embeddings'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

/**
 * 스킬트리 소유자(또는 클래스 담당 교사, admin)인지 확인.
 */
async function assertTreeAuth(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  skillTreeId: string,
): Promise<{
  ok: boolean
  error?: string
  tree?: {
    id: string
    title: string
    description: string | null
    subject_hint: string | null
    created_by: string
    class_id: string | null
  }
}> {
  const { data: tree } = await admin
    .from('skill_trees')
    .select('id, title, description, subject_hint, created_by, class_id')
    .eq('id', skillTreeId)
    .maybeSingle()
  if (!tree) return { ok: false, error: '스킬트리를 찾을 수 없습니다.' }

  let allowed = tree.created_by === userId
  if (!allowed && tree.class_id) {
    const { data: cls } = await admin
      .from('classes')
      .select('teacher_id')
      .eq('id', tree.class_id)
      .maybeSingle()
    if (cls?.teacher_id === userId) allowed = true
  }
  if (!allowed) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (profile?.role === 'admin') allowed = true
  }
  if (!allowed) return { ok: false, error: '이 스킬트리를 수정할 권한이 없습니다.' }
  return { ok: true, tree }
}

/**
 * 스킬트리 데이터 → 시뮬레이션 프롬프트용 상세 문자열 생성.
 *
 * v2 차이점:
 * - 퀴즈 문제 내용 3개까지 각 노드에 첨부
 * - 학습 문서 유무 표시
 * - 선수 노드와의 난이도 갭 계산
 */
async function buildRichTreeData(
  admin: ReturnType<typeof createAdminClient>,
  tree: { id: string; title: string; description: string | null; subject_hint: string | null },
): Promise<{ data?: string; error?: string }> {
  const [nodesRes, edgesRes] = await Promise.all([
    admin
      .from('nodes')
      .select('id, title, description, difficulty, order_index, learning_content')
      .eq('skill_tree_id', tree.id)
      .order('order_index'),
    admin
      .from('node_edges')
      .select('source_node_id, target_node_id')
      .eq('skill_tree_id', tree.id),
  ])

  const nodes = nodesRes.data ?? []
  const edges = edgesRes.data ?? []

  if (nodes.length === 0) {
    return { error: '시뮬레이션할 노드가 없습니다.' }
  }

  // 퀴즈 조회 — 노드별 3문제까지
  const nodeIds = nodes.map(n => n.id)
  const { data: quizzes } = await admin
    .from('quizzes')
    .select('node_id, question, question_type, difficulty, correct_answer')
    .in('node_id', nodeIds)
    .limit(500)

  const quizzesByNode = new Map<string, Array<{
    question: string
    question_type: string
    difficulty: number
  }>>()
  quizzes?.forEach(q => {
    const list = quizzesByNode.get(q.node_id) ?? []
    if (list.length < 3) {
      list.push({
        question: q.question ?? '',
        question_type: q.question_type ?? 'multiple_choice',
        difficulty: q.difficulty ?? 3,
      })
    }
    quizzesByNode.set(q.node_id, list)
  })

  // 노드 ID → 노드 맵 (난이도 갭 계산용)
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  // 각 노드의 선수 노드 목록 (난이도 갭용)
  const prereqByNode = new Map<string, string[]>()
  edges.forEach(e => {
    const list = prereqByNode.get(e.target_node_id) ?? []
    list.push(e.source_node_id)
    prereqByNode.set(e.target_node_id, list)
  })

  const nodesText = nodes.map((n, i) => {
    const nodeQuizzes = quizzesByNode.get(n.id) ?? []
    const hasDoc = (n.learning_content?.length ?? 0) > 100
    const docLen = n.learning_content?.length ?? 0

    // 선수 노드와의 난이도 갭
    const prereqIds = prereqByNode.get(n.id) ?? []
    let gapLabel = ''
    if (prereqIds.length > 0) {
      const prereqDiffs = prereqIds
        .map(pid => nodeById.get(pid)?.difficulty ?? 0)
        .filter(d => d > 0)
      if (prereqDiffs.length > 0) {
        const avgPrereq = prereqDiffs.reduce((a, b) => a + b, 0) / prereqDiffs.length
        const gap = n.difficulty - avgPrereq
        const prereqTitles = prereqIds
          .map(pid => nodeById.get(pid)?.title)
          .filter((t): t is string => !!t)
          .join(', ')
        gapLabel = `\n   - 선수 노드: ${prereqTitles} (평균 Lv.${avgPrereq.toFixed(1)} → 현재 Lv.${n.difficulty}, 갭 ${gap >= 0 ? '+' : ''}${gap.toFixed(1)})`
      }
    } else {
      gapLabel = '\n   - 선수 노드 없음 (시작 노드)'
    }

    // 퀴즈 문제 요약
    const quizSummary = nodeQuizzes.length === 0
      ? '\n   - 퀴즈: ❌ 없음 (이해도 검증 불가)'
      : '\n   - 퀴즈 ' + nodeQuizzes.length + '개: ' + nodeQuizzes
          .map(q => `"${q.question.slice(0, 80)}${q.question.length > 80 ? '…' : ''}" (${q.question_type === 'multiple_choice' ? '객관식' : '주관식'}, Lv.${q.difficulty})`)
          .join(' / ')

    const docLabel = hasDoc
      ? `\n   - 학습 문서: ✓ 있음 (${docLen}자)`
      : '\n   - 학습 문서: ❌ 없음 (자학습 불가)'

    return `${i + 1}. [Lv.${n.difficulty}] ${n.title}
   - 설명: ${n.description ?? '(설명 없음)'}${gapLabel}${docLabel}${quizSummary}`
  }).join('\n\n')

  const nodeTitleMap = new Map(nodes.map(n => [n.id, n.title]))
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

노드 (${nodes.length}개, 퀴즈 및 학습 문서 정보 포함):
${nodesText}

선수지식 관계 (${edges.length}개):
${edgesText || '(없음)'}
`

  if (treeData.length > 60_000) {
    return { error: '스킬트리가 너무 커서 시뮬레이션할 수 없습니다 (최대 60,000자).' }
  }

  return { data: treeData }
}

/**
 * 스킬트리를 100명의 가상 학생이 학습한다고 가정하고 시뮬레이션.
 * 교사 권한 필요.
 */
export async function simulateSkillTree(
  skillTreeId: string
): Promise<{ data?: SimulationOutput; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(skillTreeId)) return { error: '유효하지 않은 스킬트리 ID입니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertTreeAuth(admin, user.id, skillTreeId)
    if (!auth.ok || !auth.tree) return { error: auth.error }

    const dataRes = await buildRichTreeData(admin, auth.tree)
    if (dataRes.error || !dataRes.data) return { error: dataRes.error }

    // AI 시뮬레이션
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: simulationSchema,
      prompt: SIMULATION_PROMPT(dataRes.data),
    })

    return { data: object }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[simulateSkillTree]', msg)
    return { error: '시뮬레이션 실패: ' + msg }
  }
}

/**
 * 시뮬레이션 결과를 바탕으로 AI가 스킬트리를 개선 재생성.
 * 기존 skill_trees ID는 유지하고 nodes/edges만 교체.
 *
 * 중요: 학생 진도(student_progress)도 새 노드 기준으로 재초기화.
 */
export async function improveSkillTreeFromSimulation(
  skillTreeId: string,
  simulationResult: SimulationOutput,
): Promise<{
  data?: {
    newNodeCount: number
    newEdgeCount: number
    simulation: SimulationOutput
  }
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(skillTreeId)) return { error: '유효하지 않은 스킬트리 ID입니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertTreeAuth(admin, user.id, skillTreeId)
    if (!auth.ok || !auth.tree) return { error: auth.error }

    // 1. 기존 tree 데이터 + 시뮬레이션 결과를 프롬프트에 전달
    const dataRes = await buildRichTreeData(admin, auth.tree)
    if (dataRes.error || !dataRes.data) return { error: dataRes.error }

    const simResultText = `
전체 예상 통과율: ${simulationResult.overall_pass_rate}%
난이도 곡선 평가: ${simulationResult.difficulty_curve}
종합 평가: ${simulationResult.overall_feedback}

병목 노드 (${simulationResult.bottleneck_nodes.length}개):
${simulationResult.bottleneck_nodes
  .map((b, i) => `${i + 1}. [${b.gap_type}] ${b.node_title} (예상 통과율 ${b.predicted_pass_rate}%)
   원인: ${b.cause}
   제안: ${b.suggestion}`)
  .join('\n')}
`

    // 2. AI 개선 호출
    const { object: improved } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: skillTreeSchema,
      prompt: IMPROVE_SKILL_TREE_PROMPT(dataRes.data, simResultText),
    })

    if (!improved.nodes || improved.nodes.length === 0) {
      return { error: 'AI가 개선된 노드를 생성하지 못했습니다.' }
    }

    // 3. 기존 노드/엣지/진도 삭제 (트리 ID는 유지)
    // 순서: progress → edges → nodes (FK 의존성)
    await admin
      .from('student_progress')
      .delete()
      .eq('skill_tree_id', skillTreeId)

    await admin
      .from('node_edges')
      .delete()
      .eq('skill_tree_id', skillTreeId)

    // 기존 노드 ID 조회 후 관련 서브 데이터(퀴즈, 학습문서는 cascade로 사라짐)
    const { data: oldNodes } = await admin
      .from('nodes')
      .select('id')
      .eq('skill_tree_id', skillTreeId)
    const oldNodeIds = (oldNodes ?? []).map(n => n.id)

    if (oldNodeIds.length > 0) {
      // 퀴즈 삭제
      await admin.from('quizzes').delete().in('node_id', oldNodeIds)
      // 노드 삭제
      await admin.from('nodes').delete().in('id', oldNodeIds)
    }

    // 4. 새 노드 insert
    const nodeInserts = improved.nodes.map((n, idx) => ({
      skill_tree_id: skillTreeId,
      title: n.title,
      description: n.description,
      difficulty: n.difficulty,
      order_index: idx,
    }))
    const { data: insertedNodes, error: nodesErr } = await admin
      .from('nodes')
      .insert(nodeInserts)
      .select('id, title, order_index')
    if (nodesErr || !insertedNodes) {
      return { error: '노드 저장 실패: ' + (nodesErr?.message ?? '') }
    }

    // 임시 id → DB uuid 매핑
    const tempToDb = new Map<string, string>()
    improved.nodes.forEach((n, idx) => {
      tempToDb.set(n.id, insertedNodes[idx].id)
    })

    // 5. 새 엣지 insert
    const edgeInserts = (improved.edges ?? [])
      .filter(e => tempToDb.has(e.source) && tempToDb.has(e.target))
      .map(e => ({
        skill_tree_id: skillTreeId,
        source_node_id: tempToDb.get(e.source)!,
        target_node_id: tempToDb.get(e.target)!,
        label: e.label ?? null,
      }))
    if (edgeInserts.length > 0) {
      await admin.from('node_edges').insert(edgeInserts)
    }

    // 6. 트리 제목/설명 업데이트 (AI가 개선한 제목 반영, 교사 의도 존중하려 원본 제목 유지가 기본)
    await admin
      .from('skill_trees')
      .update({
        description: improved.description ?? auth.tree.description,
      })
      .eq('id', skillTreeId)

    // 7. 클래스에 배정된 경우 학생 진도 재초기화
    if (auth.tree.class_id) {
      const { data: enrolls } = await admin
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', auth.tree.class_id)
        .eq('status', 'approved')
      const targetIds = new Set(edgeInserts.map(e => e.target_node_id))
      if (enrolls && enrolls.length > 0) {
        const progressRows = enrolls.flatMap(s =>
          insertedNodes.map(n => ({
            student_id: s.student_id,
            node_id: n.id,
            skill_tree_id: skillTreeId,
            status: targetIds.has(n.id) ? 'locked' : 'available',
          }))
        )
        await admin.from('student_progress').upsert(progressRows, {
          onConflict: 'student_id,node_id',
        })
      }
    }

    // 8. 학습 문서 AI 생성 (best-effort, 병렬)
    try {
      const { generateLearningDocForNode } = await import('./learning-doc')
      const subjectHint = auth.tree.subject_hint ?? 'default'
      const batchSize = 5
      for (let i = 0; i < insertedNodes.length; i += batchSize) {
        const batch = insertedNodes.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (node) => {
            const improvedNode = improved.nodes.find(n => tempToDb.get(n.id) === node.id)
            if (!improvedNode) return
            const res = await generateLearningDocForNode(
              improvedNode.title,
              improvedNode.description,
              auth.tree!.title,
              subjectHint,
              null,
            )
            if (res.data) {
              await admin
                .from('nodes')
                .update({ learning_content: res.data })
                .eq('id', node.id)
            }
          })
        )
      }
    } catch (e) {
      console.error('[improveSkillTree] 학습 문서 생성 실패:', e)
    }

    // 9. 초기 퀴즈 생성 (첫 5개 노드)
    try {
      const { generateQuizForNode } = await import('./quiz')
      for (const node of insertedNodes.slice(0, 5)) {
        await generateQuizForNode(node.id)
      }
    } catch (e) {
      console.error('[improveSkillTree] 퀴즈 생성 실패:', e)
    }

    // 10. 벡터화 재시도 (best-effort)
    try {
      const combined = improved.nodes
        .map(n => `${n.title}\n${n.description}`)
        .join('\n\n')
      await embedAndStoreDocument(combined, skillTreeId)
    } catch (e) {
      console.error('[improveSkillTree] 벡터화 실패:', e)
    }

    // 11. 개선 후 재시뮬레이션 (비교용)
    const postDataRes = await buildRichTreeData(admin, auth.tree)
    if (postDataRes.error || !postDataRes.data) {
      return {
        data: {
          newNodeCount: insertedNodes.length,
          newEdgeCount: edgeInserts.length,
          simulation: simulationResult, // 재시뮬 실패 시 원본 반환
        },
      }
    }

    const { object: newSim } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: simulationSchema,
      prompt: SIMULATION_PROMPT(postDataRes.data),
    })

    return {
      data: {
        newNodeCount: insertedNodes.length,
        newEdgeCount: edgeInserts.length,
        simulation: newSim,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[improveSkillTreeFromSimulation]', msg)
    return { error: '개선 실패: ' + msg }
  }
}
