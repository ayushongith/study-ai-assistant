'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getDashboardStats } from '@/lib/db/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  FileText, Sparkles, Brain, BookOpen, MessageSquare, TrendingUp,
  Upload, Clock, Zap
} from 'lucide-react'
import type { DashboardStats } from '@/types'

const statCards = [
  { key: 'total_notes', label: 'Notes', icon: FileText, color: 'text-blue-500', href: '/notes' },
  { key: 'total_summaries', label: 'Summaries', icon: Sparkles, color: 'text-purple-500', href: '/summaries' },
  { key: 'total_quizzes', label: 'Quizzes', icon: Brain, color: 'text-green-500', href: '/quiz' },
  { key: 'total_flashcards', label: 'Flashcards', icon: BookOpen, color: 'text-orange-500', href: '/flashcards' },
]

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !supabase) return
    getDashboardStats(user.id, supabase).then(s => { setStats(s); setLoading(false) })
  }, [user, supabase])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.name || 'Student'}
          </p>
        </div>
        <Link href="/notes">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Notes
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
          <Link key={card.key} href={card.href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {String(stats?.[card.key as keyof DashboardStats] ?? 0)}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link href="/notes">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Upload className="h-4 w-4" /> Upload Study Material
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="outline" className="w-full justify-start gap-2">
                <MessageSquare className="h-4 w-4" /> Chat with AI
              </Button>
            </Link>
            <Link href="/quiz">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Brain className="h-4 w-4" /> Take a Quiz
              </Button>
            </Link>
            <Link href="/flashcards">
              <Button variant="outline" className="w-full justify-start gap-2">
                <BookOpen className="h-4 w-4" /> Review Flashcards
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : stats?.recent_activity?.length ? (
              <div className="space-y-3">
                {stats.recent_activity.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{a.activity_type}</span>
                    <span className="text-muted-foreground">
                      {a.duration_minutes}m ago
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity. Start by uploading a note!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
