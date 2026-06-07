import { config } from '@/lib/config'

export function validateFile(file: File): string | null {
  if (!(config.upload.allowedTypes as readonly string[]).includes(file.type)) {
    return `Invalid file type. Allowed: ${config.upload.allowedExtensions.join(', ')}`
  }
  if (file.size > config.upload.maxFileSize) {
    const maxMB = config.upload.maxFileSize / (1024 * 1024)
    return `File too large. Maximum size: ${maxMB}MB`
  }
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileIcon(type: string): string {
  if (type.includes('pdf')) return 'file-text'
  if (type.includes('word')) return 'file-text'
  return 'file'
}

export function countTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function chunkText(text: string, chunkSize = config.rag.chunkSize, overlap = config.rag.chunkOverlap): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start += chunkSize - overlap
  }
  return chunks
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, ' ')
    .trim()
}

export function extractKeywords(text: string, max = 10): string[] {
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'them', 'than', 'that', 'this', 'very', 'just', 'with', 'will', 'also', 'from', 'they', 'been', 'each', 'would', 'could', 'should', 'their', 'there', 'which', 'about', 'after', 'other', 'these', 'those', 'while'])
  const freq: Record<string, number> = {}
  for (const w of words) {
    if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w)
}
