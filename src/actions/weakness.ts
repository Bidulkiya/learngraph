'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import { weaknessAnalysisSchema, type WeaknessAnalysisOutput } from '@/lib/ai/schemas'

export interface WrongAnswer {
  attempt_id: string
  quiz_id: string
  node_id: string
  node_title: string
  question: string
  question_type: string
  options: string[] | null
  correct_answer: string
  explanation: string
  user_answer: string
  feedback: string
  attempted_at: string
}

/**
 * 학생의 오답 목록 조회
 */
export async function getWrongAnswers(): Promise<{
  data?: WrongAnswer[]
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: attempts } = await admin
      .from('quiz_attempts')
      .select('id, quiz_id, node_id, answer, feedback, attempted_at')
      .eq('student_id', user.id)
      .eq('is_correct', false)
      .order('attempted_at', { ascending: false })
      .limit(50)

    if (!attempts || attempts.length === 0) return { data: [] }

    const quizIds = [...new Set(attempts.map(a => a.quiz_id))]
    const nodeIds = [...new Set(attempts.map(a => a.node_id))]

    const { data: quizzes } = await admin
      .from('quizzes')
      .select('id, question, question_type, options, correct_answer, explanation')
      .in('id', quizIds)

    const { data: nodes } = await admin
      .from('nodes')
      .select('id, title')
      .in('id', nodeIds)

    const quizMap = new Map(quizzes?.map(q => [q.id, q]) ?? [])
    const nodeMap = new Map(nodes?.map(n => [n.id, n]) ?? [])

    const wrongAnswers: WrongAnswer[] = attempts
      .map(a => {
        const q = quizMap.get(a.quiz_id)
        const n = nodeMap.get(a.node_id)
        if (!q || !n) return null
        return {
          attempt_id: a.id,
          quiz_id: a.quiz_id,
          node_id: a.node_id,
          node_title: n.title,
          question: q.question,
          question_type: q.question_type,
          options: q.options as string[] | null,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          user_answer: a.answer ?? '',
          feedback: a.feedback ?? '',
          attempted_at: a.attempted_at,
        }
      })
      .filter((x): x is WrongAnswer => x !== null)

    return { data: wrongAnswers }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Claude AI로 학생의 약점 진단
 */
export async function analyzeWeakness(): Promise<{
  data?: WeaknessAnalysisOutput
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const { data: wrongAnswers, error } = await getWrongAnswers()
    if (error) return { error }
    if (!wrongAnswers || wrongAnswers.length === 0) {
      return {
        data: {
          diagnosis: '아직 오답 데이터가 충분하지 않습니다. 더 많은 퀴즈를 풀어보세요!',
          weak_areas: [],
          recommendations: ['스킬트리에서 새로운 노드를 도전해보세요.'],
        },
      }
    }

    // 최근 10개 오답으로 분석
    const sample = wrongAnswers.slice(0, 10).map(w => ({
      node: w.node_title,
      question: w.question,
      correct: w.correct_answer,
      user_answer: w.user_answer,
    }))

    const { object: analysis } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: weaknessAnalysisSchema,
      prompt: `당신은 학습 분석 전문가입니다. 학생의 오답 데이터를 분석하여 학습 약점을 진단하세요.

## 학생의 오답 목록 (최근 ${sample.length}개)
${sample.map((s, i) => `
${i + 1}. [${s.node}]
   문제: ${s.question}
   정답: ${s.correct}
   학생 답변: ${s.user_answer}
`).join('\n')}

## 분석 규칙
1. 학생이 어떤 개념에서 어려움을 겪는지 패턴을 찾아라.
2. 단순 실수인지, 개념 이해 부족인지, 적용력 부족인지 구분하라.
3. 한국어로 친절하게 진단하라.
4. weak_areas는 구체적인 개념 이름으로 나열하라 (예: "광합성의 명반응", "이차방정식의 인수분해").
5. recommendations는 학생이 실천할 수 있는 행동 지시로 작성하라.`,
    })

    return { data: analysis }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `약점 진단 실패: ${msg}` }
  }
}
