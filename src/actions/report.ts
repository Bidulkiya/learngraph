'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parentReportSchema, type ParentReportOutput } from '@/lib/ai/schemas'
import { PARENT_REPORT_PROMPT } from '@/lib/ai/prompts'

export interface ParentReportData {
  student_name: string
  period: string
  progress_rate: number
  completed_nodes: number
  total_nodes: number
  avg_quiz_score: number
  study_days: number
  streak_days: number
  ai_comment: ParentReportOutput
}

export async function generateParentReport(
  studentId: string
): Promise<{ data?: ParentReportData; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    const { data: student } = await admin
      .from('profiles')
      .select('name, streak_days, xp, week_study_minutes')
      .eq('id', studentId)
      .single()

    if (!student) return { error: '학생을 찾을 수 없습니다.' }

    // 진도
    const { data: progress } = await admin
      .from('student_progress')
      .select('status, quiz_score, node_id')
      .eq('student_id', studentId)

    const completed = progress?.filter(p => p.status === 'completed').length ?? 0
    const total = progress?.length ?? 0
    const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const scores = progress?.filter(p => p.quiz_score != null).map(p => p.quiz_score as number) ?? []
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0

    // 약점 노드
    const weakNodeIds = progress
      ?.filter(p => (p.quiz_score ?? 100) < 70)
      .map(p => p.node_id) ?? []
    const { data: weakNodes } = await admin
      .from('nodes')
      .select('title')
      .in('id', weakNodeIds.length > 0 ? weakNodeIds : ['00000000-0000-0000-0000-000000000000'])

    const reportData = `
학생명: ${student.name}
진도율: ${progressRate}% (${completed}/${total} 노드 완료)
퀴즈 평균 점수: ${avgScore}점
학습 스트릭: ${student.streak_days}일
주간 학습 시간: ${student.week_study_minutes}분
약점 노드: ${weakNodes?.map(n => n.title).join(', ') || '없음'}
`

    const { object: aiComment } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: parentReportSchema,
      prompt: PARENT_REPORT_PROMPT(reportData),
    })

    const now = new Date()
    const period = `${now.getFullYear()}년 ${now.getMonth() + 1}월`

    return {
      data: {
        student_name: student.name,
        period,
        progress_rate: progressRate,
        completed_nodes: completed,
        total_nodes: total,
        avg_quiz_score: avgScore,
        study_days: student.streak_days ?? 0,
        streak_days: student.streak_days ?? 0,
        ai_comment: aiComment,
      },
    }
  } catch (err) {
    return { error: `리포트 생성 실패: ${err instanceof Error ? err.message : String(err)}` }
  }
}
