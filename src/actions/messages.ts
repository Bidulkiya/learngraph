'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    if (!content.trim()) return { error: '메시지 내용을 입력해주세요.' }

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

export async function getUnreadMessageCount(): Promise<{ data?: number; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: 0 }

    const admin = createAdminClient()
    const { count } = await admin
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null)

    return { data: count ?? 0 }
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
