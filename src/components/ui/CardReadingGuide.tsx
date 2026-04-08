'use client'

import { useState, useEffect } from 'react'

const GUIDE_HIDDEN_KEY = 'cc_guide_hidden'

interface GuideEntry {
  label:   string
  body:    string
  color:   'amber' | 'green' | 'navy' | 'default'
}

const LEFT_ENTRIES: GuideEntry[] = [
  {
    label: 'Portrait & status',
    body:  'Green badge = in office, can hold a ministry. Opposition = bench only. Former = lost their seat, scores 0.',
    color: 'default',
  },
  {
    label: 'Party pill',
    body:  'Current affiliation. If they defect after you draft them, you see "INC → TMC" and get a 72h emergency transfer window.',
    color: 'default',
  },
  {
    label: 'Composite score',
    body:  'Weighted sum of 6 governance tracks (max 860). Tap How? to see the breakdown. The 7-day delta shows momentum.',
    color: 'green',
  },
  {
    label: 'Stat bars',
    body:  'Green ≥70 (strong). Amber 40–69 (average). Red <40 or penalty-dragged. Anchor the right ministry to the right stat.',
    color: 'navy',
  },
  {
    label: 'Held by %',
    body:  'Share of all players who have this politician. High % = popular, lower upside. Low % = hidden gem or known risk.',
    color: 'default',
  },
]

const RIGHT_ENTRIES: GuideEntry[] = [
  {
    label: '↑ Rising',
    body:  'Score trended up over 7 days across multiple verified events. A momentum signal — good time to draft.',
    color: 'green',
  },
  {
    label: '☁ Scam cloud',
    body:  'ED/CBI case or chargesheet filed. Penalty applied. Reverses if charges are dropped or acquittal is confirmed.',
    color: 'default',
  },
  {
    label: '? Sycophancy',
    body:  'Recent positive press may be party-controlled. Score held back pending independent corroboration from a T1/T2 source.',
    color: 'amber',
  },
  {
    label: '⊘ Disputed',
    body:  'Two credible sources contradict each other. Score frozen until resolved. Safe to hold, risky to draft right now.',
    color: 'navy',
  },
  {
    label: 'News trail tiers',
    body:  'T1 = PIB/ECI/Sansad (full weight). T2 = Hindu/IE/Reuters (80%). T3 = partisan outlets (50%, needs corroboration). T4/T5 = signal only.',
    color: 'default',
  },
]

function colorVars(c: GuideEntry['color']) {
  switch (c) {
    case 'green':  return { border: 'var(--green)',  label: 'var(--green)' }
    case 'amber':  return { border: 'var(--amber)',  label: 'var(--amber)' }
    case 'navy':   return { border: 'var(--navy-m)', label: 'var(--navy-m)' }
    default:       return { border: 'var(--amber-b)', label: 'var(--amber-b)' }
  }
}

function GuideItem({ entry }: { entry: GuideEntry }) {
  const { border, label: labelColor } = colorVars(entry.color)
  return (
    <div style={{
      borderLeft: `2px solid ${border}`,
      paddingLeft: '10px',
      marginBottom: '10px',
    }}>
      <div style={{
        fontSize: '8.5px', fontWeight: 700, letterSpacing: '.1em',
        textTransform: 'uppercase', color: labelColor, marginBottom: '3px',
        fontFamily: '"DM Sans",sans-serif',
      }}>
        {entry.label}
      </div>
      <div style={{
        fontSize: '11.5px', color: 'var(--t2)', lineHeight: 1.55,
        fontFamily: '"DM Sans",sans-serif',
      }}>
        {entry.body}
      </div>
    </div>
  )
}

export function CardReadingGuide() {
  const [hidden, setHidden] = useState(true)  // start collapsed, reveal after mount

  useEffect(() => {
    // Show by default, respect user preference if they've hidden it
    try {
      const pref = localStorage.getItem(GUIDE_HIDDEN_KEY)
      setHidden(pref === '1')
    } catch {
      setHidden(false)
    }
  }, [])

  function toggle() {
    setHidden(h => {
      const next = !h
      try { localStorage.setItem(GUIDE_HIDDEN_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  return (
    <div style={{
      background: 'var(--bg1)',
      border: '0.5px solid var(--bd0)',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      {/* Header — always visible, toggles the body */}
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '12px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: '"DM Sans",sans-serif',
          borderBottom: hidden ? 'none' : '0.5px solid var(--bd0)',
          transition: 'border-color 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px' }}>📖</span>
          <span style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--t2)',
          }}>
            How to read this card
          </span>
        </div>
        <span style={{
          fontSize: '10px', color: 'var(--t4)',
          transform: hidden ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>
          ▼
        </span>
      </button>

      {/* Body — toggleable */}
      {!hidden && (
        <div style={{ padding: '14px 16px' }}>
          {/* Two-column guide */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div>
              <div style={{
                fontSize: '8px', fontWeight: 700, letterSpacing: '.14em',
                textTransform: 'uppercase', color: 'var(--t4)',
                marginBottom: '10px', paddingBottom: '6px',
                borderBottom: '0.5px solid var(--bd0)',
                fontFamily: '"DM Sans",sans-serif',
              }}>
                Card anatomy
              </div>
              {LEFT_ENTRIES.map(e => <GuideItem key={e.label} entry={e} />)}
            </div>
            <div>
              <div style={{
                fontSize: '8px', fontWeight: 700, letterSpacing: '.14em',
                textTransform: 'uppercase', color: 'var(--t4)',
                marginBottom: '10px', paddingBottom: '6px',
                borderBottom: '0.5px solid var(--bd0)',
                fontFamily: '"DM Sans",sans-serif',
              }}>
                Score events & tags
              </div>
              {RIGHT_ENTRIES.map(e => <GuideItem key={e.label} entry={e} />)}
            </div>
          </div>

          <div style={{
            marginTop: '12px', paddingTop: '10px',
            borderTop: '0.5px solid var(--bd0)',
            fontSize: '10.5px', color: 'var(--t4)',
            lineHeight: 1.5, fontFamily: '"DM Sans",sans-serif',
          }}>
            Scores update daily from verified news. Only completed, verifiable governance outcomes count — speeches and press releases do not.
          </div>
        </div>
      )}
    </div>
  )
}
