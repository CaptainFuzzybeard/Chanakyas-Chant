/**
 * lib/supabase/client.ts
 *
 * Supabase client for Client Components and browser context.
 * Singleton — do not create multiple instances.
 *
 * Usage in Client Components:
 *   import { createClient } from '@/lib/supabase/client'
 *   const supabase = createClient()
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
