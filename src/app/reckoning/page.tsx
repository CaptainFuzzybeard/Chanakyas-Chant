import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { ReckoningPortrait } from '@/types/database'
import type { CSSProperties } from 'react'

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getReckoning(userId: string, season: string): Promise<ReckoningPortrait | null> {
  const sb = await createClient()
  const { data } = await sb
    .from('reckoning_portraits')
    .select(`
      *,
      season_quote:arthashastra_quotes(quote, book, theme)
    `)
    .eq('user_id', userId)
    .eq('season', season)
    .single()
  return data ?? null
}

async function getCurrentSeason(): Promise<string> {
  // Simple: derive from current date
  const now = new Date()
  const year = now.getFullYear()
  return `${year}-${String(year + 1).slice(2)}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReckoningPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const season = await getCurrentSeason()
  const portrait = await getReckoning(user.id, season)

  if (!portrait) {
    return <ReckoningPending season={season} />
  }

  return <ReckoningDisplay portrait={portrait} />
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReckoningPending({ season }: { season: string }) {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg0)',
      padding: '2rem',
    }}>
      <span style={{
        fontSize: '0.65rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--t3)',
        fontFamily: 'var(--fm)',
        marginBottom: '1.5rem',
      }}>
        Season {season}
      </span>
      <h1 style={{
        fontFamily: 'var(--fd)',
        fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
        color: 'var(--t1)',
        textAlign: 'center',
        marginBottom: '1rem',
      }}>
        The reckoning is not yet written.
      </h1>
      <p style={{
        color: 'var(--t3)',
        fontSize: '0.9rem',
        textAlign: 'center',
        maxWidth: '420px',
        lineHeight: 1.7,
      }}>
        It will appear when the season closes. Everything you did is being watched.
      </p>
    </main>
  )
}
import { ReckoningDisplay } from './ReckoningDisplay'
