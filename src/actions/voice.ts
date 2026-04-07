'use server'

import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * 일반 음성 → 텍스트 전사 (튜터 음성 입력용)
 */
export async function transcribeAudio(
  formData: FormData
): Promise<{ data?: { text: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const file = formData.get('audio') as File | null
    if (!file) return { error: '음성 파일이 없습니다.' }

    const transcription = await openaiClient.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ko',
    })

    const text = transcription.text?.trim() ?? ''
    if (!text) return { error: '음성에서 텍스트를 추출하지 못했습니다.' }

    return { data: { text } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `음성 인식 실패: ${msg}` }
  }
}
