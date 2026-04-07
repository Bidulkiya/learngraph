'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface Achievement {
  id: string
  code: string
  title: string
  description: string
  icon: string
  xp_reward: number
  condition_type: string
  condition_value: number
}

export interface UserAchievement extends Achievement {
  earned: boolean
  earned_at: string | null
}

/**
 * 학생의 활동 데이터를 집계해서 미획득 업적 자동 부여
 */
export async function checkAndAwardAchievements(): Promise<{
  data?: { newAchievements: Achievement[] }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 1. 모든 업적 + 이미 획득한 업적
    const { data: allAchievements } = await admin.from('achievements').select('*')
    const { data: earned } = await admin
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id)
    const earnedIds = new Set(earned?.map(e => e.achievement_id) ?? [])

    // 2. 학생 활동 데이터 집계
    const { data: progress } = await admin
      .from('student_progress')
      .select('status, quiz_score, skill_tree_id')
      .eq('student_id', user.id)

    const nodesUnlocked = progress?.filter(p => p.status === 'completed').length ?? 0
    const perfectScores = progress?.filter(p => (p.quiz_score ?? 0) >= 100).length ?? 0

    // 스킬트리 완주 체크
    const treeIds = [...new Set(progress?.map(p => p.skill_tree_id) ?? [])]
    let treeCompleted = 0
    for (const tId of treeIds) {
      const treeProgress = progress?.filter(p => p.skill_tree_id === tId) ?? []
      if (treeProgress.length > 0 && treeProgress.every(p => p.status === 'completed')) {
        treeCompleted++
      }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('streak_days')
      .eq('id', user.id)
      .single()
    const streakDays = profile?.streak_days ?? 0

    const { count: quizzesCompleted } = await admin
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('is_correct', true)

    const { count: tutorQuestions } = await admin
      .from('tutor_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('role', 'user')

    // 연속 정답 체크
    const { data: recentAttempts } = await admin
      .from('quiz_attempts')
      .select('is_correct')
      .eq('student_id', user.id)
      .order('attempted_at', { ascending: false })
      .limit(20)
    let streakCorrect = 0
    let maxStreak = 0
    for (const a of recentAttempts ?? []) {
      if (a.is_correct) {
        streakCorrect++
        maxStreak = Math.max(maxStreak, streakCorrect)
      } else {
        streakCorrect = 0
      }
    }

    // 3. 각 업적 조건 확인
    const newAchievements: Achievement[] = []
    for (const ach of allAchievements ?? []) {
      if (earnedIds.has(ach.id)) continue

      let metric = 0
      switch (ach.condition_type) {
        case 'nodes_unlocked':
          metric = nodesUnlocked
          break
        case 'perfect_score':
          metric = perfectScores
          break
        case 'streak_days':
          metric = streakDays
          break
        case 'quizzes_completed':
          metric = quizzesCompleted ?? 0
          break
        case 'tree_complete':
          metric = treeCompleted
          break
        case 'streak_correct':
          metric = maxStreak
          break
        case 'tutor_questions':
          metric = tutorQuestions ?? 0
          break
      }

      if (metric >= ach.condition_value) {
        await admin.from('user_achievements').insert({
          user_id: user.id,
          achievement_id: ach.id,
        })

        // XP 지급
        const { data: p } = await admin
          .from('profiles')
          .select('xp')
          .eq('id', user.id)
          .single()
        if (p) {
          await admin
            .from('profiles')
            .update({ xp: (p.xp ?? 0) + ach.xp_reward })
            .eq('id', user.id)
        }

        newAchievements.push(ach as Achievement)
      }
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
            await postActivity(classId, 'badge_earned', {
              title: ach.title,
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
 * 모든 업적 (획득/미획득) 조회
 */
export async function getMyAchievements(): Promise<{
  data?: UserAchievement[]
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: all } = await admin.from('achievements').select('*').order('xp_reward')
    const { data: earned } = await admin
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', user.id)

    const earnedMap = new Map(earned?.map(e => [e.achievement_id, e.earned_at]) ?? [])
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
