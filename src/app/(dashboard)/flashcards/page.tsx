'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, RotateCcw, ChevronLeft, ChevronRight, Shuffle, Star } from 'lucide-react'
import Link from 'next/link'
import type { Flashcard } from '@/types'

export const dynamic = 'force-dynamic'

export default function FlashcardsPage() {
  const { user, supabase } = useAuth()
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffled, setShuffled] = useState<Flashcard[]>([])

  useEffect(() => {
    if (!user) return
    supabase.from('flashcards').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFlashcards(data || [])
        setShuffled(data || [])
        setLoading(false)
      })
  }, [user])

  const current = shuffled[currentIndex]

  const flip = () => setFlipped(!flipped)

  const next = () => {
    if (currentIndex < shuffled.length - 1) {
      setCurrentIndex(p => p + 1)
      setFlipped(false)
    }
  }

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(p => p - 1)
      setFlipped(false)
    }
  }

  const shuffle = () => {
    const s = [...shuffled]
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]]
    }
    setShuffled(s)
    setCurrentIndex(0)
    setFlipped(false)
  }

  const markDifficulty = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!current) return
    await supabase.from('flashcards').update({ difficulty }).eq('id', current.id)
    setFlashcards(prev => prev.map(f => f.id === current.id ? { ...f, difficulty } : f))
    next()
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
        <Button variant="outline" onClick={shuffle} className="gap-2">
          <Shuffle className="h-4 w-4" /> Shuffle
        </Button>
      </div>

      {flashcards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No flashcards yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate flashcards from your study notes
            </p>
            <Link href="/notes"><Button variant="outline">Go to Notes</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Card {currentIndex + 1} of {shuffled.length}</span>
            <Progress value={(currentIndex + 1) / shuffled.length * 100} className="w-32" />
          </div>

          {current && (
            <div
              className="cursor-pointer perspective-1000"
              onClick={flip}
              style={{ perspective: '1000px' }}
            >
              <div className={`relative transition-transform duration-500 min-h-[300px] ${flipped ? 'rotate-y-180' : ''}`}
                style={{ transformStyle: 'preserve-3d' }}>
                <Card className="absolute inset-0 backface-hidden">
                  <CardContent className="flex items-center justify-center min-h-[300px] p-8">
                    <p className="text-xl text-center">{current.front}</p>
                  </CardContent>
                </Card>
                <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-primary/5"
                  style={{ transform: 'rotateY(180deg)' }}>
                  <CardContent className="flex items-center justify-center min-h-[300px] p-8">
                    <div>
                      <p className="text-xl text-center mb-4">{current.back}</p>
                      <div className="flex justify-center gap-2 mt-4">
                        <Badge variant={current.difficulty === 'easy' ? 'default' : current.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                          {current.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" onClick={prev} disabled={currentIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={flip} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Flip
            </Button>
            <Button variant="outline" onClick={next} disabled={currentIndex === shuffled.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" className="text-green-500"
              onClick={() => markDifficulty('easy')}>
              <Star className="h-3 w-3 mr-1" /> Easy
            </Button>
            <Button size="sm" variant="outline" className="text-yellow-500"
              onClick={() => markDifficulty('medium')}>
              Medium
            </Button>
            <Button size="sm" variant="outline" className="text-destructive"
              onClick={() => markDifficulty('hard')}>
              Hard
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
