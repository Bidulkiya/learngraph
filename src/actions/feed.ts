'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type FeedActionType = 'node_unlock' | 'quiz_complete' | 'badge_earned' | 'tree_complete' | 'streak'

export interface FeedItem {
  id: string
  user_id: string
  user_name: string
  action_type: FeedActionType
  detail: Record<string, unknown>
  created_at: string
  reactions: Array<{ emoji: string; count: number; by_me: boolean }>
}

/**
 * 활동 기록 (노드 언락, 배지 획득 등에서 자동 호출)
 */
export async function postActivity(
  classId: string | null,
  actionType: FeedActionType,
  detail: Record<string, unknown>
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    if (!classId) return {} // 클래스 없으면 건너뜀

    const admin = createAdminClient()
    // 클래스의 school_id 조회
    const { data: cls } = await admin
      .from('classes')
      .select('school_id')
      .eq('id', classId)
      .single()

    await admin.from('activity_feed').insert({
      school_id: cls?.school_id ?? null,
      class_id: classId,
      user_id: user.id,
      action_type: actionType,
      detail,
    })

    return {}
  } catch (err) {
    console.error('[postActivity]', err)
    return { error: String(err) }
  }
}

/**
 * 클래스 피드 조회 (+ 리액션 집계)
 */
export async function getClassFeed(
  classId: string
): Promise<{ data?: FeedItem[]; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: feed } = await admin
      .from('activity_feed')
      .select('id, user_id, action_type, detail, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!feed || feed.length === 0) return { data: [] }

    // 사용자 이름
    const userIds = [...new Set(feed.map(f => f.user_id))]
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name')
      .in('id', userIds)
    const nameMap = new Map(profiles?.map(p => [p.id, p.name]) ?? [])

    // 리액션 집계
    const feedIds = feed.map(f => f.id)
    const { data: reactions } = await admin
      .from('feed_reactions')
      .select('feed_id, emoji, user_id')
      .in('feed_id', feedIds)

    const reactionMap = new Map<string, Map<string, { count: number; by_me: boolean }>>()
    reactions?.forEach(r => {
      if (!reactionMap.has(r.feed_id)) reactionMap.set(r.feed_id, new Map())
      const emojiMap = reactionMap.get(r.feed_id)!
      const cur = emojiMap.get(r.emoji) ?? { count: 0, by_me: false }
      cur.count += 1
      if (r.user_id === user.id) cur.by_me = true
      emojiMap.set(r.emoji, cur)
    })

    const result: FeedItem[] = feed.map(f => ({
      id: f.id,
      user_id: f.user_id,
      user_name: nameMap.get(f.user_id) ?? '익명',
      action_type: f.action_type as FeedActionType,
      detail: (f.detail ?? {}) as Record<string, unknown>,
      created_at: f.created_at,
      reactions: Array.from((reactionMap.get(f.id) ?? new Map()).entries()).map(([emoji, v]) => ({
        emoji,
        count: v.count,
        by_me: v.by_me,
      })),
    }))

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 학생 소속 클래스의 통합 피드
 */
export async function getMyFeed(): Promise<{ data?: FeedItem[]; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    // 내 클래스들
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', user.id)
      .eq('status', 'approved')

    const classIds = enrollments?.map(e => e.class_id) ?? []
    if (classIds.length === 0) return { data: [] }

    // 모든 클래스의 피드 가져와서 merge
    const allFeeds: FeedItem[] = []
    for (const cid of classIds) {
      const res = await getClassFeed(cid)
      if (res.data) allFeeds.push(...res.data)
    }

    // 시간순 정렬
    allFeeds.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return { data: allFeeds.slice(0, 20) }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 리액션 토글
 */
export async function toggleReaction(
  feedId: string,
  emoji: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 이미 같은 이모지 리액션이 있는지 확인
    const { data: existing } = await admin
      .from('feed_reactions')
      .select('id, emoji')
      .eq('feed_id', feedId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.emoji === emoji) {
        // 같은 이모지 → 삭제 (토글)
        await admin.from('feed_reactions').delete().eq('id', existing.id)
      } else {
        // 다른 이모지 → 업데이트
        await admin.from('feed_reactions').update({ emoji }).eq('id', existing.id)
      }
    } else {
      await admin.from('feed_reactions').insert({
        feed_id: feedId,
        user_id: user.id,
        emoji,
      })
    }

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}
