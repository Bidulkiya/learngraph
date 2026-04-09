'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'

/**
 * 학습 시간 추가 (5분마다 호출)
 * 날짜가 바뀌면 today_study_minutes 리셋, 스트릭 자동 계산
 */
export async function addStudyMinutes(
  minutes: number
): Promise<{ data?: { todayMinutes: number; weekMinutes: number; streakDays: number }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단 (내부 호출 — 조용히 스킵)
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return {}

    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data: profile } = await admin
      .from('profiles')
      .select('today_study_minutes, week_study_minutes, last_study_date, streak_days')
      .eq('id', user.id)
      .single()

    if (!profile) return { error: '프로필을 찾을 수 없습니다.' }

    const isNewDay = profile.last_study_date !== today
    const todayMinutes = isNewDay ? minutes : (profile.today_study_minutes ?? 0) + minutes
    const weekMinutes = (profile.week_study_minutes ?? 0) + minutes

    // 스트릭 계산
    let streakDays = profile.streak_days ?? 0
    if (isNewDay) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      if (profile.last_study_date === yesterdayStr) {
        streakDays += 1
      } else {
        streakDays = 1
      }
    }

    await admin
      .from('profiles')
      .update({
        today_study_minutes: todayMinutes,
        week_study_minutes: weekMinutes,
        last_study_date: today,
        streak_days: streakDays,
      })
      .eq('id', user.id)

    // study_time 미션 진행도 업데이트
    try {
      const { updateMissionProgress } = await import('./missions')
      await updateMissionProgress('study_time', minutes)
    } catch (e) {
      console.error('[addStudyMinutes] mission update failed:', e)
    }

    return { data: { todayMinutes, weekMinutes, streakDays } }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 오늘 학습 시간 + 주간 학습 시간 조회
 */
export async function getStudyStats(): Promise<{
  data?: { todayMinutes: number; weekMinutes: number }
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data: profile } = await admin
      .from('profiles')
      .select('today_study_minutes, week_study_minutes, last_study_date')
      .eq('id', user.id)
      .single()

    if (!profile) return { data: { todayMinutes: 0, weekMinutes: 0 } }

    const todayMinutes = profile.last_study_date === today ? (profile.today_study_minutes ?? 0) : 0
    return {
      data: {
        todayMinutes,
        weekMinutes: profile.week_study_minutes ?? 0,
      },
    }
  } catch (err) {
    return { error: String(err) }
  }
}
