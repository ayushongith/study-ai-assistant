'use server'

import { createClient } from '@supabase/supabase-js'
import { inflateRaw } from 'zlib'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function ascii85Decode(data: string): Buffer {
  const clean = data.replace(/\s+/g, '')
  const out: number[] = []
  let i = 0
  while (i < clean.length) {
    if (clean[i] === '~') break
    if (clean[i] === 'z') { out.push(0, 0, 0, 0); i++; continue }
    const group = clean.slice(i, i + 5)
    const n = group.length
    if (n < 5) {
      const padded = group.padEnd(5, 'u')
      let code = 0
      for (let j = 0; j < 5; j++) code = code * 85 + (padded.charCodeAt(j) - 33)
      for (let j = 0; j < n - 1; j++) out.push((code >> (24 - j * 8)) & 0xFF)
      break
    }
    let code = 0
    for (let j = 0; j < 5; j++) code = code * 85 + (group.charCodeAt(j) - 33)
    out.push((code >> 24) & 0xFF, (code >> 16) & 0xFF, (code >> 8) & 0xFF, code & 0xFF)
    i += 5
  }
  return Buffer.from(out)
}

export async function parseDocument(noteId: string, fileUrl: string, fileType: string) {
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())

    let content = ''

    if (fileType === 'pdf') {
      const raw = buffer.toString('binary')
      const found: string[] = []

      // Collect all stream data
      const streams: string[] = []
      const streamRe = /stream\s+([\s\S]*?)\s*endstream/g
      let m: RegExpExecArray | null
      while ((m = streamRe.exec(raw)) !== null) streams.push(m[1].trim())

      if (streams.length > 0) {
        for (const s of streams) {
          let decoded: Buffer | null = null

          // Try ASCII85 decode first
          try { decoded = ascii85Decode(s) } catch { }

          // Try direct binary (no ASCII85)
          if (!decoded || decoded.length === 0) {
            try { decoded = Buffer.from(s, 'binary') } catch { }
          }

          if (decoded && decoded.length > 0) {
            // Try inflateRaw
            let inflated: Buffer | null = null
            try { inflated = inflateRaw(decoded) } catch { }

            // Try without compression (already raw)
            if (!inflated || inflated.length === 0) inflated = decoded

            const text = inflated.toString('binary')

            // Extract text between parentheses
            let pi = 0
            while (pi < text.length) {
              if (text[pi] === '(') {
                let depth = 1, pj = pi + 1
                while (pj < text.length && depth > 0) {
                  if (text[pj] === '\\') { pj += 2; continue }
                  if (text[pj] === '(') depth++
                  else if (text[pj] === ')') depth--
                  pj++
                }
                const t = text.slice(pi + 1, pj - 1)
                  .replace(/\\(.)/g, '$1')
                  .replace(/\\n/g, '\n')
                if (t.trim()) found.push(t.trim())
                pi = pj
              } else { pi++ }
            }
          }
        }
      }

      // Fallback: find text in raw binary
      if (found.length === 0) {
        let pi = 0
        while (pi < raw.length) {
          if (raw[pi] === '(') {
            let depth = 1, pj = pi + 1
            while (pj < raw.length && depth > 0) {
              if (raw[pj] === '\\') { pj += 2; continue }
              if (raw[pj] === '(') depth++
              else if (raw[pj] === ')') depth--
              pj++
            }
            const t = raw.slice(pi + 1, pj - 1)
              .replace(/\\([^n])/g, '$1')
              .replace(/\\n/g, '\n')
            if (t.trim() && t.length > 2 && t.length < 400) found.push(t.trim())
            pi = pj
          } else { pi++ }
        }
      }

      content = [...new Set(found)].join('\n')
    } else if (fileType === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      content = result.value
    } else {
      content = buffer.toString('utf-8')
    }

    const cleaned = content
      .replace(/\r\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim()

    const { error } = await supabase
      .from('notes')
      .update({ content: cleaned || 'No text could be extracted', status: cleaned ? 'ready' : 'error' })
      .eq('id', noteId)

    if (error) throw error
    return { success: true, content: cleaned || null }
  } catch (err: any) {
    console.error('Parse error:', err.message)
    await supabase
      .from('notes')
      .update({ content: `[Error: ${err.message}]`, status: 'error' })
      .eq('id', noteId)
    return { success: false, error: err.message }
  }
}
