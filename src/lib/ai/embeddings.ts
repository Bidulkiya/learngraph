import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Split text into chunks, embed each chunk with OpenAI text-embedding-3-small,
 * and store in Supabase document_chunks table for RAG retrieval.
 */
export async function embedAndStoreDocument(
  content: string,
  skillTreeId: string,
  chunkSize: number = 500
): Promise<void> {
  const admin = createAdminClient()
  const chunks = splitIntoChunks(content, chunkSize)

  for (const chunk of chunks) {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk,
    })

    const embedding = response.data[0].embedding

    await admin.from('document_chunks').insert({
      skill_tree_id: skillTreeId,
      content: chunk,
      embedding,
    })
  }
}

/**
 * Split text into chunks at sentence boundaries.
 */
function splitIntoChunks(text: string, maxChars: number): string[] {
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim())
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += (current ? '. ' : '') + sentence
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks.length > 0 ? chunks : [text.trim()]
}
