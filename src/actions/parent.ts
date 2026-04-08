'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

/**
 * 학생 → 학부모 초대 코드 생성.
 * 6자리 대문자 + 숫자, 48시간 유효.
 */
export async function createParentInviteCode(): Promise<{
  data?: { code: string; expiresAt: string }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'student') {
      return { error: '학생만 초대 코드를 생성할 수 있습니다.' }
    }

    // 6자리 코드 생성
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동되는 문자 제외
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)

    const { error: insertErr } = await admin.from('parent_invite_codes').insert({
      code,
      student_id: user.id,
      expires_at: expiresAt.toISOString(),
    })

    if (insertErr) return { error: '코드 생성 실패: ' + insertErr.message }
    return { data: { code, expiresAt: expiresAt.toISOString() } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학부모가 초대 코드를 입력해서 자녀와 연결.
 */
export async function linkParentToStudent(
  code: string
): Promise<{ data?: { student_name: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode || normalizedCode.length !== 6) {
      return { error: '6자리 코드를 정확히 입력해주세요.' }
    }

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'parent') {
      return { error: '학부모만 자녀를 연결할 수 있습니다.' }
    }

    const { data: inviteCode } = await admin
      .from('parent_invite_codes')
      .select('student_id, expires_at, used_at')
      .eq('code', normalizedCode)
      .maybeSingle()

    if (!inviteCode) return { error: '유효하지 않은 코드입니다.' }
    if (inviteCode.used_at) return { error: '이미 사용된 코드입니다.' }
    if (new Date(inviteCode.expires_at) < new Date()) {
      return { error: '만료된 코드입니다. 학생에게 새 코드를 요청해주세요.' }
    }

    // 학생 프로필
    const { data: student } = await admin
      .from('profiles')
      .select('id, name')
      .eq('id', inviteCode.student_id)
      .maybeSingle()

    if (!student) return { error: '학생을 찾을 수 없습니다.' }

    // 이미 연결되어 있는지
    const { data: existingLink } = await admin
      .from('parent_student_links')
      .select('id')
      .eq('parent_id', user.id)
      .eq('student_id', student.id)
      .maybeSingle()

    if (!existingLink) {
      const { error: linkErr } = await admin.from('parent_student_links').insert({
        parent_id: user.id,
        student_id: student.id,
      })
      if (linkErr) return { error: '연결 실패: ' + linkErr.message }
    }

    // 코드 사용 처리
    await admin
      .from('parent_invite_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('code', normalizedCode)

    return { data: { student_name: student.name } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학부모의 연결된 자녀 목록.
 */
export async function getMyChildren(): Promise<{
  data?: Array<{ student_id: string; student_name: string; student_email: string }>
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'parent') return { data: [] }

    const { data: links } = await admin
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user.id)

    const studentIds = links?.map(l => l.student_id) ?? []
    if (studentIds.length === 0) return { data: [] }

    const { data: students } = await admin
      .from('profiles')
      .select('id, name, email')
      .in('id', studentIds)

    return {
      data: (students ?? []).map(s => ({
        student_id: s.id,
        student_name: s.name,
        student_email: s.email,
      })),
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학부모가 특정 자녀 상세 대시보드 데이터 조회.
 * 권한 체크: parent_student_links에 존재해야 함.
 */
export async function getChildDashboard(
  studentId: string
): Promise<{
  data?: {
    student_name: string
    level: number
    xp: number
    streak_days: number
    weekly_study_minutes: number
    progress: { completed: number; total: number }
    recent_attempts: Array<{ node_title: string; is_correct: boolean; score: number; attempted_at: string }>
    emotion: { mood: string; mood_score: number | null; insights: string | null } | null
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    risk_factors: string[]
    weekly_chart: Array<{ day: string; minutes: number }>
  }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(studentId)) return { error: '유효하지 않은 학생 ID입니다.' }

    const admin = createAdminClient()

    // 권한: 연결된 자녀인지
    const { data: link } = await admin
      .from('parent_student_links')
      .select('id')
      .eq('parent_id', user.id)
      .eq('student_id', studentId)
      .maybeSingle()
    if (!link) return { error: '이 자녀의 정보에 접근할 권한이 없습니다.' }

    // 학생 프로필 + 진도 + 퀴즈 + 감정
    const [profileRes, progressRes, attemptsRes] = await Promise.all([
      admin.from('profiles').select('name, xp, streak_days, week_study_minutes').eq('id', studentId).maybeSingle(),
      admin.from('student_progress').select('status').eq('student_id', studentId),
      admin
        .from('quiz_attempts')
        .select('node_id, is_correct, score, attempted_at')
        .eq('student_id', studentId)
        .order('attempted_at', { ascending: false })
        .limit(10),
    ])

    const profile2 = profileRes.data
    if (!profile2) return { error: '학생을 찾을 수 없습니다.' }

    const progress = progressRes.data ?? []
    const completed = progress.filter(p => p.status === 'completed').length
    const total = progress.length

    // 노드 제목 join
    const nodeIds = [...new Set((attemptsRes.data ?? []).map(a => a.node_id))]
    const { data: nodes } = await admin
      .from('nodes')
      .select('id, title')
      .in('id', nodeIds.length > 0 ? nodeIds : ['00000000-0000-0000-0000-000000000000'])
    const nodeMap = new Map((nodes ?? []).map(n => [n.id, n.title]))

    const recent_attempts = (attemptsRes.data ?? []).map(a => ({
      node_title: nodeMap.get(a.node_id) ?? '알 수 없음',
      is_correct: a.is_correct ?? false,
      score: a.score ?? 0,
      attempted_at: a.attempted_at,
    }))

    // 최신 감정 리포트
    const { data: emotionReport } = await admin
      .from('emotion_reports')
      .select('mood, mood_score, insights')
      .eq('student_id', studentId)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const emotion = emotionReport
      ? {
          mood: emotionReport.mood,
          mood_score: emotionReport.mood_score,
          insights: emotionReport.insights,
        }
      : null

    // 위험도: alert.ts의 로직을 직접 재사용 (동적 import)
    const { calculateRiskScore } = await import('./alert')
    const riskRes = await calculateRiskScore(studentId)
    const risk_level = (riskRes.data?.risk_level ?? 'low') as 'low' | 'medium' | 'high' | 'critical'
    const risk_factors = riskRes.data?.factors ?? []

    // 주간 학습 시간 차트 — 현재는 week_study_minutes만 있으므로 단일 막대
    // (장기적으로 daily 로그가 필요하지만 현재 스키마로는 근사)
    const today = new Date()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const weekly_chart: Array<{ day: string; minutes: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      // 오늘 기준 today_study_minutes이 있으면 오늘만 정확, 나머지는 균등 분배
      weekly_chart.push({
        day: dayNames[d.getDay()],
        minutes: i === 0 ? Math.round((profile2.week_study_minutes ?? 0) / 7) : Math.round((profile2.week_study_minutes ?? 0) / 7),
      })
    }

    return {
      data: {
        student_name: profile2.name,
        level: Math.floor((profile2.xp ?? 0) / 100) + 1,
        xp: profile2.xp ?? 0,
        streak_days: profile2.streak_days ?? 0,
        weekly_study_minutes: profile2.week_study_minutes ?? 0,
        progress: { completed, total },
        recent_attempts,
        emotion,
        risk_level,
        risk_factors,
        weekly_chart,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
