import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Anon client (for browser use with auth session)
export const anonClient = createClient(supabaseUrl, supabaseAnonKey)

// Service role client (for server-side, bypasses RLS)
let _serviceClient: SupabaseClient | null = null
export const getServiceClient = () => {
  if (!_serviceClient) _serviceClient = createClient(supabaseUrl, serviceKey)
  return _serviceClient
}

// Default client (anon) — used by queries that should use auth context
export const supabase = anonClient
