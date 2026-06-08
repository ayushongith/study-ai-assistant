'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserNotes, deleteNote } from '@/lib/db/queries'
import { validateFile, formatFileSize } from '@/lib/utils/file-parser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Upload, FileText, Trash2, Loader2, Search
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Note } from '@/types'
import { parseDocument } from '@/lib/utils/parse-file'

export const dynamic = 'force-dynamic'

export default function NotesPage() {
  const { user, supabase } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadNotes = useCallback(async () => {
    if (!user || !supabase) return
    const data = await getUserNotes(user.id, supabase)
    setNotes(data)
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadNotes() }, [loadNotes])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const error = validateFile(file)
    if (error) { toast.error(error); return }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('notes')
        .getPublicUrl(filePath)

      const { data: note, error: dbError } = await supabase.from('notes').insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_url: publicUrl,
        file_type: fileExt,
        file_size: file.size,
        status: 'processing',
        content: '',
      }).select().single()

      if (dbError) throw dbError

      if (note) {
        parseDocument(note.id, publicUrl, fileExt)
          .then(res => {
            if (!res.success) console.error('Parse failed:', res.error)
          })
      }

      toast.success('File uploaded successfully!')
      setTimeout(loadNotes, 500)
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed. Check storage permissions.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteNote(id, supabase)
    setNotes(prev => prev.filter(n => n.id !== id))
    toast.success('Note deleted')
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Notes</h1>
          <p className="text-muted-foreground">Upload and manage your study materials</p>
        </div>
        <div>
          <Button className="gap-2" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
          <Input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
            onChange={handleUpload} disabled={uploading} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first study material to get started
            </p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Upload a file
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(note => (
            <Link key={note.id} href={`/notes/${note.id}`}>
              <Card className="group transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => { e.preventDefault(); handleDelete(note.id) }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <CardTitle className="text-sm font-medium line-clamp-1 mt-2">
                    {note.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="uppercase">{note.file_type}</span>
                    <span>•</span>
                    <span>{formatFileSize(note.file_size)}</span>
                    <span>•</span>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
