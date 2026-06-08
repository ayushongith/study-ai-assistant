'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function parseDocument(noteId: string, fileUrl: string, fileType: string) {
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())

    let content = ''

    if (fileType === 'pdf') {
      // Use pdfjs-dist legacy build (Node.js compatible)
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
      const pages: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        if (pageText.trim()) pages.push(pageText.trim())
      }
      content = pages.join('\n\n')
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
      .update({ content: cleaned, status: cleaned ? 'ready' : 'error' })
      .eq('id', noteId)

    if (error) throw error
    return { success: true, content: cleaned || null }
  } catch (err: any) {
    console.error('Parse error:', err.message)
    await supabase
      .from('notes')
      .update({ content: err.message, status: 'error' })
      .eq('id', noteId)
    return { success: false, error: err.message }
  }
}
