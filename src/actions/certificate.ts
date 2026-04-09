'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoAccount } from '@/lib/demo'

export interface Certificate {
  id: string
  student_id: string
  skill_tree_id: string
  tree_title: string
  node_count: number
  avg_score: number
  teacher_name: string | null
  issued_at: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean { return UUID_RE.test(v) }

/**
 * 학생이 스킬트리 100% 완료 시 인증서 자동 발급.
 * completeNode에서 내부 호출. 이미 발급된 경우 스킵.
 */
export async function issueCertificate(
  skillTreeId: string
): Promise<{ data?: Certificate; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(skillTreeId)) return { error: '유효하지 않은 스킬트리 ID입니다.' }

    // 데모는 인증서 자동 발급 차단 (completeNode 내부 호출이므로 silent skip)
    if (isDemoAccount(user.email)) return {}

    const admin = createAdminClient()

    // 1. 이미 발급됐는지 확인
    const { data: existing } = await admin
      .from('certificates')
      .select('*')
      .eq('student_id', user.id)
      .eq('skill_tree_id', skillTreeId)
      .maybeSingle()
    if (existing) return { data: existing as Certificate }

    // 2. 스킬트리의 모든 노드가 completed인지 확인
    const { data: tree } = await admin
      .from('skill_trees')
      .select('title, created_by')
      .eq('id', skillTreeId)
      .maybeSingle()
    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    const { data: allNodes } = await admin
      .from('nodes')
      .select('id')
      .eq('skill_tree_id', skillTreeId)

    if (!allNodes || allNodes.length === 0) return { error: '노드가 없습니다.' }

    const { data: progress } = await admin
      .from('student_progress')
      .select('node_id, status, quiz_score')
      .eq('student_id', user.id)
      .eq('skill_tree_id', skillTreeId)

    const completedNodes = progress?.filter(p => p.status === 'completed') ?? []
    if (completedNodes.length < allNodes.length) {
      return { error: '아직 모든 노드를 완료하지 않았습니다.' }
    }

    // 3. 평균 점수 계산
    const scores = completedNodes
      .map(p => p.quiz_score)
      .filter((s): s is number => typeof s === 'number')
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    // 4. 교사 이름 조회
    let teacherName: string | null = null
    if (tree.created_by) {
      const { data: teacher } = await admin
        .from('profiles')
        .select('name')
        .eq('id', tree.created_by)
        .maybeSingle()
      teacherName = teacher?.name ?? null
    }

    // 5. 인증서 발급
    const { data: saved, error: insertErr } = await admin
      .from('certificates')
      .insert({
        student_id: user.id,
        skill_tree_id: skillTreeId,
        tree_title: tree.title,
        node_count: allNodes.length,
        avg_score: avgScore,
        teacher_name: teacherName,
      })
      .select()
      .single()

    if (insertErr) return { error: '인증서 발급 실패: ' + insertErr.message }
    return { data: saved as Certificate }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학생의 인증서 목록.
 */
export async function getMyCertificates(): Promise<{
  data?: Certificate[]
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data } = await admin
      .from('certificates')
      .select('*')
      .eq('student_id', user.id)
      .order('issued_at', { ascending: false })

    return { data: (data ?? []) as Certificate[] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 인증서 단일 조회 (PDF 다운로드용).
 */
export async function getCertificate(
  certificateId: string
): Promise<{ data?: Certificate & { student_name: string }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }
    if (!isUuid(certificateId)) return { error: '유효하지 않은 인증서 ID입니다.' }

    const admin = createAdminClient()
    const { data: cert } = await admin
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .maybeSingle()
    if (!cert) return { error: '인증서를 찾을 수 없습니다.' }

    // 권한: 본인 또는 교사
    if (cert.student_id !== user.id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
        return { error: '인증서 조회 권한이 없습니다.' }
      }
    }

    const { data: student } = await admin
      .from('profiles')
      .select('name')
      .eq('id', cert.student_id)
      .maybeSingle()

    return {
      data: {
        ...(cert as Certificate),
        student_name: student?.name ?? '',
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
