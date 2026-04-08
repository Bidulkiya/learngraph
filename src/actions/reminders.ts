'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ReviewUrgency = 'overdue' | 'today' | 'soon'

export interface ReviewReminder {
  id: string
  node_id: string
  node_title: string
  remind_at: string
  completed: boolean
  interval_days: number
  urgency: ReviewUrgency
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

/**
 * 적응형 간격 계산.
 * - prev × 2.0  (정답률 ≥ 80%, 학생이 잘 기억함)
 * - prev × 1.0  (정답률 60-79%, 동일 간격 유지)
 * - prev × 0.5  (정답률 < 60%, 자주 복습 필요)
 * - 최소 1일, 최대 60일
 */
function calculateNextInterval(prevInterval: number, scorePercent: number): number {
  let multiplier: number
  if (scorePercent >= 80) multiplier = 2.0
  else if (scorePercent >= 60) multiplier = 1.0
  else multiplier = 0.5
  const next = Math.round(prevInterval * multiplier)
  return Math.max(1, Math.min(60, next))
}

/**
 * 긴급도 계산: overdue / today / soon.
 */
function calculateUrgency(remindAt: string, today: string): ReviewUrgency {
  if (remindAt < today) return 'overdue'
  if (remindAt === today) return 'today'
  return 'soon'
}

/**
 * 오늘 복습이 필요한 노드 목록 + 긴급도 표시.
 * 기한 지난 항목까지 모두 표시.
 */
export async function getTodayReviews(): Promise<{
  data?: ReviewReminder[]
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data: reminders } = await admin
      .from('review_reminders')
      .select('id, node_id, remind_at, completed, interval_days')
      .eq('student_id', user.id)
      .lte('remind_at', today)
      .eq('completed', false)
      .order('remind_at')

    if (!reminders || reminders.length === 0) return { data: [] }

    const nodeIds = [...new Set(reminders.map(r => r.node_id))]
    const { data: nodes } = await admin
      .from('nodes')
      .select('id, title')
      .in('id', nodeIds)

    const nodeMap = new Map(nodes?.map(n => [n.id, n.title]) ?? [])
    const result: ReviewReminder[] = reminders.map(r => ({
      id: r.id,
      node_id: r.node_id,
      node_title: nodeMap.get(r.node_id) ?? '알 수 없음',
      remind_at: r.remind_at,
      completed: r.completed,
      interval_days: r.interval_days ?? 1,
      urgency: calculateUrgency(r.remind_at, today),
    }))

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 복습 완료 처리 + 적응형 다음 복습 일정 자동 생성.
 * scorePercent: 이번 복습 퀴즈에서 받은 점수 (0-100)
 */
export async function markReviewCompleted(
  reminderId: string,
  scorePercent: number = 100
): Promise<{ data?: { nextDays: number; nextDate: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(reminderId)) return { error: '유효하지 않은 ID입니다.' }

    const admin = createAdminClient()

    // 1. 권한 + 기존 reminder 정보
    const { data: existing } = await admin
      .from('review_reminders')
      .select('id, student_id, node_id, interval_days')
      .eq('id', reminderId)
      .maybeSingle()
    if (!existing) return { error: '복습 알림을 찾을 수 없습니다.' }
    if (existing.student_id !== user.id) {
      return { error: '본인의 복습만 완료 처리할 수 있습니다.' }
    }

    const safeScore = Math.max(0, Math.min(100, scorePercent))

    // 2. 기존 reminder 완료 처리 + 점수 기록
    const { error: updateErr } = await admin
      .from('review_reminders')
      .update({ completed: true, review_score: safeScore })
      .eq('id', reminderId)
    if (updateErr) return { error: updateErr.message }

    // 3. 적응형 간격 계산
    const prevInterval = existing.interval_days ?? 1
    const nextInterval = calculateNextInterval(prevInterval, safeScore)
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + nextInterval)
    const nextDateStr = nextDate.toISOString().slice(0, 10)

    // 4. 다음 복습 일정 자동 생성 (단, 오늘 이미 같은 노드의 미완료 reminder가 있으면 스킵)
    const { data: existingFuture } = await admin
      .from('review_reminders')
      .select('id')
      .eq('student_id', user.id)
      .eq('node_id', existing.node_id)
      .eq('completed', false)
      .maybeSingle()

    if (!existingFuture) {
      await admin.from('review_reminders').insert({
        student_id: user.id,
        node_id: existing.node_id,
        remind_at: nextDateStr,
        interval_days: nextInterval,
      })
    }

    return { data: { nextDays: nextInterval, nextDate: nextDateStr } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
