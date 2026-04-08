'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 노드 메모 저장 (upsert)
 */
export async function saveMemo(
  nodeId: string,
  content: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 입력 검증
    if (content.length > 10000) return { error: '메모가 너무 깁니다 (최대 10000자).' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('node_memos')
      .upsert({
        student_id: user.id,
        node_id: nodeId,
        content,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,node_id' })

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 노드 메모 조회
 */
export async function getMemo(
  nodeId: string
): Promise<{ data?: { content: string }; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data } = await admin
      .from('node_memos')
      .select('content')
      .eq('student_id', user.id)
      .eq('node_id', nodeId)
      .maybeSingle()

    return { data: { content: data?.content ?? '' } }
  } catch (err) {
    return { error: String(err) }
  }
}
