'use server'

import { createClient } from '@supabase/supabase-js'
import { inflateRaw } from 'zlib'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function decodeASCII85(data: string): Buffer {
  const chunks: number[] = []
  let i = 0
  while (i < data.length) {
    if (data[i] === '~' && data[i + 1] === '>') break
    if (data[i] === 'z' && data[i + 1] !== undefined) {
      chunks.push(0, 0, 0, 0)
      i++
      continue
    }
    if (data[i] <= ' ') { i++; continue }
    const chunk = data.slice(i, i + 5)
    let code = 0
    for (let j = 0; j < chunk.length; j++) {
      code = code * 85 + (chunk.charCodeAt(j) - 33)
    }
    chunks.push((code >> 24) & 0xFF, (code >> 16) & 0xFF, (code >> 8) & 0xFF, code & 0xFF)
    i += chunk.length
  }
  return Buffer.from(chunks)
}

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString('binary')
  const results: string[] = []

  const streamRegex = /stream\n(.+?)endstream/gs
  let match: RegExpExecArray | null

  while ((match = streamRegex.exec(raw)) !== null) {
    let streamData = match[1].trim()
    if (streamData.endsWith('>')) {
      streamData = streamData.replace(/~>.*/, '~>')
    }

    const filterMatch = raw.slice(0, match.index).match(/\/Filter\s*\[([^\]]+)\]/)
    const filters: string[] = []
    if (filterMatch) {
      const names = filterMatch[1]
      const nameRegex = /\/(\w+)/g
      let nm: RegExpExecArray | null
      while ((nm = nameRegex.exec(names)) !== null) {
        filters.push(nm[1])
      }
    }

    let decoded: Buffer
    try {
      let bytes = Buffer.from(streamData, 'binary')

      if (filters.includes('ASCII85Decode')) {
        const ascii85 = streamData.replace(/~>.*/, '')
        bytes = decodeASCII85(ascii85)
      }

      if (filters.includes('FlateDecode')) {
        bytes = inflateRaw(bytes)
      }

      const text = bytes.toString('binary')

      const parens: string[] = []
      let j = 0
      const chars = text.split('')
      while (j < chars.length) {
        if (chars[j] === '(') {
          let depth = 1
          let k = j + 1
          while (k < chars.length && depth > 0) {
            if (chars[k] === '\\') { k += 2; continue }
            if (chars[k] === '(') depth++
            else if (chars[k] === ')') depth--
            k++
          }
          const t = chars.slice(j + 1, k - 1).join('')
            .replace(/\\(.)/g, '$1')
            .replace(/\\n/g, '\n')
          if (t.trim()) parens.push(t)
          j = k
        } else {
          j++
        }
      }
      if (parens.length) results.push(parens.join(' '))
    } catch { }
  }

  return results.join('\n\n')
}

export async function parseDocument(noteId: string, fileUrl: string, fileType: string) {
  try {
    const response = await fetch(fileUrl)
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
