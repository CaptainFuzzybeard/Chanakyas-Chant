'use client'

import { useState } from 'react'
import type { PoliticianStats } from '@/types/database'

const STAT_LABELS: Record<string, string> = {
  infrastructure: 'Infrastructure',
  healthcare:     'Healthcare',
  education:      'Education',
  jobs_economy:   'Jobs / Economy',
  approval:       'Approval Rating',
  vote_share:     'Vote Share',
}

const STAT_WEIGHTS: Record<string, number> = {
  infrastructure: 0.18,
  healthcare:     0.18,
  education:      0.15,
  jobs_economy:   0.15,
  approval:       0.12,
  vote_share:     0.08,
}

interface ScoreExplainerProps {
  stats:           PoliticianStats
  politicianName:  string
}

export function ScoreExplainer({ stats, politicianName }: ScoreExplainerProps) {
  const [open, setOpen] = useState(false)

  const score = Math.round(stats.composite_score)

  const statRows = Object.entries(STAT_WEIGHTS).map(([key, weight]) => {
    const raw    = (stats as any)[`score_${key}`] as number | null ?? 0
    const contrib = Math.round(raw * weight * 10)
    return { key, label: STAT_LABELS[key], raw, weight, contrib }
  })

  const scamPenalty = Math.round(stats.penalty_scam * 0.15 * 10)
  const biasPenalty = Math.round(stats.penalty_bias * 0.10 * 10)
  const totalPenalty = scamPenalty + biasPenalty
  const positiveTotal = statRows.reduce((s, r) => s + r.contrib, 0)

  return (
    <>
      {/* Trigger — the score number itself */}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 'inherit',
          color: 'inherit',
          fontWeight: 'inherit',
          fontStyle: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        title="Tap to see how this score is calculated"
      >
        {score}
        <span style={{
          fontSize: '9.5px',
          fontFamily: '"DM Sans",sans-serif',
          color: 'var(--t3, #8B7D6B)',
          fontWeight: 400,
          fontStyle: 'normal',
          border: '0.5px solid currentColor',
          borderRadius: '3px',
          padding: '1px 5px',
          letterSpacing: '0.04em',
          opacity: 0.7,
        }}>
          How?
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,27,45,0.55)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: '90%', maxWidth: '480px',
              background: 'var(--cream, #FAF7F2)',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(15,27,45,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: 'var(--navy, #0F1B2D)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontFamily: '"Playfair Display",serif',
                  fontSize: '18px', fontWeight: 700,
                  color: 'white', marginBottom: '2px',
                }}>
                  Score breakdown
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)' }}>
                  {politicianName} · Composite: {score}/1000
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,.12)', border: 'none',
                  color: 'white', width: '28px', height: '28px',
                  borderRadius: '50%', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 20px' }}>

              {/* Formula */}
              <div style={{
                background: 'var(--cream-dark, #F0EBE1)',
                borderRadius: '10px', padding: '11px 14px',
                marginBottom: '16px', fontSize: '11.5px',
                color: 'var(--stone, #8B7D6B)', lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--ink, #1A1208)', display: 'block', marginBottom: '3px' }}>
                  How composite scores work
                </strong>
                Each stat track (0–100) is weighted and summed. Penalties are
                subtracted. Only <strong>verifiable outcomes</strong> move scores —
                speeches, promises, and announcements do not.
                Scores update within minutes of a qualifying news event.
              </div>

              {/* Stat breakdown */}
              <div style={{
                fontSize: '9.5px', fontWeight: 700, letterSpacing: '.12em',
                textTransform: 'uppercase', color: 'var(--stone-l, #C4B8A8)',
                marginBottom: '8px',
              }}>
                Stat contributions
              </div>

              {statRows.map(row => (
                <div
                  key={row.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '7px 0',
                    borderBottom: '1px solid var(--cream-dark, #F0EBE1)',
                  }}
                >
                  {/* Label + weight */}
                  <div style={{ width: '118px', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', color: 'var(--ink, #1A1208)', fontWeight: 500 }}>
                      {row.label}
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--stone-l, #C4B8A8)', fontFamily: '"DM Mono",monospace' }}>
                      weight {(row.weight * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Bar */}
                  <div style={{
                    flex: 1, height: '5px',
                    background: 'var(--cream-dark, #F0EBE1)',
                    borderRadius: '3px', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      width: `${row.raw}%`,
                      background: row.raw >= 70
                        ? 'var(--green, #1B6B3A)'
                        : row.raw >= 40
                        ? 'var(--gold, #C9941A)'
                        : 'var(--saffron, #E8642A)',
                      transition: 'width .8s',
                    }} />
                  </div>

                  {/* Raw score */}
                  <div style={{
                    fontFamily: '"DM Mono",monospace',
                    fontSize: '11px', color: 'var(--stone, #8B7D6B)',
                    width: '28px', textAlign: 'right', flexShrink: 0,
                  }}>
                    {row.raw.toFixed(0)}
                  </div>

                  {/* Contribution arrow */}
                  <div style={{
                    fontFamily: '"DM Mono",monospace',
                    fontSize: '11px', fontWeight: 500,
                    color: 'var(--green, #1B6B3A)',
                    width: '44px', textAlign: 'right', flexShrink: 0,
                  }}>
                    +{row.contrib}
                  </div>
                </div>
              ))}

              {/* Penalties */}
              {totalPenalty > 0 && (
                <>
                  <div style={{
                    fontSize: '9.5px', fontWeight: 700, letterSpacing: '.12em',
                    textTransform: 'uppercase', color: 'var(--stone-l, #C4B8A8)',
                    margin: '12px 0 8px',
                  }}>
                    Active penalties
                  </div>
                  {scamPenalty > 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid var(--cream-dark, #F0EBE1)',
                      fontSize: '12px',
                    }}>
                      <span style={{ color: 'var(--danger, #C0392B)' }}>☁ Scam cloud</span>
                      <span style={{
                        fontFamily: '"DM Mono",monospace', fontWeight: 500,
                        color: 'var(--danger, #C0392B)',
                      }}>−{scamPenalty}</span>
                    </div>
                  )}
                  {biasPenalty > 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid var(--cream-dark, #F0EBE1)',
                      fontSize: '12px',
                    }}>
                      <span style={{ color: 'var(--danger, #C0392B)' }}>~ Bias penalty</span>
                      <span style={{
                        fontFamily: '"DM Mono",monospace', fontWeight: 500,
                        color: 'var(--danger, #C0392B)',
                      }}>−{biasPenalty}</span>
                    </div>
                  )}
                </>
              )}

              {/* Total */}
              <div style={{
                display: 'flex', alignItems: 'baseline',
                justifyContent: 'space-between',
                padding: '12px 0 4px',
                borderTop: '2px solid var(--cream-dark, #F0EBE1)',
                marginTop: '6px',
              }}>
                <div style={{
                  fontSize: '12px', fontWeight: 600, color: 'var(--ink, #1A1208)',
                }}>
                  Composite total
                </div>
                <div>
                  {totalPenalty > 0 && (
                    <span style={{
                      fontSize: '11px', color: 'var(--stone-l, #C4B8A8)',
                      fontFamily: '"DM Mono",monospace', marginRight: '8px',
                    }}>
                      {positiveTotal} − {totalPenalty} penalties =
                    </span>
                  )}
                  <span style={{
                    fontFamily: '"Playfair Display",serif',
                    fontSize: '26px', fontWeight: 700,
                    color: 'var(--ink, #1A1208)',
                  }}>
                    {score}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--stone-l, #C4B8A8)', marginLeft: '4px' }}>/1000</span>
                </div>
              </div>

              {/* Source note */}
              <div style={{
                marginTop: '12px', fontSize: '10.5px',
                color: 'var(--stone-l, #C4B8A8)', lineHeight: 1.5,
                borderTop: '1px solid var(--cream-dark, #F0EBE1)', paddingTop: '10px',
              }}>
                Scores are updated by automated analysis of news from{' '}
                <strong style={{ color: 'var(--stone, #8B7D6B)' }}>PIB, The Hindu, Indian Express, Reuters</strong>{' '}
                and 20+ other sources. Only verifiable outcomes count — not speeches or announcements.
                All scoring events are logged and auditable.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
