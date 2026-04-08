'use server'

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TUTOR_SYSTEM_PROMPT, TUTOR_SOCRATIC_PROMPT, TUTOR_EMOTION_ADAPTATION } from '@/lib/ai/prompts'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Chat with AI tutor using RAG.
 * Uses generateText (non-streaming) — returns full response as plain text.
 * Streaming Server Action is blocked by serialization issues from Phase 3.
 */
export async function chatWithTutor(
  messages: ChatMessage[],
  skillTreeId?: string,
  nodeId?: string,
  mode: 'normal' | 'socratic' = 'normal'
): Promise<{ data?: { content: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    if (messages.length === 0) return { error: '메시지가 없습니다.' }
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') return { error: '마지막 메시지는 사용자 입력이어야 합니다.' }

    const admin = createAdminClient()

    // RAG: 관련 문서 청크 검색 (document_chunks가 비어있으면 빈 컨텍스트로 진행)
    let context = ''
    try {
      const embeddingResponse = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: lastMessage.content,
      })
      const queryEmbedding = embeddingResponse.data[0].embedding

      const { data: docs } = await admin.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 3,
        p_skill_tree_id: skillTreeId ?? null,
      })

      if (docs && Array.isArray(docs) && docs.length > 0) {
        context = docs.map((d: { content: string }) => d.content).join('\n\n')
      }
    } catch (ragErr) {
      console.error('[chatWithTutor] RAG 검색 실패 (컨텍스트 없이 진행):', ragErr)
    }

    // 학생의 최신 emotion_report 조회 → mood에 따라 톤 적응
    let emotionAdaptation = ''
    try {
      let emotionQuery = admin
        .from('emotion_reports')
        .select('mood')
        .eq('student_id', user.id)
        .order('report_date', { ascending: false })
        .limit(1)
      if (skillTreeId) {
        emotionQuery = emotionQuery.eq('skill_tree_id', skillTreeId)
      }
      const { data: emotionReport } = await emotionQuery.maybeSingle()
      if (emotionReport?.mood && TUTOR_EMOTION_ADAPTATION[emotionReport.mood]) {
        emotionAdaptation = TUTOR_EMOTION_ADAPTATION[emotionReport.mood]
      }
    } catch (emoErr) {
      console.error('[chatWithTutor] emotion 조회 실패 (기본 톤 사용):', emoErr)
    }

    // Claude 호출 (모드별 시스템 프롬프트 + 감정 적응)
    const basePrompt = mode === 'socratic' ? TUTOR_SOCRATIC_PROMPT : TUTOR_SYSTEM_PROMPT
    const systemPrompt = [
      basePrompt,
      emotionAdaptation,
      context ? `## 참고 수업 자료\n${context}` : '',
    ].filter(Boolean).join('\n\n')

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    // 대화 기록 저장 (사용자 메시지 + AI 응답)
    await admin.from('tutor_conversations').insert([
      {
        student_id: user.id,
        skill_tree_id: skillTreeId ?? null,
        node_id: nodeId ?? null,
        role: 'user',
        content: lastMessage.content,
      },
      {
        student_id: user.id,
        skill_tree_id: skillTreeId ?? null,
        node_id: nodeId ?? null,
        role: 'assistant',
        content: text,
      },
    ])

    return { data: { content: text } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[chatWithTutor]', msg)
    return { error: `튜터 응답 실패: ${msg}` }
  }
}

/**
 * Fetch tutor conversation history for a student.
 */
export async function getTutorHistory(
  limit: number = 50
): Promise<{ data?: ChatMessage[]; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: conversations } = await admin
      .from('tutor_conversations')
      .select('role, content, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: true })
      .limit(limit)

    const messages: ChatMessage[] = (conversations ?? []).map(c => ({
      role: c.role as 'user' | 'assistant',
      content: c.content,
    }))

    return { data: messages }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Clear tutor conversation history (for "new conversation" button).
 */
export async function clearTutorHistory(): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    await admin.from('tutor_conversations').delete().eq('student_id', user.id)
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}
