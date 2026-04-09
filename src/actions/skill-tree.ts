'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { skillTreeSchema, type SkillTreeOutput } from '@/lib/ai/schemas'
import { SKILL_TREE_PROMPT } from '@/lib/ai/prompts'
import { embedAndStoreDocument } from '@/lib/ai/embeddings'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
// pdf-parse v1 — lib/pdf-parse.js 직접 import로 디버그 코드 우회
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buffer: Buffer) => Promise<{ text: string }>

/**
 * Extract text from uploaded PDF file.
 * 에러 시 { error: string } 반환, 성공 시 { text: string } 반환.
 * Server Action에서 throw하면 클라이언트에 메시지가 전달되지 않을 수 있으므로
 * 결과 객체로 에러를 전달한다.
 */
export async function extractPdfText(
  formData: FormData
): Promise<{ text?: string; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const file = formData.get('file') as File | null
    if (!file) return { error: '파일이 선택되지 않았습니다.' }
    if (file.size > 10 * 1024 * 1024) return { error: '파일 크기는 10MB 이하여야 합니다.' }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return { error: 'PDF 파일만 지원합니다.' }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await pdfParse(buffer)

    if (!result.text || result.text.trim().length < 50) {
      return { error: 'PDF에서 텍스트를 충분히 추출하지 못했습니다. 텍스트가 포함된 PDF를 업로드해주세요.' }
    }

    return { text: result.text }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[extractPdfText] 에러:', msg)
    return { error: `PDF 처리 실패: ${msg}` }
  }
}

/**
 * Generate a skill tree from text content using Claude API.
 * 에러를 throw하지 않고 결과 객체로 반환하여 클라이언트에서 확인 가능하게 한다.
 */
export async function generateSkillTree(
  fileContent: string
): Promise<{ data?: SkillTreeOutput; error?: string }> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? ''
    console.log(`[generateSkillTree] API key prefix: ${apiKey.slice(0, 10)}... model: claude-sonnet-4-6 textLen: ${fileContent.length}`)

    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다. 다시 로그인해주세요.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    // 교사/운영자만 생성 가능 + 입력 크기 제한 (비용 폭주 방지)
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return { error: '교사만 스킬트리를 생성할 수 있습니다.' }
    }
    if (!fileContent.trim() || fileContent.length > 200_000) {
      return { error: '콘텐츠가 비어있거나 너무 깁니다 (최대 200,000자).' }
    }

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: skillTreeSchema,
      prompt: SKILL_TREE_PROMPT(fileContent),
    })

    console.log(`[generateSkillTree] 성공: ${object.nodes?.length}개 노드`)
    return { data: object }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack?.slice(0, 300) : ''
    console.error(`[generateSkillTree] 에러: ${msg}`)
    console.error(`[generateSkillTree] 스택: ${stack}`)
    return { error: `AI 생성 실패: ${msg}` }
  }
}

/**
 * Save a generated skill tree to the database.
 * Also triggers document vectorization for RAG + AI 학습 문서 일괄 생성.
 */
export async function saveSkillTree(
  treeData: { title: string; description: string; subject_hint?: string },
  nodes: Array<{ id: string; title: string; description: string; difficulty: number }>,
  edges: Array<{ source: string; target: string; label?: string }>,
  originalText: string,
  classId?: string
): Promise<{ id?: string; error?: string }> {
  try {
    // 인증 확인 (anon key 클라이언트)
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    // 입력 검증
    if (!treeData.title.trim()) return { error: '스킬트리 제목을 입력해주세요.' }
    if (treeData.title.length > 200) return { error: '제목이 너무 깁니다.' }
    if (treeData.description.length > 2000) return { error: '설명이 너무 깁니다.' }
    if (!Array.isArray(nodes) || nodes.length === 0) return { error: '노드가 비어있습니다.' }
    if (nodes.length > 100) return { error: '노드가 너무 많습니다 (최대 100개).' }

    const admin = createAdminClient()

    // 교사/운영자만 저장 가능
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return { error: '교사만 스킬트리를 저장할 수 있습니다.' }
    }

    // classId가 지정된 경우 본인이 담당 교사인지 확인
    if (classId) {
      const { data: cls } = await admin
        .from('classes')
        .select('teacher_id, school_id')
        .eq('id', classId)
        .maybeSingle()
      if (!cls) return { error: '클래스를 찾을 수 없습니다.' }
      let allowed = cls.teacher_id === user.id
      if (!allowed && cls.school_id) {
        const { data: school } = await admin
          .from('schools')
          .select('created_by')
          .eq('id', cls.school_id)
          .maybeSingle()
        if (school?.created_by === user.id) allowed = true
      }
      if (!allowed) return { error: '이 클래스에 스킬트리를 배정할 권한이 없습니다.' }
    }

    // 1. Create skill tree record (classId + subject_hint 포함)
    const { data: tree, error: treeError } = await admin
      .from('skill_trees')
      .insert({
        title: treeData.title,
        description: treeData.description,
        subject_hint: treeData.subject_hint ?? 'default',
        created_by: user.id,
        class_id: classId ?? null,
        status: 'published',
      })
      .select()
      .single()

    if (treeError || !tree) return { error: '스킬트리 저장 실패: ' + treeError?.message }

    // 2. Batch insert nodes
    const nodeInserts = nodes.map((node, index) => ({
      skill_tree_id: tree.id,
      title: node.title,
      description: node.description,
      difficulty: node.difficulty,
      order_index: index,
    }))

    const { data: dbNodes, error: nodesError } = await admin
      .from('nodes')
      .insert(nodeInserts)
      .select()

    if (nodesError || !dbNodes) return { error: '노드 저장 실패: ' + nodesError?.message }

    // Map temp IDs → DB UUIDs
    const nodeMap = new Map<string, string>()
    nodes.forEach((node, index) => {
      nodeMap.set(node.id, dbNodes[index].id)
    })

    // 3. Batch insert edges
    const edgeInserts = edges
      .filter(edge => nodeMap.has(edge.source) && nodeMap.has(edge.target))
      .map(edge => ({
        skill_tree_id: tree.id,
        source_node_id: nodeMap.get(edge.source)!,
        target_node_id: nodeMap.get(edge.target)!,
        label: edge.label ?? null,
      }))

    if (edgeInserts.length > 0) {
      const { error: edgesError } = await admin
        .from('node_edges')
        .insert(edgeInserts)
      if (edgesError) return { error: '엣지 저장 실패: ' + edgesError.message }
    }

    // 4. Initialize student_progress for class students (if class assigned)
    if (classId) {
      const { data: enrolledStudents } = await admin
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'approved')

      if (enrolledStudents && enrolledStudents.length > 0) {
        const targetIds = new Set(edgeInserts.map(e => e.target_node_id))
        const progressRows = enrolledStudents.flatMap(s =>
          dbNodes.map(n => ({
            student_id: s.student_id,
            node_id: n.id,
            skill_tree_id: tree.id,
            status: targetIds.has(n.id) ? 'locked' : 'available',
          }))
        )
        await admin.from('student_progress').upsert(progressRows, {
          onConflict: 'student_id,node_id',
        })
      }
    }

    // 5. 퀴즈 자동 생성 (첫 3개 노드만 — 비용 절약)
    try {
      const { generateQuizForNode } = await import('./quiz')
      const nodesToQuiz = dbNodes.slice(0, 3)
      // 병렬 호출하면 rate limit 걸릴 수 있으므로 순차
      for (const node of nodesToQuiz) {
        await generateQuizForNode(node.id)
      }
    } catch (quizErr) {
      console.error('[saveSkillTree] 초기 퀴즈 생성 실패 (저장은 성공):', quizErr)
    }

    // 6. 노드별 학습 문서 AI 생성 (best-effort, 병렬로 빠르게)
    // 새로 생성된 스킬트리는 아직 style_guide가 없으므로 null 전달.
    try {
      const { generateLearningDocForNode } = await import('./learning-doc')
      const subjectHint = treeData.subject_hint ?? 'default'
      // 병렬 호출 — 최대 5개씩 배치
      const batchSize = 5
      for (let i = 0; i < dbNodes.length; i += batchSize) {
        const batch = dbNodes.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (node) => {
            const res = await generateLearningDocForNode(
              node.title,
              node.description ?? '',
              tree.title,
              subjectHint,
              null
            )
            if (res.data) {
              await admin
                .from('nodes')
                .update({ learning_content: res.data })
                .eq('id', node.id)
            }
          })
        )
      }
    } catch (docErr) {
      console.error('[saveSkillTree] 학습 문서 생성 실패 (저장은 성공):', docErr)
    }

    // 7. Vectorize (best-effort, admin client)
    try {
      await embedAndStoreDocument(originalText, tree.id)
    } catch (vecErr) {
      console.error('[saveSkillTree] 벡터화 실패 (스킬트리 저장은 성공):', vecErr)
    }

    return { id: tree.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[saveSkillTree] 에러:', msg)
    return { error: `저장 실패: ${msg}` }
  }
}

// =============================================
// Phase 4: Node/Edge CRUD Server Actions
// 보안: 모든 mutation은 인증 체크 + 노드 소유자(교사) 검증 필수
// =============================================

/**
 * 노드가 속한 스킬트리의 소유자인지 확인 (교사만).
 * 또는 해당 스킬트리를 생성한 admin인지.
 */
async function assertNodeOwnership(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  nodeId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: node } = await admin
    .from('nodes')
    .select('skill_tree_id, skill_trees(created_by, class_id)')
    .eq('id', nodeId)
    .maybeSingle()
  if (!node) return { ok: false, error: '노드를 찾을 수 없습니다.' }
  const tree = Array.isArray(node.skill_trees) ? node.skill_trees[0] : node.skill_trees
  if (!tree) return { ok: false, error: '스킬트리를 찾을 수 없습니다.' }
  if (tree.created_by === userId) return { ok: true }
  // 클래스의 teacher_id인지 확인
  if (tree.class_id) {
    const { data: cls } = await admin
      .from('classes')
      .select('teacher_id')
      .eq('id', tree.class_id)
      .maybeSingle()
    if (cls?.teacher_id === userId) return { ok: true }
  }
  return { ok: false, error: '이 노드를 수정할 권한이 없습니다.' }
}

async function assertTreeOwnership(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  treeId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: tree } = await admin
    .from('skill_trees')
    .select('created_by, class_id')
    .eq('id', treeId)
    .maybeSingle()
  if (!tree) return { ok: false, error: '스킬트리를 찾을 수 없습니다.' }
  if (tree.created_by === userId) return { ok: true }
  if (tree.class_id) {
    const { data: cls } = await admin
      .from('classes')
      .select('teacher_id')
      .eq('id', tree.class_id)
      .maybeSingle()
    if (cls?.teacher_id === userId) return { ok: true }
  }
  return { ok: false, error: '이 스킬트리를 수정할 권한이 없습니다.' }
}

async function assertEdgeOwnership(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  edgeId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: edge } = await admin
    .from('node_edges')
    .select('skill_tree_id')
    .eq('id', edgeId)
    .maybeSingle()
  if (!edge) return { ok: false, error: '엣지를 찾을 수 없습니다.' }
  return assertTreeOwnership(admin, userId, edge.skill_tree_id)
}

export async function updateNodePosition(
  nodeId: string, x: number, y: number
): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertNodeOwnership(admin, user.id, nodeId)
    if (!auth.ok) return { error: auth.error }

    const { error } = await admin
      .from('nodes')
      .update({ position_x: x, position_y: y })
      .eq('id', nodeId)
    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function updateNode(
  nodeId: string, title: string, description: string, difficulty: number
): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    // 입력 검증
    if (!title.trim()) return { error: '제목을 입력해주세요.' }
    if (title.length > 200) return { error: '제목이 너무 깁니다.' }
    if (description.length > 2000) return { error: '설명이 너무 깁니다.' }
    const diffInt = Math.floor(Number(difficulty))
    if (!Number.isFinite(diffInt) || diffInt < 1 || diffInt > 5) {
      return { error: '난이도는 1-5 사이 정수여야 합니다.' }
    }

    const admin = createAdminClient()
    const auth = await assertNodeOwnership(admin, user.id, nodeId)
    if (!auth.ok) return { error: auth.error }

    const { error } = await admin
      .from('nodes')
      .update({ title: title.trim(), description: description.trim(), difficulty: diffInt })
      .eq('id', nodeId)
    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function addNode(
  skillTreeId: string, title: string, description: string, difficulty: number
): Promise<{ id?: string; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    if (!title.trim()) return { error: '제목을 입력해주세요.' }
    if (title.length > 200) return { error: '제목이 너무 깁니다.' }
    if (description.length > 2000) return { error: '설명이 너무 깁니다.' }
    const diffInt = Math.floor(Number(difficulty))
    if (!Number.isFinite(diffInt) || diffInt < 1 || diffInt > 5) {
      return { error: '난이도는 1-5 사이 정수여야 합니다.' }
    }

    const admin = createAdminClient()
    const auth = await assertTreeOwnership(admin, user.id, skillTreeId)
    if (!auth.ok) return { error: auth.error }

    const { data, error } = await admin
      .from('nodes')
      .insert({ skill_tree_id: skillTreeId, title: title.trim(), description: description.trim(), difficulty: diffInt, order_index: 0 })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { id: data.id }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function deleteNode(nodeId: string): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertNodeOwnership(admin, user.id, nodeId)
    if (!auth.ok) return { error: auth.error }

    const { error } = await admin.from('nodes').delete().eq('id', nodeId)
    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function addEdge(
  skillTreeId: string, sourceId: string, targetId: string
): Promise<{ id?: string; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertTreeOwnership(admin, user.id, skillTreeId)
    if (!auth.ok) return { error: auth.error }

    // 두 노드가 모두 동일 스킬트리에 속하는지 확인
    const { data: nodes } = await admin
      .from('nodes')
      .select('id, skill_tree_id')
      .in('id', [sourceId, targetId])
    if (!nodes || nodes.length !== 2) return { error: '노드를 찾을 수 없습니다.' }
    if (nodes.some(n => n.skill_tree_id !== skillTreeId)) {
      return { error: '다른 스킬트리의 노드는 연결할 수 없습니다.' }
    }

    const { data, error } = await admin
      .from('node_edges')
      .insert({ skill_tree_id: skillTreeId, source_node_id: sourceId, target_node_id: targetId })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { id: data.id }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function deleteEdge(edgeId: string): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모 계정 차단
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const auth = await assertEdgeOwnership(admin, user.id, edgeId)
    if (!auth.ok) return { error: auth.error }

    const { error } = await admin.from('node_edges').delete().eq('id', edgeId)
    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * 스킬트리 상세 조회 (교사 편집 페이지용).
 * 인증 + 권한 체크: 교사 소유이거나, 학생이 승인된 enrollment가 있을 때.
 */
export async function fetchSkillTreeDetail(treeId: string) {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: tree, error: treeErr } = await admin
      .from('skill_trees')
      .select('*')
      .eq('id', treeId)
      .single()
    if (treeErr || !tree) return { error: treeErr?.message ?? '스킬트리를 찾을 수 없습니다.' }

    // 권한 체크: 교사 소유자거나 class 담당 교사거나 승인된 학생이거나 admin
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    let canAccess = tree.created_by === user.id
    if (!canAccess && tree.class_id) {
      // 담당 교사
      const { data: cls } = await admin
        .from('classes')
        .select('teacher_id')
        .eq('id', tree.class_id)
        .maybeSingle()
      if (cls?.teacher_id === user.id) canAccess = true
      // 또는 승인된 학생
      if (!canAccess) {
        const { data: enrollment } = await admin
          .from('class_enrollments')
          .select('status')
          .eq('class_id', tree.class_id)
          .eq('student_id', user.id)
          .maybeSingle()
        if (enrollment?.status === 'approved') canAccess = true
      }
    }
    // admin은 전부 허용
    if (!canAccess && profile?.role === 'admin') canAccess = true

    if (!canAccess) return { error: '이 스킬트리에 접근할 권한이 없습니다.' }

    const { data: nodes } = await admin
      .from('nodes')
      .select('*')
      .eq('skill_tree_id', treeId)
      .order('order_index')

    const { data: edges } = await admin
      .from('node_edges')
      .select('*')
      .eq('skill_tree_id', treeId)

    return { data: { tree, nodes: nodes ?? [], edges: edges ?? [] } }
  } catch (err) {
    return { error: String(err) }
  }
}
