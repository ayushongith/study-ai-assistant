import { supabase, getServiceClient } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Note, Summary, Quiz, QuizAttempt, Flashcard,
  ChatSession, ChatMessage, StudySession, DashboardStats
} from '@/types'

// Helper: use provided client or default (anon) client
function db(client?: SupabaseClient) {
  return client || supabase
}

export async function getUserNotes(userId: string, client?: SupabaseClient): Promise<Note[]> {
  const { data, error } = await db(client)
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) console.error('getUserNotes error:', error)
  return data || []
}

export async function getNoteById(noteId: string, client?: SupabaseClient): Promise<Note | null> {
  const { data } = await db(client)
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .single()
  return data
}

export async function getNoteChunks(noteId: string, client?: SupabaseClient) {
  const { data } = await db(client)
    .from('note_chunks')
    .select('*')
    .eq('note_id', noteId)
    .order('chunk_index', { ascending: true })
  return data || []
}

export async function getSummaries(noteId: string, client?: SupabaseClient): Promise<Summary[]> {
  const { data } = await db(client)
    .from('summaries')
    .select('*')
    .eq('note_id', noteId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getQuiz(quizId: string, client?: SupabaseClient) {
  const c = db(client)
  const { data: quiz } = await c
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .single()
  if (!quiz) return null
  const { data: questions } = await c
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
  return { ...quiz, questions: questions || [] }
}

export async function getChatSessions(userId: string, client?: SupabaseClient): Promise<ChatSession[]> {
  const { data } = await db(client)
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return data || []
}

export async function getChatMessages(sessionId: string, client?: SupabaseClient): Promise<ChatMessage[]> {
  const { data } = await db(client)
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function getFlashcards(noteId: string, client?: SupabaseClient): Promise<Flashcard[]> {
  const { data } = await db(client)
    .from('flashcards')
    .select('*')
    .eq('note_id', noteId)
  return data || []
}

export async function getDashboardStats(userId: string, client?: SupabaseClient): Promise<DashboardStats> {
  const c = db(client)
  const [notes, summaries, quizzes, flashcards, sessions, activity] = await Promise.all([
    c.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    c.from('summaries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    c.from('quizzes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    c.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    c.from('chat_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    c.from('study_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
  ])

  return {
    total_notes: notes.count || 0,
    total_summaries: summaries.count || 0,
    total_quizzes: quizzes.count || 0,
    total_flashcards: flashcards.count || 0,
    total_chat_sessions: sessions.count || 0,
    study_streak: 0,
    recent_activity: (activity.data || []) as StudySession[],
    notes_by_day: [],
  }
}

export async function getStudySessions(userId: string, days = 7, client?: SupabaseClient) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data } = await db(client)
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
  return data || []
}

export async function logStudySession(
  userId: string,
  type: StudySession['activity_type'],
  minutes: number,
  client?: SupabaseClient
) {
  await db(client).from('study_sessions').insert({
    user_id: userId,
    activity_type: type,
    duration_minutes: minutes,
  })
}

export async function deleteNote(noteId: string, client?: SupabaseClient) {
  await db(client).from('notes').delete().eq('id', noteId)
}

export async function deleteChatSession(sessionId: string, client?: SupabaseClient) {
  await db(client).from('chat_sessions').delete().eq('id', sessionId)
}
