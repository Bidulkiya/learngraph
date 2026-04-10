'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'

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

/**
 * 학생의 "내 학습" 페이지에서 사용하는 클래스 → 스킬트리 중첩 구조.
 * 각 클래스마다 소속된 published 스킬트리 + 내 진도를 함께 반환한다.
 */
export interface ClassWithSkillTrees {
  id: string
  name: string
  description: string | null
  teacher_id: string | null
  teacher_name: string | null
  school_name: string | null
  skill_trees: Array<{
    id: string
    title: string
    description: string | null
    subject_hint: string | null
    total_nodes: number
    completed_nodes: number
    progress_percent: number
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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    if (!name.trim()) return { error: '스쿨 이름을 입력해주세요.' }
    if (name.length > 100) return { error: '스쿨 이름이 너무 깁니다.' }
    if (description.length > 1000) return { error: '설명이 너무 깁니다.' }

    const admin = createAdminClient()

    // 운영자(admin) 역할만 스쿨 생성 가능
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') {
      return { error: '운영자만 스쿨을 생성할 수 있습니다.' }
    }

    const { data, error } = await admin
      .from('schools')
      .insert({ name: name.trim(), description: description.trim(), created_by: user.id })
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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: schools } = await admin
      .from('schools')
      .select('id, name, description, teacher_code, student_code, created_by, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (!schools || schools.length === 0) return { data: [] }

    // ✅ N+1 최적화: 모든 스쿨의 멤버를 1번의 IN 쿼리로
    const schoolIds = schools.map(s => s.id)
    const { data: allMembers } = await admin
      .from('school_members')
      .select('school_id, role')
      .in('school_id', schoolIds)
      .eq('status', 'approved')

    const teacherCountMap = new Map<string, number>()
    const studentCountMap = new Map<string, number>()
    allMembers?.forEach(m => {
      if (m.role === 'teacher') {
        teacherCountMap.set(m.school_id, (teacherCountMap.get(m.school_id) ?? 0) + 1)
      } else if (m.role === 'student') {
        studentCountMap.set(m.school_id, (studentCountMap.get(m.school_id) ?? 0) + 1)
      }
    })

    const schoolsWithCounts = schools.map(s => ({
      ...s,
      teacher_count: teacherCountMap.get(s.id) ?? 0,
      student_count: studentCountMap.get(s.id) ?? 0,
    }))

    return { data: schoolsWithCounts }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getSchoolDetail(
  schoolId: string
): Promise<{ data?: SchoolDetailData; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    const { data: school } = await admin
      .from('schools')
      .select('id, name, description, teacher_code, student_code, created_by, created_at')
      .eq('id', schoolId)
      .single()

    if (!school) return { error: '스쿨을 찾을 수 없습니다.' }

    // 권한: 스쿨 소유자(admin) 또는 승인된 멤버만
    if (school.created_by !== user.id) {
      const { data: membership } = await admin
        .from('school_members')
        .select('status, role')
        .eq('school_id', schoolId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!membership || membership.status !== 'approved') {
        return { error: '이 스쿨을 조회할 권한이 없습니다.' }
      }
    }

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
      .select('id, school_id, name, description, class_code, teacher_id, max_students, created_at')
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

/**
 * 특정 스쿨의 소유자(created_by) 인지 확인.
 */
async function assertSchoolOwnership(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  schoolId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: school } = await admin
    .from('schools')
    .select('created_by')
    .eq('id', schoolId)
    .maybeSingle()
  if (!school) return { ok: false, error: '스쿨을 찾을 수 없습니다.' }
  if (school.created_by !== userId) {
    return { ok: false, error: '이 스쿨을 관리할 권한이 없습니다.' }
  }
  return { ok: true }
}

export async function approveSchoolMember(
  schoolId: string,
  userId: string
): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertSchoolOwnership(admin, user.id, schoolId)
    if (!auth.ok) return { error: auth.error }

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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertSchoolOwnership(admin, user.id, schoolId)
    if (!auth.ok) return { error: auth.error }

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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    if (!name.trim()) return { error: '클래스 이름을 입력해주세요.' }
    if (name.length > 100) return { error: '클래스 이름이 너무 깁니다.' }
    if (description.length > 500) return { error: '설명이 너무 깁니다.' }

    const admin = createAdminClient()
    // 스쿨 소유자만 클래스 생성 가능
    const auth = await assertSchoolOwnership(admin, user.id, schoolId)
    if (!auth.ok) return { error: auth.error }

    // 지정된 teacherId가 이 스쿨에 소속된 교사인지 확인
    const { data: teacherMembership } = await admin
      .from('school_members')
      .select('role, status')
      .eq('school_id', schoolId)
      .eq('user_id', teacherId)
      .maybeSingle()
    if (!teacherMembership || teacherMembership.role !== 'teacher' || teacherMembership.status !== 'approved') {
      return { error: '지정한 교사가 이 스쿨의 승인된 교사가 아닙니다.' }
    }

    const { data, error } = await admin
      .from('classes')
      .insert({
        school_id: schoolId,
        name: name.trim(),
        description: description.trim(),
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
 * 내가 소속된 스쿨 목록 (교사/학생 공용)
 */
export async function getMySchoolMemberships(): Promise<{
  data?: Array<{
    school_id: string
    school_name: string
    role: string
    status: string
    joined_at: string
  }>
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: memberships } = await admin
      .from('school_members')
      .select('school_id, role, status, joined_at')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) return { data: [] }

    const schoolIds = memberships.map(m => m.school_id)
    const { data: schools } = await admin
      .from('schools')
      .select('id, name')
      .in('id', schoolIds)

    const nameMap = new Map(schools?.map(s => [s.id, s.name]) ?? [])

    return {
      data: memberships.map(m => ({
        school_id: m.school_id,
        school_name: nameMap.get(m.school_id) ?? '알 수 없음',
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
      })),
    }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Teacher joins school via teacher_code.
 */
export async function joinSchoolAsTeacher(
  teacherCode: string
): Promise<{ data?: { schoolId: string; schoolName: string }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()

    // .maybeSingle()로 안전하게 (레코드 없으면 null, throw 방지)
    const { data: school, error: schoolErr } = await admin
      .from('schools')
      .select('id, name')
      .eq('teacher_code', teacherCode.trim().toUpperCase())
      .maybeSingle()

    if (schoolErr) {
      console.error('[joinSchoolAsTeacher] school lookup:', schoolErr)
      return { error: '스쿨 조회 실패: ' + schoolErr.message }
    }
    if (!school) return { error: '유효하지 않은 교사 코드입니다.' }

    // upsert 패턴: 이미 있으면 status를 approved로, 없으면 insert
    const { error: upsertErr } = await admin.from('school_members').upsert({
      school_id: school.id,
      user_id: user.id,
      role: 'teacher',
      status: 'approved',
    }, { onConflict: 'school_id,user_id' })

    if (upsertErr) {
      console.error('[joinSchoolAsTeacher] upsert:', upsertErr)
      return { error: '가입 실패: ' + upsertErr.message }
    }

    return { data: { schoolId: school.id, schoolName: school.name } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[joinSchoolAsTeacher]', msg)
    return { error: msg }
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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

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
        .select('id, school_id, name, description, class_code, teacher_id, max_students, created_at')
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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

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
 * enrollment → class → school 권한 확인: 담당 교사 또는 스쿨 소유자만 승인/거부.
 */
async function assertCanModifyEnrollment(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  enrollmentId: string
): Promise<{ ok: boolean; error?: string; enrollment?: { class_id: string; student_id: string } }> {
  const { data: enrollment } = await admin
    .from('class_enrollments')
    .select('class_id, student_id')
    .eq('id', enrollmentId)
    .maybeSingle()
  if (!enrollment) return { ok: false, error: '수강신청을 찾을 수 없습니다.' }

  const { data: cls } = await admin
    .from('classes')
    .select('teacher_id, school_id')
    .eq('id', enrollment.class_id)
    .maybeSingle()
  if (!cls) return { ok: false, error: '클래스를 찾을 수 없습니다.' }

  if (cls.teacher_id === userId) return { ok: true, enrollment }

  if (cls.school_id) {
    const { data: school } = await admin
      .from('schools')
      .select('created_by')
      .eq('id', cls.school_id)
      .maybeSingle()
    if (school?.created_by === userId) return { ok: true, enrollment }
  }

  return { ok: false, error: '이 수강신청을 관리할 권한이 없습니다.' }
}

/**
 * Teacher/admin approves a class enrollment.
 * Also creates class_students row + initializes student_progress for skill trees.
 */
export async function approveEnrollment(
  enrollmentId: string
): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()

    const auth = await assertCanModifyEnrollment(admin, user.id, enrollmentId)
    if (!auth.ok || !auth.enrollment) return { error: auth.error }
    const enrollment = auth.enrollment

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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertCanModifyEnrollment(admin, user.id, enrollmentId)
    if (!auth.ok) return { error: auth.error }

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
    const user = await getCachedUser()
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
        .select('id, school_id, name, description, class_code, teacher_id, max_students, created_at')
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
          .select('id, school_id, name, description, class_code, teacher_id, max_students, created_at')
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

    // N+1 최적화: 모든 클래스의 enrollments + skill_trees를 한 번에 조회
    const classIds = classes.map(c => c.id)
    const [{ data: allEnrollments }, { data: allTrees }] = await Promise.all([
      admin
        .from('class_enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'approved'),
      admin
        .from('skill_trees')
        .select('class_id')
        .in('class_id', classIds),
    ])

    // JS에서 count 집계
    const enrollmentCountMap = new Map<string, number>()
    allEnrollments?.forEach(e => {
      enrollmentCountMap.set(e.class_id, (enrollmentCountMap.get(e.class_id) ?? 0) + 1)
    })
    const treeCountMap = new Map<string, number>()
    allTrees?.forEach(t => {
      if (t.class_id) treeCountMap.set(t.class_id, (treeCountMap.get(t.class_id) ?? 0) + 1)
    })

    const enriched = classes.map(c => ({
      ...c,
      school_name: c.school_id ? schoolNameMap.get(c.school_id) : undefined,
      student_count: enrollmentCountMap.get(c.id) ?? 0,
      skill_tree_count: treeCountMap.get(c.id) ?? 0,
    }))

    return { data: enriched }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getClassEnrollments(
  classId: string
): Promise<{ data?: Array<{ id: string; student_id: string; student_name: string; student_email: string; status: string; requested_at: string }>; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 권한 확인: 담당 교사 또는 스쿨 소유자(admin)만
    const { data: cls } = await admin
      .from('classes')
      .select('teacher_id, school_id')
      .eq('id', classId)
      .maybeSingle()
    if (!cls) return { error: '클래스를 찾을 수 없습니다.' }
    let allowed = cls.teacher_id === user.id
    if (!allowed && cls.school_id) {
      const { data: school } = await admin
        .from('schools')
        .select('created_by')
        .eq('id', cls.school_id)
        .maybeSingle()
      if (school?.created_by === user.id) allowed = true
    }
    if (!allowed) return { error: '이 클래스의 수강신청 목록을 조회할 권한이 없습니다.' }

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
// Student: My Learning (Class → Skill Trees 2-level)
// ============================================

/**
 * 학생의 "내 학습" 페이지 데이터:
 * 내가 approved된 모든 클래스 + 각 클래스의 published 스킬트리 + 스킬트리별 진도.
 *
 * 병합된 단일 API라 대시보드 쿼리 N+1을 피하고, 클라이언트는 이 결과만으로
 * 클래스 → 스킬트리 2단계 아코디언 UI를 렌더할 수 있다.
 */
export async function getMyClassesWithSkillTrees(): Promise<{
  data?: ClassWithSkillTrees[]
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 1. 학생의 approved enrollments
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', user.id)
      .eq('status', 'approved')

    const classIds = enrollments?.map(e => e.class_id) ?? []
    if (classIds.length === 0) return { data: [] }

    // 2. 클래스 정보 (병렬로 teacher/school도 가져오기 위해 teacher_id, school_id 수집)
    const { data: classes } = await admin
      .from('classes')
      .select('id, name, description, teacher_id, school_id, created_at')
      .in('id', classIds)
      .order('created_at', { ascending: false })

    if (!classes || classes.length === 0) return { data: [] }

    const teacherIds = [...new Set(
      classes.map(c => c.teacher_id).filter((v): v is string => !!v)
    )]
    const schoolIds = [...new Set(
      classes.map(c => c.school_id).filter((v): v is string => !!v)
    )]

    // 3. 교사 이름 + 학교 이름 + 클래스들의 published 스킬트리 병렬 조회
    const [teachersRes, schoolsRes, treesRes] = await Promise.all([
      teacherIds.length > 0
        ? admin.from('profiles').select('id, name').in('id', teacherIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      schoolIds.length > 0
        ? admin.from('schools').select('id, name').in('id', schoolIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      admin
        .from('skill_trees')
        .select('id, title, description, subject_hint, class_id, created_at')
        .in('class_id', classIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
    ])

    const teacherMap = new Map(
      (teachersRes.data ?? []).map(t => [t.id, t.name])
    )
    const schoolMap = new Map(
      (schoolsRes.data ?? []).map(s => [s.id, s.name])
    )
    const trees = treesRes.data ?? []
    const treeIds = trees.map(t => t.id)

    // 4. 각 스킬트리의 노드 목록 + 학생 진도 병렬 조회
    const [nodesRes, progressRes] = await Promise.all([
      treeIds.length > 0
        ? admin
            .from('nodes')
            .select('id, skill_tree_id')
            .in('skill_tree_id', treeIds)
        : Promise.resolve({ data: [] as Array<{ id: string; skill_tree_id: string }> }),
      admin
        .from('student_progress')
        .select('node_id, status')
        .eq('student_id', user.id)
        .eq('status', 'completed'),
    ])

    // 5. 노드 → 트리 매핑 + 완료 진도 Set
    const nodesByTree = new Map<string, string[]>()
    for (const n of nodesRes.data ?? []) {
      const list = nodesByTree.get(n.skill_tree_id) ?? []
      list.push(n.id)
      nodesByTree.set(n.skill_tree_id, list)
    }
    const completedNodeIds = new Set(
      (progressRes.data ?? []).map(p => p.node_id)
    )

    // 6. 클래스별 스킬트리 집계
    const treesByClass = new Map<string, ClassWithSkillTrees['skill_trees']>()
    for (const tree of trees) {
      const nodeIds = nodesByTree.get(tree.id) ?? []
      const totalNodes = nodeIds.length
      const completedCount = nodeIds.filter(id => completedNodeIds.has(id)).length
      const progressPercent = totalNodes > 0
        ? Math.round((completedCount / totalNodes) * 100)
        : 0

      const list = treesByClass.get(tree.class_id) ?? []
      list.push({
        id: tree.id,
        title: tree.title,
        description: tree.description,
        subject_hint: tree.subject_hint ?? null,
        total_nodes: totalNodes,
        completed_nodes: completedCount,
        progress_percent: progressPercent,
      })
      treesByClass.set(tree.class_id, list)
    }

    // 7. 최종 조립 (클래스 순서 유지)
    const result: ClassWithSkillTrees[] = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      teacher_id: cls.teacher_id,
      teacher_name: cls.teacher_id ? teacherMap.get(cls.teacher_id) ?? null : null,
      school_name: cls.school_id ? schoolMap.get(cls.school_id) ?? null : null,
      skill_trees: treesByClass.get(cls.id) ?? [],
    }))

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}

// ============================================
// Demo login
// ============================================

/**
 * 데모 환경 구축 후, 데모 계정 이메일과 비밀번호를 클라이언트에 반환.
 * 클라이언트가 직접 supabase.auth.signInWithPassword()를 호출해
 * 브라우저 쿠키가 정확히 설정되도록 한다 (서버 쪽 로그인은 클라이언트
 * 세션에 반영되지 않아 redirect 후에도 미인증 상태가 됨).
 */
export async function loginAsDemo(
  role: 'teacher' | 'student'
): Promise<{ data?: { email: string; password: string; redirect: string }; error?: string }> {
  try {
    const { setupDemoData } = await import('./demo-setup')
    const { DEMO_TEACHER_EMAIL, DEMO_STUDENT_EMAIL, DEMO_PASSWORD } = await import('@/lib/demo')

    // Idempotent: 이미 있으면 내부적으로 스킵
    const setupResult = await setupDemoData()
    if (setupResult.error) {
      return { error: '데모 환경 구축 실패: ' + setupResult.error }
    }

    return {
      data: {
        email: role === 'teacher' ? DEMO_TEACHER_EMAIL : DEMO_STUDENT_EMAIL,
        password: DEMO_PASSWORD,
        redirect: `/${role}`,
      },
    }
  } catch (err) {
    return { error: String(err) }
  }
}
