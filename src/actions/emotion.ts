'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoAccount } from '@/lib/demo'
import { emotionReportSchema } from '@/lib/ai/schemas'
import { EMOTION_ANALYSIS_PROMPT } from '@/lib/ai/prompts'

export interface EmotionReport {
  id: string
  student_id: string
  skill_tree_id: string | null
  mood: 'confident' | 'neutral' | 'struggling' | 'frustrated'
  mood_score: number
  insights: string
  recommendation: string
  node_emotions: Array<{ node_title: string; emotion: string }>
  report_date: string
  created_at: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

/**
 * 권한 체크: 본인이거나 / 담당 교사이거나 / admin.
 */
async function assertCanAccessStudent(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  studentId: string
): Promise<{ ok: boolean; error?: string }> {
  if (userId === studentId) return { ok: true }
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.role === 'admin') return { ok: true }
  if (profile?.role === 'teacher') {
    // 학생이 내 클래스에 속해있는지
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('class_id, classes!inner(teacher_id)')
      .eq('student_id', studentId)
      .eq('status', 'approved')
    const hasAccess = enrollments?.some(e => {
      const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes
      return cls?.teacher_id === userId
    })
    if (hasAccess) return { ok: true }
  }
  return { ok: false, error: '이 학생의 감정 리포트에 접근할 권한이 없습니다.' }
}

/**
 * 학생의 학습 감정 분석.
 * 같은 날 호출하면 캐시된 결과 반환 (DB에서 조회).
 */
export async function analyzeStudentEmotion(
  studentId: string,
  skillTreeId: string
): Promise<{ data?: EmotionReport; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    if (!isUuid(studentId) || !isUuid(skillTreeId)) {
      return { error: '유효하지 않은 ID입니다.' }
    }

    const admin = createAdminClient()
    const auth = await assertCanAccessStudent(admin, user.id, studentId)
    if (!auth.ok) return { error: auth.error }

    // 1. 캐시 확인 (같은 날 동일 student/tree 보고서)
    const today = new Date().toISOString().slice(0, 10)
    const { data: cached } = await admin
      .from('emotion_reports')
      .select('id, student_id, skill_tree_id, mood, mood_score, insights, recommendation, node_emotions, report_date, generated_at, created_at')
      .eq('student_id', studentId)
      .eq('skill_tree_id', skillTreeId)
      .eq('report_date', today)
      .maybeSingle()

    if (cached) {
      return { data: cached as EmotionReport }
    }

    // 데모는 미리 만든 캐시만 사용 — AI 호출 차단
    if (isDemoAccount(user.email)) {
      return { error: '체험 모드에서는 이 기능을 사용할 수 없습니다. 회원가입 후 이용해주세요!' }
    }

    // 2. 최근 20회 quiz_attempts 조회
    const { data: attempts } = await admin
      .from('quiz_attempts')
      .select('quiz_id, node_id, is_correct, score, attempted_at, hint_used, feedback')
      .eq('student_id', studentId)
      .order('attempted_at', { ascending: false })
      .limit(20)

    if (!attempts || attempts.length === 0) {
      return { error: '분석할 학습 데이터가 충분하지 않습니다. (퀴즈 시도 0회)' }
    }

    // 3. 노드 정보 조회 (스킬트리에 속한 것만 필터링)
    const nodeIds = [...new Set(attempts.map(a => a.node_id))]
    const { data: nodes } = await admin
      .from('nodes')
      .select('id, title, skill_tree_id, difficulty')
      .in('id', nodeIds)

    const treeNodeIds = new Set((nodes ?? []).filter(n => n.skill_tree_id === skillTreeId).map(n => n.id))
    const treeAttempts = attempts.filter(a => treeNodeIds.has(a.node_id))

    if (treeAttempts.length === 0) {
      return { error: '해당 스킬트리에서의 학습 데이터가 없습니다.' }
    }

    const nodeMap = new Map((nodes ?? []).map(n => [n.id, n]))

    // 4. 분석 데이터 집계
    const totalAttempts = treeAttempts.length
    const correctCount = treeAttempts.filter(a => a.is_correct).length
    const correctRate = Math.round((correctCount / totalAttempts) * 100)
    const hintCount = treeAttempts.filter(a => a.hint_used).length
    const hintRate = Math.round((hintCount / totalAttempts) * 100)
    const avgScore = Math.round(treeAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / totalAttempts)

    // 연속 오답 카운트 (최근부터)
    let consecutiveWrong = 0
    for (const a of treeAttempts) {
      if (!a.is_correct) consecutiveWrong++
      else break
    }

    // 노드별 시도 회수 + 정답 분포
    const perNode = new Map<string, { tries: number; correct: number }>()
    for (const a of treeAttempts) {
      if (!perNode.has(a.node_id)) perNode.set(a.node_id, { tries: 0, correct: 0 })
      const s = perNode.get(a.node_id)!
      s.tries++
      if (a.is_correct) s.correct++
    }
    const nodeStats = [...perNode.entries()].map(([nodeId, stat]) => {
      const node = nodeMap.get(nodeId)
      return `- ${node?.title ?? '알 수 없음'} (난이도 ${node?.difficulty ?? '?'}): ${stat.tries}회 시도, ${stat.correct}회 정답`
    }).join('\n')

    const dataText = `
분석 기간: 최근 ${treeAttempts.length}회 시도
정답률: ${correctRate}% (${correctCount}/${totalAttempts})
평균 점수: ${avgScore}점
힌트 사용 비율: ${hintRate}%
최근 연속 오답: ${consecutiveWrong}회

노드별 시도 분포:
${nodeStats}
`

    // 5. AI 분석
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: emotionReportSchema,
      prompt: EMOTION_ANALYSIS_PROMPT(dataText),
    })

    // 6. DB에 저장 (UNIQUE constraint로 같은 날 중복 방지)
    const { data: saved, error: insertErr } = await admin
      .from('emotion_reports')
      .upsert({
        student_id: studentId,
        skill_tree_id: skillTreeId,
        mood: object.overall_mood,
        mood_score: Math.max(0, Math.min(100, Math.round(object.mood_score))),
        insights: object.insights,
        recommendation: object.recommendation,
        node_emotions: object.node_emotions,
        report_date: today,
      }, { onConflict: 'student_id,skill_tree_id,report_date' })
      .select()
      .single()

    if (insertErr) return { error: '리포트 저장 실패: ' + insertErr.message }
    return { data: saved as EmotionReport }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analyzeStudentEmotion]', msg)
    return { error: '감정 분석 실패: ' + msg }
  }
}

/**
 * 클래스 학생들의 최신 감정 요약 (교사 대시보드용).
 * 캐시된 가장 최근 리포트 + 학생 정보.
 */
export async function getClassEmotionOverview(
  classId: string
): Promise<{
  data?: Array<{
    student_id: string
    student_name: string
    mood: 'confident' | 'neutral' | 'struggling' | 'frustrated' | 'unknown'
    mood_score: number | null
    insights: string | null
    recommendation: string | null
    last_report_date: string | null
  }>
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(classId)) return { error: '유효하지 않은 클래스 ID입니다.' }

    const admin = createAdminClient()

    // 권한: 담당 교사만
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
    if (!allowed) return { error: '이 클래스의 감정 현황을 조회할 권한이 없습니다.' }

    // 클래스 학생들
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'approved')

    const studentIds = enrollments?.map(e => e.student_id) ?? []
    if (studentIds.length === 0) return { data: [] }

    // 학생 프로필 + 가장 최근 emotion_report
    const [profilesRes, reportsRes] = await Promise.all([
      admin.from('profiles').select('id, name').in('id', studentIds),
      admin
        .from('emotion_reports')
        .select('student_id, mood, mood_score, insights, recommendation, report_date')
        .in('student_id', studentIds)
        .order('report_date', { ascending: false }),
    ])

    // 학생별 가장 최신 리포트 (Map으로 첫 번째 = 최신)
    const latestByStudent = new Map<string, {
      mood: 'confident' | 'neutral' | 'struggling' | 'frustrated'
      mood_score: number
      insights: string
      recommendation: string
      report_date: string
    }>()
    reportsRes.data?.forEach(r => {
      if (!latestByStudent.has(r.student_id)) {
        latestByStudent.set(r.student_id, r as never)
      }
    })

    const result = (profilesRes.data ?? []).map(p => {
      const latest = latestByStudent.get(p.id)
      return {
        student_id: p.id,
        student_name: p.name,
        mood: (latest?.mood ?? 'unknown') as 'confident' | 'neutral' | 'struggling' | 'frustrated' | 'unknown',
        mood_score: latest?.mood_score ?? null,
        insights: latest?.insights ?? null,
        recommendation: latest?.recommendation ?? null,
        last_report_date: latest?.report_date ?? null,
      }
    })

    return { data: result }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학생 본인의 가장 최신 감정 리포트 조회 (튜터 적응용).
 */
export async function getMyLatestEmotion(
  skillTreeId?: string
): Promise<{ data?: EmotionReport | null; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { data: null }

    const admin = createAdminClient()
    let query = admin
      .from('emotion_reports')
      .select('id, student_id, skill_tree_id, mood, mood_score, insights, recommendation, node_emotions, report_date, generated_at, created_at')
      .eq('student_id', user.id)
      .order('report_date', { ascending: false })
      .limit(1)
    if (skillTreeId && isUuid(skillTreeId)) {
      query = query.eq('skill_tree_id', skillTreeId)
    }
    const { data } = await query.maybeSingle()
    return { data: (data ?? null) as EmotionReport | null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
