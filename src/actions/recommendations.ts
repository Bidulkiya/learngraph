'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import { conceptConnectionSchema, type ConceptConnectionOutput } from '@/lib/ai/schemas'
import { CONCEPT_CONNECTION_PROMPT } from '@/lib/ai/prompts'

export async function getConceptConnections(
  nodeId: string
): Promise<{ data?: ConceptConnectionOutput; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const { data: node } = await admin
      .from('nodes')
      .select('title, description')
      .eq('id', nodeId)
      .single()

    if (!node) return { error: '노드를 찾을 수 없습니다.' }

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: conceptConnectionSchema,
      prompt: CONCEPT_CONNECTION_PROMPT(node.title, node.description ?? ''),
    })

    return { data: object }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `개념 추천 실패: ${msg}` }
  }
}
