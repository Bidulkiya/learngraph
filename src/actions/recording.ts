'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import OpenAI from 'openai'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import { lessonSummarySchema, quizSchema, type LessonSummaryOutput } from '@/lib/ai/schemas'
import {
  LESSON_SUMMARY_PROMPT,
  QUIZ_PROMPT,
  TRANSCRIPT_CLEAN_PROMPT,
  NODE_QUIZ_FROM_TRANSCRIPT_PROMPT,
} from '@/lib/ai/prompts'
import { generateText } from 'ai'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Whisper로 음성 전사 후 DB에 저장
 */
export async function transcribeRecording(
  formData: FormData
): Promise<{ data?: { recordingId: string; transcript: string }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const file = formData.get('audio') as File | null
    const duration = Number(formData.get('duration') ?? 0)
    if (!file) return { error: '녹음 파일이 없습니다.' }

    // 파일 크기 제한: 25MB (Whisper API 제한 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return { error: '파일 크기는 25MB 이하여야 합니다.' }
    }

    // 교사/운영자만 녹음 가능
    const admin0 = createAdminClient()
    const { data: profile } = await admin0
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return { error: '교사만 수업 녹음을 저장할 수 있습니다.' }
    }

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
    const admin = admin0
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
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const { data: recording } = await admin
      .from('lesson_recordings')
      .select('transcript, teacher_id')
      .eq('id', recordingId)
      .single()

    if (!recording) return { error: '녹음을 찾을 수 없습니다.' }
    if (recording.teacher_id !== user.id) return { error: '이 녹음에 접근할 권한이 없습니다.' }
    if (!recording.transcript) return { error: '전사 내용이 없습니다.' }

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

// generateQuizFromRecording — 삭제됨. generateNodeQuizFromTranscript로 대체.

/**
 * 전사 텍스트에서 교육 내용만 추출하고 잡음(농담, 잡담, 진행 멘트, 말 더듬기)을 제거.
 * 스킬트리 작성 / 노드 퀴즈 생성 공통 전처리 단계.
 *
 * Claude가 순수 텍스트(markdown 없음)로 정리된 교육 내용을 반환한다.
 * 이 결과를 generateSkillTree / generateNodeQuizFromTranscript에 넘긴다.
 */
export async function cleanTranscriptForSkillTree(
  transcript: string
): Promise<{ data?: string; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    if (!transcript || transcript.trim().length < 30) {
      return { error: '전사 내용이 너무 짧습니다.' }
    }
    if (transcript.length > 50000) {
      return { error: '전사 내용이 너무 깁니다 (최대 50,000자).' }
    }

    // 교사/운영자만
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return { error: '교사만 사용할 수 있습니다.' }
    }

    const { text: cleaned } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt: TRANSCRIPT_CLEAN_PROMPT(transcript),
    })

    const trimmed = cleaned.trim()
    if (!trimmed || trimmed.length < 20) {
      return { error: '정리된 내용이 너무 짧습니다. 전사 품질을 확인해주세요.' }
    }

    return { data: trimmed }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cleanTranscriptForSkillTree]', msg)
    return { error: `전사 정리 실패: ${msg}` }
  }
}

/**
 * 수업 녹음 전사 + 노드 정보로 해당 노드의 복습 퀴즈를 생성해서 DB에 저장.
 *
 * 플로우:
 *   1. 전사 텍스트를 cleanTranscriptForSkillTree로 먼저 정리
 *   2. 노드 정보 조회 (소유권 체크)
 *   3. Claude로 수업 내용 기반 퀴즈 생성 (quizSchema)
 *   4. quizzes 테이블에 insert → 저장된 퀴즈 수 반환
 */
export async function generateNodeQuizFromTranscript(
  nodeId: string,
  transcript: string
): Promise<{ data?: { insertedCount: number; questions: number }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()

    // 노드 + 스킬트리 소유권 확인
    const { data: node } = await admin
      .from('nodes')
      .select('id, title, description, skill_tree_id')
      .eq('id', nodeId)
      .maybeSingle()
    if (!node) return { error: '노드를 찾을 수 없습니다.' }

    const { data: tree } = await admin
      .from('skill_trees')
      .select('created_by, class_id')
      .eq('id', node.skill_tree_id)
      .maybeSingle()
    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    let allowed = tree.created_by === user.id
    if (!allowed && tree.class_id) {
      const { data: cls } = await admin
        .from('classes')
        .select('teacher_id')
        .eq('id', tree.class_id)
        .maybeSingle()
      if (cls?.teacher_id === user.id) allowed = true
    }
    if (!allowed) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role === 'admin') allowed = true
    }
    if (!allowed) return { error: '이 노드에 퀴즈를 추가할 권한이 없습니다.' }

    // 1. 전사 정리
    const cleanRes = await cleanTranscriptForSkillTree(transcript)
    if (cleanRes.error || !cleanRes.data) {
      return { error: cleanRes.error ?? '전사 정리 실패' }
    }
    const cleaned = cleanRes.data

    // 2. 퀴즈 생성 (quizSchema 재사용)
    const { object: quiz } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: quizSchema,
      prompt: NODE_QUIZ_FROM_TRANSCRIPT_PROMPT(
        node.title,
        node.description ?? '',
        cleaned,
      ),
    })

    // 3. 생성된 퀴즈를 해당 노드에 insert
    const inserts = quiz.questions.map(q => ({
      node_id: nodeId,
      question: q.question,
      question_type: q.type,
      options: q.options ?? null,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    }))

    const { data: saved, error: insertErr } = await admin
      .from('quizzes')
      .insert(inserts)
      .select('id')

    if (insertErr) return { error: '퀴즈 저장 실패: ' + insertErr.message }

    return {
      data: {
        insertedCount: saved?.length ?? 0,
        questions: quiz.questions.length,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generateNodeQuizFromTranscript]', msg)
    return { error: `노드 퀴즈 생성 실패: ${msg}` }
  }
}

export async function getMyRecordings(): Promise<{
  data?: Array<{ id: string; transcript: string | null; summary: unknown; duration_seconds: number; created_at: string }>
  error?: string
}> {
  try {
    const user = await getCachedUser()
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
