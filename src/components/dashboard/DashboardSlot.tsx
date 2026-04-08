'use client'
import { InfoPop, INFO } from '@/components/ui/InfoPop'

import { useState } from 'react'
import type { RosterSlotEnriched } from '@/types/database'
import { POSITION_LABELS, POSITION_MULTIPLIERS } from '@/types/database'
import type { CabinetPosition } from '@/types/database'

interface DashboardSlotProps {
  pos:    CabinetPosition
  slot:   RosterSlotEnriched
  isCap:  boolean
}

const STAT_WEIGHTS: Record<string, { label: string; weight: number }> = {
  score_infrastructure: { label: 'Infrastructure', weight: 0.18 },
  score_healthcare:     { label: 'Healthcare',     weight: 0.18 },
  score_education:      { label: 'Education',       weight: 0.15 },
  score_jobs_economy:   { label: 'Jobs / Economy',  weight: 0.15 },
  score_approval:       { label: 'Approval',         weight: 0.12 },
  score_vote_share:     { label: 'Vote Share',       weight: 0.08 },
}

export function DashboardSlot({ pos, slot, isCap }: DashboardSlotProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const stats      = slot.stats
  const statsScore = Math.round(stats?.composite_score ?? 0)
  const statsDelta = stats?.composite_delta_7d ?? 0
  const isOpp      = slot.politician.office_status === 'opposition'
  const multiplier = POSITION_MULTIPLIERS[pos]

  const statRows = Object.entries(STAT_WEIGHTS).map(([key, { label, weight }]) => {
    const raw = (stats as any)?.[key] ?? 0
    const contribution = Math.round(raw * weight * 10) / 10
    return { label, raw: Math.round(raw), weight, contribution }
  })

  const penalty = Math.round(
    ((stats?.penalty_scam ?? 0) * 0.15 + (stats?.penalty_bias ?? 0) * 0.10)
  )

  return (
    <div style={{ position: 'relative' }}>
      {/* Main slot card — links to detail page */}
      <a
        href={`/p/${slot.politician.id}`}
        style={{
          background:     isCap ? 'rgba(212,146,10,.04)' : 'var(--bg2)',
          border:         `0.5px solid ${isCap ? 'var(--bd-a)' : 'var(--bd0)'}`,
          borderRadius:   '12px',
          padding:        '9px 10px 8px',
          minHeight:      '86px',
          position:       'relative',
          textDecoration: 'none',
          display:        'block',
          transition:     'border-color 0.12s, transform 0.12s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
      >
        <InfoPop {...(multiplier >= 1.5 ? INFO.multiplier_pm
                      : multiplier >= 1.2 ? INFO.multiplier_anchor
                      : multiplier >= 1.1 ? INFO.multiplier_anchor_rs
                      : INFO.multiplier_bench)} inline={false}>
          <div style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isCap ? 'var(--amber)' : 'var(--t3)', marginBottom: '5px' }}>
            {POSITION_LABELS[pos]} {multiplier > 1 && `×${multiplier}`}
          </div>
        </InfoPop>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg3)', border: '0.5px solid var(--bd0)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', overflow: 'hidden' }}>
          {slot.politician.portrait_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={slot.politician.portrait_url} alt={slot.politician.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <svg width="20" height="26" viewBox="0 0 20 26" fill="none" style={{ opacity: 0.3 }}><ellipse cx="10" cy="8" rx="5" ry="6" fill="#ece8dc"/><path d="M2 26C2 18 5 15 10 14C15 15 18 18 18 26" fill="#ece8dc"/></svg>
          }
        </div>
        <div style={{ fontSize: '9.5px', fontWeight: 500, color: isOpp ? 'var(--t3)' : 'var(--t1)', lineHeight: 1.2, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {slot.politician.name.split(' ').slice(-1)[0]}
          {isOpp && (
              <InfoPop {...INFO.opposition_status}>
                <span style={{ fontSize: '7px', color: 'var(--t3)', marginLeft: '3px' }}>(opp)</span>
              </InfoPop>
            )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <InfoPop {...INFO.composite_score}>
            <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10.5px', color: 'var(--amber-b)' }}>{statsScore}</span>
          </InfoPop>
          <InfoPop {...INFO.composite_delta}>
            <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '8.5px', color: statsDelta >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {statsDelta >= 0 ? '▲' : '▼'}{Math.abs(statsDelta).toFixed(1)}
            </span>
          </InfoPop>
        </div>
      </a>

      {/* "?" badge — tap to show mini breakdown without navigating */}
      <button
        onClick={e => { e.stopPropagation(); setShowBreakdown(b => !b) }}
        title="Score breakdown"
        style={{
          position: 'absolute', top: '6px', right: '6px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: showBreakdown ? 'var(--amber)' : 'var(--bg3)',
          border: '0.5px solid var(--bd1)',
          color: showBreakdown ? '#000' : 'var(--t4)',
          fontSize: '8px', fontWeight: 700,
          cursor: 'pointer', lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.12s', fontFamily: '"DM Sans",sans-serif',
          zIndex: 5,
        }}
      >
        ?
      </button>

      {/* Mini breakdown popover */}
      {showBreakdown && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onClick={() => setShowBreakdown(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 49,
            width: '240px', marginTop: '6px',
            background: 'var(--bg1)', border: '0.5px solid var(--bd1)',
            borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 8px 28px rgba(26,18,8,.15)',
          }}>
            {/* Header */}
            <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--bd0)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t1)', marginBottom: '1px' }}>
                  {slot.politician.name}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--t3)' }}>{POSITION_LABELS[pos]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '18px', fontWeight: 700, color: 'var(--amber-b)', lineHeight: 1 }}>
                  {statsScore}
                </div>
                {multiplier > 1 && (
                  <InfoPop {...(multiplier >= 1.5 ? INFO.multiplier_pm : multiplier >= 1.2 ? INFO.multiplier_anchor : INFO.multiplier_anchor_rs)}>
                    <div style={{ fontSize: '8.5px', color: 'var(--amber)', fontFamily: '"DM Mono",monospace' }}>×{multiplier} position</div>
                  </InfoPop>
                )}
              </div>
            </div>

            {/* Stat rows */}
            <div style={{ padding: '8px 12px' }}>
              {statRows.map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                  {(() => {
                    const trackKey: Record<string, keyof typeof INFO> = {
                      'Infrastructure': 'track_infrastructure', 'Healthcare': 'track_healthcare',
                      'Education': 'track_education', 'Jobs / Economy': 'track_economy',
                      'Approval': 'track_approval', 'Vote Share': 'track_vote_share',
                    }
                    const k = trackKey[r.label]
                    const el = <div style={{ fontSize: '9px', color: 'var(--t3)', width: '80px', flexShrink: 0 }}>{r.label}</div>
                    return k ? <InfoPop {...INFO[k]} inline={false}>{el}</InfoPop> : el
                  })()}
                  <div style={{ flex: 1, height: '3px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '2px', width: `${r.raw}%`, background: r.raw >= 65 ? 'var(--green)' : r.raw >= 40 ? 'var(--amber)' : 'var(--red)', transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '9px', color: 'var(--t2)', width: '28px', textAlign: 'right', flexShrink: 0 }}>
                    +{r.contribution}
                  </div>
                </div>
              ))}
              {penalty > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--red)', width: '80px', flexShrink: 0 }}>Penalties</div>
                  <div style={{ flex: 1, height: '3px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min(penalty, 100)}%`, background: 'var(--red)' }} />
                  </div>
                  <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '9px', color: 'var(--red)', width: '28px', textAlign: 'right', flexShrink: 0 }}>
                    −{penalty}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '6px 12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px solid var(--bd0)' }}>
              <InfoPop {...INFO.composite_delta}>
                <span style={{ fontSize: '9px', color: 'var(--t4)' }}>7-day delta: {statsDelta >= 0 ? '+' : ''}{statsDelta.toFixed(1)}</span>
              </InfoPop>
              <a href={`/p/${slot.politician.id}`} style={{ fontSize: '10px', color: 'var(--amber)', textDecoration: 'none', fontFamily: '"DM Sans",sans-serif' }}>Full profile →</a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
