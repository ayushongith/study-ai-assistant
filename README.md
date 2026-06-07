# StudyAI - AI-Powered Study Assistant

A production-grade SaaS web application that helps students upload study materials, generate AI summaries, quizzes, flashcards, and chat with documents using RAG (Retrieval-Augmented Generation).

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion
- **Backend**: Next.js Server Actions, API Routes
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: Google Gemini API with auto-fallback to mock AI (works without API key for demo)

## Features

- 📄 **Upload Study Material** - PDF, DOCX, TXT with drag-and-drop
- 🤖 **AI Summaries** - Short, detailed, bullet, key concepts, revision, exam prep
- 📝 **Quiz Generator** - MCQs, True/False, Fill-in-blank, Short answer
- 🃏 **Flashcards** - Auto-generated with flip animation and spaced repetition
- 💬 **RAG Chat** - Chat with your documents using semantic search
- 📊 **Dashboard** - Analytics, study stats, activity tracking
- 🔍 **Global Search** - Semantic + keyword hybrid search
- 🌙 **Dark/Light Mode**
- 📱 **Fully Responsive**

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account
- Google Gemini API key

### Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd studyai
   npm install
   ```

2. **Environment variables**
   Copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Database setup**
   - Run `supabase/schema.sql` in Supabase SQL Editor
   - Enable pgvector extension
   - Create storage buckets: `notes`, `avatars`

4. **Run development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login, Signup, Forgot Password
│   └── (dashboard)/       # Dashboard, Notes, Chat, Quiz, etc.
├── components/            # Reusable UI components
│   ├── ui/               # Shadcn UI components
│   ├── layout/           # Sidebar, Navbar
│   └── ...               # Feature components
├── lib/                   # Core library code
│   ├── ai/               # Gemini + mock AI integration
│   ├── db/               # Supabase client + queries
│   ├── rag/              # RAG retrieval system
│   └── utils/            # Helpers (file parsing, text)
├── hooks/                # React hooks (useAuth, useTheme)
├── types/                # TypeScript type definitions
├── actions/              # Server actions
└── proxy.ts              # Auth middleware (Next.js 16 proxy)
```

## Deployment

Deploy to Vercel:

```bash
npm run build
vercel --prod
```

Set all environment variables in Vercel dashboard. Ensure Supabase is in production mode.

## License

MIT
