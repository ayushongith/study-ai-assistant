export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  file_type: 'pdf' | 'docx' | 'txt'
  file_url: string
  file_size: number
  status: 'processing' | 'ready' | 'error'
  created_at: string
  updated_at: string
}

export interface NoteChunk {
  id: string
  note_id: string
  content: string
  chunk_index: number
  token_count: number
  created_at: string
}

export interface Summary {
  id: string
  note_id: string
  user_id: string
  type: 'short' | 'detailed' | 'bullet' | 'key_concepts' | 'revision' | 'exam'
  title: string
  content: string
  created_at: string
}

export interface Quiz {
  id: string
  note_id: string
  user_id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit: number
  created_at: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer'
  question: string
  options?: string[]
  correct_answer: string
  explanation: string
  points: number
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  user_id: string
  score: number
  total: number
  answers: Record<string, string>
  started_at: string
  completed_at: string
}

export interface Flashcard {
  id: string
  note_id: string
  user_id: string
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
  created_at: string
}

export interface FlashcardProgress {
  id: string
  flashcard_id: string
  user_id: string
  interval: number
  ease_factor: number
  repetitions: number
  next_review: string
  last_reviewed: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  pinned: boolean
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  created_at: string
}

export interface Embedding {
  id: string
  note_id: string
  chunk_id: string
  content: string
  embedding: number[]
  created_at: string
}

export interface StudySession {
  id: string
  user_id: string
  duration_minutes: number
  activity_type: 'upload' | 'summary' | 'quiz' | 'flashcard' | 'chat'
  created_at: string
}

export interface DashboardStats {
  total_notes: number
  total_summaries: number
  total_quizzes: number
  total_flashcards: number
  total_chat_sessions: number
  study_streak: number
  recent_activity: StudySession[]
  notes_by_day: { date: string; count: number }[]
}
