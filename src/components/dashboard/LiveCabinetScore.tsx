'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LiveCabinetScoreProps {
  cabinetId:    string
  initialScore: number
}

/**
 * Subscribes to cabinet score changes via Supabase Realtime.
 * Flashes amber briefly when the score updates.
 * Shows ▲/▼ indicator with the change amount for 4 seconds.
 */
export function LiveCabinetScore({ cabinetId, initialScore }: LiveCabinetScoreProps) {
  const [score,       setScore]       = useState(initialScore)
  const [prevScore,   setPrevScore]   = useState(initialScore)
  const [flash,       setFlash]       = useState(false)
  const [delta,       setDelta]       = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`cabinet-score-${cabinetId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'cabinets',
          filter: `id=eq.${cabinetId}`,
        },
        payload => {
          const updated = payload.new as { cabinet_score?: number }
          if (updated.cabinet_score != null) {
            const newScore = Math.round(updated.cabinet_score)
            setDelta(newScore - score)
            setScore(newScore)
            setFlash(true)
            setTimeout(() => { setFlash(false); setDelta(null) }, 4000)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cabinetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const change = delta ?? 0

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
      <span style={{
        fontFamily: '"Playfair Display",Georgia,serif',
        fontSize: '28px',
        fontWeight: 700,
        fontStyle: 'italic',
        color: flash ? 'var(--amber-b)' : 'var(--amber-b)',
        lineHeight: 1,
        transition: 'color 0.3s',
      }}>
        {score.toLocaleString('en-IN')}
      </span>

      {delta !== null && delta !== 0 && (
        <span style={{
          fontFamily: '"DM Mono",monospace',
          fontSize: '12px',
          fontWeight: 600,
          color: change > 0 ? 'var(--green)' : 'var(--red)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {change > 0 ? '+' : ''}{change}
        </span>
      )}
    </div>
  )
}
