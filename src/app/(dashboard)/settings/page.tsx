'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, User, Lock, Moon, Sun, Trash2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const { user, supabase } = useAuth()
  const { theme, toggle } = useTheme()
  const [name, setName] = useState(user?.user_metadata?.name || '')
  const [loading, setLoading] = useState(false)

  const updateProfile = async () => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ data: { name } })
    if (error) toast.error(error.message)
    else toast.success('Profile updated')
    setLoading(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setLoading(true)
    const filePath = `avatars/${user.id}/${crypto.randomUUID()}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)
    if (uploadError) { toast.error(uploadError.message); setLoading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
    toast.success('Avatar updated')
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Profile
          </CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-lg">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Change Avatar
              </Button>
              <Input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>

          <Button onClick={updateProfile} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" /> Appearance
          </CardTitle>
          <CardDescription>Toggle between light and dark mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm font-medium capitalize">{theme} mode</span>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggle} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Security
          </CardTitle>
          <CardDescription>Manage your password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
              redirectTo: `${window.location.origin}/reset-password`,
            })
            if (error) toast.error(error.message)
            else toast.success('Password reset email sent')
          }}>
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>Permanently delete your account and all data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={async () => {
            const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.')
            if (!confirmed) return
            const { error } = await supabase.rpc('delete_user')
            if (error) toast.error(error.message)
            else {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }
          }}>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
