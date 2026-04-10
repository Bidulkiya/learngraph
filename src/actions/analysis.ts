'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import { studentGroupsSchema, bottleneckSchema, type StudentGroupsOutput, type BottleneckOutput } from '@/lib/ai/schemas'
import { STUDENT_GROUPS_PROMPT, BOTTLENECK_PROMPT } from '@/lib/ai/prompts'

export async function analyzeStudentGroups(
  classId: string
): Promise<{ data?: StudentGroupsOutput; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()

    // 권한 확인: 담당 교사 또는 스쿨 소유자(admin)만
    const { data: cls } = await admin
      .from('classes')
      .select('teacher_id, school_id')
      .eq('id', classId)
      .maybeSingle()
    if (!cls) return { error: '클래스를 찾을 수 없습니다.' }
    let allowed = cls.teacher_id === user.id
    if (!allowed && cls.school_id) {
      const { data: school } = await admin.from('schools').select('created_by').eq('id', cls.school_id).maybeSingle()
      if (school?.created_by === user.id) allowed = true
    }
    if (!allowed) return { error: '이 클래스를 분석할 권한이 없습니다.' }

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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()

    // 권한: 스쿨 소유자만
    const { data: school } = await admin
      .from('schools')
      .select('created_by')
      .eq('id', schoolId)
      .maybeSingle()
    if (!school) return { error: '스쿨을 찾을 수 없습니다.' }
    if (school.created_by !== user.id) {
      return { error: '이 스쿨을 분석할 권한이 없습니다.' }
    }

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

// getTeacherActivity — 삭제됨. getAdminFilteredDashboard (dashboard-filters.ts)의 teacherActivity로 대체.
