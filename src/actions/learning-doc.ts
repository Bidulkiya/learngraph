'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { learningDocSchema } from '@/lib/ai/schemas'
import { LEARNING_DOC_PROMPT, LEARNING_DOC_REVISE_PROMPT } from '@/lib/ai/prompts'

/**
 * 노드 단일 항목에 대한 학습 문서 생성 (내부용 — saveSkillTree에서 일괄 호출)
 */
export async function generateLearningDocForNode(
  nodeTitle: string,
  nodeDescription: string,
  treeTitle: string,
  subjectHint: string
): Promise<{ data?: string; error?: string }> {
  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: learningDocSchema,
      prompt: LEARNING_DOC_PROMPT(nodeTitle, nodeDescription, treeTitle, subjectHint),
    })
    return { data: object.content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generateLearningDocForNode]', msg)
    return { error: msg }
  }
}

/**
 * 교사가 특정 노드의 학습 문서를 다시 생성 (재생성 버튼)
 */
export async function regenerateLearningDoc(
  nodeId: string
): Promise<{ data?: string; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 노드 + 스킬트리 정보 조회
    const { data: node } = await admin
      .from('nodes')
      .select('id, title, description, skill_tree_id')
      .eq('id', nodeId)
      .maybeSingle()

    if (!node) return { error: '노드를 찾을 수 없습니다.' }

    const { data: tree } = await admin
      .from('skill_trees')
      .select('title, subject_hint')
      .eq('id', node.skill_tree_id)
      .maybeSingle()

    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    const gen = await generateLearningDocForNode(
      node.title,
      node.description ?? '',
      tree.title,
      tree.subject_hint ?? 'default'
    )
    if (gen.error || !gen.data) return { error: gen.error ?? '생성 실패' }

    const { error: updateErr } = await admin
      .from('nodes')
      .update({ learning_content: gen.data })
      .eq('id', nodeId)

    if (updateErr) return { error: updateErr.message }
    return { data: gen.data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 교사가 AI에게 "이 부분 수정해줘" 요청하여 학습 문서 개선
 */
export async function reviseLearningDoc(
  nodeId: string,
  userRequest: string
): Promise<{ data?: string; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    if (!userRequest.trim()) return { error: '수정 요청 내용을 입력해주세요.' }

    const admin = createAdminClient()

    const { data: node } = await admin
      .from('nodes')
      .select('id, title, learning_content')
      .eq('id', nodeId)
      .maybeSingle()

    if (!node) return { error: '노드를 찾을 수 없습니다.' }
    if (!node.learning_content) return { error: '아직 학습 문서가 없습니다. 먼저 생성해주세요.' }

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: learningDocSchema,
      prompt: LEARNING_DOC_REVISE_PROMPT(node.learning_content, userRequest, node.title),
    })

    const { error: updateErr } = await admin
      .from('nodes')
      .update({ learning_content: object.content })
      .eq('id', nodeId)

    if (updateErr) return { error: updateErr.message }
    return { data: object.content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[reviseLearningDoc]', msg)
    return { error: msg }
  }
}

/**
 * 교사가 직접 작성한 학습 문서를 저장 (AI 문서를 대체)
 */
export async function saveLearningDocManually(
  nodeId: string,
  content: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('nodes')
      .update({ learning_content: content })
      .eq('id', nodeId)

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 노드별 "다운로드/프린트 허용" 토글
 */
export async function updateNodePermissions(
  nodeId: string,
  allowDownload: boolean,
  allowPrint: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('nodes')
      .update({
        allow_download: allowDownload,
        allow_print: allowPrint,
      })
      .eq('id', nodeId)

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학생/교사가 특정 노드의 학습 문서 + 권한 조회
 */
export async function getNodeLearningDoc(nodeId: string): Promise<{
  data?: { content: string | null; allowDownload: boolean; allowPrint: boolean; title: string }
  error?: string
}> {
  try {
    const admin = createAdminClient()
    const { data: node } = await admin
      .from('nodes')
      .select('title, learning_content, allow_download, allow_print')
      .eq('id', nodeId)
      .maybeSingle()

    if (!node) return { error: '노드를 찾을 수 없습니다.' }
    return {
      data: {
        content: node.learning_content,
        allowDownload: node.allow_download ?? true,
        allowPrint: node.allow_print ?? true,
        title: node.title,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
