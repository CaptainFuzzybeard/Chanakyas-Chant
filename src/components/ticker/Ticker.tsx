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
  { id: 's2', text: 'Stake your conviction on this week\'s picks before Sunday', direction: 'neutral' },
  { id: 's3', text: 'Scores move with verified governance outcomes — speeches don\'t count', direction: 'neutral' },
  { id: 's4', text: 'Defection alert: watch your roster — transfers open 72h after a defection', direction: 'neutral' },
  { id: 's5', text: 'Coalition scores update at every Monday rank lock', direction: 'neutral' },
]

export function Ticker() {
  const [items, setItems] = useState<TickerItem[]>(SEED_ITEMS)

  useEffect(() => {
    const supabase = createClient()

    // 1. Fetch most recent ticker events on mount
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

    // 2. Subscribe to new ticker events via Realtime
    const channel = supabase
      .channel('ticker-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticker_events' },
        payload => {
          const event = payload.new as TickerEvent
          setItems(prev => [
            { id: event.id, text: event.ticker_text, direction: event.delta_direction },
            ...prev.slice(0, 29), // Keep max 30 items
          ])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Duplicate for seamless CSS loop
  const displayed = [...items, ...items]

  return (
    <div
      className="flex items-center overflow-hidden"
      style={{
        height: '34px',
        background: 'var(--bg1)',
        borderBottom: '0.5px solid var(--bd0)',
      }}
    >
      {/* LIVE label */}
      <div
        className="flex-shrink-0 flex items-center gap-[6px] px-[13px] h-full text-[9px] font-bold tracking-[0.12em] uppercase"
        style={{
          color: 'var(--amber)',
          borderRight: '0.5px solid var(--bd-a)',
        }}
      >
        <span className="live-dot" />
        Live
      </div>

      {/* Scrolling track */}
      <div className="overflow-hidden flex-1">
        <div
          className="flex whitespace-nowrap animate-ticker"
          style={{ willChange: 'transform' }}
        >
          {displayed.map((item, i) => (
            <span
              key={`${item.id}-${i}`}
              className="text-[11px] px-[22px]"
              style={{
                fontFamily: '"DM Mono", "Fira Code", monospace',
                color: 'var(--t2)',
                borderRight: '0.5px solid var(--bd0)',
              }}
            >
              <span
                style={{
                  color:
                    item.direction === 'positive' ? 'var(--green)'
                    : item.direction === 'negative' ? 'var(--red)'
                    : 'var(--t2)',
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
