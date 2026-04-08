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

/**
 * 해당 클래스에 승인된 멤버(학생/교사)인지 확인.
 */
async function assertClassMember(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  classId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: cls } = await admin
    .from('classes')
    .select('teacher_id')
    .eq('id', classId)
    .maybeSingle()
  if (!cls) return { ok: false, error: '클래스를 찾을 수 없습니다.' }
  if (cls.teacher_id === userId) return { ok: true }
  const { data: enr } = await admin
    .from('class_enrollments')
    .select('status')
    .eq('class_id', classId)
    .eq('student_id', userId)
    .maybeSingle()
  if (enr?.status === 'approved') return { ok: true }
  return { ok: false, error: '이 클래스의 승인된 멤버가 아닙니다.' }
}

/**
 * 스터디 그룹의 class_id를 조회하고 멤버 확인.
 */
async function assertGroupClassMember(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: grp } = await admin
    .from('study_groups')
    .select('class_id')
    .eq('id', groupId)
    .maybeSingle()
  if (!grp) return { ok: false, error: '그룹을 찾을 수 없습니다.' }
  return assertClassMember(admin, userId, grp.class_id)
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
    if (name.length > 100) return { error: '그룹 이름이 너무 깁니다.' }

    const admin = createAdminClient()
    const auth = await assertClassMember(admin, user.id, classId)
    if (!auth.ok) return { error: auth.error }

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

    // ✅ N+1 최적화: 그룹별 count → 1번의 IN 쿼리 + JS Map 집계
    const groupIds = groups.map(g => g.id)
    const { data: allMembers } = await admin
      .from('study_group_members')
      .select('group_id')
      .in('group_id', groupIds)

    const countMap = new Map<string, number>()
    allMembers?.forEach(m => {
      countMap.set(m.group_id, (countMap.get(m.group_id) ?? 0) + 1)
    })

    const result: StudyGroup[] = groups.map(g => ({
      id: g.id,
      class_id: g.class_id,
      class_name: classMap.get(g.class_id),
      name: g.name,
      created_by: g.created_by,
      created_at: g.created_at,
      member_count: countMap.get(g.id) ?? 0,
      is_member: memberSet.has(g.id),
    }))

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
    const auth = await assertGroupClassMember(admin, user.id, groupId)
    if (!auth.ok) return { error: auth.error }

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

/**
 * 해당 그룹의 멤버인지 확인.
 */
async function assertGroupMember(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: member } = await admin
    .from('study_group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!member) return { ok: false, error: '이 그룹의 멤버가 아닙니다.' }
  return { ok: true }
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
    if (content.length > 2000) return { error: '메시지가 너무 깁니다.' }

    const admin = createAdminClient()
    const auth = await assertGroupMember(admin, user.id, groupId)
    if (!auth.ok) return { error: auth.error }

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
    const auth = await assertGroupMember(admin, user.id, groupId)
    if (!auth.ok) return { error: auth.error }

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
