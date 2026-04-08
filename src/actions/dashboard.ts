'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface TeacherDashboardData {
  skillTreeCount: number
  totalStudents: number
  avgUnlockRate: number
  riskStudentCount: number
  nodeUnlockChart: Array<{ name: string; unlockRate: number }>
  recentAttempts: Array<{
    student_name: string
    node_title: string
    is_correct: boolean
    score: number
    attempted_at: string
  }>
  riskStudents: Array<{ id: string; name: string; reason: string; severity: 'warning' | 'danger' }>
}

/**
 * Fetch teacher dashboard data (admin client — RLS bypass).
 * 보안: 호출자가 teacherId 본인이거나 admin인지 검증.
 */
export async function getTeacherDashboardData(
  teacherId: string
): Promise<{ data?: TeacherDashboardData; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 본인이거나 admin만 접근 가능
    if (user.id !== teacherId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'admin') {
        return { error: '다른 교사의 데이터에 접근할 수 없습니다.' }
      }
    }

    // 1. Teacher's skill trees
    const { data: trees } = await admin
      .from('skill_trees')
      .select('id, title')
      .eq('created_by', teacherId)

    const treeIds = trees?.map(t => t.id) ?? []
    const skillTreeCount = treeIds.length

    // 2. Nodes on teacher's trees
    const { data: allNodes } = await admin
      .from('nodes')
      .select('id, title, skill_tree_id')
      .in('skill_tree_id', treeIds.length > 0 ? treeIds : ['00000000-0000-0000-0000-000000000000'])

    const nodeIds = allNodes?.map(n => n.id) ?? []

    // 3. Student progress on these nodes
    const { data: progressRows } = await admin
      .from('student_progress')
      .select('student_id, node_id, status')
      .in('node_id', nodeIds.length > 0 ? nodeIds : ['00000000-0000-0000-0000-000000000000'])

    const uniqueStudents = new Set(progressRows?.map(p => p.student_id) ?? [])
    const totalStudents = uniqueStudents.size

    // 4. Compute avg unlock rate
    const completedCount = progressRows?.filter(p => p.status === 'completed').length ?? 0
    const totalProgressCount = progressRows?.length ?? 0
    const avgUnlockRate = totalProgressCount > 0
      ? Math.round((completedCount / totalProgressCount) * 100)
      : 0

    // 5. Node unlock chart
    const nodeUnlockChart = (allNodes ?? []).slice(0, 10).map(node => {
      const nodeProgress = progressRows?.filter(p => p.node_id === node.id) ?? []
      const completed = nodeProgress.filter(p => p.status === 'completed').length
      const rate = nodeProgress.length > 0 ? Math.round((completed / nodeProgress.length) * 100) : 0
      return { name: node.title.slice(0, 10), unlockRate: rate }
    })

    // 6. Recent quiz attempts
    const { data: attempts } = await admin
      .from('quiz_attempts')
      .select('student_id, node_id, is_correct, score, attempted_at')
      .in('node_id', nodeIds.length > 0 ? nodeIds : ['00000000-0000-0000-0000-000000000000'])
      .order('attempted_at', { ascending: false })
      .limit(10)

    const studentIds = [...new Set(attempts?.map(a => a.student_id) ?? [])]
    const { data: studentProfiles } = await admin
      .from('profiles')
      .select('id, name')
      .in('id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])

    const studentNameMap = new Map(studentProfiles?.map(p => [p.id, p.name]) ?? [])
    const nodeNameMap = new Map(allNodes?.map(n => [n.id, n.title]) ?? [])

    const recentAttempts = (attempts ?? []).map(a => ({
      student_name: studentNameMap.get(a.student_id) ?? '익명',
      node_title: nodeNameMap.get(a.node_id) ?? '알 수 없음',
      is_correct: a.is_correct ?? false,
      score: a.score ?? 0,
      attempted_at: a.attempted_at,
    }))

    // 7. Risk students: 3+ consecutive failures
    const failureCounts = new Map<string, number>()
    attempts?.forEach(a => {
      if (!a.is_correct) {
        failureCounts.set(a.student_id, (failureCounts.get(a.student_id) ?? 0) + 1)
      }
    })

    const riskStudents = Array.from(failureCounts.entries())
      .filter(([, count]) => count >= 3)
      .map(([id, count]) => ({
        id,
        name: studentNameMap.get(id) ?? '익명',
        reason: `최근 ${count}회 오답`,
        severity: (count >= 5 ? 'danger' : 'warning') as 'warning' | 'danger',
      }))

    return {
      data: {
        skillTreeCount,
        totalStudents,
        avgUnlockRate,
        riskStudentCount: riskStudents.length,
        nodeUnlockChart,
        recentAttempts,
        riskStudents,
      },
    }
  } catch (err) {
    return { error: String(err) }
  }
}

export interface AdminDashboardData {
  totalTeachers: number
  totalStudents: number
  totalSkillTrees: number
  totalQuizAttempts: number
  avgUnlockRate: number
  teacherList: Array<{ id: string; name: string; email: string }>
  studentList: Array<{ id: string; name: string; email: string }>
}

export async function getAdminDashboardData(): Promise<{ data?: AdminDashboardData; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 운영자가 만든 스쿨만
    const { data: mySchools } = await admin
      .from('schools')
      .select('id')
      .eq('created_by', user.id)
    const schoolIds = mySchools?.map(s => s.id) ?? []

    if (schoolIds.length === 0) {
      return {
        data: {
          totalTeachers: 0,
          totalStudents: 0,
          totalSkillTrees: 0,
          totalQuizAttempts: 0,
          avgUnlockRate: 0,
          teacherList: [],
          studentList: [],
        },
      }
    }

    // 내 스쿨의 멤버만
    const { data: members } = await admin
      .from('school_members')
      .select('user_id, role')
      .in('school_id', schoolIds)
      .eq('status', 'approved')

    const teacherIds = members?.filter(m => m.role === 'teacher').map(m => m.user_id) ?? []
    const studentIds = members?.filter(m => m.role === 'student').map(m => m.user_id) ?? []
    const teachers = teacherIds.length
    const students = studentIds.length

    // 멤버 프로필 조회
    const allMemberIds = [...teacherIds, ...studentIds]
    const { data: memberProfiles } = await admin
      .from('profiles')
      .select('id, name, email, role')
      .in('id', allMemberIds.length > 0 ? allMemberIds : ['00000000-0000-0000-0000-000000000000'])

    const teacherList = (memberProfiles ?? [])
      .filter(p => teacherIds.includes(p.id))
      .map(p => ({ id: p.id, name: p.name, email: p.email }))
    const studentList = (memberProfiles ?? [])
      .filter(p => studentIds.includes(p.id))
      .map(p => ({ id: p.id, name: p.name, email: p.email }))

    // 내 스쿨의 클래스 → 스킬트리
    const { data: classes } = await admin
      .from('classes')
      .select('id')
      .in('school_id', schoolIds)
    const classIds = classes?.map(c => c.id) ?? []

    const { count: treeCount } = await admin
      .from('skill_trees')
      .select('*', { count: 'exact', head: true })
      .in('class_id', classIds.length > 0 ? classIds : ['00000000-0000-0000-0000-000000000000'])

    // 내 스쿨 학생의 퀴즈 시도
    const { count: attemptCount } = await admin
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])

    const { data: progress } = await admin
      .from('student_progress')
      .select('status')
      .in('student_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
    const completed = progress?.filter(p => p.status === 'completed').length ?? 0
    const total = progress?.length ?? 0
    const avgUnlockRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      data: {
        totalTeachers: teachers,
        totalStudents: students,
        totalSkillTrees: treeCount ?? 0,
        totalQuizAttempts: attemptCount ?? 0,
        avgUnlockRate,
        teacherList,
        studentList,
      },
    }
  } catch (err) {
    return { error: String(err) }
  }
}

export interface StudentDashboardData {
  level: number
  xp: number
  xpToNextLevel: number
  streakDays: number
  completedNodes: number
  totalNodes: number
  recentAttempts: Array<{
    node_title: string
    is_correct: boolean
    score: number
    attempted_at: string
  }>
}

export async function getStudentDashboardData(
  studentId: string
): Promise<{ data?: StudentDashboardData; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 본인이거나, 이 학생의 클래스 담당 교사이거나, admin만 허용
    if (user.id !== studentId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      let allowed = profile?.role === 'admin'
      if (!allowed && profile?.role === 'teacher') {
        // 이 학생이 내 클래스에 속해있는지 확인
        const { data: enrollments } = await admin
          .from('class_enrollments')
          .select('class_id, classes!inner(teacher_id)')
          .eq('student_id', studentId)
          .eq('status', 'approved')
        const hasAccess = enrollments?.some(e => {
          const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes
          return cls?.teacher_id === user.id
        })
        if (hasAccess) allowed = true
      }
      if (!allowed) return { error: '다른 학생의 데이터에 접근할 수 없습니다.' }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('xp, streak_days')
      .eq('id', studentId)
      .single()

    const xp = profile?.xp ?? 0
    const level = Math.floor(xp / 100) + 1
    const xpToNextLevel = 100 - (xp % 100)

    const { data: progress } = await admin
      .from('student_progress')
      .select('status')
      .eq('student_id', studentId)

    const completedNodes = progress?.filter(p => p.status === 'completed').length ?? 0
    const totalNodes = progress?.length ?? 0

    const { data: attempts } = await admin
      .from('quiz_attempts')
      .select('node_id, is_correct, score, attempted_at')
      .eq('student_id', studentId)
      .order('attempted_at', { ascending: false })
      .limit(5)

    const nodeIds = [...new Set(attempts?.map(a => a.node_id) ?? [])]
    const { data: nodes } = await admin
      .from('nodes')
      .select('id, title')
      .in('id', nodeIds.length > 0 ? nodeIds : ['00000000-0000-0000-0000-000000000000'])

    const nodeNameMap = new Map(nodes?.map(n => [n.id, n.title]) ?? [])

    const recentAttempts = (attempts ?? []).map(a => ({
      node_title: nodeNameMap.get(a.node_id) ?? '알 수 없음',
      is_correct: a.is_correct ?? false,
      score: a.score ?? 0,
      attempted_at: a.attempted_at,
    }))

    return {
      data: {
        level,
        xp,
        xpToNextLevel,
        streakDays: profile?.streak_days ?? 0,
        completedNodes,
        totalNodes,
        recentAttempts,
      },
    }
  } catch (err) {
    return { error: String(err) }
  }
}
