import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from '@/lib/config'
import {
  mockGenerateStreamingResponse,
  mockGenerateSummary,
  mockGenerateQuiz,
  mockGenerateFlashcards,
  isApiKeyValid,
} from './mock-ai'

let genAI: GoogleGenerativeAI | null = null

function getAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  }
  return genAI
}

export function getModel() {
  return getAI().getGenerativeModel({ model: config.ai.model })
}

function canUseGemini(): boolean {
  return isApiKeyValid(process.env.GEMINI_API_KEY)
}

export async function generateEmbedding(_text: string): Promise<number[]> {
  return new Array(config.embeddings.dimensions).fill(0)
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  return texts.map(() => new Array(config.embeddings.dimensions).fill(0))
}

export async function generateStreamingResponse(
  prompt: string,
  context: string,
  onChunk: (text: string) => void
): Promise<string> {
  if (!canUseGemini()) {
    return mockGenerateStreamingResponse(prompt, context, onChunk)
  }
  const model = getModel()
  const fullPrompt = `Context from study notes:\n${context}\n\nUser question: ${prompt}\n\nProvide a helpful, accurate answer based on the context. If the context doesn't contain enough information, say so.`

  try {
    const result = await model.generateContentStream(fullPrompt)
    let fullText = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      fullText += text
      onChunk(text)
    }
    return fullText
  } catch {
    return mockGenerateStreamingResponse(prompt, context, onChunk)
  }
}

async function generateContent(prompt: string): Promise<string> {
  if (!canUseGemini()) {
    throw new Error('USE_MOCK')
  }
  const model = getModel()
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateSummary(
  text: string,
  type: 'short' | 'detailed' | 'bullet' | 'key_concepts' | 'revision' | 'exam'
): Promise<string> {
  const prompts: Record<string, string> = {
    short: 'Provide a concise short summary of the following study material in 3-5 sentences:',
    detailed: 'Provide a detailed comprehensive summary of the following study material covering all key points:',
    bullet: 'Convert the following study material into well-organized bullet-point notes:',
    key_concepts: 'Extract and explain the key concepts from the following study material:',
    revision: 'Create revision notes from the following study material, highlighting the most important points to remember:',
    exam: 'Create exam-oriented preparation notes from the following material, focusing on likely test topics:',
  }
  if (!canUseGemini()) {
    return mockGenerateSummary(text, type)
  }
  try {
    const prompt = `${prompts[type]}\n\n${text}`
    return await generateContent(prompt)
  } catch {
    return mockGenerateSummary(text, type)
  }
}

export async function generateQuiz(
  text: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number
): Promise<string> {
  if (!canUseGemini()) {
    return mockGenerateQuiz(text, difficulty, count)
  }
  try {
    const prompt = `Based on the following study material, generate ${count} ${difficulty}-difficulty quiz questions. Include a mix of MCQs (with 4 options), true/false, fill-in-the-blank, and short answer questions. For each question provide: question, type, options (if MCQ), correct answer, and explanation.\n\nFormat as JSON array:\n[{"question": "...", "type": "mcq|true_false|fill_blank|short_answer", "options": ["A", "B", "C", "D"], "correct_answer": "...", "explanation": "..."}]\n\nMaterial:\n${text}`
    return await generateContent(prompt)
  } catch {
    return mockGenerateQuiz(text, difficulty, count)
  }
}

export async function generateFlashcards(text: string, count = 10): Promise<string> {
  if (!canUseGemini()) {
    return mockGenerateFlashcards(text, count)
  }
  try {
    const prompt = `Based on the following study material, generate ${count} flashcards for effective learning. Each flashcard should have a front (question/concept) and back (answer/explanation).\n\nFormat as JSON array:\n[{"front": "...", "back": "..."}]\n\nMaterial:\n${text}`
    return await generateContent(prompt)
  } catch {
    return mockGenerateFlashcards(text, count)
  }
}
