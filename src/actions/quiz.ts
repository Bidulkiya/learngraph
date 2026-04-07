'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { quizSchema, essayGradingSchema, quizHintSchema } from '@/lib/ai/schemas'
import { QUIZ_PROMPT, QUIZ_HINT_PROMPT } from '@/lib/ai/prompts'
import type { Quiz } from '@/types/quiz'

/**
 * Generate quizzes for a node, or return existing ones.
 */
export async function generateQuizForNode(
  nodeId: string
): Promise<{ data?: Quiz[]; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // Check if quizzes already exist
    const { data: existing } = await admin
      .from('quizzes')
      .select('*')
      .eq('node_id', nodeId)

    if (existing && existing.length > 0) {
      return { data: existing as Quiz[] }
    }

    // Get node info
    const { data: node } = await admin
      .from('nodes')
      .select('title, description, difficulty')
      .eq('id', nodeId)
      .single()

    if (!node) return { error: '노드를 찾을 수 없습니다.' }

    // 난이도 자동 조절: 최근 5개 quiz_attempts 조회
    let adjustedDifficulty = node.difficulty ?? 1
    const { data: recentAttempts } = await admin
      .from('quiz_attempts')
      .select('is_correct, attempted_at')
      .eq('student_id', user.id)
      .eq('node_id', nodeId)
      .order('attempted_at', { ascending: false })
      .limit(5)

    if (recentAttempts && recentAttempts.length >= 3) {
      const last3 = recentAttempts.slice(0, 3)
      const last2 = recentAttempts.slice(0, 2)
      if (last3.every(a => a.is_correct)) {
        adjustedDifficulty = Math.min(5, adjustedDifficulty + 1)
      } else if (last2.every(a => !a.is_correct)) {
        adjustedDifficulty = Math.max(1, adjustedDifficulty - 1)
      }
    }

    // Generate quiz via Claude with adjusted difficulty
    const { object: quiz } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: quizSchema,
      prompt: QUIZ_PROMPT(node.title, node.description ?? '', adjustedDifficulty),
    })

    // Save to DB
    const quizInserts = quiz.questions.map(q => ({
      node_id: nodeId,
      question: q.question,
      question_type: q.type,
      options: q.options ?? null,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    }))

    const { data: savedQuizzes, error: saveErr } = await admin
      .from('quizzes')
      .insert(quizInserts)
      .select()

    if (saveErr) return { error: '퀴즈 저장 실패: ' + saveErr.message }
    return { data: savedQuizzes as Quiz[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generateQuizForNode]', msg)
    return { error: `퀴즈 생성 실패: ${msg}` }
  }
}

/**
 * Submit a quiz answer and handle scoring + node unlock.
 */
export async function submitQuizAnswer(
  quizId: string,
  nodeId: string,
  answer: string
): Promise<{
  data?: { isCorrect: boolean; explanation: string; score: number; aiFeedback?: string }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: quiz } = await admin
      .from('quizzes')
      .select('question, correct_answer, explanation, question_type')
      .eq('id', quizId)
      .single()

    if (!quiz) return { error: '퀴즈를 찾을 수 없습니다.' }

    // 노드 정보도 가져옴 (서술형 채점 컨텍스트용)
    const { data: node } = await admin
      .from('nodes')
      .select('title, description')
      .eq('id', nodeId)
      .single()

    let isCorrect = false
    let score = 0
    let aiFeedback: string | undefined

    if (quiz.question_type === 'multiple_choice') {
      // 객관식: 정확 매칭
      isCorrect = answer.trim() === quiz.correct_answer.trim()
      score = isCorrect ? 100 : 0
    } else {
      // 서술형/주관식: Claude AI 의미 채점
      try {
        const { object: grading } = await generateObject({
          model: anthropic('claude-sonnet-4-6'),
          schema: essayGradingSchema,
          prompt: `당신은 친절한 교사입니다. 학생의 서술형 답변을 의미 기반으로 평가하세요.

## 학습 개념
- 노드 제목: ${node?.title ?? ''}
- 노드 설명: ${node?.description ?? ''}

## 문제
${quiz.question}

## 모범 답안
${quiz.correct_answer}

## 학생 답변
${answer}

## 평가 규칙
1. 학생의 답변이 정답의 핵심 개념을 포함하는지 의미 기반으로 평가하세요.
2. 완벽하지 않아도 핵심을 이해했으면 부분 점수를 주세요.
3. 70점 이상이면 통과(is_correct=true)로 판정하세요.
4. 피드백은 한국어로, 구체적으로:
   - 잘 이해한 부분
   - 틀리거나 부족한 부분
   - 보충 학습이 필요한 내용
5. 점수는 0~100 사이의 정수로 매기세요.`,
        })
        isCorrect = grading.is_correct
        score = Math.round(grading.score)
        aiFeedback = grading.feedback
      } catch (gradeErr) {
        // AI 채점 실패 시 fallback: 키워드 매칭
        console.error('[submitQuizAnswer] AI 채점 실패, fallback:', gradeErr)
        const normalizedAnswer = answer.trim().toLowerCase()
        const normalizedCorrect = quiz.correct_answer.trim().toLowerCase()
        isCorrect = normalizedAnswer.includes(normalizedCorrect) ||
                    normalizedCorrect.includes(normalizedAnswer)
        score = isCorrect ? 80 : 30
        aiFeedback = '자동 채점이 일시적으로 불가능합니다. 키워드 기반으로 평가했습니다.'
      }
    }

    // Record attempt with AI feedback
    await admin.from('quiz_attempts').insert({
      student_id: user.id,
      quiz_id: quizId,
      node_id: nodeId,
      answer,
      is_correct: isCorrect,
      score,
      feedback: aiFeedback ?? quiz.explanation,
    })

    return {
      data: {
        isCorrect,
        explanation: quiz.explanation,
        score,
        aiFeedback,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `채점 실패: ${msg}` }
  }
}

/**
 * Complete a node after passing the quiz (70%+ correct).
 * Updates progress and unlocks subsequent nodes.
 */
export async function completeNode(
  nodeId: string,
  score: number
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // Get node info for XP calculation
    const { data: node } = await admin
      .from('nodes')
      .select('skill_tree_id, difficulty')
      .eq('id', nodeId)
      .single()

    if (!node) return { error: '노드를 찾을 수 없습니다.' }

    // Update progress to completed
    const { error: progressErr } = await admin
      .from('student_progress')
      .upsert({
        student_id: user.id,
        node_id: nodeId,
        skill_tree_id: node.skill_tree_id,
        status: 'completed',
        quiz_score: score,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'student_id,node_id' })

    if (progressErr) return { error: '진도 업데이트 실패: ' + progressErr.message }

    // Add XP (difficulty × 20)
    const xpGain = (node.difficulty ?? 1) * 20
    const { data: profile } = await admin
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single()

    if (profile) {
      await admin
        .from('profiles')
        .update({ xp: (profile.xp ?? 0) + xpGain })
        .eq('id', user.id)
    }

    // Unlock subsequent nodes
    const { data: nextEdges } = await admin
      .from('node_edges')
      .select('target_node_id')
      .eq('source_node_id', nodeId)

    if (nextEdges) {
      for (const edge of nextEdges) {
        const { data: prereqEdges } = await admin
          .from('node_edges')
          .select('source_node_id')
          .eq('target_node_id', edge.target_node_id)

        if (prereqEdges) {
          const results = await Promise.all(
            prereqEdges.map(async (pe) => {
              const { data } = await admin
                .from('student_progress')
                .select('status')
                .eq('student_id', user.id)
                .eq('node_id', pe.source_node_id)
                .single()
              return data?.status === 'completed'
            })
          )

          if (results.every(Boolean)) {
            await admin
              .from('student_progress')
              .upsert({
                student_id: user.id,
                node_id: edge.target_node_id,
                skill_tree_id: node.skill_tree_id,
                status: 'available',
              }, { onConflict: 'student_id,node_id' })
          }
        }
      }
    }

    // 복습 알림 자동 생성 (1일/3일/7일 후)
    const now = new Date()
    const reminders = [1, 3, 7].map(days => {
      const d = new Date(now)
      d.setDate(d.getDate() + days)
      return {
        student_id: user.id,
        node_id: nodeId,
        remind_at: d.toISOString().slice(0, 10),
      }
    })
    await admin.from('review_reminders').insert(reminders)

    // 활동 피드 기록
    try {
      const { data: nodeInfo } = await admin
        .from('nodes')
        .select('title, skill_tree_id')
        .eq('id', nodeId)
        .single()
      if (nodeInfo?.skill_tree_id) {
        const { data: treeInfo } = await admin
          .from('skill_trees')
          .select('class_id')
          .eq('id', nodeInfo.skill_tree_id)
          .single()
        const classId = treeInfo?.class_id
        if (classId) {
          const { postActivity } = await import('./feed')
          await postActivity(classId, 'node_unlock', {
            title: nodeInfo.title ?? '노드',
            score,
          })
        }
      }
    } catch (e) {
      console.error('[completeNode] feed hook failed:', e)
    }

    // 미션 진행도 업데이트
    try {
      const { updateMissionProgress } = await import('./missions')
      await updateMissionProgress('unlock_node')
      // 만점이면 perfect_score 미션도
      if (score >= 100) {
        await updateMissionProgress('complete_quiz')
      } else {
        await updateMissionProgress('complete_quiz')
      }
    } catch (e) {
      console.error('[completeNode] mission update failed:', e)
    }

    // 업적 자동 체크
    try {
      const { checkAndAwardAchievements } = await import('./achievements')
      await checkAndAwardAchievements()
    } catch (e) {
      console.error('[completeNode] achievements check failed:', e)
    }

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Get quizzes for a node (for teacher quiz management).
 */
export async function getQuizzesForNode(
  nodeId: string
): Promise<{ data?: Quiz[]; error?: string }> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('quizzes')
      .select('*')
      .eq('node_id', nodeId)
      .order('created_at')
    if (error) return { error: error.message }
    return { data: data as Quiz[] }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Update a quiz question (teacher editing).
 */
export async function updateQuiz(
  quizId: string,
  updates: { question?: string; correct_answer?: string; explanation?: string; options?: string[] }
): Promise<{ error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Delete all quizzes for a node and regenerate.
 */
export async function regenerateQuizzes(
  nodeId: string
): Promise<{ data?: Quiz[]; error?: string }> {
  try {
    const admin = createAdminClient()
    await admin.from('quizzes').delete().eq('node_id', nodeId)
    return await generateQuizForNode(nodeId)
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * AI 퀴즈 힌트 생성 (정답 직접 공개 금지)
 */
export async function getQuizHint(
  quizId: string
): Promise<{ data?: { hint: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: quiz } = await admin
      .from('quizzes')
      .select('question, correct_answer')
      .eq('id', quizId)
      .single()

    if (!quiz) return { error: '퀴즈를 찾을 수 없습니다.' }

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: quizHintSchema,
      prompt: QUIZ_HINT_PROMPT(quiz.question, quiz.correct_answer),
    })

    return { data: object }
  } catch (err) {
    return { error: `힌트 생성 실패: ${err instanceof Error ? err.message : String(err)}` }
  }
}
