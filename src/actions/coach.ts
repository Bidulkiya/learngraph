'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { weeklyPlanSchema, type WeeklyPlanOutput } from '@/lib/ai/schemas'
import { WEEKLY_PLAN_PROMPT } from '@/lib/ai/prompts'

export async function getWeeklyPlan(): Promise<{
  data?: WeeklyPlanOutput
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 학생의 진도
    const { data: progress } = await admin
      .from('student_progress')
      .select('node_id, status, quiz_score')
      .eq('student_id', user.id)

    const completedCount = progress?.filter(p => p.status === 'completed').length ?? 0
    const availableNodeIds = progress?.filter(p => p.status === 'available').map(p => p.node_id) ?? []
    const lockedCount = progress?.filter(p => p.status === 'locked').length ?? 0

    // 사용 가능한 노드 정보
    const { data: availableNodes } = await admin
      .from('nodes')
      .select('id, title, difficulty')
      .in('id', availableNodeIds.length > 0 ? availableNodeIds : ['00000000-0000-0000-0000-000000000000'])

    // 약점 영역 (낮은 점수 노드)
    const weakNodeIds = progress?.filter(p => (p.quiz_score ?? 100) < 80).map(p => p.node_id) ?? []
    const { data: weakNodes } = await admin
      .from('nodes')
      .select('title')
      .in('id', weakNodeIds.length > 0 ? weakNodeIds : ['00000000-0000-0000-0000-000000000000'])

    const progressSummary = `완료: ${completedCount}개 / 도전 가능: ${availableNodeIds.length}개 / 잠김: ${lockedCount}개`
    const availableList = (availableNodes ?? [])
      .map(n => `- ${n.title} (난이도 ${n.difficulty})`)
      .join('\n') || '(없음)'
    const weakList = (weakNodes ?? []).map(n => `- ${n.title}`).join('\n') || '(없음)'

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: weeklyPlanSchema,
      prompt: WEEKLY_PLAN_PROMPT(progressSummary, availableList, weakList),
    })

    return { data: object }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `주간 계획 생성 실패: ${msg}` }
  }
}
