'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { lessonSummarySchema, quizSchema, type LessonSummaryOutput } from '@/lib/ai/schemas'
import { LESSON_SUMMARY_PROMPT, QUIZ_PROMPT } from '@/lib/ai/prompts'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Whisper로 음성 전사 후 DB에 저장
 */
export async function transcribeRecording(
  formData: FormData
): Promise<{ data?: { recordingId: string; transcript: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const file = formData.get('audio') as File | null
    const duration = Number(formData.get('duration') ?? 0)
    if (!file) return { error: '녹음 파일이 없습니다.' }

    // OpenAI Whisper 호출
    const transcription = await openaiClient.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ko',
    })

    const transcript = transcription.text
    if (!transcript || transcript.trim().length < 10) {
      return { error: '전사된 내용이 너무 짧습니다. 다시 녹음해주세요.' }
    }

    // DB 저장
    const admin = createAdminClient()
    const { data: recording, error: insertErr } = await admin
      .from('lesson_recordings')
      .insert({
        teacher_id: user.id,
        transcript,
        duration_seconds: Math.floor(duration),
      })
      .select('id')
      .single()

    if (insertErr || !recording) return { error: '녹음 저장 실패: ' + insertErr?.message }

    return { data: { recordingId: recording.id, transcript } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `전사 실패: ${msg}` }
  }
}

/**
 * Claude로 수업 요약 생성
 */
export async function summarizeLesson(
  recordingId: string
): Promise<{ data?: LessonSummaryOutput; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: recording } = await admin
      .from('lesson_recordings')
      .select('transcript')
      .eq('id', recordingId)
      .single()

    if (!recording?.transcript) return { error: '전사 내용이 없습니다.' }

    const { object: summary } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: lessonSummarySchema,
      prompt: LESSON_SUMMARY_PROMPT(recording.transcript),
    })

    // DB 업데이트
    await admin
      .from('lesson_recordings')
      .update({ summary })
      .eq('id', recordingId)

    return { data: summary }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `요약 생성 실패: ${msg}` }
  }
}

/**
 * 전사 내용으로 복습 퀴즈 생성
 */
export async function generateQuizFromRecording(
  recordingId: string
): Promise<{ data?: { questions: number }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: recording } = await admin
      .from('lesson_recordings')
      .select('transcript')
      .eq('id', recordingId)
      .single()

    if (!recording?.transcript) return { error: '전사 내용이 없습니다.' }

    // 녹음 내용 기반으로 퀴즈 생성
    const { object: quiz } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: quizSchema,
      prompt: QUIZ_PROMPT('수업 복습', recording.transcript.slice(0, 2000), 2),
    })

    return { data: { questions: quiz.questions.length } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `퀴즈 생성 실패: ${msg}` }
  }
}

export async function getMyRecordings(): Promise<{
  data?: Array<{ id: string; transcript: string | null; summary: unknown; duration_seconds: number; created_at: string }>
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data } = await admin
      .from('lesson_recordings')
      .select('id, transcript, summary, duration_seconds, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return { data: data ?? [] }
  } catch (err) {
    return { error: String(err) }
  }
}
