'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================
// Types
// ============================================

export interface School {
  id: string
  name: string
  description: string | null
  teacher_code: string
  student_code: string
  created_by: string
  created_at: string
}

export interface SchoolClass {
  id: string
  school_id: string | null
  name: string
  description: string | null
  class_code: string | null
  teacher_id: string | null
  max_students: number
  created_at: string
}

export interface SchoolDetailData {
  school: School
  teachers: Array<{ id: string; name: string; email: string; joined_at: string }>
  students: Array<{ id: string; name: string; email: string; joined_at: string }>
  pendingMembers: Array<{ id: string; name: string; email: string; role: string; joined_at: string }>
  classes: SchoolClass[]
  pendingEnrollments: Array<{
    id: string
    class_id: string
    class_name: string
    student_id: string
    student_name: string
    requested_at: string
  }>
}

// ============================================
// Admin: Create / Manage Schools
// ============================================

export async function createSchool(
  name: string,
  description: string
): Promise<{ data?: School; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('schools')
      .insert({ name, description, created_by: user.id })
      .select()
      .single()

    if (error) return { error: '스쿨 생성 실패: ' + error.message }

    // 생성자(운영자)를 school_members에 자동 추가
    await admin.from('school_members').insert({
      school_id: data.id,
      user_id: user.id,
      role: 'admin',
      status: 'approved',
    })

    return { data: data as School }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getMySchools(): Promise<{ data?: Array<School & { teacher_count: number; student_count: number }>; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: schools } = await admin
      .from('schools')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (!schools) return { data: [] }

    const schoolsWithCounts = await Promise.all(
      schools.map(async (s) => {
        const { data: members } = await admin
          .from('school_members')
          .select('role')
          .eq('school_id', s.id)
          .eq('status', 'approved')

        const teacher_count = members?.filter(m => m.role === 'teacher').length ?? 0
        const student_count = members?.filter(m => m.role === 'student').length ?? 0
        return { ...s, teacher_count, student_count }
      })
    )

    return { data: schoolsWithCounts }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getSchoolDetail(
  schoolId: string
): Promise<{ data?: SchoolDetailData; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    const { data: school } = await admin
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single()

    if (!school) return { error: '스쿨을 찾을 수 없습니다.' }

    // Members
    const { data: members } = await admin
      .from('school_members')
      .select('user_id, role, status, joined_at')
      .eq('school_id', schoolId)

    const userIds = (members ?? []).map(m => m.user_id)
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

    const teachers: SchoolDetailData['teachers'] = []
    const students: SchoolDetailData['students'] = []
    const pendingMembers: SchoolDetailData['pendingMembers'] = []

    for (const m of members ?? []) {
      const p = profileMap.get(m.user_id)
      if (!p) continue
      if (m.status === 'pending') {
        pendingMembers.push({ id: p.id, name: p.name, email: p.email, role: m.role, joined_at: m.joined_at })
      } else if (m.status === 'approved') {
        if (m.role === 'teacher') teachers.push({ id: p.id, name: p.name, email: p.email, joined_at: m.joined_at })
        if (m.role === 'student') students.push({ id: p.id, name: p.name, email: p.email, joined_at: m.joined_at })
      }
    }

    // Classes
    const { data: classes } = await admin
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)

    // Pending enrollments for classes in this school
    const classIds = (classes ?? []).map(c => c.id)
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('id, class_id, student_id, requested_at')
      .in('class_id', classIds.length > 0 ? classIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'pending')

    const enrollmentStudentIds = (enrollments ?? []).map(e => e.student_id)
    const { data: enrollmentProfiles } = await admin
      .from('profiles')
      .select('id, name')
      .in('id', enrollmentStudentIds.length > 0 ? enrollmentStudentIds : ['00000000-0000-0000-0000-000000000000'])

    const enrollmentProfileMap = new Map(enrollmentProfiles?.map(p => [p.id, p]) ?? [])
    const classMap = new Map(classes?.map(c => [c.id, c]) ?? [])

    const pendingEnrollments = (enrollments ?? []).map(e => ({
      id: e.id,
      class_id: e.class_id,
      class_name: classMap.get(e.class_id)?.name ?? '알 수 없음',
      student_id: e.student_id,
      student_name: enrollmentProfileMap.get(e.student_id)?.name ?? '익명',
      requested_at: e.requested_at,
    }))

    return {
      data: {
        school: school as School,
        teachers,
        students,
        pendingMembers,
        classes: (classes ?? []) as SchoolClass[],
        pendingEnrollments,
      },
    }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function approveSchoolMember(
  schoolId: string,
  userId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('school_members')
      .update({ status: 'approved' })
      .eq('school_id', schoolId)
      .eq('user_id', userId)

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function rejectSchoolMember(
  schoolId: string,
  userId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('school_members')
      .delete()
      .eq('school_id', schoolId)
      .eq('user_id', userId)

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

// ============================================
// Admin: Create Classes
// ============================================

export async function createClass(
  schoolId: string,
  name: string,
  description: string,
  teacherId: string
): Promise<{ data?: SchoolClass; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('classes')
      .insert({
        school_id: schoolId,
        name,
        description,
        teacher_id: teacherId,
      })
      .select()
      .single()

    if (error) return { error: '클래스 생성 실패: ' + error.message }
    return { data: data as SchoolClass }
  } catch (err) {
    return { error: String(err) }
  }
}

// ============================================
// Join: Code-based (teacher/student)
// ============================================

/**
 * Teacher joins school via teacher_code.
 */
export async function joinSchoolAsTeacher(
  teacherCode: string
): Promise<{ data?: { schoolId: string; schoolName: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: school } = await admin
      .from('schools')
      .select('id, name')
      .eq('teacher_code', teacherCode.trim().toUpperCase())
      .single()

    if (!school) return { error: '유효하지 않은 교사 코드입니다.' }

    // 이미 가입된 경우 체크
    const { data: existing } = await admin
      .from('school_members')
      .select('status')
      .eq('school_id', school.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'approved') {
        return { data: { schoolId: school.id, schoolName: school.name } }
      }
      return { error: '이미 가입 요청이 있습니다.' }
    }

    // 교사는 즉시 승인
    const { error } = await admin.from('school_members').insert({
      school_id: school.id,
      user_id: user.id,
      role: 'teacher',
      status: 'approved',
    })

    if (error) return { error: error.message }
    return { data: { schoolId: school.id, schoolName: school.name } }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Student joins via code (school code or class code — auto-detect).
 */
export async function joinWithCode(
  code: string
): Promise<{
  data?: { type: 'school' | 'class'; schoolId?: string; schoolName?: string; classes?: SchoolClass[]; className?: string }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const normalized = code.trim().toUpperCase()
    const admin = createAdminClient()

    // 1. 스쿨 코드 먼저 확인
    const { data: schoolByCode } = await admin
      .from('schools')
      .select('id, name')
      .eq('student_code', normalized)
      .maybeSingle()

    if (schoolByCode) {
      // 스쿨 가입 (즉시 승인) — upsert로 중복 insert 안전
      const { error: memberErr } = await admin.from('school_members').upsert({
        school_id: schoolByCode.id,
        user_id: user.id,
        role: 'student',
        status: 'approved',
      }, { onConflict: 'school_id,user_id' })

      if (memberErr) {
        console.error('[joinWithCode] school member insert failed:', memberErr)
        return { error: '스쿨 가입 실패: ' + memberErr.message }
      }

      // 이미 가입되어 있었다면 status를 approved로 보장
      await admin
        .from('school_members')
        .update({ status: 'approved' })
        .eq('school_id', schoolByCode.id)
        .eq('user_id', user.id)

      // 해당 스쿨의 클래스 목록 반환
      const { data: classes } = await admin
        .from('classes')
        .select('*')
        .eq('school_id', schoolByCode.id)

      return {
        data: {
          type: 'school',
          schoolId: schoolByCode.id,
          schoolName: schoolByCode.name,
          classes: (classes ?? []) as SchoolClass[],
        },
      }
    }

    // 2. 클래스 코드 확인
    const { data: classByCode } = await admin
      .from('classes')
      .select('id, name, school_id')
      .eq('class_code', normalized)
      .maybeSingle()

    if (classByCode) {
      // 스쿨에도 자동 가입 (pending) — upsert로 안전하게
      if (classByCode.school_id) {
        await admin.from('school_members').upsert({
          school_id: classByCode.school_id,
          user_id: user.id,
          role: 'student',
          status: 'pending',
        }, { onConflict: 'school_id,user_id' })
      }

      // 클래스 수강신청 (pending) — upsert로 안전하게
      const { error: enrollErr } = await admin.from('class_enrollments').upsert({
        class_id: classByCode.id,
        student_id: user.id,
        status: 'pending',
      }, { onConflict: 'class_id,student_id' })

      if (enrollErr) {
        console.error('[joinWithCode] enrollment failed:', enrollErr)
        return { error: '수강신청 실패: ' + enrollErr.message }
      }

      return {
        data: {
          type: 'class',
          className: classByCode.name,
        },
      }
    }

    return { error: '유효하지 않은 코드입니다.' }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Student requests enrollment to a class (within a school they're already in).
 */
export async function requestClassEnrollment(
  classId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('class_enrollments')
      .select('status')
      .eq('class_id', classId)
      .eq('student_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'approved') return { error: '이미 수강 중입니다.' }
      if (existing.status === 'pending') return { error: '이미 신청했습니다. 승인을 기다리세요.' }
    }

    const { error } = await admin.from('class_enrollments').insert({
      class_id: classId,
      student_id: user.id,
      status: 'pending',
    })

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Teacher/admin approves a class enrollment.
 * Also creates class_students row + initializes student_progress for skill trees.
 */
export async function approveEnrollment(
  enrollmentId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    const { data: enrollment } = await admin
      .from('class_enrollments')
      .select('class_id, student_id')
      .eq('id', enrollmentId)
      .single()

    if (!enrollment) return { error: '수강신청을 찾을 수 없습니다.' }

    // 1. enrollment status → approved
    await admin
      .from('class_enrollments')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', enrollmentId)

    // 2. class_students에도 추가 (기존 테이블 유지)
    await admin.from('class_students').upsert({
      class_id: enrollment.class_id,
      student_id: enrollment.student_id,
    }, { onConflict: 'class_id,student_id' })

    // 3. school_members 상태도 approved로 (pending이었다면)
    const { data: classData } = await admin
      .from('classes')
      .select('school_id')
      .eq('id', enrollment.class_id)
      .single()

    if (classData?.school_id) {
      await admin
        .from('school_members')
        .update({ status: 'approved' })
        .eq('school_id', classData.school_id)
        .eq('user_id', enrollment.student_id)
    }

    // 4. 해당 클래스의 스킬트리 → student_progress 초기화
    const { data: trees } = await admin
      .from('skill_trees')
      .select('id')
      .eq('class_id', enrollment.class_id)

    if (trees) {
      for (const tree of trees) {
        const { data: nodes } = await admin
          .from('nodes')
          .select('id')
          .eq('skill_tree_id', tree.id)

        const { data: edges } = await admin
          .from('node_edges')
          .select('source_node_id, target_node_id')
          .eq('skill_tree_id', tree.id)

        // 루트 노드(들어오는 엣지 없음) → available, 나머지 → locked
        const targetIds = new Set(edges?.map(e => e.target_node_id) ?? [])
        const progressInserts = (nodes ?? []).map(n => ({
          student_id: enrollment.student_id,
          node_id: n.id,
          skill_tree_id: tree.id,
          status: targetIds.has(n.id) ? 'locked' : 'available',
        }))

        if (progressInserts.length > 0) {
          await admin.from('student_progress').upsert(progressInserts, {
            onConflict: 'student_id,node_id',
          })
        }
      }
    }

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function rejectEnrollment(
  enrollmentId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('class_enrollments')
      .update({ status: 'rejected' })
      .eq('id', enrollmentId)

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

// ============================================
// Teacher / Student: getMyClasses
// ============================================

export async function getMyClasses(): Promise<{
  data?: Array<SchoolClass & { school_name?: string; student_count: number; skill_tree_count: number }>
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 역할 확인
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let classes: SchoolClass[] = []
    if (profile?.role === 'teacher') {
      const { data } = await admin
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
      classes = (data ?? []) as SchoolClass[]
    } else if (profile?.role === 'student') {
      const { data: enrollments } = await admin
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', user.id)
        .eq('status', 'approved')

      const classIds = enrollments?.map(e => e.class_id) ?? []
      if (classIds.length > 0) {
        const { data } = await admin
          .from('classes')
          .select('*')
          .in('id', classIds)
        classes = (data ?? []) as SchoolClass[]
      }
    }

    // 스쿨명 + 학생 수 + 스킬트리 수
    const schoolIds = [...new Set(classes.map(c => c.school_id).filter(Boolean))] as string[]
    const { data: schools } = await admin
      .from('schools')
      .select('id, name')
      .in('id', schoolIds.length > 0 ? schoolIds : ['00000000-0000-0000-0000-000000000000'])
    const schoolNameMap = new Map(schools?.map(s => [s.id, s.name]) ?? [])

    const enriched = await Promise.all(
      classes.map(async (c) => {
        const { count: studentCount } = await admin
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', c.id)
          .eq('status', 'approved')

        const { count: treeCount } = await admin
          .from('skill_trees')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', c.id)

        return {
          ...c,
          school_name: c.school_id ? schoolNameMap.get(c.school_id) : undefined,
          student_count: studentCount ?? 0,
          skill_tree_count: treeCount ?? 0,
        }
      })
    )

    return { data: enriched }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getClassEnrollments(
  classId: string
): Promise<{ data?: Array<{ id: string; student_id: string; student_name: string; student_email: string; status: string; requested_at: string }>; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('id, student_id, status, requested_at')
      .eq('class_id', classId)
      .order('requested_at', { ascending: false })

    const studentIds = enrollments?.map(e => e.student_id) ?? []
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email')
      .in('id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])

    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])
    return {
      data: (enrollments ?? []).map(e => ({
        id: e.id,
        student_id: e.student_id,
        student_name: profileMap.get(e.student_id)?.name ?? '익명',
        student_email: profileMap.get(e.student_id)?.email ?? '',
        status: e.status,
        requested_at: e.requested_at,
      })),
    }
  } catch (err) {
    return { error: String(err) }
  }
}

// ============================================
// Demo login
// ============================================

export async function loginAsDemo(
  role: 'teacher' | 'student'
): Promise<{ data?: { redirect: string }; error?: string }> {
  try {
    const { setupDemoData } = await import('./demo-setup')
    // Idempotent: 첫 호출 시에만 데이터 생성
    const setupResult = await setupDemoData()
    if (setupResult.error) {
      return { error: '데모 설정 실패: ' + setupResult.error }
    }

    const email = role === 'teacher' ? 'demo_teacher@learngraph.app' : 'demo_student1@learngraph.app'
    const password = 'demo1234'

    const supabase = await createServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return { error: '데모 로그인 실패: ' + error.message }
    return { data: { redirect: `/${role}` } }
  } catch (err) {
    return { error: String(err) }
  }
}
