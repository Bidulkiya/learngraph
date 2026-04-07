'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface StudyGroup {
  id: string
  class_id: string
  class_name?: string
  name: string
  created_by: string
  created_at: string
  member_count: number
  is_member: boolean
}

export interface GroupMessage {
  id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
}

export async function createGroup(
  classId: string,
  name: string
): Promise<{ data?: { id: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!name.trim()) return { error: '그룹 이름을 입력해주세요.' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('study_groups')
      .insert({ class_id: classId, name: name.trim(), created_by: user.id })
      .select('id')
      .single()

    if (error) return { error: error.message }

    // 생성자 자동 가입
    await admin.from('study_group_members').insert({
      group_id: data.id,
      user_id: user.id,
    })

    return { data: { id: data.id } }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getMyGroups(): Promise<{ data?: StudyGroup[]; error?: string }> {
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

    // 클래스의 모든 그룹
    const { data: groups } = await admin
      .from('study_groups')
      .select('*')
      .in('class_id', classIds)
      .order('created_at', { ascending: false })

    if (!groups) return { data: [] }

    // 내가 속한 그룹 체크
    const { data: myMemberships } = await admin
      .from('study_group_members')
      .select('group_id')
      .eq('user_id', user.id)
    const memberSet = new Set(myMemberships?.map(m => m.group_id) ?? [])

    // 클래스 이름 + 멤버 카운트
    const { data: classes } = await admin
      .from('classes')
      .select('id, name')
      .in('id', classIds)
    const classMap = new Map(classes?.map(c => [c.id, c.name]) ?? [])

    const result: StudyGroup[] = await Promise.all(
      groups.map(async g => {
        const { count } = await admin
          .from('study_group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)

        return {
          id: g.id,
          class_id: g.class_id,
          class_name: classMap.get(g.class_id),
          name: g.name,
          created_by: g.created_by,
          created_at: g.created_at,
          member_count: count ?? 0,
          is_member: memberSet.has(g.id),
        }
      })
    )

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function joinGroup(groupId: string): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { error } = await admin.from('study_group_members').upsert({
      group_id: groupId,
      user_id: user.id,
    }, { onConflict: 'group_id,user_id' })

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function leaveGroup(groupId: string): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    await admin
      .from('study_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function sendGroupMessage(
  groupId: string,
  content: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!content.trim()) return { error: '메시지를 입력해주세요.' }

    const admin = createAdminClient()
    const { error } = await admin.from('study_group_messages').insert({
      group_id: groupId,
      user_id: user.id,
      content: content.trim(),
    })

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getGroupMessages(
  groupId: string
): Promise<{ data?: GroupMessage[]; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: messages } = await admin
      .from('study_group_messages')
      .select('id, user_id, content, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (!messages) return { data: [] }

    const userIds = [...new Set(messages.map(m => m.user_id).filter(Boolean))] as string[]
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name')
      .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
    const nameMap = new Map(profiles?.map(p => [p.id, p.name]) ?? [])

    const result: GroupMessage[] = messages.map(m => ({
      id: m.id,
      user_id: m.user_id ?? '',
      user_name: nameMap.get(m.user_id ?? '') ?? '익명',
      content: m.content,
      created_at: m.created_at,
    }))

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}
