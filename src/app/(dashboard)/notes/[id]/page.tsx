'use client'

import { useEffect, useState, use } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getNoteById, getSummaries } from '@/lib/db/queries'
import { generateSummary, generateQuiz, generateFlashcards } from '@/lib/ai/gemini'
import { cleanText, countTokens } from '@/lib/utils/file-parser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sparkles, Brain, BookOpen, Copy, Check, Loader2, ArrowLeft, FileText, Clock
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Note, Summary } from '@/types'

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, supabase } = useAuth()
  const [note, setNote] = useState<Note | null>(null)
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [summaryType, setSummaryType] = useState<string>('short')
  const [quizDifficulty, setQuizDifficulty] = useState<string>('medium')
  const [flashcardCount, setFlashcardCount] = useState(10)
  const [noteContent, setNoteContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [pollFailed, setPollFailed] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    let cancelled = false
    let attempts = 0

    const poll = async () => {
      let n: Note | null = null
      try {
        n = await getNoteById(id, supabase)
      } catch {
        if (cancelled) return
        if (attempts < 30) { attempts++; setTimeout(poll, 2000) }
        return
      }
      if (cancelled) return
      setNote(n)
      setLoading(false)
      if (n?.content && n.content.length > 0) {
        setNoteContent(cleanText(n.content))
        setPollFailed(false)
      } else if (n?.status === 'processing' && attempts < 30) {
        attempts++
        setTimeout(poll, 2000)
      } else if (n?.status === 'ready' && (!n?.content || n.content.length === 0)) {
        setPollFailed(true)
      }
    }
    poll()
    getSummaries(id, supabase).then(s => { if (!cancelled) setSummaries(s) })
    return () => { cancelled = true }
  }, [id, user, supabase])

  const handleGenerateSummary = async () => {
    if (!note || !user) return
    setAiLoading(true)
    try {
      const content = await generateSummary(noteContent, summaryType as any)
      const { error } = await supabase.from('summaries').insert({
        note_id: note.id,
        user_id: user.id,
        type: summaryType,
        title: `${summaryType} summary`,
        content,
      })
      if (error) throw error
      const updated = await getSummaries(note.id, supabase)
      setSummaries(updated)
      toast.success('Summary generated!')
    } catch (err: any) {
      toast.error(err.message || 'Generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!note || !user) return
    setAiLoading(true)
    try {
      const result = await generateQuiz(noteContent, quizDifficulty as any, 5)
      const questions = JSON.parse(result.replace(/```json|```/g, ''))
      const { data: quiz, error } = await supabase.from('quizzes').insert({
        note_id: note.id,
        user_id: user.id,
        title: `${note.title} - ${quizDifficulty} quiz`,
        difficulty: quizDifficulty,
        time_limit: 10,
      }).select().single()
      if (error) throw error
      await supabase.from('quiz_questions').insert(
        questions.map((q: any) => ({ ...q, quiz_id: quiz.id }))
      )
      toast.success('Quiz generated!')
    } catch (err: any) {
      toast.error(err.message || 'Quiz generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    if (!note || !user) return
    setAiLoading(true)
    try {
      const result = await generateFlashcards(noteContent, flashcardCount)
      const cards = JSON.parse(result.replace(/```json|```/g, ''))
      const { error } = await supabase.from('flashcards').insert(
        cards.map((c: any) => ({
          note_id: note.id,
          user_id: user.id,
          front: c.front,
          back: c.back,
        }))
      )
      if (error) throw error
      toast.success(`${cards.length} flashcards created!`)
    } catch (err: any) {
      toast.error(err.message || 'Flashcard generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  if (!note) return <p>Note not found</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/notes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{note.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="uppercase">{note.file_type}</Badge>
            <span>{countTokens(noteContent)} tokens</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Document Content</CardTitle>
            </CardHeader>
            <CardContent>
              {note.status === 'processing' && !noteContent ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 animate-pulse" />
                  <p className="text-sm">Parsing document...</p>
                  <p className="text-xs mt-1">This may take a few seconds</p>
                </div>
              ) : pollFailed ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2" />
                  <p className="text-sm">No content available</p>
                  <p className="text-xs mt-1 text-destructive">The PDF parser could not extract text from this file.</p>
                </div>
              ) : !noteContent && note.status === 'error' ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
                  <p className="text-sm">Failed to parse document</p>
                </div>
              ) : !noteContent ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2" />
                  <p className="text-sm">No content available</p>
                </div>
              ) : (
                <Textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
              />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Generate Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={summaryType} onValueChange={(v) => v && setSummaryType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short Summary</SelectItem>
                  <SelectItem value="detailed">Detailed Summary</SelectItem>
                  <SelectItem value="bullet">Bullet Notes</SelectItem>
                  <SelectItem value="key_concepts">Key Concepts</SelectItem>
                  <SelectItem value="revision">Revision Notes</SelectItem>
                  <SelectItem value="exam">Exam Prep</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleGenerateSummary} className="w-full" disabled={aiLoading}>
                {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-green-500" />
                Generate Quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={quizDifficulty} onValueChange={(v) => v && setQuizDifficulty(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleGenerateQuiz} className="w-full" variant="secondary" disabled={aiLoading}>
                {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                Generate Quiz
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-orange-500" />
                Generate Flashcards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleGenerateFlashcards} className="w-full" variant="outline" disabled={aiLoading}>
                {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                Generate 10 Cards
              </Button>
            </CardContent>
          </Card>

          {summaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  Saved Summaries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summaries.map((s, i) => (
                  <div key={s.id} className="group relative rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="capitalize">{s.type}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => copyText(s.content)}>
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-muted-foreground line-clamp-3">{s.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
