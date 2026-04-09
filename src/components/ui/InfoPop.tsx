'use client'

/**
 * InfoPop — contextual story card for every game mechanism.
 *
 * Philosophy: the game's full depth is invisible unless pointed out.
 * Every number, label, or icon with a non-obvious meaning wraps in InfoPop
 * so the player discovers "oh, THAT'S why" at the right moment.
 *
 * Behaviour:
 *   - Desktop: hover trigger → card appears. Mouse can move INTO the card
 *     without it closing (120ms close delay, cancelled on re-entry).
 *   - Mobile: tap trigger → card appears, tap again or anywhere else to close.
 *   - Only one InfoPop open at a time.
 *   - Card positions itself above if near bottom of viewport.
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react'

interface InfoPopProps {
  story:     string
  title?:    string
  children:  React.ReactNode
  inline?:   boolean
}

// Global: close the currently open InfoPop when another opens
let globalClose: (() => void) | null = null

export function InfoPop({ story, title, children, inline = true }: InfoPopProps) {
  const [open, setOpen]   = useState(false)
  const [pos,  setPos]    = useState<'below' | 'above'>('below')
  const wrapRef           = useRef<HTMLSpanElement>(null)
  const closeTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }, [])

  const openPop = useCallback(() => {
    cancelClose()
    // Close any other open InfoPop
    if (globalClose && globalClose !== scheduleClose) globalClose()
    globalClose = scheduleClose
    // Detect viewport position
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect()
      setPos(rect.bottom + 180 > window.innerHeight ? 'above' : 'below')
    }
    setOpen(true)
  }, [scheduleClose])

  // Close on outside click (mobile tap-away)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (globalClose === scheduleClose) globalClose = null
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, scheduleClose])

  // Cleanup timer on unmount
  useEffect(() => () => { cancelClose() }, [])

  return (
    <span
      ref={wrapRef}
      style={{
        display:    inline ? 'inline-flex' : 'flex',
        alignItems: 'center',
        gap:        '3px',
        position:   'relative',
        cursor:     'pointer',
      }}
      onMouseEnter={openPop}
      onMouseLeave={scheduleClose}
      onClick={e => { e.stopPropagation(); open ? setOpen(false) : openPop() }}
    >
      {children}

      {/* Subtle ⓘ indicator */}
      <span style={{
        fontSize:   '8px',
        color:      'var(--t4)',
        lineHeight: 1,
        userSelect: 'none',
        opacity:    open ? 1 : 0.6,
        flexShrink: 0,
        transition: 'opacity 0.12s',
      }}>ⓘ</span>

      {/* Story card — note: NOT pointerEvents:none so mouse can enter it */}
      {open && (
        <span
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          style={{
            position:     'absolute',
            [pos === 'below' ? 'top' : 'bottom']: 'calc(100% + 8px)',
            left:         '50%',
            transform:    'translateX(-50%)',
            zIndex:       1000,
            width:        '224px',
            background:   'var(--bg1)',
            border:       '0.5px solid var(--bd-a)',
            borderRadius: '10px',
            padding:      '11px 13px',
            boxShadow:    '0 6px 24px rgba(26,18,8,.14)',
            pointerEvents: 'auto',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Arrow */}
          <span style={Object.assign({
            position:     'absolute' as const,
            left:         '50%',
            width:        '8px',
            height:       '8px',
            background:   'var(--bg1)',
            border:       '0.5px solid var(--bd-a)',
            borderRight:  'none',
            transform:    `translateX(-50%) rotate(${pos === 'below' ? '45deg' : '225deg'})`,
          }, pos === 'below'
            ? { top: '-4px',    borderBottom: 'none' }
            : { bottom: '-4px', borderTop: 'none'    }
          )} />

          {title && (
            <span style={{
              display:       'block',
              fontSize:      '8px',
              fontWeight:    700,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color:         'var(--amber)',
              marginBottom:  '4px',
              fontFamily:    '"DM Sans",sans-serif',
            }}>
              {title}
            </span>
          )}

          <span style={{
            display:    'block',
            fontSize:   '11.5px',
            color:      'var(--t2)',
            lineHeight: 1.55,
            fontFamily: '"DM Sans",sans-serif',
          }}>
            {story}
          </span>
        </span>
      )}
    </span>
  )
}

/**
 * Pre-authored stories for all 39 game mechanisms.
 * Usage: <InfoPop {...INFO.composite_score}>742</InfoPop>
 */
export const INFO = {
  // ── SCORING ──────────────────────────────────────────────────────────
  composite_score: {
    title: 'Composite score',
    story: 'Their governance report card — 0 to 860. Built from six real-world tracks updated daily from verified news. Higher is better.',
  },
  composite_delta: {
    title: 'Weekly movement',
    story: "How much this politician's score moved since last Sunday's rank lock. Not their total — just this week's change.",
  },
  track_infrastructure: {
    title: 'Infrastructure track',
    story: "Roads, bridges, buildings completed and inaugurated. Foundation stones don't count — only finished projects.",
  },
  track_healthcare: {
    title: 'Healthcare track',
    story: 'Hospitals built, health schemes with verified enrollment, documented health outcomes in their jurisdiction.',
  },
  track_education: {
    title: 'Education track',
    story: "Schools opened, literacy data, enrollment improvements. Announcements don't count — only verifiable outcomes.",
  },
  track_economy: {
    title: 'Economy track',
    story: "Jobs data, investment figures, economic indicators from their domain. Tracks real economic outcomes, not projections.",
  },
  track_approval: {
    title: 'Approval track',
    story: 'Public sentiment from verified surveys and electoral performance data. A proxy for how citizens rate their governance.',
  },
  track_vote_share: {
    title: 'Vote share track',
    story: "Their last election result. Lowest-weighted track because it's backward-looking — elections happen every 5 years.",
  },
  penalty_scam: {
    title: 'Scam penalty',
    story: 'Subtracts from their score. A court conviction hits harder than an allegation. Decays slowly over 90 days — politicians recover, just not quickly.',
  },
  penalty_bias: {
    title: 'Bias penalty',
    story: 'Documented communal or divisive statements. Penalises conduct that undermines governance credibility.',
  },

  // ── POSITION MULTIPLIERS ─────────────────────────────────────────────
  multiplier_pm: {
    title: 'PM/CM multiplier ×1.5',
    story: "Your captain. Whoever sits here contributes 1.5× their composite score to your cabinet total. Put your strongest politician here.",
  },
  multiplier_anchor: {
    title: 'Anchor match ×1.2',
    story: "This politician's best stat matches what this ministry rewards. The right person in the right job earns a 20% bonus on their contribution.",
  },
  multiplier_anchor_rs: {
    title: 'Rajya Sabha anchor ×1.1',
    story: "Upper house MPs have no constituency, so their anchor bonus is slightly reduced (1.1× instead of 1.2×). They're domain experts, not local champions.",
  },
  multiplier_bench: {
    title: 'Bench ×1.0',
    story: "Your reserve. Contributes raw composite score with no multiplier. If a minister defects, your bench is who steps up.",
  },
  multiplier_empty: {
    title: 'Empty slot — scores 0',
    story: 'No politician assigned here. This position contributes zero to your cabinet score until filled. Every empty slot is points left on the table.',
  },

  // ── CONVICTION ───────────────────────────────────────────────────────
  conviction_slider: {
    title: 'Conviction',
    story: "Your personal bet on this minister. Moves their score contribution up or down based on how they actually perform this week. Lock in by Saturday midnight.",
  },
  conviction_doubt: {
    title: 'Doubt — 0.6× good weeks / 1.4× bad weeks',
    story: "You think they'll fail. If they do, your loss is cushioned. If they somehow perform well, you gain less. Bearish protection.",
  },
  conviction_cautious: {
    title: 'Cautious — 0.8× / 1.2×',
    story: "Hedged skepticism. Small protection if they fail, small cost if they succeed. Safer than Doubt, more engaged than Neutral.",
  },
  conviction_neutral: {
    title: 'Neutral — 1.0×',
    story: "No conviction either way. Their score flows through unmodified. The default — useful when you genuinely don't have a read.",
  },
  conviction_believe: {
    title: 'Believe — 1.3× good weeks / 0.8× bad weeks',
    story: "You're backing them. A good week amplifies your gain by 30%. A bad week only costs you 80% of the normal loss. Meaningful upside.",
  },
  conviction_certain: {
    title: 'Certain — 1.6× / 0.6×',
    story: "Maximum conviction. Great week = 60% bonus. Bad week = 40% penalty. The highest-stakes setting. Reserve it for politicians you truly believe in.",
  },
  conviction_herd_bullish: {
    title: 'Herd signal — bullish',
    story: 'Most players who hold this politician have set Believe or Certain this week. The crowd is backing them. Useful signal — or a useful fade.',
  },
  conviction_herd_bearish: {
    title: 'Herd signal — bearish',
    story: 'Most players holding this politician have set Doubt or Cautious. The crowd expects a bad week. Going against the herd is how contrarians win.',
  },
  conviction_lock: {
    title: 'Conviction locked',
    story: "It's Sunday — rank lock day. You can't change conviction until Monday. This stops last-minute gaming after you already know the week's news.",
  },

  // ── SOURCE TIER ──────────────────────────────────────────────────────
  source_tier_1: {
    title: 'Tier 1 — Official source',
    story: 'Government press releases, PIB, official records. Full score impact applied immediately. No corroboration needed.',
  },
  source_tier_2: {
    title: 'Tier 2 — Major outlet',
    story: 'The Hindu, Indian Express, Reuters, Livemint. 85% of base impact. Credible but one step removed from the official record.',
  },
  source_tier_3: {
    title: 'Tier 3 — Biased outlet',
    story: 'Publications with a known editorial stance. Score impact halved, and only applied after a Tier 1 or 2 outlet confirms the same event.',
  },
  source_tier_discounted: {
    title: 'Discounted source',
    story: "Foreign or heavily partisan source. Zero score impact. We track it, but it can't move any politician's score on its own.",
  },
  corroboration_pending: {
    title: 'Awaiting corroboration',
    story: "A lower-tier outlet reported this event but no major source has confirmed it yet. Score impact is held until confirmed. If it never is, it won't apply.",
  },
  event_type_badge: {
    title: 'Event classification',
    story: 'How the news engine categorised this story. The category determines which stat track moves and by how much. Each category name explains itself on hover.',
  },

  // ── DRAFT / ROSTER ───────────────────────────────────────────────────
  party_cap: {
    title: 'Party cap — 4 per party max',
    story: "You can have at most 4 politicians from any single party. Forces a coalition-style cabinet — no one-party sweeps.",
  },
  cooldown_24h: {
    title: '24-hour cooldown',
    story: 'You dropped this politician recently. Wait one day before re-drafting them — prevents instantly recycling players to game transfer windows.',
  },
  transfer_window: {
    title: 'Emergency transfer window — 72h',
    story: "This politician just defected to another party. You have 72 hours to assign someone to their ministry slot before it goes empty and scores 0.",
  },
  defection_penalty: {
    title: 'Defection score hit',
    story: "Switching parties drops a politician's composite score by 20 points. Political instability is already priced into their rating.",
  },
  opposition_status: {
    title: 'Opposition politician',
    story: "Elected but not in government. Can sit on your bench, but can't hold a ministry — they're not actually governing anything right now.",
  },
  roster_depth: {
    title: '20-slot roster',
    story: "You can hold 20 politicians but only 12 play (ministry positions). The other 8 are your bench — cover for transfers, defections, and injuries to your strategy.",
  },

  // ── CABINET / LEAGUE ─────────────────────────────────────────────────
  cabinet_score: {
    title: 'Cabinet score',
    story: "The sum of all 12 ministry contributions: each politician's composite score × their position multiplier × your conviction modifier for the week.",
  },
  rank_lock: {
    title: 'Rank lock — Sunday midnight IST',
    story: "Every Sunday at midnight IST, scores freeze and rankings are computed. Your leaderboard position is set until the following Sunday.",
  },
  rank_delta: {
    title: 'Rank movement',
    story: 'How many positions you moved since the last rank lock. Green = you climbed. Red = others pulled ahead. Resets every Sunday.',
  },
  coalition_score: {
    title: 'Coalition score',
    story: "The average of your cabinet score and your partner's. You compete as one unit on the coalition leaderboard — you rise and fall together.",
  },

  // ── RECKONING ────────────────────────────────────────────────────────
  reckoning_portrait: {
    title: 'Season Reckoning',
    story: "At season end — triggered by a general election — your full year of play is evaluated. A portrait is generated. Archived permanently.",
  },
  conviction_calibration: {
    title: 'Calibration score',
    story: "How well your conviction tracked reality over the season. High Certain bets that paid off = sharp instincts. High Certain bets that failed = overconfidence.",
  },
  slow_burn: {
    title: 'The Long Game',
    story: "Governance trends that build over months. A politician quietly improving week after week shows up here, even if no single week was dramatic.",
  },
} as const

export type InfoKey = keyof typeof INFO
