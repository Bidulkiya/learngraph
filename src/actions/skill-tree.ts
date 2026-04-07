'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { skillTreeSchema, type SkillTreeOutput } from '@/lib/ai/schemas'
import { SKILL_TREE_PROMPT } from '@/lib/ai/prompts'
import { embedAndStoreDocument } from '@/lib/ai/embeddings'
import { createAdminClient } from '@/lib/supabase/admin'
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
    const file = formData.get('file') as File | null
    if (!file) return { error: '파일이 선택되지 않았습니다.' }
    if (file.size > 10 * 1024 * 1024) return { error: '파일 크기는 10MB 이하여야 합니다.' }

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

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다. 다시 로그인해주세요.' }

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
 * Also triggers document vectorization for RAG.
 */
export async function saveSkillTree(
  treeData: { title: string; description: string },
  nodes: Array<{ id: string; title: string; description: string; difficulty: number }>,
  edges: Array<{ source: string; target: string; label?: string }>,
  originalText: string,
  classId?: string
): Promise<{ id?: string; error?: string }> {
  try {
    // 인증 확인 (anon key 클라이언트)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 1. Create skill tree record (classId 포함)
    const { data: tree, error: treeError } = await admin
      .from('skill_trees')
      .insert({
        title: treeData.title,
        description: treeData.description,
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

    // 6. Vectorize (best-effort, admin client)
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
// =============================================

export async function updateNodePosition(
  nodeId: string, x: number, y: number
): Promise<{ error?: string }> {
  try {
    const admin = createAdminClient()
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
    const admin = createAdminClient()
    const { error } = await admin
      .from('nodes')
      .update({ title, description, difficulty })
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
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('nodes')
      .insert({ skill_tree_id: skillTreeId, title, description, difficulty, order_index: 0 })
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
    const admin = createAdminClient()
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
    const admin = createAdminClient()
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
    const admin = createAdminClient()
    const { error } = await admin.from('node_edges').delete().eq('id', edgeId)
    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

export async function fetchSkillTreeDetail(treeId: string) {
  try {
    const admin = createAdminClient()
    const { data: tree, error: treeErr } = await admin
      .from('skill_trees')
      .select('*')
      .eq('id', treeId)
      .single()
    if (treeErr || !tree) return { error: treeErr?.message ?? 'Not found' }

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
