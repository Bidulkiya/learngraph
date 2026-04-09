'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo, isDemoAccount } from '@/lib/demo'

export interface Announcement {
  id: string
  school_id: string
  author_id: string | null
  author_name?: string
  title: string
  content: string
  target_role: 'all' | 'teacher' | 'student'
  created_at: string
  is_read?: boolean
}

export async function createAnnouncement(
  schoolId: string,
  title: string,
  content: string,
  targetRole: 'all' | 'teacher' | 'student' = 'all'
): Promise<{ data?: { id: string }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    // 입력 검증
    if (!title.trim()) return { error: '제목을 입력해주세요.' }
    if (title.length > 200) return { error: '제목이 너무 깁니다.' }
    if (content.length > 5000) return { error: '내용이 너무 깁니다 (최대 5000자).' }
    if (!['all', 'teacher', 'student'].includes(targetRole)) {
      return { error: '유효하지 않은 대상입니다.' }
    }

    const admin = createAdminClient()

    // 권한: 스쿨 소유자만 공지 작성 가능
    const { data: school } = await admin
      .from('schools')
      .select('created_by')
      .eq('id', schoolId)
      .maybeSingle()
    if (!school) return { error: '스쿨을 찾을 수 없습니다.' }
    if (school.created_by !== user.id) {
      return { error: '이 스쿨에 공지를 작성할 권한이 없습니다.' }
    }

    const { data, error } = await admin
      .from('announcements')
      .insert({
        school_id: schoolId,
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
        target_role: targetRole,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    return { data: { id: data.id } }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getAnnouncements(
  schoolId?: string,
  options: { unreadOnly?: boolean } = {}
): Promise<{ data?: Announcement[]; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 학생/교사의 소속 스쿨들 조회
    let targetSchoolIds: string[] = []
    if (schoolId) {
      targetSchoolIds = [schoolId]
    } else {
      // Admin이 만든 스쿨 + 본인이 멤버인 스쿨
      const { data: myMemberships } = await admin
        .from('school_members')
        .select('school_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
      targetSchoolIds = myMemberships?.map(m => m.school_id) ?? []

      const { data: mySchools } = await admin
        .from('schools')
        .select('id')
        .eq('created_by', user.id)
      if (mySchools) targetSchoolIds.push(...mySchools.map(s => s.id))
      targetSchoolIds = [...new Set(targetSchoolIds)]
    }

    if (targetSchoolIds.length === 0) return { data: [] }

    const { data: announcements } = await admin
      .from('announcements')
      .select('*')
      .in('school_id', targetSchoolIds)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!announcements) return { data: [] }

    // 본인이 읽은 공지들
    const { data: reads } = await admin
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id)
    const readSet = new Set(reads?.map(r => r.announcement_id) ?? [])

    // author 이름
    const authorIds = [...new Set(announcements.map(a => a.author_id).filter(Boolean))]
    const { data: authors } = await admin
      .from('profiles')
      .select('id, name')
      .in('id', authorIds.length > 0 ? authorIds : ['00000000-0000-0000-0000-000000000000'])
    const authorMap = new Map(authors?.map(a => [a.id, a.name]) ?? [])

    let result: Announcement[] = announcements.map(a => ({
      ...a,
      author_name: a.author_id ? authorMap.get(a.author_id) : undefined,
      is_read: readSet.has(a.id),
    }))

    // 읽지 않은 공지만 요청 시 필터링
    if (options.unreadOnly) {
      result = result.filter(a => !a.is_read)
    }

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function markAnnouncementRead(
  announcementId: string
): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모는 읽음 상태 저장 차단 — 다음 데모 사용자도 동일한 미읽음 상태로 보기 위함
    if (isDemoAccount(user.email)) return {}

    const admin = createAdminClient()
    await admin.from('announcement_reads').upsert({
      user_id: user.id,
      announcement_id: announcementId,
    }, { onConflict: 'user_id,announcement_id' })

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getUnreadAnnouncementCount(): Promise<{
  data?: number
  error?: string
}> {
  try {
    const { data: announcements } = await getAnnouncements()
    if (!announcements) return { data: 0 }
    return { data: announcements.filter(a => !a.is_read).length }
  } catch (err) {
    return { error: String(err) }
  }
}
