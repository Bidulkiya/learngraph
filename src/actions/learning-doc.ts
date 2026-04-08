'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { learningDocSchema } from '@/lib/ai/schemas'
import { LEARNING_DOC_PROMPT, LEARNING_DOC_REVISE_PROMPT } from '@/lib/ai/prompts'

/**
 * 노드의 스킬트리 소유자(교사) 권한 확인.
 * 또는 클래스 담당 교사.
 */
async function assertTeacherCanEditNode(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  nodeId: string
): Promise<{ ok: boolean; error?: string; node?: { id: string; title: string; description: string | null; skill_tree_id: string; learning_content: string | null } }> {
  const { data: node } = await admin
    .from('nodes')
    .select('id, title, description, skill_tree_id, learning_content')
    .eq('id', nodeId)
    .maybeSingle()
  if (!node) return { ok: false, error: '노드를 찾을 수 없습니다.' }

  const { data: tree } = await admin
    .from('skill_trees')
    .select('created_by, class_id')
    .eq('id', node.skill_tree_id)
    .maybeSingle()
  if (!tree) return { ok: false, error: '스킬트리를 찾을 수 없습니다.' }

  if (tree.created_by === userId) return { ok: true, node }

  if (tree.class_id) {
    const { data: cls } = await admin
      .from('classes')
      .select('teacher_id')
      .eq('id', tree.class_id)
      .maybeSingle()
    if (cls?.teacher_id === userId) return { ok: true, node }
  }

  return { ok: false, error: '이 노드를 수정할 권한이 없습니다.' }
}

/**
 * 학생이 해당 노드의 학습 문서를 볼 수 있는지 확인.
 * 교사/운영자는 전부 허용. 학생은 승인된 enrollment가 있어야 함.
 */
async function assertCanReadNode(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  nodeId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: node } = await admin
    .from('nodes')
    .select('skill_tree_id')
    .eq('id', nodeId)
    .maybeSingle()
  if (!node) return { ok: false, error: '노드를 찾을 수 없습니다.' }

  const { data: tree } = await admin
    .from('skill_trees')
    .select('created_by, class_id')
    .eq('id', node.skill_tree_id)
    .maybeSingle()
  if (!tree) return { ok: false, error: '스킬트리를 찾을 수 없습니다.' }

  if (tree.created_by === userId) return { ok: true }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.role === 'admin') return { ok: true }

  if (tree.class_id) {
    const { data: cls } = await admin
      .from('classes')
      .select('teacher_id')
      .eq('id', tree.class_id)
      .maybeSingle()
    if (cls?.teacher_id === userId) return { ok: true }

    const { data: enrollment } = await admin
      .from('class_enrollments')
      .select('status')
      .eq('class_id', tree.class_id)
      .eq('student_id', userId)
      .maybeSingle()
    if (enrollment?.status === 'approved') return { ok: true }
  }

  return { ok: false, error: '이 노드에 접근할 권한이 없습니다.' }
}

/**
 * 노드 학습 문서 AI 생성 — 내부 헬퍼 (not a Server Action).
 * saveSkillTree에서 일괄 호출. export는 되지만 인증 없이는 무의미한 파라미터만 받음.
 */
export async function generateLearningDocForNode(
  nodeTitle: string,
  nodeDescription: string,
  treeTitle: string,
  subjectHint: string
): Promise<{ data?: string; error?: string }> {
  try {
    // 이 함수는 파라미터만 받아서 AI를 호출하므로 DB 접근 없음.
    // saveSkillTree 등 내부 호출자가 이미 인증 체크를 수행한 후 호출해야 함.
    // 입력 길이 검증으로 비용 과다 방지.
    if (!nodeTitle.trim() || nodeTitle.length > 500) {
      return { error: '유효하지 않은 입력입니다.' }
    }
    if (nodeDescription.length > 5000) {
      return { error: '설명이 너무 깁니다.' }
    }
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
    const auth = await assertTeacherCanEditNode(admin, user.id, nodeId)
    if (!auth.ok || !auth.node) return { error: auth.error }

    const { data: tree } = await admin
      .from('skill_trees')
      .select('title, subject_hint')
      .eq('id', auth.node.skill_tree_id)
      .maybeSingle()

    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    const gen = await generateLearningDocForNode(
      auth.node.title,
      auth.node.description ?? '',
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
    if (userRequest.length > 1000) return { error: '수정 요청이 너무 깁니다.' }

    const admin = createAdminClient()
    const auth = await assertTeacherCanEditNode(admin, user.id, nodeId)
    if (!auth.ok || !auth.node) return { error: auth.error }

    if (!auth.node.learning_content) return { error: '아직 학습 문서가 없습니다. 먼저 생성해주세요.' }

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: learningDocSchema,
      prompt: LEARNING_DOC_REVISE_PROMPT(auth.node.learning_content, userRequest, auth.node.title),
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

    if (content.length > 50000) return { error: '학습 문서가 너무 깁니다 (최대 50000자).' }

    const admin = createAdminClient()
    const auth = await assertTeacherCanEditNode(admin, user.id, nodeId)
    if (!auth.ok) return { error: auth.error }

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
    const auth = await assertTeacherCanEditNode(admin, user.id, nodeId)
    if (!auth.ok) return { error: auth.error }

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
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const auth = await assertCanReadNode(admin, user.id, nodeId)
    if (!auth.ok) return { error: auth.error }

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
