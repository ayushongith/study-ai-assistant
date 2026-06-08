'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getChatSessions, getChatMessages } from '@/lib/db/queries'
import { getRelevantContext } from '@/lib/rag/retrieval'
import { generateStreamingResponse } from '@/lib/ai/gemini'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Send, Plus, Trash2, Loader2, Bot, User, Pin
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatSession, ChatMessage } from '@/types'

export const dynamic = 'force-dynamic'

export default function ChatPage() {
  const { user, supabase } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadSessions = async () => {
    if (!user) return
    const data = await getChatSessions(user.id, supabase)
    setSessions(data)
    setLoading(false)
    if (data.length > 0 && !activeSession) {
      setActiveSession(data[0].id)
    }
  }

  useEffect(() => { if (!user) return; loadSessions() }, [user, loadSessions])
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamingText])

  useEffect(() => {
    if (!activeSession) return
    getChatMessages(activeSession, supabase).then(setMessages)
  }, [activeSession, supabase])

  const newSession = async () => {
    if (!user) return
    const { data } = await supabase.from('chat_sessions').insert({
      user_id: user.id,
      title: 'New Chat',
    }).select().single()
    if (data) {
      setSessions(prev => [data, ...prev])
      setActiveSession(data.id)
      setMessages([])
    }
  }

  const deleteSession = async (id: string) => {
    await supabase.from('chat_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSession === id) {
      setActiveSession(sessions.find(s => s.id !== id)?.id || null)
      setMessages([])
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !user || !activeSession) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(), session_id: activeSession,
      role: 'user', content: input, created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    setSending(true)
    setStreamingText('')

    await supabase.from('chat_messages').insert({
      session_id: activeSession, role: 'user', content: input,
    })

    const q = input
    setInput('')

    try {
      const { context, sources } = await getRelevantContext(q, undefined, supabase)
      let fullResponse = ''

      await generateStreamingResponse(q, context, (chunk) => {
        fullResponse += chunk
        setStreamingText(fullResponse)
      })

      await supabase.from('chat_messages').insert({
        session_id: activeSession,
        role: 'assistant',
        content: fullResponse,
        sources: sources,
      })

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), session_id: activeSession,
        role: 'assistant', content: fullResponse,
        sources, created_at: new Date().toISOString(),
      }])
      setStreamingText('')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to get response. Check API key or quota.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <Skeleton className="w-64 h-full" />
      <Skeleton className="flex-1 h-full" />
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="hidden md:flex w-64 flex-col gap-2">
        <Button onClick={newSession} className="gap-2">
          <Plus className="h-4 w-4" /> New Chat
        </Button>
        <ScrollArea className="flex-1">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`flex items-center justify-between rounded-lg p-2 cursor-pointer text-sm transition-colors ${
                activeSession === s.id ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              onClick={() => setActiveSession(s.id)}
            >
              <span className="truncate flex-1">{s.title}</span>
              <div className="flex gap-1">
                {s.pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                <Trash2 className="h-3 w-3 text-destructive cursor-pointer"
                  onClick={() => deleteSession(s.id)} />
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="rounded-full bg-primary/10 p-2 h-8 w-8 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="prose dark:prose-invert text-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{m.content}</p>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="rounded-full bg-primary p-2 h-8 w-8 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {streamingText && (
                <div className="flex gap-3">
                  <div className="rounded-full bg-primary/10 p-2 h-8 w-8 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="max-w-[80%] rounded-lg bg-muted p-3">
                    <div className="prose dark:prose-invert text-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamingText}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              {sending && !streamingText && (
                <div className="flex gap-3">
                  <div className="rounded-full bg-primary/10 p-2 h-8 w-8 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask a question about your study material..."
                disabled={!activeSession || sending}
              />
              <Button type="submit" disabled={!input.trim() || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
