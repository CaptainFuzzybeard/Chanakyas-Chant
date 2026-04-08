import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/layout/Nav'
import { Ticker } from '@/components/ticker/Ticker'

export const metadata: Metadata = {
  title: { default: "Chanakya's Chant", template: "%s · Chanakya's Chant" },
  description: 'Fantasy cabinet league for Indian democracy. Draft real politicians, track real governance, compete with real stakes.',
  openGraph: {
    siteName: "Chanakya's Chant",
    type: 'website',
    title: "Chanakya's Chant",
    description: 'Fantasy cabinet league for Indian democracy.',
  },
  twitter: {
    card: 'summary',
    title: "Chanakya's Chant",
    description: 'Fantasy cabinet league for Indian democracy.',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('party_name, subscription_tier, onboarding_complete')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="en">
      <body style={{ background: 'var(--bg0)', color: 'var(--t1)', minHeight: '100vh' }}>
        {user && (
          <>
            <Nav
              partyName={profile?.party_name ?? ''}
              subscriptionTier={profile?.subscription_tier ?? 'free'}
              userId={user.id}
              onboardingComplete={profile?.onboarding_complete ?? false}
            />
            <Ticker />
          </>
        )}
        <main>{children}</main>
      </body>
    </html>
  )
}
