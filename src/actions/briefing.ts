'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoAccount } from '@/lib/demo'
import { weeklyBriefingSchema } from '@/lib/ai/schemas'
import { WEEKLY_BRIEFING_PROMPT } from '@/lib/ai/prompts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

export interface WeeklyBriefing {
  id: string
  class_id: string
  week_start: string
  summary: string
  highlights: string[]
  concerns: string[]
  action_items: string[]
  created_at: string
}

/**
 * 현재 주의 월요일 (yyyy-mm-dd).
 */
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // 일요일이면 전주 월요일
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * 이번 주 클래스 브리핑 조회 (캐시 우선) 또는 새로 생성.
 * forceRefresh=true면 강제 재생성.
 */
export async function generateWeeklyBriefing(
  classId: string,
  forceRefresh = false
): Promise<{ data?: WeeklyBriefing; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(classId)) return { error: '유효하지 않은 클래스 ID입니다.' }

    const admin = createAdminClient()

    // 권한: 담당 교사, 스쿨 소유자, 승인된 학생, 연결된 학부모
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
    if (!allowed) {
      // 승인된 학생 또는 학부모
      const { data: enrollment } = await admin
        .from('class_enrollments')
        .select('status')
        .eq('class_id', classId)
        .eq('student_id', user.id)
        .maybeSingle()
      if (enrollment?.status === 'approved') allowed = true
      if (!allowed) {
        // 학부모: 자녀가 이 클래스에 있는지
        const { data: links } = await admin
          .from('parent_student_links')
          .select('student_id')
          .eq('parent_id', user.id)
        const childIds = links?.map(l => l.student_id) ?? []
        if (childIds.length > 0) {
          const { data: childEnrolls } = await admin
            .from('class_enrollments')
            .select('student_id')
            .eq('class_id', classId)
            .eq('status', 'approved')
            .in('student_id', childIds)
          if (childEnrolls && childEnrolls.length > 0) allowed = true
        }
      }
    }
    if (!allowed) return { error: '이 클래스의 브리핑에 접근할 권한이 없습니다.' }

    const weekStart = getMondayOfWeek(new Date())

    // 1. 캐시 확인
    if (!forceRefresh) {
      const { data: cached } = await admin
        .from('weekly_briefings')
        .select('id, class_id, week_start, summary, highlights, concerns, action_items, created_at')
        .eq('class_id', classId)
        .eq('week_start', weekStart)
        .maybeSingle()
      if (cached) return { data: cached as WeeklyBriefing }
    }

    // 데모는 미리 생성된 캐시만 사용 — 새 브리핑 생성 차단 (AI 비용)
    if (isDemoAccount(user.email)) {
      return { error: '체험 모드에서는 이 기능을 사용할 수 없습니다. 회원가입 후 이용해주세요!' }
    }

    // 2. 지난 7일 데이터 집계
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // 학생 목록
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'approved')
    const studentIds = enrollments?.map(e => e.student_id) ?? []

    if (studentIds.length === 0) {
      return { error: '분석할 학생이 없습니다.' }
    }

    // 클래스 스킬트리 + 노드 조회
    const { data: trees } = await admin
      .from('skill_trees')
      .select('id, title')
      .eq('class_id', classId)
    const treeIds = trees?.map(t => t.id) ?? []

    const { data: nodes } = await admin
      .from('nodes')
      .select('id, title')
      .in('skill_tree_id', treeIds.length > 0 ? treeIds : ['00000000-0000-0000-0000-000000000000'])
    const nodeIds = nodes?.map(n => n.id) ?? []
    const nodeMap = new Map((nodes ?? []).map(n => [n.id, n.title]))

    // 최근 7일 퀴즈 시도
    const { data: recentAttempts } = await admin
      .from('quiz_attempts')
      .select('student_id, node_id, is_correct, score, attempted_at')
      .in('student_id', studentIds)
      .gte('attempted_at', sevenDaysAgo.toISOString())

    const attempts = recentAttempts ?? []
    const totalAttempts = attempts.length
    const correctCount = attempts.filter(a => a.is_correct).length
    const avgScore = totalAttempts > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / totalAttempts)
      : 0

    // 진도율
    const { data: allProgress } = await admin
      .from('student_progress')
      .select('student_id, status, node_id')
      .in('student_id', studentIds)
      .in('node_id', nodeIds.length > 0 ? nodeIds : ['00000000-0000-0000-0000-000000000000'])

    const totalProgress = allProgress?.length ?? 0
    const completedProgress = allProgress?.filter(p => p.status === 'completed').length ?? 0
    const progressRate = totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0

    // 병목 노드 (통과율 낮은 상위 3)
    const nodeStats = new Map<string, { attempts: number; correct: number }>()
    attempts.forEach(a => {
      if (!nodeStats.has(a.node_id)) nodeStats.set(a.node_id, { attempts: 0, correct: 0 })
      const s = nodeStats.get(a.node_id)!
      s.attempts++
      if (a.is_correct) s.correct++
    })
    const bottlenecks = [...nodeStats.entries()]
      .filter(([, s]) => s.attempts >= 2)
      .map(([nid, s]) => ({
        title: nodeMap.get(nid) ?? '알 수 없음',
        rate: Math.round((s.correct / s.attempts) * 100),
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3)

    // 위험 학생 (alert.ts 재사용)
    const { calculateRiskScore } = await import('./alert')
    const riskResults = await Promise.all(
      studentIds.map(sid => calculateRiskScore(sid))
    )
    const highRisk = riskResults
      .map(r => r.data)
      .filter((r): r is NonNullable<typeof r> => !!r && (r.risk_level === 'high' || r.risk_level === 'critical'))

    // 감정 분포
    const { data: recentEmotions } = await admin
      .from('emotion_reports')
      .select('student_id, mood')
      .in('student_id', studentIds)
      .order('report_date', { ascending: false })
      .limit(studentIds.length * 2)
    const latestMood = new Map<string, string>()
    recentEmotions?.forEach(e => {
      if (!latestMood.has(e.student_id)) latestMood.set(e.student_id, e.mood)
    })
    const moodCounts = { confident: 0, neutral: 0, struggling: 0, frustrated: 0 }
    latestMood.forEach(m => {
      if (m in moodCounts) moodCounts[m as keyof typeof moodCounts]++
    })

    // 데이터 텍스트 조립
    const dataText = `
## 클래스 정보
- 학생 수: ${studentIds.length}명
- 전체 진도율: ${progressRate}% (${completedProgress}/${totalProgress})

## 지난 7일 활동
- 총 퀴즈 시도: ${totalAttempts}회
- 정답률: ${totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0}%
- 평균 점수: ${avgScore}점

## 병목 노드 (통과율 낮은 순)
${bottlenecks.length > 0 ? bottlenecks.map(b => `- ${b.title}: 통과율 ${b.rate}%`).join('\n') : '- 특별한 병목 없음'}

## 위험 학생 (${highRisk.length}명)
${highRisk.length > 0 ? highRisk.map(r => `- ${r.student_name}: ${r.primary_reason}`).join('\n') : '- 위험 학생 없음'}

## 감정 분포
- 자신감: ${moodCounts.confident}명
- 보통: ${moodCounts.neutral}명
- 어려움: ${moodCounts.struggling}명
- 좌절: ${moodCounts.frustrated}명
`

    // 3. AI 브리핑 생성
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: weeklyBriefingSchema,
      prompt: WEEKLY_BRIEFING_PROMPT(dataText),
    })

    // 4. DB 저장 (upsert)
    const { data: saved, error: insertErr } = await admin
      .from('weekly_briefings')
      .upsert({
        class_id: classId,
        week_start: weekStart,
        summary: object.summary,
        highlights: object.highlights,
        concerns: object.concerns,
        action_items: object.action_items,
      }, { onConflict: 'class_id,week_start' })
      .select()
      .single()

    if (insertErr) return { error: '브리핑 저장 실패: ' + insertErr.message }
    return { data: saved as WeeklyBriefing }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generateWeeklyBriefing]', msg)
    return { error: '브리핑 생성 실패: ' + msg }
  }
}
