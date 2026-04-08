'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PoliticianStats } from '@/types/database'

interface LiveScoreUpdaterProps {
  politicianId:   string
  initialScore:   number
  initialDelta7d: number | null
  children: (score: number, delta7d: number | null, justUpdated: boolean) => React.ReactNode
}

/**
 * Subscribes to politician_stats Realtime updates.
 * Passes live score + delta to children via render prop.
 * Shows a "just updated" flash when a score change arrives.
 */
export function LiveScoreUpdater({
  politicianId,
  initialScore,
  initialDelta7d,
  children,
}: LiveScoreUpdaterProps) {
  const [score,       setScore]       = useState(initialScore)
  const [delta7d,     setDelta7d]     = useState(initialDelta7d)
  const [justUpdated, setJustUpdated] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`stats-${politicianId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'politician_stats',
          filter: `politician_id=eq.${politicianId}`,
        },
        payload => {
          const updated = payload.new as Partial<PoliticianStats>
          if (updated.composite_score != null) {
            setScore(Math.round(updated.composite_score))
          }
          if (updated.composite_delta_7d != null) {
            setDelta7d(updated.composite_delta_7d)
          }
          // Flash indicator
          setJustUpdated(true)
          setTimeout(() => setJustUpdated(false), 3000)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [politicianId])

  return <>{children(score, delta7d, justUpdated)}</>
}
