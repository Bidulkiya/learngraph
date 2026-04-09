'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 대시보드 컨텍스트 선택기 (ContextSelector) 용 계층 데이터 API.
 *
 * - 교사: 내 클래스 → 각 클래스의 스킬트리
 * - 운영자: 내가 만든 스쿨의 클래스 → 교사 → 스킬트리 (3단계)
 *
 * 그리고 노드별 언락율 집계 API도 함께 제공한다:
 * - getNodeUnlockRates(skillTreeId): 각 노드의 언락 비율
 */

// ============================================
// 공통 타입
// ============================================

export interface ContextClass {
  id: string
  name: string
  school_name?: string | null
  teacher_id?: string | null
}

export interface ContextTeacher {
  id: string
  name: string
  nickname?: string | null
  avatar_url?: string | null
}

export interface ContextSkillTree {
  id: string
  title: string
  class_id: string | null
  created_by: string
}

export interface TeacherContextHierarchy {
  classes: ContextClass[]
  skillTrees: ContextSkillTree[]
}

export interface AdminContextHierarchy {
  classes: ContextClass[]
  teachers: ContextTeacher[]
  skillTrees: ContextSkillTree[]
}

// ============================================
// 교사 컨텍스트 계층 조회
// ============================================

/**
 * 교사용: 내 클래스 + 각 클래스의 스킬트리 + 내가 만든 개인 스킬트리까지.
 * ContextSelector가 이 결과로 드롭다운 옵션을 구성.
 */
export async function getTeacherContextHierarchy(): Promise<{
  data?: TeacherContextHierarchy
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 1. 내 클래스
    const { data: classes } = await admin
      .from('classes')
      .select('id, name, school_id')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    // 스쿨 이름 매핑 (선택적)
    const schoolIds = (classes ?? [])
      .map(c => c.school_id)
      .filter((s): s is string => !!s)
    const schoolNameMap = new Map<string, string>()
    if (schoolIds.length > 0) {
      const { data: schools } = await admin
        .from('schools')
        .select('id, name')
        .in('id', schoolIds)
      schools?.forEach(s => schoolNameMap.set(s.id, s.name))
    }

    const classList: ContextClass[] = (classes ?? []).map(c => ({
      id: c.id,
      name: c.name,
      school_name: c.school_id ? schoolNameMap.get(c.school_id) ?? null : null,
      teacher_id: user.id,
    }))

    // 2. 내가 만든 스킬트리 + 내 클래스에 배정된 스킬트리 (중복 제거)
    const classIds = classList.map(c => c.id)
    const [ownTreesRes, classTreesRes] = await Promise.all([
      admin
        .from('skill_trees')
        .select('id, title, class_id, created_by')
        .eq('created_by', user.id),
      classIds.length > 0
        ? admin
            .from('skill_trees')
            .select('id, title, class_id, created_by')
            .in('class_id', classIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; title: string; class_id: string | null; created_by: string }>,
          }),
    ])

    const treeMap = new Map<string, ContextSkillTree>()
    ;(ownTreesRes.data ?? []).forEach(t => treeMap.set(t.id, {
      id: t.id,
      title: t.title,
      class_id: t.class_id,
      created_by: t.created_by,
    }))
    ;(classTreesRes.data ?? []).forEach(t => treeMap.set(t.id, {
      id: t.id,
      title: t.title,
      class_id: t.class_id,
      created_by: t.created_by,
    }))

    return {
      data: {
        classes: classList,
        skillTrees: Array.from(treeMap.values()),
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 운영자 컨텍스트 계층 조회
// ============================================

/**
 * 운영자용: 내가 만든 스쿨의 클래스 + 교사 + 스킬트리.
 */
export async function getAdminContextHierarchy(): Promise<{
  data?: AdminContextHierarchy
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 권한: admin만
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') {
      return { error: '운영자만 접근할 수 있습니다.' }
    }

    // 1. 내가 만든 스쿨
    const { data: schools } = await admin
      .from('schools')
      .select('id, name')
      .eq('created_by', user.id)
    const schoolIds = (schools ?? []).map(s => s.id)

    if (schoolIds.length === 0) {
      return {
        data: { classes: [], teachers: [], skillTrees: [] },
      }
    }

    const schoolNameMap = new Map((schools ?? []).map(s => [s.id, s.name]))

    // 2. 스쿨의 클래스
    const { data: classes } = await admin
      .from('classes')
      .select('id, name, school_id, teacher_id')
      .in('school_id', schoolIds)
      .order('created_at', { ascending: false })

    const classList: ContextClass[] = (classes ?? []).map(c => ({
      id: c.id,
      name: c.name,
      school_name: c.school_id ? schoolNameMap.get(c.school_id) ?? null : null,
      teacher_id: c.teacher_id,
    }))

    // 3. 스쿨의 승인된 교사
    const { data: teacherMembers } = await admin
      .from('school_members')
      .select('user_id')
      .in('school_id', schoolIds)
      .eq('role', 'teacher')
      .eq('status', 'approved')
    const teacherIds = [...new Set((teacherMembers ?? []).map(m => m.user_id))]

    let teachers: ContextTeacher[] = []
    if (teacherIds.length > 0) {
      const { data: teacherProfiles } = await admin
        .from('profiles')
        .select('id, name, nickname, avatar_url')
        .in('id', teacherIds)
      teachers = (teacherProfiles ?? []).map(p => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname ?? null,
        avatar_url: p.avatar_url ?? null,
      }))
    }

    // 4. 클래스에 배정된 스킬트리 + 해당 스쿨 교사가 만든 개인 스킬트리
    const classIds = classList.map(c => c.id)
    const [classTreesRes, teacherTreesRes] = await Promise.all([
      classIds.length > 0
        ? admin
            .from('skill_trees')
            .select('id, title, class_id, created_by')
            .in('class_id', classIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; title: string; class_id: string | null; created_by: string }>,
          }),
      teacherIds.length > 0
        ? admin
            .from('skill_trees')
            .select('id, title, class_id, created_by')
            .in('created_by', teacherIds)
            .is('class_id', null)
        : Promise.resolve({
            data: [] as Array<{ id: string; title: string; class_id: string | null; created_by: string }>,
          }),
    ])

    const treeMap = new Map<string, ContextSkillTree>()
    ;(classTreesRes.data ?? []).forEach(t => treeMap.set(t.id, {
      id: t.id,
      title: t.title,
      class_id: t.class_id,
      created_by: t.created_by,
    }))
    ;(teacherTreesRes.data ?? []).forEach(t => treeMap.set(t.id, {
      id: t.id,
      title: t.title,
      class_id: t.class_id,
      created_by: t.created_by,
    }))

    return {
      data: {
        classes: classList,
        teachers,
        skillTrees: Array.from(treeMap.values()),
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 노드별 언락율 조회 (교사/운영자 공용)
// ============================================

export interface NodeUnlockRate {
  node_id: string
  node_title: string
  difficulty: number
  unlocked_count: number
  total_students: number
  unlock_rate: number // 0-100
}

export interface NodeUnlockRateResult {
  skill_tree_id: string
  skill_tree_title: string
  total_students: number
  nodes: NodeUnlockRate[]
}

/**
 * 특정 스킬트리의 노드별 언락율 집계.
 *
 * 정의:
 * - total_students: 해당 스킬트리에 student_progress 엔트리가 있는 학생 수
 * - unlocked_count: 그 학생들 중 해당 노드를 완료한 수
 * - unlock_rate: unlocked_count / total_students * 100
 *
 * 권한:
 * - 스킬트리 소유자 또는 클래스 담당 교사 또는 admin
 */
export async function getNodeUnlockRates(
  skillTreeId: string,
): Promise<{ data?: NodeUnlockRateResult; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 권한 확인
    const { data: tree } = await admin
      .from('skill_trees')
      .select('id, title, created_by, class_id')
      .eq('id', skillTreeId)
      .maybeSingle()
    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    let allowed = tree.created_by === user.id
    if (!allowed && tree.class_id) {
      const { data: cls } = await admin
        .from('classes')
        .select('teacher_id')
        .eq('id', tree.class_id)
        .maybeSingle()
      if (cls?.teacher_id === user.id) allowed = true
    }
    if (!allowed) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role === 'admin') allowed = true
    }
    if (!allowed) return { error: '이 스킬트리에 접근할 권한이 없습니다.' }

    // 노드 조회
    const { data: nodes } = await admin
      .from('nodes')
      .select('id, title, difficulty, order_index')
      .eq('skill_tree_id', skillTreeId)
      .order('order_index')

    if (!nodes || nodes.length === 0) {
      return {
        data: {
          skill_tree_id: skillTreeId,
          skill_tree_title: tree.title,
          total_students: 0,
          nodes: [],
        },
      }
    }

    // student_progress에서 이 스킬트리에 엔트리가 있는 학생 + 상태 집계
    const { data: progressRows } = await admin
      .from('student_progress')
      .select('student_id, node_id, status')
      .eq('skill_tree_id', skillTreeId)

    const uniqueStudents = new Set((progressRows ?? []).map(p => p.student_id))
    const totalStudents = uniqueStudents.size

    // 노드별 완료 수 집계
    const completedByNode = new Map<string, number>()
    ;(progressRows ?? []).forEach(p => {
      if (p.status === 'completed') {
        completedByNode.set(p.node_id, (completedByNode.get(p.node_id) ?? 0) + 1)
      }
    })

    const nodeRates: NodeUnlockRate[] = nodes.map(n => ({
      node_id: n.id,
      node_title: n.title,
      difficulty: n.difficulty ?? 1,
      unlocked_count: completedByNode.get(n.id) ?? 0,
      total_students: totalStudents,
      unlock_rate: totalStudents > 0
        ? Math.round(((completedByNode.get(n.id) ?? 0) / totalStudents) * 100)
        : 0,
    }))

    return {
      data: {
        skill_tree_id: skillTreeId,
        skill_tree_title: tree.title,
        total_students: totalStudents,
        nodes: nodeRates,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 운영자 대시보드 — 필터 기반 통합 데이터
// ============================================

export interface AdminFilteredDashboardData {
  overview: {
    totalSchools: number
    totalClasses: number
    totalTeachers: number
    totalStudents: number
    totalSkillTrees: number
  }
  classProgress: Array<{
    class_id: string
    class_name: string
    avg_progress: number // 0-100
    student_count: number
  }>
  riskBuckets: {
    low: number
    medium: number
    high: number
    critical: number
  }
  emotionBuckets: {
    confident: number
    neutral: number
    struggling: number
    frustrated: number
    unknown: number
  }
  teacherActivity: Array<{
    teacher_id: string
    teacher_name: string
    teacher_nickname: string | null
    skill_tree_count: number
    last_active_at: string | null
    is_inactive: boolean // 7일 이상 비활동
  }>
}

export interface AdminDashboardFilters {
  classId?: string
  teacherId?: string
  skillTreeId?: string
}

/**
 * 운영자 대시보드 통합 필터 데이터.
 *
 * 필터에 따라:
 * - classId 지정: 해당 클래스만
 * - teacherId 지정: 해당 교사의 학생/스킬트리만 (클래스 필터와 교집합)
 * - skillTreeId 지정: 해당 트리의 학생만
 *
 * 모두 undefined면 내 스쿨 전체.
 */
export async function getAdminFilteredDashboard(
  filters: AdminDashboardFilters = {},
): Promise<{ data?: AdminFilteredDashboardData; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') {
      return { error: '운영자만 접근할 수 있습니다.' }
    }

    // 1. 내 스쿨
    const { data: schools } = await admin
      .from('schools')
      .select('id, name')
      .eq('created_by', user.id)
    const schoolIds = (schools ?? []).map(s => s.id)

    if (schoolIds.length === 0) {
      return {
        data: emptyAdminDashboard(),
      }
    }

    // 2. 클래스 필터 적용
    const classFilter = filters.classId
    const { data: allClasses } = await admin
      .from('classes')
      .select('id, name, teacher_id, school_id')
      .in('school_id', schoolIds)
    const classes = classFilter
      ? (allClasses ?? []).filter(c => c.id === classFilter)
      : (allClasses ?? [])
    const classIds = classes.map(c => c.id)

    // 3. 교사 필터 적용
    const teacherFilter = filters.teacherId
    const teacherIdsInScope = teacherFilter
      ? classes.filter(c => c.teacher_id === teacherFilter).map(c => c.teacher_id).filter(Boolean)
      : [...new Set(classes.map(c => c.teacher_id).filter(Boolean) as string[])]

    // 교사 필터가 있으면 해당 교사의 클래스로 재제한
    const filteredClassIds = teacherFilter
      ? classes.filter(c => c.teacher_id === teacherFilter).map(c => c.id)
      : classIds

    // 4. 스킬트리 필터
    const treeFilter = filters.skillTreeId

    // 5. 스쿨 전체 통계
    const { data: schoolMembers } = await admin
      .from('school_members')
      .select('user_id, role')
      .in('school_id', schoolIds)
      .eq('status', 'approved')
    const allTeachers = (schoolMembers ?? []).filter(m => m.role === 'teacher').map(m => m.user_id)
    const allStudents = (schoolMembers ?? []).filter(m => m.role === 'student').map(m => m.user_id)

    // 6. 스킬트리 조회 (스쿨 기준)
    const { count: totalSkillTrees } = await admin
      .from('skill_trees')
      .select('*', { count: 'exact', head: true })
      .in('class_id', classIds.length > 0 ? classIds : ['00000000-0000-0000-0000-000000000000'])

    // 7. 필터 적용된 학생 ID 목록
    let filteredStudentIds: string[] = allStudents
    if (filteredClassIds.length > 0) {
      const { data: enrolls } = await admin
        .from('class_enrollments')
        .select('student_id')
        .in('class_id', filteredClassIds)
        .eq('status', 'approved')
      filteredStudentIds = [...new Set((enrolls ?? []).map(e => e.student_id))]
    } else if (classFilter || teacherFilter) {
      // 필터가 있는데 맞는 학생이 없음
      filteredStudentIds = []
    }

    // 8. 클래스별 진도율 (필터 전체일 때 유의미)
    const classProgress: AdminFilteredDashboardData['classProgress'] = []
    if (classes.length > 0) {
      // 각 클래스별 enrollments + progress 계산
      for (const cls of classes) {
        const { data: enrolls } = await admin
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', cls.id)
          .eq('status', 'approved')
        const cStudentIds = (enrolls ?? []).map(e => e.student_id)
        if (cStudentIds.length === 0) {
          classProgress.push({
            class_id: cls.id,
            class_name: cls.name,
            avg_progress: 0,
            student_count: 0,
          })
          continue
        }

        // 이 클래스에 배정된 스킬트리들의 진도
        const { data: classTreeList } = await admin
          .from('skill_trees')
          .select('id')
          .eq('class_id', cls.id)
        const classTreeIds = (classTreeList ?? []).map(t => t.id)

        if (classTreeIds.length === 0) {
          classProgress.push({
            class_id: cls.id,
            class_name: cls.name,
            avg_progress: 0,
            student_count: cStudentIds.length,
          })
          continue
        }

        const { data: prog } = await admin
          .from('student_progress')
          .select('status')
          .in('student_id', cStudentIds)
          .in('skill_tree_id', classTreeIds)

        const total = prog?.length ?? 0
        const completed = prog?.filter(p => p.status === 'completed').length ?? 0
        classProgress.push({
          class_id: cls.id,
          class_name: cls.name,
          avg_progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          student_count: cStudentIds.length,
        })
      }
    }

    // 9. 위험 버킷 — quiz_attempts 기반 간이 계산 (최근 20회 중 오답율)
    const riskBuckets = { low: 0, medium: 0, high: 0, critical: 0 }
    if (filteredStudentIds.length > 0) {
      const { data: recentAttempts } = await admin
        .from('quiz_attempts')
        .select('student_id, is_correct')
        .in('student_id', filteredStudentIds)
        .order('attempted_at', { ascending: false })
        .limit(filteredStudentIds.length * 20)

      const attemptsByStudent = new Map<string, { total: number; wrong: number }>()
      ;(recentAttempts ?? []).forEach(a => {
        const cur = attemptsByStudent.get(a.student_id) ?? { total: 0, wrong: 0 }
        cur.total += 1
        if (!a.is_correct) cur.wrong += 1
        attemptsByStudent.set(a.student_id, cur)
      })

      for (const sid of filteredStudentIds) {
        const stats = attemptsByStudent.get(sid)
        if (!stats || stats.total === 0) {
          riskBuckets.low += 1
          continue
        }
        const wrongRate = stats.wrong / stats.total
        if (wrongRate >= 0.6) riskBuckets.critical += 1
        else if (wrongRate >= 0.4) riskBuckets.high += 1
        else if (wrongRate >= 0.2) riskBuckets.medium += 1
        else riskBuckets.low += 1
      }
    }

    // 10. 감정 버킷 — emotion_reports 최신 값 기반
    const emotionBuckets = {
      confident: 0,
      neutral: 0,
      struggling: 0,
      frustrated: 0,
      unknown: 0,
    }
    if (filteredStudentIds.length > 0) {
      const { data: reports } = await admin
        .from('emotion_reports')
        .select('student_id, mood, generated_at')
        .in('student_id', filteredStudentIds)
        .order('generated_at', { ascending: false })

      const moodByStudent = new Map<string, string>()
      ;(reports ?? []).forEach(r => {
        if (!moodByStudent.has(r.student_id)) {
          moodByStudent.set(r.student_id, r.mood ?? 'unknown')
        }
      })

      for (const sid of filteredStudentIds) {
        const mood = moodByStudent.get(sid) ?? 'unknown'
        if (mood in emotionBuckets) {
          emotionBuckets[mood as keyof typeof emotionBuckets] += 1
        } else {
          emotionBuckets.unknown += 1
        }
      }
    }

    // 11. 교사 활동 — 범위 내 교사들의 최근 스킬트리 생성/수정 활동
    let teacherActivity: AdminFilteredDashboardData['teacherActivity'] = []
    if (teacherIdsInScope.length > 0) {
      const { data: teacherProfiles } = await admin
        .from('profiles')
        .select('id, name, nickname')
        .in('id', teacherIdsInScope)

      const { data: teacherTrees } = await admin
        .from('skill_trees')
        .select('created_by, created_at, updated_at')
        .in('created_by', teacherIdsInScope)
        .order('updated_at', { ascending: false })

      const treeStatsByTeacher = new Map<string, { count: number; lastActive: string | null }>()
      ;(teacherTrees ?? []).forEach(t => {
        const cur = treeStatsByTeacher.get(t.created_by) ?? { count: 0, lastActive: null }
        cur.count += 1
        const latest = t.updated_at || t.created_at
        if (latest && (!cur.lastActive || latest > cur.lastActive)) {
          cur.lastActive = latest
        }
        treeStatsByTeacher.set(t.created_by, cur)
      })

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      teacherActivity = (teacherProfiles ?? []).map(p => {
        const stats = treeStatsByTeacher.get(p.id) ?? { count: 0, lastActive: null }
        const isInactive = !stats.lastActive || new Date(stats.lastActive).getTime() < sevenDaysAgo
        return {
          teacher_id: p.id,
          teacher_name: p.name ?? '',
          teacher_nickname: p.nickname ?? null,
          skill_tree_count: stats.count,
          last_active_at: stats.lastActive,
          is_inactive: isInactive,
        }
      })
    }

    return {
      data: {
        overview: {
          totalSchools: schoolIds.length,
          totalClasses: allClasses?.length ?? 0,
          totalTeachers: allTeachers.length,
          totalStudents: allStudents.length,
          totalSkillTrees: totalSkillTrees ?? 0,
        },
        classProgress,
        riskBuckets,
        emotionBuckets,
        teacherActivity,
      },
    }

    // treeFilter는 현재 통계 버킷에는 큰 영향 없음 (학생 스코프는 클래스 기준).
    // 향후 필요 시 별도 버킷으로 확장 가능.
    void treeFilter
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

function emptyAdminDashboard(): AdminFilteredDashboardData {
  return {
    overview: {
      totalSchools: 0,
      totalClasses: 0,
      totalTeachers: 0,
      totalStudents: 0,
      totalSkillTrees: 0,
    },
    classProgress: [],
    riskBuckets: { low: 0, medium: 0, high: 0, critical: 0 },
    emotionBuckets: { confident: 0, neutral: 0, struggling: 0, frustrated: 0, unknown: 0 },
    teacherActivity: [],
  }
}
