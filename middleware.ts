/**
 * middleware.ts
 *
 * Next.js middleware — runs on every request before the page renders.
 *
 * Responsibilities:
 *   1. Refresh the Supabase auth session (keeps the user logged in)
 *   2. Protect authenticated routes — redirect to /login if not signed in
 *   3. Redirect signed-in users away from /login to /dashboard
 *   4. Redirect users who haven't completed onboarding to /onboarding
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/card-bank',
  '/cabinet',
  '/leagues',
  '/onboarding',
]

// Routes only accessible when NOT authenticated
const AUTH_ROUTES = ['/login']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — critical, do not remove
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_ROUTES.some(r => path.startsWith(r))
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth routes
  const isAuthRoute = AUTH_ROUTES.some(r => path.startsWith(r))
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Check onboarding completion for authenticated users
  // /card-bank and /cabinet are part of the onboarding flow itself,
  // so we only gate /dashboard and /leagues — not the draft/build screens.
  const ONBOARDING_GATED = ['/dashboard', '/leagues']
  const needsOnboardingCheck = user && isProtected && path !== '/onboarding' &&
    ONBOARDING_GATED.some(r => path.startsWith(r))

  if (needsOnboardingCheck) {
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_complete) {
      // If they have a cabinet already, they're mid-draft — send to card bank
      const { count } = await supabase
        .from('cabinets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = (count ?? 0) > 0 ? '/card-bank' : '/onboarding'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
