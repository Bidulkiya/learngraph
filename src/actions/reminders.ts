'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ReviewReminder {
  id: string
  node_id: string
  node_title: string
  remind_at: string
  completed: boolean
}

/**
 * 오늘 복습이 필요한 노드 목록
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
      .select('id, node_id, remind_at, completed')
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
    }))

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function markReviewCompleted(reminderId: string): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('review_reminders')
      .update({ completed: true })
      .eq('id', reminderId)

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}
