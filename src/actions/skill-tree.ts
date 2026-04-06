'use server'

import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { skillTreeSchema, type SkillTreeOutput } from '@/lib/ai/schemas'
import { SKILL_TREE_PROMPT } from '@/lib/ai/prompts'
import { embedAndStoreDocument } from '@/lib/ai/embeddings'
// pdf-parse v1 — CommonJS module, no default ESM export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>

/**
 * Extract text from uploaded PDF file.
 * Server-side extraction is more reliable than browser-side.
 */
export async function extractPdfText(formData: FormData): Promise<string> {
  const file = formData.get('file') as File | null
  if (!file) throw new Error('파일이 선택되지 않았습니다.')
  if (file.size > 10 * 1024 * 1024) throw new Error('파일 크기는 10MB 이하여야 합니다.')

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await pdfParse(buffer)

  if (!result.text || result.text.trim().length < 50) {
    throw new Error('PDF에서 텍스트를 충분히 추출하지 못했습니다. 텍스트가 포함된 PDF를 업로드해주세요.')
  }

  return result.text
}

/**
 * Generate a skill tree from text content using Claude API.
 * Returns a streamable object for real-time preview.
 */
export async function generateSkillTree(fileContent: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다.')

  const result = streamObject({
    model: anthropic('claude-sonnet-4-6-20250514'),
    schema: skillTreeSchema,
    prompt: SKILL_TREE_PROMPT(fileContent),
  })

  return result
}

/**
 * Save a generated skill tree to the database.
 * Also triggers document vectorization for RAG.
 */
export async function saveSkillTree(
  treeData: { title: string; description: string },
  nodes: Array<{ id: string; title: string; description: string; difficulty: number }>,
  edges: Array<{ source: string; target: string; label?: string }>,
  originalText: string
): Promise<{ id: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다.')

  // 1. Create skill tree record
  const { data: tree, error: treeError } = await supabase
    .from('skill_trees')
    .insert({
      title: treeData.title,
      description: treeData.description,
      created_by: user.id,
      status: 'published',
    })
    .select()
    .single()

  if (treeError || !tree) throw new Error('스킬트리 저장에 실패했습니다: ' + treeError?.message)

  // 2. Batch insert nodes (avoid N+1)
  const nodeInserts = nodes.map((node, index) => ({
    skill_tree_id: tree.id,
    title: node.title,
    description: node.description,
    difficulty: node.difficulty,
    order_index: index,
  }))

  const { data: dbNodes, error: nodesError } = await supabase
    .from('nodes')
    .insert(nodeInserts)
    .select()

  if (nodesError || !dbNodes) throw new Error('노드 저장에 실패했습니다: ' + nodesError?.message)

  // Map temp IDs (node_1, node_2) → DB UUIDs
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
    const { error: edgesError } = await supabase
      .from('node_edges')
      .insert(edgeInserts)
    if (edgesError) throw new Error('엣지 저장에 실패했습니다: ' + edgesError?.message)
  }

  // 4. Vectorize original text for RAG (non-blocking best-effort)
  try {
    await embedAndStoreDocument(originalText, tree.id)
  } catch (err) {
    console.error('벡터화 실패 (스킬트리 저장은 성공):', err)
  }

  return { id: tree.id }
}

/**
 * Upload file to Supabase Storage and return public URL.
 */
export async function uploadFileToStorage(formData: FormData): Promise<string> {
  const file = formData.get('file') as File | null
  if (!file) throw new Error('파일이 선택되지 않았습니다.')

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다.')

  const ext = file.name.split('.').pop()
  const filePath = `${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('uploads')
    .upload(filePath, file, { contentType: file.type })

  if (error) throw new Error('파일 업로드에 실패했습니다: ' + error.message)

  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filePath)

  return urlData.publicUrl
}
