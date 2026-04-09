'use client'

import { InfoPop, INFO } from '@/components/ui/InfoPop'
import type { ReckoningPortrait } from '@/types/database'
import type { CSSProperties } from 'react'


export function ReckoningDisplay({ portrait }: { portrait: any }) {
  const calibrationPct = Math.round((portrait.calibration_score ?? 0) * 100)
  const herdPct        = Math.round((portrait.herd_score ?? 0) * 100)
  const quote          = portrait.season_quote

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg0)',
      padding: 'clamp(2rem, 5vw, 4rem)',
    }}>
      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
      }}>

        {/* Season label */}
        <div style={{
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--t3)',
          fontFamily: 'var(--fm)',
          marginBottom: '0.75rem',
        }}>
          Season {portrait.season} · End of Record
        </div>

        {/* Archetype */}
        <InfoPop {...INFO.reckoning_portrait} inline={false}>
          <h1 style={{
            fontFamily: 'var(--fd)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: 'var(--t1)',
            lineHeight: 1.15,
            marginBottom: '0.6rem',
          }}>
            {portrait.archetype}
          </h1>
        </InfoPop>

        <p style={{
          fontFamily: 'var(--fd)',
          fontStyle: 'italic',
          fontSize: '1.05rem',
          color: 'var(--t2)',
          lineHeight: 1.6,
          marginBottom: '3rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid var(--bd0)',
        }}>
          {portrait.archetype_description}
        </p>

        {/* Score row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          marginBottom: '3rem',
        }}>
          <Stat label="Final Score" value={portrait.total_score?.toFixed(1) ?? '—'} />
          <Stat
            label="League Rank"
            value={portrait.league_rank ? `#${portrait.league_rank}` : '—'}
          />
          <Stat
            label="Top"
            value={portrait.league_percentile ? `${portrait.league_percentile.toFixed(0)}%` : '—'}
          />
        </div>

        {/* Divider */}
        <SectionLabel>Conviction</SectionLabel>
        <p style={narrativeStyle}>{portrait.conviction_narrative}</p>

        {/* Calibration bars */}
        <div style={{ display: 'flex', gap: '2rem', margin: '1.5rem 0 2.5rem' }}>
          <InfoPop {...INFO.conviction_calibration} inline={false}><MiniBar label="Calibration" pct={calibrationPct} color="var(--green)" /></InfoPop>
          <MiniBar label="Herd" pct={herdPct} color="var(--amber)" />
        </div>

        {/* Cabinet composition */}
        <SectionLabel>Cabinet</SectionLabel>
        <p style={narrativeStyle}>{portrait.composition_narrative}</p>

        {/* Slow burn */}
        <div style={{ marginTop: '2.5rem' }}>
          <InfoPop {...INFO.slow_burn} inline={false}><SectionLabel>The Long Game</SectionLabel></InfoPop>
          <p style={narrativeStyle}>{portrait.slow_burn_narrative}</p>
        </div>

        {/* Season quote */}
        {quote && (
          <div style={{
            marginTop: '3rem',
            paddingTop: '2.5rem',
            borderTop: '1px solid var(--bd0)',
          }}>
            <div style={{
              fontSize: '0.65rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--t3)',
              fontFamily: 'var(--fm)',
              marginBottom: '1.25rem',
            }}>
              The season&apos;s recurring counsel
            </div>
            <p style={{
              fontFamily: 'var(--fd)',
              fontStyle: 'italic',
              fontSize: 'clamp(1rem, 1.4vw, 1.15rem)',
              lineHeight: 1.7,
              color: 'var(--t1)',
              marginBottom: '0.75rem',
            }}>
              &ldquo;{quote.quote}&rdquo;
            </p>
            <span style={{
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--t3)',
              fontFamily: 'var(--fm)',
            }}>
              Kautilya · {quote.book}
            </span>
          </div>
        )}

        {/* Footer note */}
        <div style={{
          marginTop: '4rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--bd0)',
          fontSize: '0.72rem',
          color: 'var(--t3)',
          lineHeight: 1.7,
          fontFamily: 'var(--fm)',
          letterSpacing: '0.04em',
        }}>
          This is a document. Not a judgement. Chanakya watched. Now you know what he saw.
        </div>

      </div>
    </main>
  )
}

// ─── Shared tiny components ───────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: '0.6rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--t3)',
        fontFamily: 'var(--fm)',
        marginBottom: '0.3rem',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--fd)',
        fontSize: '1.8rem',
        color: 'var(--t1)',
        lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.62rem',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'var(--amber)',
      fontFamily: 'var(--fm)',
      marginBottom: '0.75rem',
    }}>
      {children}
    </div>
  )
}

function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.4rem',
      }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--t2)', fontFamily: 'var(--fm)' }}>
          {pct}%
        </span>
      </div>
      <div style={{
        height: '3px',
        background: 'var(--bd0)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '2px',
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  )
}

const narrativeStyle: CSSProperties = {
  fontSize: '0.92rem',
  lineHeight: 1.75,
  color: 'var(--t2)',
  maxWidth: '580px',
}
