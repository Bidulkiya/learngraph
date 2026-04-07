'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { studentGroupsSchema, bottleneckSchema, type StudentGroupsOutput, type BottleneckOutput } from '@/lib/ai/schemas'
import { STUDENT_GROUPS_PROMPT, BOTTLENECK_PROMPT } from '@/lib/ai/prompts'

export async function analyzeStudentGroups(
  classId: string
): Promise<{ data?: StudentGroupsOutput; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 클래스 학생 목록
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'approved')

    const studentIds = enrollments?.map(e => e.student_id) ?? []
    if (studentIds.length === 0) return { error: '분석할 학생이 없습니다.' }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, xp, streak_days')
      .in('id', studentIds)

    // 진도 + 퀴즈 성적 집계
    const { data: progress } = await admin
      .from('student_progress')
      .select('student_id, status, quiz_score')
      .in('student_id', studentIds)

    const { data: attempts } = await admin
      .from('quiz_attempts')
      .select('student_id, is_correct, score')
      .in('student_id', studentIds)

    // 학생별 데이터 구성
    const studentsData = (profiles ?? []).map(p => {
      const myProgress = progress?.filter(pr => pr.student_id === p.id) ?? []
      const myAttempts = attempts?.filter(a => a.student_id === p.id) ?? []
      const completed = myProgress.filter(pr => pr.status === 'completed').length
      const avgScore = myAttempts.length > 0
        ? Math.round(myAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / myAttempts.length)
        : 0
      return `- ${p.name}: 완료 노드 ${completed}개, XP ${p.xp}, 퀴즈 평균 ${avgScore}점, 스트릭 ${p.streak_days}일`
    }).join('\n')

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: studentGroupsSchema,
      prompt: STUDENT_GROUPS_PROMPT(studentsData),
    })

    return { data: object }
  } catch (err) {
    return { error: `그룹 분석 실패: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function analyzeBottlenecks(
  schoolId: string
): Promise<{ data?: BottleneckOutput; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 스쿨의 모든 클래스
    const { data: classes } = await admin
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)

    const classIds = classes?.map(c => c.id) ?? []
    if (classIds.length === 0) return { error: '분석할 클래스가 없습니다.' }

    // 클래스의 스킬트리
    const { data: trees } = await admin
      .from('skill_trees')
      .select('id')
      .in('class_id', classIds)

    const treeIds = trees?.map(t => t.id) ?? []
    if (treeIds.length === 0) return { error: '분석할 스킬트리가 없습니다.' }

    // 노드
    const { data: nodes } = await admin
      .from('nodes')
      .select('id, title, difficulty')
      .in('skill_tree_id', treeIds)

    const nodeIds = nodes?.map(n => n.id) ?? []
    if (nodeIds.length === 0) return { error: '분석할 노드가 없습니다.' }

    // 진도
    const { data: progress } = await admin
      .from('student_progress')
      .select('node_id, status')
      .in('node_id', nodeIds)

    // 노드별 언락률 계산
    const nodeStats = (nodes ?? []).map(n => {
      const nodeProg = progress?.filter(p => p.node_id === n.id) ?? []
      const total = nodeProg.length
      const completed = nodeProg.filter(p => p.status === 'completed').length
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0
      return { title: n.title, difficulty: n.difficulty, rate, total }
    })

    // 언락률 낮은 순으로 정렬
    nodeStats.sort((a, b) => a.rate - b.rate)

    const nodesData = nodeStats
      .slice(0, 15)
      .map(n => `- ${n.title} (난이도 ${n.difficulty}): 언락률 ${n.rate}% (${n.total}명 시도)`)
      .join('\n')

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: bottleneckSchema,
      prompt: BOTTLENECK_PROMPT(nodesData),
    })

    return { data: object }
  } catch (err) {
    return { error: `병목 분석 실패: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * 교사 활동 통계 (운영자 대시보드용)
 */
export async function getTeacherActivity(
  schoolId: string
): Promise<{
  data?: Array<{
    teacher_id: string
    teacher_name: string
    skill_tree_count: number
    quiz_count: number
    student_count: number
    avg_unlock_rate: number
    last_active: string | null
  }>
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 스쿨 소속 교사들
    const { data: members } = await admin
      .from('school_members')
      .select('user_id')
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .eq('status', 'approved')

    const teacherIds = members?.map(m => m.user_id) ?? []
    if (teacherIds.length === 0) return { data: [] }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, last_active_at')
      .in('id', teacherIds)

    const result = await Promise.all(
      (profiles ?? []).map(async t => {
        const { count: treeCount } = await admin
          .from('skill_trees')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', t.id)

        const { data: teacherTrees } = await admin
          .from('skill_trees')
          .select('id')
          .eq('created_by', t.id)
        const tTreeIds = teacherTrees?.map(x => x.id) ?? []

        const { data: teacherNodes } = await admin
          .from('nodes')
          .select('id')
          .in('skill_tree_id', tTreeIds.length > 0 ? tTreeIds : ['00000000-0000-0000-0000-000000000000'])
        const tNodeIds = teacherNodes?.map(n => n.id) ?? []

        const { count: quizCount } = await admin
          .from('quizzes')
          .select('*', { count: 'exact', head: true })
          .in('node_id', tNodeIds.length > 0 ? tNodeIds : ['00000000-0000-0000-0000-000000000000'])

        const { data: teacherProgress } = await admin
          .from('student_progress')
          .select('student_id, status')
          .in('node_id', tNodeIds.length > 0 ? tNodeIds : ['00000000-0000-0000-0000-000000000000'])

        const uniqueStudents = new Set(teacherProgress?.map(p => p.student_id) ?? [])
        const completed = teacherProgress?.filter(p => p.status === 'completed').length ?? 0
        const total = teacherProgress?.length ?? 0
        const avgRate = total > 0 ? Math.round((completed / total) * 100) : 0

        return {
          teacher_id: t.id,
          teacher_name: t.name,
          skill_tree_count: treeCount ?? 0,
          quiz_count: quizCount ?? 0,
          student_count: uniqueStudents.size,
          avg_unlock_rate: avgRate,
          last_active: t.last_active_at,
        }
      })
    )

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}
