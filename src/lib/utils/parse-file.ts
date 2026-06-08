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
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      text = pdfData.text
    } else if (fileType === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      text = buffer.toString('utf-8')
    }

    const cleaned = text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const { error } = await supabase
      .from('notes')
      .update({ content: cleaned, status: 'ready' })
      .eq('id', noteId)

    if (error) throw error
    return { success: true, content: cleaned }
  } catch (err: any) {
    console.error('Parse error:', err)
    return { success: false, error: err.message }
  }
}
