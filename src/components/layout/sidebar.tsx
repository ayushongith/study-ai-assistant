'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard, FileText, Brain, MessageSquare, Sparkles,
  BookOpen, Settings, LogOut, ChevronLeft, ChevronRight, GraduationCap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { signOut } from '@/lib/db/auth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/notes', label: 'My Notes', icon: FileText },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/quiz', label: 'Quizzes', icon: Brain },
  { href: '/flashcards', label: 'Flashcards', icon: BookOpen },
  { href: '/summaries', label: 'Summaries', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300',
      collapsed ? 'w-16' : 'w-60'
    )}>
      <div className={cn('flex items-center gap-2 border-b border-border px-4 py-4', collapsed && 'justify-center')}>
        <GraduationCap className="h-6 w-6 text-primary" />
        {!collapsed && <span className="text-lg font-bold">StudyAI</span>}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-2">
        <form action={signOut}>
          <Button
            variant="ghost"
            className={cn('w-full justify-start text-muted-foreground', collapsed && 'justify-center px-2')}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="ml-3">Sign Out</span>}
          </Button>
        </form>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}
