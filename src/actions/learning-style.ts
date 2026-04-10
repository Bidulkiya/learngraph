'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import type { LearningStyle } from '@/types/user'

// getLearningStyle — 삭제됨. getCurrentProfile()의 learning_style 필드로 직접 조회.

/**
 * 학습 스타일 초기화 (재진단용).
 * 기존 learning_style을 null로 리셋하면 온보딩 페이지가 다시 표시된다.
 */
export async function clearLearningStyle(): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const { error: updateErr } = await admin
      .from('profiles')
      .update({ learning_style: null })
      .eq('id', user.id)

    if (updateErr) return { error: updateErr.message }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학생이 5문제 진단 후 결과 저장.
 * answers: 각 문항에서 선택한 스타일 (visual/textual/practical 중 하나씩)
 * 가장 많이 선택된 스타일을 최종 학습 스타일로 저장.
 */
export async function saveLearningStyle(
  answers: Array<'visual' | 'textual' | 'practical'>
): Promise<{ data?: { style: LearningStyle }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    if (!Array.isArray(answers) || answers.length === 0) {
      return { error: '진단 답변이 비어있습니다.' }
    }
    if (answers.length > 20) return { error: '진단 답변이 너무 많습니다.' }
    const validStyles = new Set(['visual', 'textual', 'practical'])
    if (!answers.every(a => validStyles.has(a))) {
      return { error: '유효하지 않은 진단 답변입니다.' }
    }

    // 가장 많이 선택된 스타일
    const counts: Record<string, number> = { visual: 0, textual: 0, practical: 0 }
    answers.forEach(a => { counts[a]++ })
    const style = (['visual', 'textual', 'practical'] as const).reduce((a, b) =>
      counts[a] >= counts[b] ? a : b
    )

    const admin = createAdminClient()
    const { error: updateErr } = await admin
      .from('profiles')
      .update({ learning_style: style })
      .eq('id', user.id)

    if (updateErr) return { error: '저장 실패: ' + updateErr.message }
    return { data: { style } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
