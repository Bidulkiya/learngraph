'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('announcements')
      .insert({
        school_id: schoolId,
        author_id: user.id,
        title,
        content,
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
  schoolId?: string
): Promise<{ data?: Announcement[]; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
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

    const result: Announcement[] = announcements.map(a => ({
      ...a,
      author_name: a.author_id ? authorMap.get(a.author_id) : undefined,
      is_read: readSet.has(a.id),
    }))

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function markAnnouncementRead(
  announcementId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

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
