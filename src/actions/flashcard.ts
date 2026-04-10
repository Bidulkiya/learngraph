'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoAccount, assertNotDemo } from '@/lib/demo'
import { flashcardsSchema } from '@/lib/ai/schemas'
import { FLASHCARD_PROMPT } from '@/lib/ai/prompts'

export interface Flashcard {
  id: string
  node_id: string
  card_index: number
  front: string
  back: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

/**
 * 권한 체크: 학생이 해당 노드에 접근 가능한지.
 */
async function assertCanAccessNode(
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
    const { data: cls } = await admin.from('classes').select('teacher_id').eq('id', tree.class_id).maybeSingle()
    if (cls?.teacher_id === userId) return { ok: true }
    const { data: enr } = await admin
      .from('class_enrollments')
      .select('status')
      .eq('class_id', tree.class_id)
      .eq('student_id', userId)
      .maybeSingle()
    if (enr?.status === 'approved') return { ok: true }
  }

  return { ok: false, error: '이 노드에 접근할 권한이 없습니다.' }
}

/**
 * 노드 완료 시 플래시카드 5장 자동 생성.
 * 이미 플래시카드가 있으면 스킵 (재호출 안전).
 * saveSkillTree 또는 completeNode에서 내부 호출.
 */
export async function generateFlashcards(
  nodeId: string
): Promise<{ data?: Flashcard[]; error?: string }> {
  try {
    if (!isUuid(nodeId)) return { error: '유효하지 않은 노드 ID입니다.' }

    const admin = createAdminClient()

    // 이미 있으면 스킵
    const { data: existing } = await admin
      .from('flashcards')
      .select('id, node_id, card_index, front, back, created_at')
      .eq('node_id', nodeId)
      .order('card_index')
    if (existing && existing.length > 0) return { data: existing as Flashcard[] }

    // 데모는 미리 만든 카드만 사용 — AI 호출 차단 (no-op으로 빈 배열 반환)
    const authUser = await getCachedUser()
    if (isDemoAccount(authUser?.email)) return { data: [] }

    const { data: node } = await admin
      .from('nodes')
      .select('title, description, learning_content')
      .eq('id', nodeId)
      .maybeSingle()
    if (!node) return { error: '노드를 찾을 수 없습니다.' }

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: flashcardsSchema,
      prompt: FLASHCARD_PROMPT(
        node.title,
        node.description ?? '',
        node.learning_content ?? ''
      ),
    })

    // DB 저장
    const inserts = object.cards.slice(0, 5).map((c, i) => ({
      node_id: nodeId,
      card_index: i,
      front: c.front.slice(0, 500),
      back: c.back.slice(0, 1000),
    }))

    const { data: saved, error: insertErr } = await admin
      .from('flashcards')
      .insert(inserts)
      .select()
    if (insertErr) return { error: '플래시카드 저장 실패: ' + insertErr.message }
    return { data: saved as Flashcard[] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generateFlashcards]', msg)
    return { error: msg }
  }
}

/**
 * 학생이 노드 팝업에서 플래시카드를 조회.
 * 권한 체크 포함. 없으면 자동 생성.
 */
export async function getFlashcardsForNode(
  nodeId: string
): Promise<{ data?: Flashcard[]; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(nodeId)) return { error: '유효하지 않은 노드 ID입니다.' }

    const admin = createAdminClient()
    const auth = await assertCanAccessNode(admin, user.id, nodeId)
    if (!auth.ok) return { error: auth.error }

    const { data } = await admin
      .from('flashcards')
      .select('id, node_id, card_index, front, back, created_at')
      .eq('node_id', nodeId)
      .order('card_index')

    if (data && data.length > 0) {
      return { data: data as Flashcard[] }
    }

    // 없으면 자동 생성
    return generateFlashcards(nodeId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 플래시카드 복습 결과 기록 (알겠어요 / 다시볼게요).
 * "다시볼게요"가 많은 카드의 노드는 복습 간격 축소.
 */
export async function recordFlashcardReview(
  flashcardId: string,
  result: 'known' | 'unknown'
): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(flashcardId)) return { error: '유효하지 않은 카드 ID입니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const { error } = await admin.from('flashcard_reviews').insert({
      student_id: user.id,
      flashcard_id: flashcardId,
      result,
    })
    if (error) return { error: error.message }

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
