export const config = {
  app: {
    name: 'StudyAI',
    description: 'AI-powered study assistant for students',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    allowedExtensions: ['.pdf', '.docx', '.txt'],
  },
  ai: {
    model: 'gemini-2.0-flash',
    embeddingModel: 'gemini-2.0-flash',
    maxTokens: 8192,
    temperature: 0.3,
  },
  rag: {
    chunkSize: 1000,
    chunkOverlap: 200,
    maxChunks: 20,
    similarityThreshold: 0.7,
  },
  embeddings: {
    dimensions: 768,
    batchSize: 10,
  },
  pagination: {
    defaultPageSize: 20,
  },
  study: {
    defaultQuizTimeLimit: 15,
    flashcardEasyInterval: 3,
    flashcardMediumInterval: 1,
    flashcardHardInterval: 0,
    spacedRepetition: {
      easy: 2.5,
      medium: 1.5,
      hard: 1.0,
    },
  },
} as const
