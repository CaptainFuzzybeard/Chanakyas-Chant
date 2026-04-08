/**
 * lib/supabase/server.ts
 *
 * Supabase client for Server Components and Route Handlers.
 * Uses @supabase/ssr to correctly handle cookie-based auth
 * in Next.js App Router (no localStorage).
 *
 * Usage in Server Components:
 *   import { createClient } from '@/lib/supabase/server'
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('politicians').select()
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Component — cookies can't be set from here.
            // Middleware handles cookie refresh.
          }
        },
      },
    }
  )
}

/**
 * Service-role client — bypasses RLS entirely.
 * Only use in server actions where you have already verified
 * the user's identity via auth.getUser().
 * NEVER expose this client to the browser.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
