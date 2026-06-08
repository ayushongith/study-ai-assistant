'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Copy, Check, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const dynamic = 'force-dynamic'

export default function SummariesPage() {
  const { user, supabase } = useAuth()
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('summaries').select('*, notes(title)').eq('summaries.user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setSummaries(data || []); setLoading(false) })
  }, [user])

  const deleteSummary = async (id: string) => {
    await supabase.from('summaries').delete().eq('id', id)
    setSummaries(prev => prev.filter(s => s.id !== id))
    toast.success('Summary deleted')
  }

  const copySummary = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Copied!')
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Summaries</h1>

      {summaries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No summaries yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate AI summaries from your study notes
            </p>
            <Link href="/notes"><Button variant="outline">Go to Notes</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {summaries.map(s => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="capitalize mb-1">{s.type}</Badge>
                    <CardTitle className="text-sm font-medium">
                      {s.notes?.title || 'Summary'}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => copySummary(s.id, s.content)}>
                      {copiedId === s.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => deleteSummary(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert text-sm max-w-none line-clamp-6">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
