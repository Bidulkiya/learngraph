'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import { learningDocSchema, teacherStyleSchema } from '@/lib/ai/schemas'
import { LEARNING_DOC_PROMPT, LEARNING_DOC_REVISE_PROMPT, TEACHER_STYLE_ANALYSIS_PROMPT } from '@/lib/ai/prompts'

/**
 * 노드의 스킬트리 소유자(교사) 권한 확인.
 * 또는 클래스 담당 교사.
 */
async function assertTeacherCanEditNode(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  nodeId: string
): Promise<{
  ok: boolean
  error?: string
  node?: { id: string; title: string; description: string | null; skill_tree_id: string; learning_content: string | null }
}> {
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
 * 노드 학습 문서 AI 생성 — 내부 헬퍼.
 * saveSkillTree에서 일괄 호출. style_guide와 learning_style이 있으면 프롬프트에 주입.
 * 입력 길이 검증으로 비용 과다 방지.
 */
export async function generateLearningDocForNode(
  nodeTitle: string,
  nodeDescription: string,
  treeTitle: string,
  subjectHint: string,
  styleGuide?: string | null,
  learningStyle?: string | null
): Promise<{ data?: string; error?: string }> {
  try {
    if (!nodeTitle.trim() || nodeTitle.length > 500) {
      return { error: '유효하지 않은 입력입니다.' }
    }
    if (nodeDescription.length > 5000) {
      return { error: '설명이 너무 깁니다.' }
    }
    if (styleGuide && styleGuide.length > 5000) {
      return { error: '스타일 가이드가 너무 깁니다.' }
    }
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: learningDocSchema,
      prompt: LEARNING_DOC_PROMPT(
        nodeTitle,
        nodeDescription,
        treeTitle,
        subjectHint,
        styleGuide ?? undefined,
        learningStyle ?? undefined
      ),
    })
    return { data: object.content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generateLearningDocForNode]', msg)
    return { error: msg }
  }
}

/**
 * 학생이 자기 노드를 열 때 호출되는 단일 문서 생성 (개인 맞춤 학습 스타일 적용).
 * 기존에 learning_content가 있으면 그대로 반환, 없으면 학생 스타일에 맞게 생성해서 저장.
 */
export async function getOrCreatePersonalizedDoc(
  nodeId: string
): Promise<{ data?: string; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const auth = await assertCanReadNode(admin, user.id, nodeId)
    if (!auth.ok) return { error: auth.error }

    const { data: node } = await admin
      .from('nodes')
      .select('title, description, learning_content, skill_tree_id')
      .eq('id', nodeId)
      .maybeSingle()
    if (!node) return { error: '노드를 찾을 수 없습니다.' }

    // 이미 있으면 그대로 반환
    if (node.learning_content) return { data: node.learning_content }

    // 데모는 미리 만든 문서만 사용 — AI 호출 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    // 없으면 학생 learning_style + tree 정보로 생성
    const [{ data: profile }, { data: tree }] = await Promise.all([
      admin.from('profiles').select('learning_style').eq('id', user.id).maybeSingle(),
      admin.from('skill_trees').select('title, subject_hint, style_guide').eq('id', node.skill_tree_id).maybeSingle(),
    ])

    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    const gen = await generateLearningDocForNode(
      node.title,
      node.description ?? '',
      tree.title,
      tree.subject_hint ?? 'default',
      tree.style_guide,
      profile?.learning_style ?? null
    )
    if (gen.error || !gen.data) return { error: gen.error ?? '생성 실패' }

    await admin.from('nodes').update({ learning_content: gen.data }).eq('id', nodeId)
    return { data: gen.data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
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

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertTeacherCanEditNode(admin, user.id, nodeId)
    if (!auth.ok || !auth.node) return { error: auth.error }

    const { data: tree } = await admin
      .from('skill_trees')
      .select('title, subject_hint, style_guide')
      .eq('id', auth.node.skill_tree_id)
      .maybeSingle()

    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    const gen = await generateLearningDocForNode(
      auth.node.title,
      auth.node.description ?? '',
      tree.title,
      tree.subject_hint ?? 'default',
      tree.style_guide
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

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

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
 * 교사가 직접 작성한 학습 문서를 저장 (AI 문서를 대체).
 * 추가로: 교사 작성 문서로부터 스타일 가이드를 추출하여 skill_trees.style_guide에 저장.
 * 이후 같은 스킬트리의 다른 노드 생성 시 이 가이드가 프롬프트에 주입된다.
 */
export async function saveLearningDocManually(
  nodeId: string,
  content: string
): Promise<{ data?: { styleAnalyzed: boolean }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    if (content.length > 50000) return { error: '학습 문서가 너무 깁니다 (최대 50000자).' }
    if (!content.trim()) return { error: '학습 문서 내용을 입력해주세요.' }

    const admin = createAdminClient()
    const auth = await assertTeacherCanEditNode(admin, user.id, nodeId)
    if (!auth.ok || !auth.node) return { error: auth.error }

    // 1. 학습 문서 저장
    const { error } = await admin
      .from('nodes')
      .update({ learning_content: content })
      .eq('id', nodeId)

    if (error) return { error: error.message }

    // 2. 교사 스타일 분석 (best-effort, 실패해도 저장은 성공)
    let styleAnalyzed = false
    try {
      const { data: tree } = await admin
        .from('skill_trees')
        .select('id, title, style_guide')
        .eq('id', auth.node.skill_tree_id)
        .maybeSingle()

      // 아직 스타일 가이드가 없을 때만 새로 분석 (덮어쓰기 방지 — 1회성 학습)
      if (tree && !tree.style_guide && content.length >= 100) {
        const { object } = await generateObject({
          model: anthropic('claude-sonnet-4-6'),
          schema: teacherStyleSchema,
          prompt: TEACHER_STYLE_ANALYSIS_PROMPT(auth.node.title, tree.title, content),
        })
        await admin
          .from('skill_trees')
          .update({ style_guide: object.style_guide })
          .eq('id', tree.id)
        styleAnalyzed = true
      }
    } catch (styleErr) {
      console.error('[saveLearningDocManually] 스타일 분석 실패 (저장은 성공):', styleErr)
    }

    return { data: { styleAnalyzed } }
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

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

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
