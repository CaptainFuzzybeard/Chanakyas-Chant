'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TickerEvent } from '@/types/database'

interface TickerItem {
  id: string
  text: string
  direction: 'positive' | 'negative' | 'neutral'
}

/** Seed ticker with static items until real-time data arrives */
const SEED_ITEMS: TickerItem[] = [
  { id: 's1', text: 'Live scores updating every 15 minutes',  direction: 'neutral' },
  { id: 's2', text: "Stake your conviction on this week's picks before Sunday", direction: 'neutral' },
  { id: 's3', text: "Scores move with verified governance outcomes — speeches don't count", direction: 'neutral' },
  { id: 's4', text: 'Defection alert: watch your roster — transfers open 72h after a defection', direction: 'neutral' },
  { id: 's5', text: 'Coalition scores update at every Monday rank lock', direction: 'neutral' },
]

export function Ticker() {
  const [items, setItems] = useState<TickerItem[]>(SEED_ITEMS)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('ticker_events')
      .select('*')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setItems(
            (data as TickerEvent[]).map(e => ({
              id:        e.id,
              text:      e.ticker_text,
              direction: e.delta_direction,
            }))
          )
        }
      })

    const channel = supabase
      .channel('ticker-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticker_events' },
        payload => {
          const event = payload.new as TickerEvent
          setItems(prev => [
            { id: event.id, text: event.ticker_text, direction: event.delta_direction },
            ...prev.slice(0, 29),
          ])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Duplicate for seamless CSS scroll loop
  const displayed = [...items, ...items]

  return (
    <div
      style={{
        height: '34px',
        background: 'var(--navy)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* LIVE label */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 13px',
          height: '100%',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--amber-b)',
          borderRight: '0.5px solid rgba(201,148,26,0.3)',
        }}
      >
        <span className="live-dot" />
        Live
      </div>

      {/* Scrolling track */}
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div
          className="animate-ticker"
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            willChange: 'transform',
          }}
        >
          {displayed.map((item, i) => (
            <span
              key={`${item.id}-${i}`}
              style={{
                fontSize: '11px',
                fontFamily: '"DM Mono", "Fira Code", monospace',
                padding: '0 22px',
                borderRight: '0.5px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.5)',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color:
                    item.direction === 'positive' ? 'var(--green)'
                    : item.direction === 'negative' ? 'var(--red)'
                    : 'rgba(255,255,255,0.5)',
                }}
              >
                {item.text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
