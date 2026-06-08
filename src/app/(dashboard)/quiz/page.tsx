'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Brain, CheckCircle, XCircle, Clock, RotateCcw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function QuizPage() {
  const { user, supabase } = useAuth()
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeQuiz, setActiveQuiz] = useState<any>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase.from('quizzes').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setQuizzes(data || []); setLoading(false) })
  }, [user])

  const startQuiz = async (quiz: any) => {
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
    setActiveQuiz({ ...quiz, questions: questions || [] })
    setCurrentQ(0)
    setAnswers({})
    setShowResults(false)
    setScore(0)
  }

  const submitAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const finishQuiz = () => {
    let s = 0
    activeQuiz.questions.forEach((q: any) => {
      if (answers[q.id]?.toLowerCase() === q.correct_answer?.toLowerCase()) s++
    })
    setScore(s)
    setShowResults(true)

    supabase.from('quiz_attempts').insert({
      quiz_id: activeQuiz.id,
      user_id: user?.id,
      score: s,
      total: activeQuiz.questions.length,
      answers,
    }).then(() => {})
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>

  if (activeQuiz && !showResults) {
    const q = activeQuiz.questions[currentQ]
    if (!q) return null

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setActiveQuiz(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Question {currentQ + 1} of {activeQuiz.questions.length}
          </div>
        </div>

        <Progress value={(currentQ + 1) / activeQuiz.questions.length * 100} />

        <Card>
          <CardContent className="pt-6">
            <Badge className="mb-4">{q.type.replace('_', ' ')}</Badge>
            <h3 className="text-lg font-medium mb-4">{q.question}</h3>

            {q.type === 'true_false' ? (
              <RadioGroup
                value={answers[q.id] || ''}
                onValueChange={v => submitAnswer(q.id, v)}
              >
                {['True', 'False'].map(o => (
                  <div key={o} className="flex items-center gap-2 rounded-lg border p-3">
                    <RadioGroupItem value={o} id={`${q.id}-${o}`} />
                    <Label htmlFor={`${q.id}-${o}`}>{o}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : q.options ? (
              <RadioGroup
                value={answers[q.id] || ''}
                onValueChange={v => submitAnswer(q.id, v)}
              >
                {q.options.map((o: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border p-3">
                    <RadioGroupItem value={o} id={`${q.id}-${i}`} />
                    <Label htmlFor={`${q.id}-${i}`}>{o}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
            disabled={currentQ === 0}>Previous</Button>
          {currentQ < activeQuiz.questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(p => p + 1)}>Next</Button>
          ) : (
            <Button onClick={finishQuiz}>Finish Quiz</Button>
          )}
        </div>
      </div>
    )
  }

  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            {score / activeQuiz.questions.length >= 0.7 ? (
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-4xl font-bold text-primary mb-2">
              {score}/{activeQuiz.questions.length}
            </p>
            <p className="text-muted-foreground mb-4">
              {score >= activeQuiz.questions.length * 0.8 ? 'Excellent!' :
               score >= activeQuiz.questions.length * 0.6 ? 'Good job!' : 'Keep practicing!'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => startQuiz(activeQuiz)} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" /> Retry
              </Button>
              <Button onClick={() => setActiveQuiz(null)}>Back to Quizzes</Button>
            </div>
          </CardContent>
        </Card>

        {activeQuiz.questions.map((q: any, i: number) => (
          <Card key={q.id}>
            <CardContent className="pt-4">
              <p className="font-medium mb-2">{i + 1}. {q.question}</p>
              <p className={`text-sm ${answers[q.id]?.toLowerCase() === q.correct_answer?.toLowerCase() ? 'text-green-500' : 'text-destructive'}`}>
                Your answer: {answers[q.id] || 'Not answered'}
              </p>
              {answers[q.id]?.toLowerCase() !== q.correct_answer?.toLowerCase() && (
                <p className="text-sm text-green-500">Correct: {q.correct_answer}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{q.explanation}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
      {quizzes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No quizzes yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a quiz from your study notes
            </p>
            <Link href="/notes"><Button variant="outline">Go to Notes</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="cursor-pointer transition-colors hover:border-primary/50"
              onClick={() => startQuiz(quiz)}>
              <CardHeader>
                <CardTitle className="text-sm font-medium line-clamp-1">{quiz.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="capitalize">{quiz.difficulty}</Badge>
                  <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
