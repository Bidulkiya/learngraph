'use server'

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
 * Only run in Server Components after getCurrentProfile() auth.
 */
export async function getTeacherDashboardData(
  teacherId: string
): Promise<{ data?: TeacherDashboardData; error?: string }> {
  try {
    const admin = createAdminClient()

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
}

export async function getAdminDashboardData(): Promise<{ data?: AdminDashboardData; error?: string }> {
  try {
    const admin = createAdminClient()

    const { data: profiles } = await admin.from('profiles').select('role')
    const teachers = profiles?.filter(p => p.role === 'teacher').length ?? 0
    const students = profiles?.filter(p => p.role === 'student').length ?? 0

    const { count: treeCount } = await admin.from('skill_trees').select('*', { count: 'exact', head: true })
    const { count: attemptCount } = await admin.from('quiz_attempts').select('*', { count: 'exact', head: true })

    const { data: progress } = await admin.from('student_progress').select('status')
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
    const admin = createAdminClient()

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
