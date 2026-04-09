'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoAccount } from '@/lib/demo'
import {
  weeklyPlanSchema,
  type WeeklyPlanOutput,
  type WeeklyPlanDay,
} from '@/lib/ai/schemas'
import { WEEKLY_PLAN_PROMPT } from '@/lib/ai/prompts'

/**
 * AI 학습 코치 v2 — 요일별 미션 시스템.
 *
 * 데이터 흐름:
 *   1. getWeeklyPlanWithMissions() — 이번 주 계획 + 요일별 미션 + 진행률 반환
 *      · 캐시 있으면 weekly_plans + weekly_plan_missions에서 조회
 *      · 캐시 miss → Claude 호출 → plan 생성 → weekly_plan_missions upsert
 *   2. 미션 완료는 학생이 해당 노드의 퀴즈를 풀어 정답을 맞힐 때 자동 갱신
 *      (completeNode에서 호출되는 markWeeklyMissionsForNode)
 *   3. 주간 완주 체크 + 보너스 XP 100 지급 (awardWeeklyBonusIfEligible)
 *   4. 다음 주 월요일이 되면 새 계획 생성 가능 여부 반환 (canStartNewWeek)
 */

// ============================================
// Types
// ============================================

export interface WeeklyPlanMission {
  id: string
  day: WeeklyPlanDay
  node_id: string
  node_title: string
  completed: boolean
  completed_at: string | null
}

export interface WeeklyPlanWithMissions {
  weekStart: string          // yyyy-mm-dd (월요일)
  plan: WeeklyPlanOutput     // AI 생성 원본 (reason, motivation 등)
  missions: WeeklyPlanMission[]
  completedCount: number
  totalCount: number
  progressPercent: number
  bonusAwarded: boolean      // 주간 완주 보너스 XP 이미 지급됨?
  allCompleted: boolean      // 월~금 전부 완료?
  today: WeeklyPlanDay       // 오늘 요일 (mon/tue/...)
}

// ============================================
// 내부 헬퍼
// ============================================

const DAYS: WeeklyPlanDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const WEEKDAYS: WeeklyPlanDay[] = ['mon', 'tue', 'wed', 'thu', 'fri']

/**
 * 캐시된 plan JSONB가 새 스키마 (day: 영문 enum, nodes: {id,title}[]) 인지 검증.
 *
 * 배경: v1 스키마는 { day: "월", nodes: ["세포의 기본 구조"] } 이고,
 *       v2 스키마는 { day: "mon", nodes: [{id, title}] } 이다.
 *       weekly_plan_missions 테이블은 v2를 전제로 하기 때문에
 *       v1 캐시가 있으면 미션이 0개로 남아 대시보드가 "0/0"을 표시한다.
 *       캐시 로드 시 스키마 검증으로 재생성 트리거.
 */
function isValidPlanV2Schema(plan: unknown): boolean {
  if (!Array.isArray(plan) || plan.length === 0) return false
  return plan.every(d => {
    if (!d || typeof d !== 'object') return false
    const day = (d as { day?: unknown }).day
    const nodes = (d as { nodes?: unknown }).nodes
    if (typeof day !== 'string') return false
    if (!DAYS.includes(day as WeeklyPlanDay)) return false
    if (!Array.isArray(nodes)) return false
    // 빈 배열은 OK (요일에 따라 0개 노드 가능)
    return nodes.every(n =>
      n !== null
      && typeof n === 'object'
      && 'id' in n
      && 'title' in n
      && typeof (n as { id: unknown }).id === 'string'
      && typeof (n as { title: unknown }).title === 'string'
    )
  })
}

/**
 * 이번 주 월요일(yyyy-mm-dd, 로컬 타임존).
 * 일요일이면 전주 월요일이 아니라 "지난 월요일"로 계산 → 주말에도 이번 주 계획 유지.
 */
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0=일 ~ 6=토
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

/** 오늘의 요일 약어 (mon/tue/...) */
function getTodayDay(): WeeklyPlanDay {
  const jsDay = new Date().getDay() // 0=sun, 1=mon, ...
  return DAYS[(jsDay + 6) % 7] // sun→6, mon→0, ..., sat→5 → DAYS[]는 mon 시작
}


// ============================================
// 메인: 주간 계획 조회 (미션 포함)
// ============================================

export async function getWeeklyPlanWithMissions(
  forceRefresh: boolean = false
): Promise<{ data?: WeeklyPlanWithMissions; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const weekStart = getMondayOfWeek(new Date())
    const today = getTodayDay()

    // 1. 캐시 확인 — v2 스키마 검증 + 미션 존재 검증 통과해야만 캐시 사용
    if (!forceRefresh) {
      const { data: cached } = await admin
        .from('weekly_plans')
        .select('plan, motivation, bonus_awarded')
        .eq('student_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (cached) {
        const isValid = isValidPlanV2Schema(cached.plan)
        const missions = await fetchMissions(admin, user.id, weekStart)

        // v2 스키마 + 미션이 1개 이상 존재해야 캐시 유효
        if (isValid && missions.length > 0) {
          const planOutput: WeeklyPlanOutput = {
            plan: (cached.plan as WeeklyPlanOutput['plan']) ?? [],
            motivation: cached.motivation ?? '',
          }
          return {
            data: buildPlanResult(
              weekStart,
              planOutput,
              missions,
              cached.bonus_awarded ?? false,
              today,
            ),
          }
        }

        // 무효한 캐시 → 삭제 후 재생성 (v1 → v2 마이그레이션 + 0/0 표시 버그 수정)
        console.warn(
          `[getWeeklyPlanWithMissions] Invalid cache detected (valid=${isValid}, missions=${missions.length}). Regenerating...`
        )
        await admin
          .from('weekly_plans')
          .delete()
          .eq('student_id', user.id)
          .eq('week_start', weekStart)
        await admin
          .from('weekly_plan_missions')
          .delete()
          .eq('student_id', user.id)
          .eq('week_start', weekStart)
      }
    }

    // 2. 데모 학생: 하드코딩된 plan + 노드 ID는 실제 체험 스킬트리 노드 4개
    if (isDemoAccount(user.email)) {
      return await getDemoWeeklyPlan(admin, user.id, weekStart, today)
    }

    // 3. 캐시 miss → AI 생성
    const { data: progress } = await admin
      .from('student_progress')
      .select('node_id, status, quiz_score')
      .eq('student_id', user.id)

    const completedNodeIds = new Set(
      (progress ?? []).filter(p => p.status === 'completed').map(p => p.node_id)
    )
    const availableNodeIds = (progress ?? [])
      .filter(p => p.status === 'available')
      .map(p => p.node_id)
    const lockedCount = (progress ?? []).filter(p => p.status === 'locked').length

    if (availableNodeIds.length === 0) {
      return { error: '도전 가능한 노드가 없습니다. 스킬트리에 먼저 등록해주세요.' }
    }

    const { data: availableNodesData } = await admin
      .from('nodes')
      .select('id, title, difficulty')
      .in('id', availableNodeIds)

    const weakNodeIds = (progress ?? [])
      .filter(p => (p.quiz_score ?? 100) < 80)
      .map(p => p.node_id)
    const { data: weakNodesData } = await admin
      .from('nodes')
      .select('title')
      .in('id', weakNodeIds.length > 0 ? weakNodeIds : ['00000000-0000-0000-0000-000000000000'])

    const progressSummary = `완료: ${completedNodeIds.size}개 / 도전 가능: ${availableNodeIds.length}개 / 잠김: ${lockedCount}개`
    const availableList = (availableNodesData ?? [])
      .map(n => `- [ID: ${n.id}] ${n.title} (난이도 ${n.difficulty})`)
      .join('\n') || '(없음)'
    const weakList = (weakNodesData ?? []).map(n => `- ${n.title}`).join('\n') || '(없음)'

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: weeklyPlanSchema,
      prompt: WEEKLY_PLAN_PROMPT(progressSummary, availableList, weakList),
    })

    // 4. 생성된 계획에서 available 목록 밖의 node ID는 필터링 (안전장치)
    const availableSet = new Set(availableNodeIds)
    const sanitizedPlan: WeeklyPlanOutput = {
      ...object,
      plan: object.plan.map(day => ({
        ...day,
        nodes: day.nodes.filter(n => availableSet.has(n.id)),
      })).filter(day => day.nodes.length > 0),
    }

    // 5. weekly_plans upsert
    await admin
      .from('weekly_plans')
      .upsert({
        student_id: user.id,
        week_start: weekStart,
        plan: sanitizedPlan.plan,
        motivation: sanitizedPlan.motivation,
        bonus_awarded: false,
      }, { onConflict: 'student_id,week_start' })

    // 6. weekly_plan_missions 재구축 (기존 것 삭제 후 insert)
    await admin
      .from('weekly_plan_missions')
      .delete()
      .eq('student_id', user.id)
      .eq('week_start', weekStart)

    const missionRows = sanitizedPlan.plan.flatMap(day =>
      day.nodes.map(node => ({
        student_id: user.id,
        week_start: weekStart,
        day: day.day,
        node_id: node.id,
        completed: false,
      }))
    )
    if (missionRows.length > 0) {
      await admin.from('weekly_plan_missions').insert(missionRows)
    }

    // 7. 과거 요일 미션이 이미 완료된 경우 자동 체크 (노드 이미 completed인 경우)
    await syncMissionsWithProgress(admin, user.id, weekStart)

    const missions = await fetchMissions(admin, user.id, weekStart)
    return {
      data: buildPlanResult(weekStart, sanitizedPlan, missions, false, today),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[getWeeklyPlanWithMissions]', msg)
    return { error: `주간 계획 생성 실패: ${msg}` }
  }
}

/**
 * 데모 학생용 주간 플랜 — 체험 스킬트리의 available 노드 4개를 요일별로 배정.
 * fast-path로 AI 호출 없이 즉시 반환.
 */
async function getDemoWeeklyPlan(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  weekStart: string,
  today: WeeklyPlanDay
): Promise<{ data?: WeeklyPlanWithMissions; error?: string }> {
  // 이미 캐시된 미션 + v2 스키마 plan이 있으면 그대로 사용
  const existingMissions = await fetchMissions(admin, studentId, weekStart)
  if (existingMissions.length > 0) {
    const { data: cached } = await admin
      .from('weekly_plans')
      .select('plan, motivation, bonus_awarded')
      .eq('student_id', studentId)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (cached && isValidPlanV2Schema(cached.plan)) {
      return {
        data: buildPlanResult(
          weekStart,
          {
            plan: (cached.plan as WeeklyPlanOutput['plan']) ?? [],
            motivation: cached.motivation ?? '',
          },
          existingMissions,
          cached.bonus_awarded ?? false,
          today,
        ),
      }
    }

    // 무효한 캐시 → 재구축
    await admin
      .from('weekly_plans')
      .delete()
      .eq('student_id', studentId)
      .eq('week_start', weekStart)
    await admin
      .from('weekly_plan_missions')
      .delete()
      .eq('student_id', studentId)
      .eq('week_start', weekStart)
  }

  // 체험 스킬트리 available 노드 조회
  const { data: progress } = await admin
    .from('student_progress')
    .select('node_id, status')
    .eq('student_id', studentId)
    .in('status', ['available', 'completed'])

  const available = (progress ?? [])
    .filter(p => p.status === 'available')
    .map(p => p.node_id)

  if (available.length === 0) {
    return { error: '데모 환경 구축이 필요합니다.' }
  }

  const { data: nodes } = await admin
    .from('nodes')
    .select('id, title')
    .in('id', available)

  const nodeById = new Map((nodes ?? []).map(n => [n.id, n.title]))

  // 월~금에 노드 배정 (4개 노드 → 월화수목, 금요일은 복습)
  const planDays: WeeklyPlanOutput['plan'] = []
  const daysToAssign: WeeklyPlanDay[] = ['mon', 'tue', 'wed', 'thu', 'fri']
  available.slice(0, 4).forEach((nodeId, i) => {
    planDays.push({
      day: daysToAssign[i],
      nodes: [{ id: nodeId, title: nodeById.get(nodeId) ?? '노드' }],
      reason: `이 노드의 개념을 익히는 날입니다. 퀴즈를 풀면 미션이 완료돼요.`,
    })
  })
  if (available.length > 0) {
    planDays.push({
      day: 'fri',
      nodes: [{ id: available[0], title: nodeById.get(available[0]) ?? '노드' }],
      reason: '한 주를 마무리하며 가장 중요한 개념을 복습합니다.',
    })
  }

  const planOutput: WeeklyPlanOutput = {
    plan: planDays,
    motivation: '이번 주 하나씩 꾸준히 풀어봅시다! 꾸준함이 가장 큰 힘이에요. 👍',
  }

  // DB 저장
  await admin.from('weekly_plans').upsert({
    student_id: studentId,
    week_start: weekStart,
    plan: planOutput.plan,
    motivation: planOutput.motivation,
    bonus_awarded: false,
  }, { onConflict: 'student_id,week_start' })

  await admin.from('weekly_plan_missions').delete().eq('student_id', studentId).eq('week_start', weekStart)
  const missionRows = planDays.flatMap(d =>
    d.nodes.map(n => ({
      student_id: studentId,
      week_start: weekStart,
      day: d.day,
      node_id: n.id,
      completed: false,
    }))
  )
  if (missionRows.length > 0) {
    await admin.from('weekly_plan_missions').insert(missionRows)
  }

  await syncMissionsWithProgress(admin, studentId, weekStart)

  const missions = await fetchMissions(admin, studentId, weekStart)
  return {
    data: buildPlanResult(weekStart, planOutput, missions, false, today),
  }
}

/**
 * weekly_plan_missions 조회 + 노드 제목 join.
 */
async function fetchMissions(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  weekStart: string
): Promise<WeeklyPlanMission[]> {
  const { data: rows } = await admin
    .from('weekly_plan_missions')
    .select('id, day, node_id, completed, completed_at')
    .eq('student_id', studentId)
    .eq('week_start', weekStart)
    .order('day')

  if (!rows || rows.length === 0) return []

  const nodeIds = [...new Set(rows.map(r => r.node_id))]
  const { data: nodes } = await admin
    .from('nodes')
    .select('id, title')
    .in('id', nodeIds)

  const titleMap = new Map((nodes ?? []).map(n => [n.id, n.title]))
  return rows.map(r => ({
    id: r.id,
    day: r.day as WeeklyPlanDay,
    node_id: r.node_id,
    node_title: titleMap.get(r.node_id) ?? '알 수 없는 노드',
    completed: r.completed,
    completed_at: r.completed_at,
  }))
}

/**
 * 이미 student_progress에 completed인 노드는 미션도 자동 완료 처리.
 * 주간 계획 생성 직후 + 주기적 동기화에 사용.
 */
async function syncMissionsWithProgress(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  weekStart: string
): Promise<void> {
  const { data: missions } = await admin
    .from('weekly_plan_missions')
    .select('id, node_id, completed')
    .eq('student_id', studentId)
    .eq('week_start', weekStart)

  if (!missions || missions.length === 0) return

  const uncompletedMissions = missions.filter(m => !m.completed)
  if (uncompletedMissions.length === 0) return

  const nodeIds = [...new Set(uncompletedMissions.map(m => m.node_id))]
  const { data: progress } = await admin
    .from('student_progress')
    .select('node_id, status, completed_at')
    .eq('student_id', studentId)
    .in('node_id', nodeIds)
    .eq('status', 'completed')

  if (!progress || progress.length === 0) return

  const completedMap = new Map(progress.map(p => [p.node_id, p.completed_at]))

  const missionsToUpdate = uncompletedMissions.filter(m => completedMap.has(m.node_id))
  if (missionsToUpdate.length === 0) return

  // 배치 update — 각 미션을 개별로 업데이트 (supabase-js는 batch update 부족)
  await Promise.all(
    missionsToUpdate.map(m =>
      admin
        .from('weekly_plan_missions')
        .update({
          completed: true,
          completed_at: completedMap.get(m.node_id) ?? new Date().toISOString(),
        })
        .eq('id', m.id)
    )
  )
}

/**
 * WeeklyPlanWithMissions 결과 조립.
 */
function buildPlanResult(
  weekStart: string,
  plan: WeeklyPlanOutput,
  missions: WeeklyPlanMission[],
  bonusAwarded: boolean,
  today: WeeklyPlanDay,
): WeeklyPlanWithMissions {
  const totalCount = missions.length
  const completedCount = missions.filter(m => m.completed).length
  const progressPercent = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0

  // 월~금 미션만 집계
  const weekdayMissions = missions.filter(m => WEEKDAYS.includes(m.day))
  const allCompleted = weekdayMissions.length > 0
    && weekdayMissions.every(m => m.completed)

  return {
    weekStart,
    plan,
    missions,
    completedCount,
    totalCount,
    progressPercent,
    bonusAwarded,
    allCompleted,
    today,
  }
}

// ============================================
// 외부 호출용: 노드 완료 시 미션 동기화
// ============================================

/**
 * completeNode 등에서 호출 — 특정 노드가 완료되면 이번 주 미션 중
 * 해당 노드가 배정된 요일 미션을 자동 완료 처리.
 */
export async function markWeeklyMissionsForNode(nodeId: string): Promise<void> {
  try {
    const user = await getCachedUser()
    if (!user) return

    const admin = createAdminClient()
    const weekStart = getMondayOfWeek(new Date())

    await admin
      .from('weekly_plan_missions')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('student_id', user.id)
      .eq('week_start', weekStart)
      .eq('node_id', nodeId)
      .eq('completed', false)
  } catch (err) {
    console.error('[markWeeklyMissionsForNode]', err)
  }
}

// ============================================
// 주간 완주 보너스 + 주 전환
// ============================================

/**
 * 월~금 미션 전부 완료 시 보너스 XP 100 지급.
 * 한 주에 한 번만 지급 (weekly_plans.bonus_awarded 플래그).
 */
export async function awardWeeklyBonusIfEligible(): Promise<{
  data?: { awarded: boolean; xpGained: number }
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모는 silent skip (XP 변경 차단)
    if (isDemoAccount(user.email)) return { data: { awarded: false, xpGained: 0 } }

    const admin = createAdminClient()
    const weekStart = getMondayOfWeek(new Date())

    const { data: cached } = await admin
      .from('weekly_plans')
      .select('bonus_awarded')
      .eq('student_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (!cached) return { data: { awarded: false, xpGained: 0 } }
    if (cached.bonus_awarded) return { data: { awarded: false, xpGained: 0 } }

    // 월~금 미션 전부 완료 여부
    const { data: missions } = await admin
      .from('weekly_plan_missions')
      .select('day, completed')
      .eq('student_id', user.id)
      .eq('week_start', weekStart)
      .in('day', ['mon', 'tue', 'wed', 'thu', 'fri'])

    if (!missions || missions.length === 0) return { data: { awarded: false, xpGained: 0 } }
    if (missions.some(m => !m.completed)) return { data: { awarded: false, xpGained: 0 } }

    // XP 지급 + 플래그 설정
    const BONUS_XP = 100
    const { data: profile } = await admin
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single()

    const newXp = (profile?.xp ?? 0) + BONUS_XP
    await admin.from('profiles').update({ xp: newXp }).eq('id', user.id)
    await admin
      .from('weekly_plans')
      .update({ bonus_awarded: true })
      .eq('student_id', user.id)
      .eq('week_start', weekStart)

    return { data: { awarded: true, xpGained: BONUS_XP } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 지난 주 계획의 요약 조회 (새 주 시작 모달용).
 * 이번 주가 월요일이 아닐 때도 호출 가능.
 */
export async function getPreviousWeekSummary(): Promise<{
  data?: {
    weekStart: string
    completedCount: number
    totalCount: number
    progressPercent: number
    bonusAwarded: boolean
  } | null
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 지난 주 월요일 = 이번 주 월요일 - 7일
    const thisMonday = new Date(getMondayOfWeek(new Date()) + 'T00:00:00')
    thisMonday.setDate(thisMonday.getDate() - 7)
    const lastWeekStart = thisMonday.toISOString().slice(0, 10)

    const { data: cached } = await admin
      .from('weekly_plans')
      .select('bonus_awarded')
      .eq('student_id', user.id)
      .eq('week_start', lastWeekStart)
      .maybeSingle()

    if (!cached) return { data: null }

    const { data: missions } = await admin
      .from('weekly_plan_missions')
      .select('completed')
      .eq('student_id', user.id)
      .eq('week_start', lastWeekStart)

    const totalCount = missions?.length ?? 0
    const completedCount = missions?.filter(m => m.completed).length ?? 0
    const progressPercent = totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0

    return {
      data: {
        weekStart: lastWeekStart,
        completedCount,
        totalCount,
        progressPercent,
        bonusAwarded: cached.bonus_awarded ?? false,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 기존 getWeeklyPlan (하위 호환 — 지난 API)
// ============================================

/**
 * @deprecated — getWeeklyPlanWithMissions를 사용하세요.
 * 기존 API와의 호환을 위해 남겨두었지만 새 필드는 반환하지 않습니다.
 */
export async function getWeeklyPlan(
  forceRefresh: boolean = false
): Promise<{ data?: WeeklyPlanOutput; error?: string }> {
  const res = await getWeeklyPlanWithMissions(forceRefresh)
  if (res.error) return { error: res.error }
  if (!res.data) return { error: '주간 계획을 불러올 수 없습니다.' }
  return { data: res.data.plan }
}

