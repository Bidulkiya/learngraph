'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskAssessment {
  student_id: string
  student_name: string
  risk_score: number
  risk_level: RiskLevel
  factors: string[]
  primary_reason: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

function levelFromScore(score: number): RiskLevel {
  if (score >= 81) return 'critical'
  if (score >= 61) return 'high'
  if (score >= 31) return 'medium'
  return 'low'
}

interface StudentMetrics {
  student_id: string
  student_name: string
  last_active_at: string | null
  weekly_quiz_attempts: number
  consecutive_failures: number
  weekly_study_minutes: number
  overdue_reviews: number
  zero_progress_trees: number
}

/**
 * 단일 학생의 위험 점수 계산 (DB 쿼리만, AI 미사용 — 비용 0).
 *
 * 점수 가중치:
 * - 7일 미접속: +30  /  3일 미접속: +15
 * - 퀴즈 3연속 실패: +20
 * - 주간 학습 시간 < 30분: +15
 * - 미완료 복습 ≥ 3개: +10
 * - 진도율 0%인 스킬트리 보유: +10
 *
 * 등급: 0-30 low / 31-60 medium / 61-80 high / 81-100 critical
 */
export async function calculateRiskScore(
  studentId: string
): Promise<{ data?: RiskAssessment; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(studentId)) return { error: '유효하지 않은 학생 ID입니다.' }

    const admin = createAdminClient()

    // 권한: 본인 / admin / 담당 교사
    if (user.id !== studentId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      let allowed = profile?.role === 'admin'
      if (!allowed && profile?.role === 'teacher') {
        const { data: enrollments } = await admin
          .from('class_enrollments')
          .select('class_id, classes!inner(teacher_id)')
          .eq('student_id', studentId)
          .eq('status', 'approved')
        allowed = !!enrollments?.some(e => {
          const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes
          return cls?.teacher_id === user.id
        })
      }
      if (!allowed) return { error: '이 학생의 위험도에 접근할 권한이 없습니다.' }
    }

    const metrics = await collectStudentMetrics(admin, studentId)
    if (!metrics) return { error: '학생을 찾을 수 없습니다.' }

    const { score, factors } = computeRiskScore(metrics)
    const primary = factors[0] ?? '특이사항 없음'

    return {
      data: {
        student_id: metrics.student_id,
        student_name: metrics.student_name,
        risk_score: score,
        risk_level: levelFromScore(score),
        factors,
        primary_reason: primary,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 클래스 전체 학생의 위험도 일괄 계산.
 * 담당 교사 / 스쿨 소유자만 호출 가능.
 */
export async function getClassRiskAlerts(
  classId: string
): Promise<{
  data?: { all: RiskAssessment[]; alerts: RiskAssessment[] }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(classId)) return { error: '유효하지 않은 클래스 ID입니다.' }

    const admin = createAdminClient()

    // 권한: 담당 교사 또는 스쿨 소유자
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
    if (!allowed) return { error: '이 클래스의 경보에 접근할 권한이 없습니다.' }

    // 클래스 학생들
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'approved')

    const studentIds = enrollments?.map(e => e.student_id) ?? []
    if (studentIds.length === 0) return { data: { all: [], alerts: [] } }

    // 일괄 메트릭 수집 (학생별 collect)
    const all: RiskAssessment[] = []
    for (const sid of studentIds) {
      const metrics = await collectStudentMetrics(admin, sid)
      if (!metrics) continue
      const { score, factors } = computeRiskScore(metrics)
      all.push({
        student_id: metrics.student_id,
        student_name: metrics.student_name,
        risk_score: score,
        risk_level: levelFromScore(score),
        factors,
        primary_reason: factors[0] ?? '특이사항 없음',
      })
    }

    all.sort((a, b) => b.risk_score - a.risk_score)
    const alerts = all.filter(a => a.risk_level === 'high' || a.risk_level === 'critical')

    return { data: { all, alerts } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 운영자 대시보드용 — 본인이 만든 모든 스쿨의 위험도 분포.
 * 파이 차트 데이터 생성.
 */
export async function getAdminRiskOverview(): Promise<{
  data?: {
    total: number
    distribution: { level: RiskLevel; count: number; label: string }[]
    topRisks: RiskAssessment[]
  }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // admin 역할만
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'admin') {
      return { error: '운영자만 접근할 수 있습니다.' }
    }

    // 본인이 만든 스쿨들의 모든 학생
    const { data: mySchools } = await admin
      .from('schools')
      .select('id')
      .eq('created_by', user.id)

    const schoolIds = mySchools?.map(s => s.id) ?? []
    if (schoolIds.length === 0) {
      return { data: { total: 0, distribution: [], topRisks: [] } }
    }

    const { data: members } = await admin
      .from('school_members')
      .select('user_id, role')
      .in('school_id', schoolIds)
      .eq('role', 'student')
      .eq('status', 'approved')

    const studentIds = [...new Set(members?.map(m => m.user_id) ?? [])]
    if (studentIds.length === 0) {
      return { data: { total: 0, distribution: [], topRisks: [] } }
    }

    // 일괄 메트릭 수집
    const all: RiskAssessment[] = []
    for (const sid of studentIds) {
      const metrics = await collectStudentMetrics(admin, sid)
      if (!metrics) continue
      const { score, factors } = computeRiskScore(metrics)
      all.push({
        student_id: metrics.student_id,
        student_name: metrics.student_name,
        risk_score: score,
        risk_level: levelFromScore(score),
        factors,
        primary_reason: factors[0] ?? '특이사항 없음',
      })
    }

    all.sort((a, b) => b.risk_score - a.risk_score)

    const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    all.forEach(a => { counts[a.risk_level]++ })

    const distribution = [
      { level: 'low' as const, count: counts.low, label: '낮음' },
      { level: 'medium' as const, count: counts.medium, label: '보통' },
      { level: 'high' as const, count: counts.high, label: '높음' },
      { level: 'critical' as const, count: counts.critical, label: '매우 높음' },
    ]

    return {
      data: {
        total: all.length,
        distribution,
        topRisks: all.slice(0, 5),
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 내부 헬퍼: 학생 메트릭 수집 + 점수 계산
// ============================================

async function collectStudentMetrics(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string
): Promise<StudentMetrics | null> {
  // 1. profile (이름, last_active_at, week_study_minutes)
  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, last_active_at, week_study_minutes')
    .eq('id', studentId)
    .maybeSingle()
  if (!profile) return null

  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // 2. 최근 7일 퀴즈 시도 + 연속 오답
  const { data: recentAttempts } = await admin
    .from('quiz_attempts')
    .select('is_correct, attempted_at')
    .eq('student_id', studentId)
    .gte('attempted_at', sevenDaysAgo.toISOString())
    .order('attempted_at', { ascending: false })
    .limit(20)

  const weekly = recentAttempts ?? []
  let consecutiveFailures = 0
  for (const a of weekly) {
    if (!a.is_correct) consecutiveFailures++
    else break
  }

  // 3. 미완료 + 기한 지난 복습 알림
  const todayStr = today.toISOString().slice(0, 10)
  const { data: overdueReviews } = await admin
    .from('review_reminders')
    .select('id')
    .eq('student_id', studentId)
    .eq('completed', false)
    .lte('remind_at', todayStr)

  // 4. 진도율 0%인 스킬트리 (단, locked가 아닌 노드가 있는데 completed가 0)
  const { data: progress } = await admin
    .from('student_progress')
    .select('skill_tree_id, status')
    .eq('student_id', studentId)

  const treeStats = new Map<string, { available: number; completed: number }>()
  progress?.forEach(p => {
    if (!p.skill_tree_id) return
    if (!treeStats.has(p.skill_tree_id)) {
      treeStats.set(p.skill_tree_id, { available: 0, completed: 0 })
    }
    const s = treeStats.get(p.skill_tree_id)!
    if (p.status !== 'locked') s.available++
    if (p.status === 'completed') s.completed++
  })
  const zeroProgressTrees = [...treeStats.values()].filter(s => s.available > 0 && s.completed === 0).length

  return {
    student_id: profile.id,
    student_name: profile.name,
    last_active_at: profile.last_active_at,
    weekly_quiz_attempts: weekly.length,
    consecutive_failures: consecutiveFailures,
    weekly_study_minutes: profile.week_study_minutes ?? 0,
    overdue_reviews: overdueReviews?.length ?? 0,
    zero_progress_trees: zeroProgressTrees,
  }
}

function computeRiskScore(m: StudentMetrics): { score: number; factors: string[] } {
  let score = 0
  const factors: string[] = []

  // 1. 미접속 일수
  if (m.last_active_at) {
    const daysInactive = Math.floor((Date.now() - new Date(m.last_active_at).getTime()) / (1000 * 60 * 60 * 24))
    if (daysInactive >= 7) {
      score += 30
      factors.push(`${daysInactive}일 미접속`)
    } else if (daysInactive >= 3) {
      score += 15
      factors.push(`${daysInactive}일 미접속`)
    }
  } else {
    score += 30
    factors.push('접속 기록 없음')
  }

  // 2. 연속 오답
  if (m.consecutive_failures >= 3) {
    score += 20
    factors.push(`최근 ${m.consecutive_failures}회 연속 오답`)
  }

  // 3. 주간 학습 시간 < 30분
  if (m.weekly_study_minutes < 30) {
    score += 15
    factors.push(`주간 학습 ${m.weekly_study_minutes}분`)
  }

  // 4. 미완료 복습 ≥ 3
  if (m.overdue_reviews >= 3) {
    score += 10
    factors.push(`미완료 복습 ${m.overdue_reviews}개`)
  }

  // 5. 진도율 0%인 스킬트리
  if (m.zero_progress_trees > 0) {
    score += 10
    factors.push(`진도 0% 스킬트리 ${m.zero_progress_trees}개`)
  }

  return { score: Math.min(100, score), factors }
}
