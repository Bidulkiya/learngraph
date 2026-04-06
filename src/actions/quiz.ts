'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { quizSchema } from '@/lib/ai/schemas'
import { QUIZ_PROMPT } from '@/lib/ai/prompts'
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

    // Generate quiz via Claude
    const { object: quiz } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: quizSchema,
      prompt: QUIZ_PROMPT(node.title, node.description ?? '', node.difficulty ?? 1),
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
  data?: { isCorrect: boolean; explanation: string; score: number }
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // Get quiz (admin — anon client에서 RLS로 조회 실패 가능)
    const adminForRead = createAdminClient()
    const { data: quiz } = await adminForRead
      .from('quizzes')
      .select('correct_answer, explanation, question_type')
      .eq('id', quizId)
      .single()

    if (!quiz) return { error: '퀴즈를 찾을 수 없습니다.' }

    // Grade: exact match for MC, keyword match for short answer
    let isCorrect = false
    if (quiz.question_type === 'multiple_choice') {
      isCorrect = answer.trim() === quiz.correct_answer.trim()
    } else {
      // Keyword matching for short answer
      const normalizedAnswer = answer.trim().toLowerCase()
      const normalizedCorrect = quiz.correct_answer.trim().toLowerCase()
      isCorrect = normalizedAnswer.includes(normalizedCorrect) ||
                  normalizedCorrect.includes(normalizedAnswer) ||
                  normalizedAnswer === normalizedCorrect
    }

    // Record attempt (admin bypasses RLS)
    const admin = createAdminClient()
    await admin.from('quiz_attempts').insert({
      student_id: user.id,
      quiz_id: quizId,
      node_id: nodeId,
      answer,
      is_correct: isCorrect,
      score: isCorrect ? 100 : 0,
      feedback: quiz.explanation,
    })

    return {
      data: {
        isCorrect,
        explanation: quiz.explanation,
        score: isCorrect ? 100 : 0,
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
