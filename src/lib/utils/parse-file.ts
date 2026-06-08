'use server'

import { createClient } from '@supabase/supabase-js'
import { config } from '@/lib/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function parseDocument(noteId: string, fileUrl: string, fileType: string) {
  try {
    const response = await fetch(fileUrl)
    const buffer = Buffer.from(await response.arrayBuffer())
    let text = ''

    if (fileType === 'pdf') {
      const [pdfjs, pdfWorker] = await Promise.all([
        import('pdfjs-dist/legacy/build/pdf.mjs'),
        import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
      ])
      globalThis.pdfjsWorker = pdfWorker
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
      const pages: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items.map((item: any) => item.str).join(' '))
      }
      await pdf.destroy()
      text = pages.join('\n\n')
    } else if (fileType === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      text = buffer.toString('utf-8')
    }

    const cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/^\s*$/gm, '')
      .split('\n').filter(l => l.trim()).join('\n')
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
