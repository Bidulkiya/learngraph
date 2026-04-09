'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'

export type FeedActionType = 'node_unlock' | 'quiz_complete' | 'badge_earned' | 'tree_complete' | 'streak'

export interface FeedItem {
  id: string
  user_id: string
  user_name: string
  user_nickname: string | null
  user_avatar: string | null
  action_type: FeedActionType
  detail: Record<string, unknown>
  created_at: string
  reactions: Array<{ emoji: string; count: number; by_me: boolean }>
}

/**
 * 활동 기록 (노드 언락, 배지 획득 등에서 자동 호출).
 * 본인이 해당 클래스에 승인된 학생/교사인지 확인.
 */
export async function postActivity(
  classId: string | null,
  actionType: FeedActionType,
  detail: Record<string, unknown>
): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단 (내부 호출 — 조용히 스킵)
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return {}

    if (!classId) return {} // 클래스 없으면 건너뜀

    const admin = createAdminClient()
    // 클래스의 school_id 조회 + 권한 확인
    const { data: cls } = await admin
      .from('classes')
      .select('school_id, teacher_id')
      .eq('id', classId)
      .single()
    if (!cls) return { error: '클래스를 찾을 수 없습니다.' }

    // 담당 교사가 아니라면 승인된 학생이어야 함
    let authorized = cls.teacher_id === user.id
    if (!authorized) {
      const { data: enr } = await admin
        .from('class_enrollments')
        .select('status')
        .eq('class_id', classId)
        .eq('student_id', user.id)
        .maybeSingle()
      if (enr?.status === 'approved') authorized = true
    }
    if (!authorized) return { error: '이 클래스에 활동을 기록할 권한이 없습니다.' }

    await admin.from('activity_feed').insert({
      school_id: cls.school_id ?? null,
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
 * 클래스 피드 조회 (+ 리액션 집계).
 * 본인이 해당 클래스에 속한 담당 교사 또는 승인된 학생 또는 admin일 때만.
 */
export async function getClassFeed(
  classId: string
): Promise<{ data?: FeedItem[]; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 권한 확인
    const { data: cls } = await admin
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .maybeSingle()
    let allowed = cls?.teacher_id === user.id
    if (!allowed) {
      const { data: enr } = await admin
        .from('class_enrollments')
        .select('status')
        .eq('class_id', classId)
        .eq('student_id', user.id)
        .maybeSingle()
      if (enr?.status === 'approved') allowed = true
    }
    if (!allowed) {
      // admin 체크
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role === 'admin') allowed = true
    }
    if (!allowed) return { error: '이 클래스 피드를 조회할 권한이 없습니다.' }

    const { data: feed } = await admin
      .from('activity_feed')
      .select('id, user_id, action_type, detail, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!feed || feed.length === 0) return { data: [] }

    // 사용자 이름 + 닉네임 + 아바타
    const userIds = [...new Set(feed.map(f => f.user_id))]
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, nickname, avatar_url')
      .in('id', userIds)
    const profileMap = new Map(
      profiles?.map(p => [p.id, { name: p.name, nickname: p.nickname, avatar_url: p.avatar_url }]) ?? []
    )

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

    const result: FeedItem[] = feed.map(f => {
      const p = profileMap.get(f.user_id)
      return {
        id: f.id,
        user_id: f.user_id,
        user_name: p?.name ?? '익명',
        user_nickname: p?.nickname ?? null,
        user_avatar: p?.avatar_url ?? null,
        action_type: f.action_type as FeedActionType,
        detail: (f.detail ?? {}) as Record<string, unknown>,
        created_at: f.created_at,
        reactions: Array.from((reactionMap.get(f.id) ?? new Map()).entries()).map(([emoji, v]) => ({
          emoji,
          count: v.count,
          by_me: v.by_me,
        })),
      }
    })

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 학생 소속 클래스의 통합 피드.
 * N+1 최적화: 모든 클래스에 대해 한 번에 IN 쿼리 + 권한 체크는 본인 enrollment로 보장됨.
 */
export async function getMyFeed(): Promise<{ data?: FeedItem[]; error?: string }> {
  try {
    const user = await getCachedUser()
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

    // ✅ 전체 피드 + 프로필 + 리액션을 3개 쿼리로 일괄 조회 (N+1 제거)
    const [{ data: feed }, /* placeholder */] = await Promise.all([
      admin
        .from('activity_feed')
        .select('id, user_id, action_type, detail, created_at')
        .in('class_id', classIds)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (!feed || feed.length === 0) return { data: [] }

    const userIds = [...new Set(feed.map(f => f.user_id).filter(Boolean))] as string[]
    const feedIds = feed.map(f => f.id)

    const [profilesRes, reactionsRes] = await Promise.all([
      admin.from('profiles').select('id, name, nickname, avatar_url').in('id', userIds),
      admin.from('feed_reactions').select('feed_id, emoji, user_id').in('feed_id', feedIds),
    ])

    const profileMap = new Map(
      profilesRes.data?.map(p => [p.id, { name: p.name, nickname: p.nickname, avatar_url: p.avatar_url }]) ?? []
    )

    const reactionMap = new Map<string, Map<string, { count: number; by_me: boolean }>>()
    reactionsRes.data?.forEach(r => {
      if (!reactionMap.has(r.feed_id)) reactionMap.set(r.feed_id, new Map())
      const emojiMap = reactionMap.get(r.feed_id)!
      const cur = emojiMap.get(r.emoji) ?? { count: 0, by_me: false }
      cur.count += 1
      if (r.user_id === user.id) cur.by_me = true
      emojiMap.set(r.emoji, cur)
    })

    const result: FeedItem[] = feed.map(f => {
      const p = profileMap.get(f.user_id)
      return {
        id: f.id,
        user_id: f.user_id,
        user_name: p?.name ?? '익명',
        user_nickname: p?.nickname ?? null,
        user_avatar: p?.avatar_url ?? null,
        action_type: f.action_type as FeedActionType,
        detail: (f.detail ?? {}) as Record<string, unknown>,
        created_at: f.created_at,
        reactions: Array.from((reactionMap.get(f.id) ?? new Map()).entries()).map(([emoji, v]) => ({
          emoji,
          count: v.count,
          by_me: v.by_me,
        })),
      }
    })

    return { data: result }
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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

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
