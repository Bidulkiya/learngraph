'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'

export interface DailyMission {
  id: string
  mission_type: string
  title: string
  target: number
  progress: number
  completed: boolean
  xp_reward: number
}

const MISSION_TEMPLATES: Array<{
  type: 'unlock_node' | 'complete_quiz' | 'ask_tutor' | 'review_node' | 'study_time'
  title: string
  target: number
  xp_reward: number
}> = [
  { type: 'unlock_node', title: '노드 1개 언락하기', target: 1, xp_reward: 30 },
  { type: 'complete_quiz', title: '퀴즈 3개 풀기', target: 3, xp_reward: 25 },
  { type: 'ask_tutor', title: 'AI 튜터에게 1번 질문하기', target: 1, xp_reward: 20 },
  { type: 'review_node', title: '복습 노드 1개 다시 풀기', target: 1, xp_reward: 25 },
  { type: 'study_time', title: '30분 학습하기', target: 30, xp_reward: 35 },
]

function pickRandomMissions(count: number): typeof MISSION_TEMPLATES {
  const shuffled = [...MISSION_TEMPLATES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * 오늘 미션을 가져오거나 (없으면) 자동 생성
 */
export async function getTodayMissions(): Promise<{
  data?: DailyMission[]
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data: existing } = await admin
      .from('daily_missions')
      .select('id, student_id, mission_type, title, target, progress, completed, xp_reward, mission_date')
      .eq('student_id', user.id)
      .eq('mission_date', today)
      .order('created_at')

    if (existing && existing.length > 0) {
      return { data: existing as DailyMission[] }
    }

    // Generate 3 random missions
    const templates = pickRandomMissions(3)
    const inserts = templates.map(t => ({
      student_id: user.id,
      mission_type: t.type,
      title: t.title,
      target: t.target,
      xp_reward: t.xp_reward,
      mission_date: today,
    }))

    const { data: created } = await admin
      .from('daily_missions')
      .insert(inserts)
      .select()

    return { data: (created ?? []) as DailyMission[] }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 특정 타입 미션의 progress 증가
 */
export async function updateMissionProgress(
  missionType: string,
  amount: number = 1
): Promise<{ awarded?: number; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단 (쓰기)
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return {}  // 에러 없이 조용히 스킵 (내부 호출이므로)

    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data: mission } = await admin
      .from('daily_missions')
      .select('id, student_id, mission_type, title, target, progress, completed, xp_reward, mission_date')
      .eq('student_id', user.id)
      .eq('mission_type', missionType)
      .eq('mission_date', today)
      .maybeSingle()

    if (!mission || mission.completed) return {}

    const newProgress = Math.min(mission.target, mission.progress + amount)
    const justCompleted = newProgress >= mission.target && !mission.completed

    await admin
      .from('daily_missions')
      .update({
        progress: newProgress,
        completed: justCompleted ? true : mission.completed,
      })
      .eq('id', mission.id)

    // XP 지급
    if (justCompleted) {
      const { data: profile } = await admin
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .single()

      if (profile) {
        await admin
          .from('profiles')
          .update({ xp: (profile.xp ?? 0) + mission.xp_reward })
          .eq('id', user.id)
      }

      return { awarded: mission.xp_reward }
    }

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}
