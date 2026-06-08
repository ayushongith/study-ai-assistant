'use server'

import { createClient } from '@supabase/supabase-js'
import { inflateRaw } from 'zlib'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function decodeASCII85(data: string): Buffer {
  const clean = data.replace(/\s/g, '')
  const chunks: number[] = []
  let i = 0
  while (i < clean.length) {
    if (clean[i] === '~') break
    if (clean[i] === 'z') {
      chunks.push(0, 0, 0, 0)
      i++
      continue
    }
    const group = clean.slice(i, i + 5)
    const n = group.length
    if (n < 5) {
      const padded = group + 'u'.repeat(5 - n)
      let code = 0
      for (let j = 0; j < 5; j++) code = code * 85 + (padded.charCodeAt(j) - 33)
      const count = n - 1
      chunks.push(
        (code >> 24) & 0xFF,
        (code >> 16) & 0xFF,
        ...(count >= 2 ? [(code >> 8) & 0xFF] : []),
        ...(count >= 3 ? [code & 0xFF] : [])
      )
      break
    }
    let code = 0
    for (let j = 0; j < 5; j++) code = code * 85 + (group.charCodeAt(j) - 33)
    chunks.push((code >> 24) & 0xFF, (code >> 16) & 0xFF, (code >> 8) & 0xFF, code & 0xFF)
    i += 5
  }
  return Buffer.from(chunks)
}

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString('binary')
  const results: string[] = []

  // Try multiple stream detection patterns
  const patterns = [
    /stream\s(.+?)\sendstream/gs,
    /stream\n(.+?)\nendstream/gs,
    /stream\r\n(.+?)\r\nendstream/gs,
  ]

  for (const streamRegex of patterns) {
    let match: RegExpExecArray | null
    streamRegex.lastIndex = 0
    while ((match = streamRegex.exec(raw)) !== null) {
      let streamData = match[1].replace(/\r\n/g, '\n').replace(/\n$/, '')

      // Find filters preceding this stream
      const before = raw.slice(Math.max(0, match.index - 500), match.index)
      const filterMatch = before.match(/\/Filter\s*(\[.*?\]|\/\w+)/)
      const filters: string[] = []
      if (filterMatch) {
        const f = filterMatch[1]
        if (f.startsWith('[')) {
          const names = f.match(/\/(\w+)/g) || []
          filters.push(...names.map(n => n.slice(1)))
        } else if (f.startsWith('/')) {
          filters.push(f.slice(1))
        }
      }

      try {
        let bytes = Buffer.from(streamData, 'binary')

        if (filters.includes('ASCII85Decode')) {
          bytes = decodeASCII85(streamData)
        }

        if (filters.includes('FlateDecode')) {
          bytes = inflateRaw(bytes)
        }

        const text = bytes.toString('binary')

        const parens: string[] = []
        let j = 0
        while (j < text.length) {
          if (text[j] === '(') {
            let depth = 1
            let k = j + 1
            while (k < text.length && depth > 0) {
              if (text[k] === '\\') { k += 2; continue }
              if (text[k] === '(') depth++
              else if (text[k] === ')') depth--
              k++
            }
            const t = text.slice(j + 1, k - 1)
              .replace(/\\(.)/g, '$1')
              .replace(/\\n/g, '\n')
            if (t.trim()) parens.push(t.trim())
            j = k
          } else {
            j++
          }
        }

        if (parens.length) results.push(parens.join(' '))
      } catch { }
    }
    if (results.length) break
  }

  if (!results.length) {
    const fallback = extractAnyText(buffer)
    if (fallback) results.push(fallback)
  }

  return results.join('\n\n')
}

function extractAnyText(buffer: Buffer): string {
  const raw = buffer.toString('binary')
  const found: string[] = []

  // Extract text between parentheses
  let i = 0
  while (i < raw.length) {
    if (raw[i] === '(') {
      let depth = 1
      let j = i + 1
      while (j < raw.length && depth > 0) {
        if (raw[j] === '\\') { j += 2; continue }
        if (raw[j] === '(') depth++
        else if (raw[j] === ')') depth--
        j++
      }
      const t = raw.slice(i + 1, j - 1)
        .replace(/\\(.)/g, '$1')
        .replace(/\\n/g, '\n')
      if (t.trim() && t.length < 500) found.push(t.trim())
      i = j
    } else {
      i++
    }
  }

  // Extract text between hex brackets <...> (PDF hex strings)
  i = 0
  while (i < raw.length) {
    if (raw[i] === '<' && raw[i + 1] !== '<') {
      let j = i + 1
      while (j < raw.length && raw[j] !== '>') j++
      const hex = raw.slice(i + 1, j).replace(/\s/g, '')
      try {
        const decoded = Buffer.from(hex, 'hex').toString('utf-8')
        if (decoded.trim()) found.push(decoded.trim())
      } catch { }
      i = j + 1
    } else {
      i++
    }
  }

  // Filter out PDF keywords and metadata noise
  const skipWords = new Set(['obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref', 'R', 'BT', 'ET', 'Td', 'Tm', 'Tf', 'TJ', 'Tj', 'cm', 'w', 'J', 'j', 'M', 'd', 'ri', 'gs', 'q', 'Q', 'Do'])
  const filtered = found.filter(t => t.length > 2 && !skipWords.has(t) && !/^[\d.\s]+$/.test(t))

  // If we got text, use it; otherwise mark as empty
  if (filtered.length > 2) {
    return filtered.join('\n\n')
  }
  return ''
}

export async function parseDocument(noteId: string, fileUrl: string, fileType: string) {
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    let text = ''

    if (fileType === 'pdf') {
      text = extractPdfText(buffer)
    } else if (fileType === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      text = buffer.toString('utf-8')
    }

    const cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim()

    const { error } = await supabase
      .from('notes')
      .update({ content: cleaned, status: 'ready' })
      .eq('id', noteId)

    if (error) throw error
    return { success: true, content: cleaned }
  } catch (err: any) {
    console.error('Parse error:', err)
    await supabase.from('notes').update({ status: 'error' }).eq('id', noteId)
    return { success: false, error: err.message }
  }
}
