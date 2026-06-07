import { supabase } from '@/lib/db/supabase'
import { config } from '@/lib/config'

export async function searchSimilarChunks(
  query: string,
  noteId?: string,
  limit = config.rag.maxChunks
) {
  let queryBuilder = supabase
    .from('note_chunks')
    .select('id, note_id, content')
    .limit(limit)

  if (noteId) {
    queryBuilder = queryBuilder.eq('note_id', noteId)
  }

  const { data, error } = await queryBuilder
  if (error) {
    console.error('Search error:', error)
    return []
  }

  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)

  const scored = (data || []).map(chunk => {
    const contentLower = chunk.content.toLowerCase()
    const wordMatches = queryWords.filter(w => contentLower.includes(w)).length
    const exactMatch = contentLower.includes(queryLower) ? 3 : 0
    return { ...chunk, similarity: (wordMatches + exactMatch) / Math.max(queryWords.length, 1) }
  })

  return scored
    .filter(c => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit) as { id: string; note_id: string; content: string; similarity: number }[]
}

export async function getRelevantContext(
  query: string,
  noteId?: string
): Promise<{ context: string; sources: string[] }> {
  const chunks = await searchSimilarChunks(query, noteId)
  const context = chunks.map(c => c.content).join('\n\n')
  const sources = chunks.map(c => c.id)
  return { context, sources }
}

export async function hybridSearch(
  query: string,
  userId: string
) {
  const semanticResults = await searchSimilarChunks(query)

  const { data: keywordResults } = await supabase
    .from('note_chunks')
    .select('*, notes!inner(user_id)')
    .eq('notes.user_id', userId)
    .textSearch('content', query, { type: 'websearch' })
    .limit(config.rag.maxChunks)

  const seen = new Set<string>()
  const combined = [...semanticResults, ...(keywordResults || [])]
    .filter(r => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
    .slice(0, config.rag.maxChunks)

  return combined
}
