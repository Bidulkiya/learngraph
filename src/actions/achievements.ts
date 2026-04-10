'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoAccount } from '@/lib/demo'

export interface Achievement {
  id: string
  code: string
  title: string
  description: string
  icon: string
  xp_reward: number
  condition_type: string
  condition_value: number
  category: AchievementCategory
  is_hidden: boolean
}

export interface UserAchievement extends Achievement {
  earned: boolean
  earned_at: string | null
}

export type AchievementCategory =
  | 'learning'
  | 'streak'
  | 'ranking'
  | 'social'
  | 'hidden'

// ============================================
// 학생 활동 집계 (한 번에 계산)
// ============================================

interface StudentMetrics {
  nodesUnlocked: number
  perfectScores: number
  streakDays: number
  quizzesCompleted: number
  treeCompleted: number
  streakCorrect: number
  tutorQuestions: number
  weeklyPlanCompleted: number
  studyGroupJoined: number       // 0 or 1
  feedReactionsReceived: number
  flashcardsReviewed: number
  nightQuiz: number              // 0 or 1 (23시 이후 퀴즈 attempts 존재)
  earlyActivity: number          // 0 or 1 (새벽 6시 이전 활동)
  dailyMarathon: number          // today_study_minutes
  perfectTree: number            // 0 or 1 (한 스킬트리 모든 노드 만점)
  crossSubjectTrees: number      // 다른 subject_hint로 완주한 스킬트리 수
  phoenixRecovery: number        // 0 or 1 (5연속 오답 후 만점 기록 존재)
  // 랭킹 메트릭은 "연속 N일 1등 유지" 방식으로 변경.
  // daily_ranking_snapshots 테이블에서 최근 연속 일수를 집계한다.
  rankingClassTop1: number            // 최근 연속 클래스 1등 일수
  rankingSchoolTop1: number           // 최근 연속 스쿨 1등 일수
  rankingClassTop1Persistent: number  // 동일 — 클래스 왕좌(14일) 판정용
  rankingSchoolTop1Persistent: number // 동일 — 스쿨 왕좌(30일) 판정용
}

async function collectMetrics(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<StudentMetrics> {
  // 핵심 데이터 병렬 조회
  const [progressRes, profileRes, attemptsRes, tutorRes, groupRes, cardReviewsRes, weeklyBonusRes] =
    await Promise.all([
      admin
        .from('student_progress')
        .select('node_id, skill_tree_id, status, quiz_score')
        .eq('student_id', userId),
      admin
        .from('profiles')
        .select('xp, streak_days, today_study_minutes')
        .eq('id', userId)
        .single(),
      admin
        .from('quiz_attempts')
        .select('is_correct, score, attempted_at, node_id')
        .eq('student_id', userId)
        .order('attempted_at', { ascending: false })
        .limit(200),
      admin
        .from('tutor_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', userId)
        .eq('role', 'user'),
      admin
        .from('study_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      admin
        .from('flashcard_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', userId),
      admin
        .from('weekly_plans')
        .select('bonus_awarded')
        .eq('student_id', userId)
        .eq('bonus_awarded', true),
    ])

  const progress = progressRes.data ?? []
  const profile = profileRes.data
  const attempts = attemptsRes.data ?? []

  // 기본 집계
  const nodesUnlocked = progress.filter(p => p.status === 'completed').length
  const perfectScores = progress.filter(p => (p.quiz_score ?? 0) >= 100).length

  // 완주 스킬트리
  const treeIds = [...new Set(progress.map(p => p.skill_tree_id))]
  let treeCompleted = 0
  const completedTreeIds: string[] = []
  for (const tId of treeIds) {
    const treeProgress = progress.filter(p => p.skill_tree_id === tId)
    if (treeProgress.length > 0 && treeProgress.every(p => p.status === 'completed')) {
      treeCompleted++
      completedTreeIds.push(tId)
    }
  }

  // 완벽 트리: 완주한 스킬트리 중 모든 노드 quiz_score가 100
  let perfectTree = 0
  for (const tId of completedTreeIds) {
    const tp = progress.filter(p => p.skill_tree_id === tId)
    if (tp.length > 0 && tp.every(p => (p.quiz_score ?? 0) >= 100)) {
      perfectTree = 1
      break
    }
  }

  // 크로스 과목: 완주한 스킬트리의 subject_hint 유니크 수
  let crossSubjectTrees = 0
  if (completedTreeIds.length > 0) {
    const { data: treesInfo } = await admin
      .from('skill_trees')
      .select('id, subject_hint')
      .in('id', completedTreeIds)
    const subjects = new Set(
      (treesInfo ?? [])
        .map(t => t.subject_hint)
        .filter((s): s is string => !!s)
    )
    crossSubjectTrees = subjects.size
  }

  // 연속 정답 (최근 200 attempts 중 최대)
  let streakCorrect = 0
  let maxStreak = 0
  for (const a of attempts) {
    if (a.is_correct) {
      streakCorrect++
      maxStreak = Math.max(maxStreak, streakCorrect)
    } else {
      streakCorrect = 0
    }
  }

  // 퀴즈 총 풀이 수 (정답/오답 합)
  const quizzesCompleted = attempts.length

  // 튜터 질문 수
  const tutorQuestions = tutorRes.count ?? 0

  // 스터디 그룹 가입
  const studyGroupJoined = (groupRes.count ?? 0) > 0 ? 1 : 0

  // 피드 리액션 받은 수 — 직접 계산 (RPC가 없을 수 있음)
  let feedReactionsReceived = 0
  try {
    const { data: myFeeds } = await admin
      .from('activity_feed')
      .select('id')
      .eq('user_id', userId)
    const feedIds = myFeeds?.map(f => f.id) ?? []
    if (feedIds.length > 0) {
      const { count } = await admin
        .from('feed_reactions')
        .select('*', { count: 'exact', head: true })
        .in('feed_id', feedIds)
      feedReactionsReceived = count ?? 0
    }
  } catch {
    feedReactionsReceived = 0
  }

  // 플래시카드 복습 수
  const flashcardsReviewed = cardReviewsRes.count ?? 0

  // 주간 완주 회수
  const weeklyPlanCompleted = weeklyBonusRes.data?.length ?? 0

  // 히든: 밤 11시 이후 퀴즈
  const nightQuiz = attempts.some(a => {
    const h = new Date(a.attempted_at).getHours()
    return h >= 23 || h < 5
  }) ? 1 : 0

  // 히든: 오전 6시 이전 활동 (퀴즈 기준)
  const earlyActivity = attempts.some(a => {
    const h = new Date(a.attempted_at).getHours()
    return h < 6 && h >= 4
  }) ? 1 : 0

  // 히든: 오늘 3시간(180분) 이상 학습
  const dailyMarathon = profile?.today_study_minutes ?? 0

  // 히든: 5연속 오답 후 같은 노드 만점 (phoenix)
  // 노드별로 최근 시도를 시간순으로 재정렬 후 패턴 감지
  let phoenixRecovery = 0
  const attemptsByNode = new Map<string, Array<{ is_correct: boolean; score: number; ts: number }>>()
  for (const a of attempts) {
    const list = attemptsByNode.get(a.node_id) ?? []
    list.push({
      is_correct: a.is_correct ?? false,
      score: a.score ?? 0,
      ts: new Date(a.attempted_at).getTime(),
    })
    attemptsByNode.set(a.node_id, list)
  }
  for (const [, arr] of attemptsByNode) {
    // 시간 오름차순 정렬
    arr.sort((a, b) => a.ts - b.ts)
    // 연속 5 오답 구간 직후 만점(100) 기록이 있는지 검사
    let consecWrong = 0
    for (const at of arr) {
      if (!at.is_correct) {
        consecWrong++
      } else {
        if (consecWrong >= 5 && at.score >= 100) {
          phoenixRecovery = 1
          break
        }
        consecWrong = 0
      }
    }
    if (phoenixRecovery === 1) break
  }

  // 랭킹 — 오늘의 class/school top1 여부 조회
  const { classTop1Today, schoolTop1Today } = await computeRanking(admin, userId)

  // 오늘의 스냅샷 upsert
  const today = new Date().toISOString().slice(0, 10)
  await admin
    .from('daily_ranking_snapshots')
    .upsert({
      student_id: userId,
      snapshot_date: today,
      class_top1: classTop1Today,
      school_top1: schoolTop1Today,
    }, { onConflict: 'student_id,snapshot_date' })

  // 오늘을 포함한 최근 연속 1등 일수 계산 (오늘부터 과거로 거슬러 올라감)
  const { classStreak, schoolStreak } = await computeRankingStreaks(admin, userId, today)

  // 모든 랭킹 메트릭은 연속 일수로 표현 — condition_value 와 직접 비교
  return {
    nodesUnlocked,
    perfectScores,
    streakDays: profile?.streak_days ?? 0,
    quizzesCompleted,
    treeCompleted,
    streakCorrect: maxStreak,
    tutorQuestions,
    weeklyPlanCompleted,
    studyGroupJoined,
    feedReactionsReceived,
    flashcardsReviewed,
    nightQuiz,
    earlyActivity,
    dailyMarathon,
    perfectTree,
    crossSubjectTrees,
    phoenixRecovery,
    // 랭킹 = 오늘부터 과거로 거슬러 올라가며 센 연속 1등 일수
    rankingClassTop1: classStreak,
    rankingSchoolTop1: schoolStreak,
    rankingClassTop1Persistent: classStreak,
    rankingSchoolTop1Persistent: schoolStreak,
  }
}

/**
 * 오늘을 포함한 최근 연속 "1등 유지" 일수 계산.
 *
 * 알고리즘: 최근 60일의 스냅샷을 최신순으로 가져와, 오늘부터 연속으로
 * class_top1=true 인 일수를 센다. 중간에 false가 있으면 스트릭 종료.
 * 스냅샷이 없는 날은 "1등 아님"으로 간주.
 */
async function computeRankingStreaks(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  today: string,
): Promise<{ classStreak: number; schoolStreak: number }> {
  // 60일 전까지 조회 — 스쿨 왕좌(30일)의 2배 여유
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sinceStr = sixtyDaysAgo.toISOString().slice(0, 10)

  const { data: snapshots } = await admin
    .from('daily_ranking_snapshots')
    .select('snapshot_date, class_top1, school_top1')
    .eq('student_id', userId)
    .gte('snapshot_date', sinceStr)
    .order('snapshot_date', { ascending: false }) // 최신순

  if (!snapshots || snapshots.length === 0) {
    return { classStreak: 0, schoolStreak: 0 }
  }

  // 날짜 기준 Map — 빠른 lookup
  const byDate = new Map(snapshots.map(s => [s.snapshot_date, s]))

  // 오늘부터 하루씩 과거로 이동하며 연속 카운트
  const countStreak = (picker: (s: { class_top1: boolean; school_top1: boolean }) => boolean): number => {
    let streak = 0
    const cursor = new Date(today + 'T00:00:00')
    while (true) {
      const dateStr = cursor.toISOString().slice(0, 10)
      const snap = byDate.get(dateStr)
      if (!snap || !picker(snap)) break
      streak++
      cursor.setDate(cursor.getDate() - 1)
      // 60일 이상이면 안전장치
      if (streak > 60) break
    }
    return streak
  }

  return {
    classStreak: countStreak(s => s.class_top1),
    schoolStreak: countStreak(s => s.school_top1),
  }
}

/**
 * 학생의 오늘 시점 클래스/스쿨 XP 랭킹 1등 여부.
 * 클래스/스쿨이 여러 개면 하나라도 1등이면 true 반환.
 * 이 값은 daily_ranking_snapshots 에 기록되어 연속 일수 집계에 사용됨.
 */
async function computeRanking(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ classTop1Today: boolean; schoolTop1Today: boolean }> {
  // 내 클래스 목록 (approved)
  const { data: enrollments } = await admin
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', userId)
    .eq('status', 'approved')
  const classIds = enrollments?.map(e => e.class_id) ?? []

  // 내 스쿨 멤버십
  const { data: memberships } = await admin
    .from('school_members')
    .select('school_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .eq('role', 'student')
  const schoolIds = memberships?.map(m => m.school_id) ?? []

  let classTop = false
  if (classIds.length > 0) {
    for (const classId of classIds) {
      // 해당 클래스의 approved 학생들의 XP 중 최대
      const { data: classEnrolls } = await admin
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'approved')
      const studentIds = classEnrolls?.map(e => e.student_id) ?? []
      if (studentIds.length === 0) continue
      const { data: students } = await admin
        .from('profiles')
        .select('id, xp')
        .in('id', studentIds)
        .order('xp', { ascending: false })
        .limit(1)
      if (students?.[0]?.id === userId) {
        classTop = true
        break
      }
    }
  }

  let schoolTop = false
  if (schoolIds.length > 0) {
    for (const schoolId of schoolIds) {
      const { data: schoolMembers } = await admin
        .from('school_members')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('role', 'student')
        .eq('status', 'approved')
      const studentIds = schoolMembers?.map(m => m.user_id) ?? []
      if (studentIds.length === 0) continue
      const { data: students } = await admin
        .from('profiles')
        .select('id, xp')
        .in('id', studentIds)
        .order('xp', { ascending: false })
        .limit(1)
      if (students?.[0]?.id === userId) {
        schoolTop = true
        break
      }
    }
  }

  return { classTop1Today: classTop, schoolTop1Today: schoolTop }
}

/**
 * metric 값을 condition_type별로 매핑.
 */
function getMetricValue(conditionType: string, m: StudentMetrics): number {
  switch (conditionType) {
    case 'nodes_unlocked': return m.nodesUnlocked
    case 'perfect_score': return m.perfectScores
    case 'streak_days': return m.streakDays
    case 'quizzes_completed': return m.quizzesCompleted
    case 'tree_complete': return m.treeCompleted
    case 'streak_correct': return m.streakCorrect
    case 'tutor_questions': return m.tutorQuestions
    case 'weekly_plan_completed': return m.weeklyPlanCompleted
    case 'study_group_joined': return m.studyGroupJoined
    case 'feed_reactions_received': return m.feedReactionsReceived
    case 'flashcards_reviewed': return m.flashcardsReviewed
    case 'night_quiz': return m.nightQuiz
    case 'early_activity': return m.earlyActivity
    case 'daily_marathon': return m.dailyMarathon
    case 'perfect_tree': return m.perfectTree
    case 'cross_subject_trees': return m.crossSubjectTrees
    case 'phoenix_recovery': return m.phoenixRecovery
    case 'ranking_class_top1': return m.rankingClassTop1
    case 'ranking_school_top1': return m.rankingSchoolTop1
    case 'ranking_class_top1_persistent': return m.rankingClassTop1Persistent
    case 'ranking_school_top1_persistent': return m.rankingSchoolTop1Persistent
    default: return 0
  }
}

// ============================================
// 메인: 업적 자동 부여
// ============================================

/**
 * 학생의 활동 데이터를 집계해서 미획득 업적 자동 부여.
 * 반환: 새로 부여된 업적 목록 (클라이언트에서 토스트로 표시).
 */
export async function checkAndAwardAchievements(): Promise<{
  data?: { newAchievements: Achievement[] }
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정은 미리 부여된 업적만 사용
    if (isDemoAccount(user.email)) return { data: { newAchievements: [] } }

    const admin = createAdminClient()

    // 병렬 조회 — 업적 정의 + 획득 내역 + 메트릭 + 현재 XP
    const [{ data: allAchievements }, { data: earned }, metrics, { data: currentProfile }] =
      await Promise.all([
        admin
          .from('achievements')
          .select('id, code, title, description, icon, xp_reward, condition_type, condition_value, category, is_hidden'),
        admin
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id),
        collectMetrics(admin, user.id),
        admin
          .from('profiles')
          .select('xp')
          .eq('id', user.id)
          .single(),
      ])
    const earnedIds = new Set(earned?.map(e => e.achievement_id) ?? [])

    // 미획득 업적 중 달성 조건 충족 여부 판정 (JS 루프, DB 호출 없음)
    const newAchievements: Achievement[] = []
    let totalXpGain = 0
    const insertRows: Array<{ user_id: string; achievement_id: string }> = []

    for (const ach of allAchievements ?? []) {
      if (earnedIds.has(ach.id)) continue
      const metric = getMetricValue(ach.condition_type, metrics)
      if (metric < ach.condition_value) continue

      insertRows.push({ user_id: user.id, achievement_id: ach.id })
      totalXpGain += ach.xp_reward
      newAchievements.push(ach as Achievement)
    }

    // 배치 insert + XP 일괄 지급 (N+1 제거 — 최대 2 쿼리)
    if (insertRows.length > 0) {
      await admin.from('user_achievements').insert(insertRows)
    }
    if (totalXpGain > 0 && currentProfile) {
      await admin
        .from('profiles')
        .update({ xp: (currentProfile.xp ?? 0) + totalXpGain })
        .eq('id', user.id)
    }

    // 활동 피드 기록 — 새 업적 획득 시
    if (newAchievements.length > 0) {
      try {
        const { data: enrollments } = await admin
          .from('class_enrollments')
          .select('class_id')
          .eq('student_id', user.id)
          .eq('status', 'approved')
          .limit(1)
        const classId = enrollments?.[0]?.class_id
        if (classId) {
          const { postActivity } = await import('./feed')
          for (const ach of newAchievements) {
            // 히든 업적은 피드에 "???" 표시 (다른 학생에게 스포일러 방지)
            await postActivity(classId, 'badge_earned', {
              title: ach.is_hidden ? '🔓 히든 업적 해금!' : ach.title,
              icon: ach.icon,
            })
          }
        }
      } catch (e) {
        console.error('[checkAndAwardAchievements] feed hook failed:', e)
      }
    }

    return { data: { newAchievements } }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 모든 업적 (획득/미획득 + category/is_hidden 포함) 조회.
 */
export async function getMyAchievements(): Promise<{
  data?: UserAchievement[]
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const [{ data: all }, { data: earned }] = await Promise.all([
      admin
        .from('achievements')
        .select('id, code, title, description, icon, xp_reward, condition_type, condition_value, category, is_hidden')
        .order('category')
        .order('xp_reward'),
      admin
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user.id),
    ])

    const earnedMap = new Map(
      earned?.map(e => [e.achievement_id, e.earned_at]) ?? []
    )
    const result: UserAchievement[] = (all ?? []).map(a => ({
      ...(a as Achievement),
      earned: earnedMap.has(a.id),
      earned_at: earnedMap.get(a.id) ?? null,
    }))

    return { data: result }
  } catch (err) {
    return { error: String(err) }
  }
}
