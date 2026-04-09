'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo, isDemoAccount } from '@/lib/demo'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(v: string): boolean {
  return UUID_RE.test(v)
}

export interface DirectMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read_at: string | null
  created_at: string
}

export interface Conversation {
  user_id: string
  name: string
  email: string
  role: string
  last_message: string
  last_at: string
  unread_count: number
}

export async function sendMessage(
  receiverId: string,
  content: string
): Promise<{ data?: { id: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    if (!content.trim()) return { error: '메시지 내용을 입력해주세요.' }
    if (content.length > 2000) return { error: '메시지가 너무 깁니다 (최대 2000자).' }
    if (!isUuid(receiverId)) return { error: '유효하지 않은 수신자 ID입니다.' }
    if (receiverId === user.id) return { error: '자기 자신에게 메시지를 보낼 수 없습니다.' }

    const admin = createAdminClient()

    // 같은 스쿨에 속해있는지 확인
    const { data: myMemberships } = await admin
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    const { data: receiverMemberships } = await admin
      .from('school_members')
      .select('school_id')
      .eq('user_id', receiverId)
      .eq('status', 'approved')

    const mySchoolIds = new Set(myMemberships?.map(m => m.school_id) ?? [])
    const commonSchool = receiverMemberships?.find(m => mySchoolIds.has(m.school_id))?.school_id

    // 운영자는 본인이 만든 스쿨도 포함
    const { data: ownSchools } = await admin
      .from('schools')
      .select('id')
      .eq('created_by', user.id)
    ownSchools?.forEach(s => mySchoolIds.add(s.id))

    const schoolId = commonSchool
      ?? receiverMemberships?.find(m => mySchoolIds.has(m.school_id))?.school_id
      ?? null

    const { data, error } = await admin
      .from('direct_messages')
      .insert({
        school_id: schoolId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim(),
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    return { data: { id: data.id } }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getConversation(
  otherUserId: string
): Promise<{ data?: DirectMessage[]; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // Injection 방어: UUID 형식만 허용
    if (!isUuid(otherUserId)) return { error: '유효하지 않은 사용자 ID입니다.' }

    const admin = createAdminClient()
    const { data: messages } = await admin
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })
      .limit(200)

    // 받은 메시지 읽음 처리
    await admin
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', user.id)
      .is('read_at', null)

    return { data: (messages ?? []) as DirectMessage[] }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getConversations(): Promise<{
  data?: Conversation[]
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 내가 sender/receiver인 모든 메시지
    const { data: messages } = await admin
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!messages || messages.length === 0) return { data: [] }

    // 대화 상대별 그룹핑
    const conversationMap = new Map<string, {
      last_message: string
      last_at: string
      unread_count: number
    }>()

    for (const msg of messages) {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      const existing = conversationMap.get(otherUserId)
      if (!existing) {
        conversationMap.set(otherUserId, {
          last_message: msg.content,
          last_at: msg.created_at,
          unread_count: msg.receiver_id === user.id && !msg.read_at ? 1 : 0,
        })
      } else if (msg.receiver_id === user.id && !msg.read_at) {
        existing.unread_count++
      }
    }

    // 상대 프로필
    const otherIds = [...conversationMap.keys()]
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email, role')
      .in('id', otherIds.length > 0 ? otherIds : ['00000000-0000-0000-0000-000000000000'])

    const result: Conversation[] = (profiles ?? []).map(p => {
      const conv = conversationMap.get(p.id)!
      return {
        user_id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        last_message: conv.last_message,
        last_at: conv.last_at,
        unread_count: conv.unread_count,
      }
    })

    return { data: result.sort((a, b) => b.last_at.localeCompare(a.last_at)) }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 읽지 않은 메시지 요약 — 사이드바 배지 + 토스트 알림용.
 * 가장 최근 발신자 1명의 정보와 전체 unread 수를 함께 반환.
 */
export async function getUnreadSummary(): Promise<{
  data?: {
    totalUnread: number
    latestUnread: {
      senderId: string
      senderName: string
      lastMessage: string
      count: number
    } | null
  }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: { totalUnread: 0, latestUnread: null } }

    const admin = createAdminClient()

    // 전체 unread count
    const { count: totalUnread } = await admin
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null)

    if (!totalUnread || totalUnread === 0) {
      return { data: { totalUnread: 0, latestUnread: null } }
    }

    // 가장 최근 읽지 않은 메시지
    const { data: latestMsg } = await admin
      .from('direct_messages')
      .select('sender_id, content, created_at')
      .eq('receiver_id', user.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestMsg) {
      return { data: { totalUnread, latestUnread: null } }
    }

    // 발신자 프로필
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('name')
      .eq('id', latestMsg.sender_id)
      .maybeSingle()

    // 해당 발신자의 unread 수
    const { count: senderUnreadCount } = await admin
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', latestMsg.sender_id)
      .is('read_at', null)

    return {
      data: {
        totalUnread,
        latestUnread: {
          senderId: latestMsg.sender_id,
          senderName: senderProfile?.name ?? '알 수 없음',
          lastMessage: latestMsg.content.length > 60
            ? latestMsg.content.slice(0, 60) + '...'
            : latestMsg.content,
          count: senderUnreadCount ?? 1,
        },
      },
    }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 특정 발신자와의 대화를 즉시 '읽음' 처리.
 * 대화 열 때 호출되어 사이드바 배지가 즉시 업데이트되도록.
 */
export async function markConversationRead(
  otherUserId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(otherUserId)) return { error: '유효하지 않은 사용자 ID입니다.' }

    // 데모는 읽음 상태 저장 차단 — 다음 데모 사용자도 미읽음 메시지 그대로 보기 위함
    if (isDemoAccount(user.email)) return {}

    const admin = createAdminClient()
    await admin
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', user.id)
      .is('read_at', null)

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 같은 스쿨 멤버 목록 (메시지 받을 대상)
 */
export async function getMessageContacts(): Promise<{
  data?: Array<{ id: string; name: string; email: string; role: string }>
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 나의 스쿨들
    const { data: myMemberships } = await admin
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    const { data: mySchools } = await admin
      .from('schools')
      .select('id')
      .eq('created_by', user.id)

    const schoolIds = new Set<string>()
    myMemberships?.forEach(m => schoolIds.add(m.school_id))
    mySchools?.forEach(s => schoolIds.add(s.id))

    if (schoolIds.size === 0) return { data: [] }

    // 같은 스쿨의 모든 멤버
    const { data: members } = await admin
      .from('school_members')
      .select('user_id')
      .in('school_id', [...schoolIds])
      .eq('status', 'approved')
      .neq('user_id', user.id)

    const userIds = [...new Set(members?.map(m => m.user_id) ?? [])]
    if (userIds.length === 0) return { data: [] }

    // 스쿨 운영자도 포함
    const schoolAdminIds = new Set<string>()
    const { data: schoolAdmins } = await admin
      .from('schools')
      .select('created_by')
      .in('id', [...schoolIds])
    schoolAdmins?.forEach(s => {
      if (s.created_by && s.created_by !== user.id) schoolAdminIds.add(s.created_by)
    })

    const allContactIds = [...new Set([...userIds, ...schoolAdminIds])]

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email, role')
      .in('id', allContactIds)

    return { data: profiles ?? [] }
  } catch (err) {
    return { error: String(err) }
  }
}
