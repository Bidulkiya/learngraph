'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { crossCurriculumSchema, type CrossCurriculumOutput } from '@/lib/ai/schemas'
import { CROSS_CURRICULUM_PROMPT } from '@/lib/ai/prompts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

/**
 * 학생이 배운 모든 노드를 분석해 과목을 넘나드는 개념 연결을 찾는다.
 * 본인 또는 담당 교사 / admin만 호출 가능.
 */
export async function findConceptConnections(
  studentId: string
): Promise<{ data?: CrossCurriculumOutput; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(studentId)) return { error: '유효하지 않은 학생 ID입니다.' }

    const admin = createAdminClient()

    // 권한: 본인 / admin / 담당 교사
    if (user.id !== studentId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      let allowed = profile?.role === 'admin'
      if (!allowed && profile?.role === 'teacher') {
        const { data: enrollments } = await admin
          .from('class_enrollments')
          .select('class_id, classes!inner(teacher_id)')
          .eq('student_id', studentId)
          .eq('status', 'approved')
        allowed = !!enrollments?.some(e => {
          const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes
          return cls?.teacher_id === user.id
        })
      }
      if (!allowed) return { error: '이 학생의 지식 맵에 접근할 권한이 없습니다.' }
    }

    // 1. 학생이 completed한 모든 노드 + 해당 스킬트리 정보
    const { data: progress } = await admin
      .from('student_progress')
      .select('node_id, skill_tree_id')
      .eq('student_id', studentId)
      .eq('status', 'completed')

    if (!progress || progress.length === 0) {
      return { error: '아직 완료한 학습 개념이 없습니다. 먼저 노드를 완료해주세요.' }
    }

    if (progress.length < 3) {
      return { error: '의미 있는 연결을 찾으려면 최소 3개 이상의 노드를 완료해야 합니다.' }
    }

    const nodeIds = progress.map(p => p.node_id)
    const treeIds = [...new Set(progress.map(p => p.skill_tree_id))]

    const [nodesRes, treesRes] = await Promise.all([
      admin.from('nodes').select('id, title, description, skill_tree_id').in('id', nodeIds),
      admin.from('skill_trees').select('id, title, subject_hint').in('id', treeIds),
    ])

    const treeInfoMap = new Map(
      (treesRes.data ?? []).map(t => [t.id, { title: t.title, hint: t.subject_hint ?? '일반' }])
    )

    // 과목 힌트를 한국어로
    const hintToKorean: Record<string, string> = {
      science: '과학',
      math: '수학',
      korean: '국어',
      default: '일반',
    }

    const learnedNodes = (nodesRes.data ?? []).map(n => {
      const tree = treeInfoMap.get(n.skill_tree_id ?? '')
      const subject = hintToKorean[tree?.hint ?? 'default'] ?? '일반'
      return `- [${subject}] ${n.title}: ${n.description ?? ''}`
    }).join('\n')

    if (learnedNodes.length > 20_000) {
      return { error: '학습 데이터가 너무 많습니다 (최대 20,000자).' }
    }

    // 2. AI 분석
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: crossCurriculumSchema,
      prompt: CROSS_CURRICULUM_PROMPT(learnedNodes),
    })

    return { data: object }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[findConceptConnections]', msg)
    return { error: '지식 연결 분석 실패: ' + msg }
  }
}
