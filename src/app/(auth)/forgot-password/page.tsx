'use client'

import { useState } from 'react'
import Link from 'next/link'
import { resetPassword } from '@/lib/db/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
      toast.success('Password reset link sent to your email!')
    }
  }

  if (sent) {
    return (
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle>Check your email</CardTitle>
          <CardDescription>We&apos;ve sent a password reset link to {email}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">Back to login</Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-2">
          <div className="rounded-full bg-primary/10 p-3">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center">Forgot password?</CardTitle>
        <CardDescription className="text-center">
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send Reset Link
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
