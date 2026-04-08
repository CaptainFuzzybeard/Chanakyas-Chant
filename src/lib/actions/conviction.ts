'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ConvictionLevel } from '@/types/database'

interface StakeConvictionArgs {
  politicianId: string
  conviction: ConvictionLevel
  gameweek: number
  season: string
}

export async function stakeConviction({
  politicianId,
  conviction,
  gameweek,
  season,
}: StakeConvictionArgs): Promise<{ error: string | null }> {
  const sb = await createClient()

  const { data: { user }, error: authError } = await sb.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  // Verify politician is in the user's active roster before allowing a stake
  const { data: cabinet } = await sb
    .from('cabinets')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!cabinet) return { error: 'No active cabinet found' }

  const { data: inRoster } = await sb
    .from('roster_slots')
    .select('id')
    .eq('cabinet_id', cabinet.id)
    .eq('politician_id', politicianId)
    .eq('is_active', true)
    .single()

  if (!inRoster) return { error: 'Politician is not in your roster' }

  const { error } = await sb
    .from('conviction_stakes')
    .upsert({
      user_id:       user.id,
      politician_id: politicianId,
      gameweek,
      season,
      conviction,
      resolved:      false,
    }, {
      onConflict: 'user_id,politician_id,gameweek,season',
    })

  if (error) {
    console.error('stakeConviction error:', error)
    return { error: error.message }
  }

  revalidatePath('/cabinet')
  revalidatePath('/card-bank')
  return { error: null }
}

export async function getUserStakesForGameweek(
  gameweek: number,
  season: string,
): Promise<Record<string, ConvictionLevel>> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return {}

  const { data } = await sb
    .from('conviction_stakes')
    .select('politician_id, conviction')
    .eq('user_id', user.id)
    .eq('gameweek', gameweek)
    .eq('season', season)

  const map: Record<string, ConvictionLevel> = {}
  for (const row of data ?? []) {
    map[row.politician_id] = row.conviction as ConvictionLevel
  }
  return map
}

export async function getHerdSummary(
  politicianIds: string[],
  gameweek: number,
  season: string,
) {
  if (!politicianIds.length) return {}

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return {}

  const { data } = await sb.rpc('get_conviction_herd_summary', {
    p_politician_ids: politicianIds,
    p_gameweek:       gameweek,
    p_season:         season,
  })

  const map: Record<string, {
    total_stakes: number
    certain_pct:  number
    believe_pct:  number
    neutral_pct:  number
    cautious_pct: number
    doubt_pct:    number
    high_pct:     number   // compat — equals certain_pct
    is_consensus: boolean
  }> = {}
  for (const row of data ?? []) {
    // Ensure backward-compat field present
    map[row.politician_id] = { ...row, high_pct: row.certain_pct ?? row.high_pct ?? 0 }
  }
  return map
}
