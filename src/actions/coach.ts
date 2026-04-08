'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { weeklyPlanSchema, type WeeklyPlanOutput } from '@/lib/ai/schemas'
import { WEEKLY_PLAN_PROMPT } from '@/lib/ai/prompts'

/**
 * 이번 주 월요일(yyyy-mm-dd).
 * 주 기준: 월~일 (일요일이면 전주 월요일).
 */
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * 학생 주간 학습 계획 조회.
 * - 기본(forceRefresh=false): 이번 주에 이미 생성된 캐시가 있으면 DB에서 반환
 * - forceRefresh=true: 새로 생성해서 캐시 덮어쓰기 (같은 주의 기존 캐시를 upsert로 갱신)
 *
 * 같은 주(월~일) 동안 동일한 계획을 유지한다. 페이지를 벗어났다 돌아와도 동일 결과.
 */
export async function getWeeklyPlan(
  forceRefresh: boolean = false
): Promise<{
  data?: WeeklyPlanOutput
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const weekStart = getMondayOfWeek(new Date())

    // 1. 캐시 확인 (forceRefresh가 false일 때만)
    if (!forceRefresh) {
      const { data: cached } = await admin
        .from('weekly_plans')
        .select('plan, motivation')
        .eq('student_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (cached) {
        return {
          data: {
            plan: cached.plan as WeeklyPlanOutput['plan'],
            motivation: cached.motivation,
          },
        }
      }
    }

    // 2. 캐시 miss → AI 생성을 위한 데이터 집계
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

    // 3. Claude 호출
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: weeklyPlanSchema,
      prompt: WEEKLY_PLAN_PROMPT(progressSummary, availableList, weakList),
    })

    // 4. DB 캐싱 (같은 주 중복 시 upsert로 갱신)
    const { error: upsertErr } = await admin
      .from('weekly_plans')
      .upsert({
        student_id: user.id,
        week_start: weekStart,
        plan: object.plan,
        motivation: object.motivation,
      }, { onConflict: 'student_id,week_start' })

    if (upsertErr) {
      // 저장 실패해도 결과는 반환 (사용자 경험 우선)
      console.error('[getWeeklyPlan] cache upsert failed:', upsertErr)
    }

    return { data: object }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `주간 계획 생성 실패: ${msg}` }
  }
}
