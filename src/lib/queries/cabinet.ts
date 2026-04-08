/**
 * lib/queries/cabinet.ts
 *
 * Server-side data access for cabinet, roster, and league data.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Cabinet,
  CabinetEnriched,
  League,
  LeagueMembership,
  RosterSlotEnriched,
  CabinetRankingRow,
  CabinetPosition,
  CABINET_POSITIONS,
} from '@/types/database'

/**
 * Fetch the active cabinet(s) for the current user.
 * Most users have one — Pro users can have national + state.
 */
export async function getUserCabinets(): Promise<Cabinet[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('cabinets')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at')

  return (data ?? []) as Cabinet[]
}

/**
 * Fetch a fully enriched cabinet — all 12 slots with politician, stats, party data.
 * This is the dashboard and cabinet builder view.
 */
export async function getEnrichedCabinet(cabinetId: string): Promise<CabinetEnriched | null> {
  const supabase = await createClient()

  // Cabinet itself
  const { data: cabinet, error: cabError } = await supabase
    .from('cabinets')
    .select('*')
    .eq('id', cabinetId)
    .single()

  if (cabError || !cabinet) return null

  // All active roster slots with politician + stats + both party refs
  const { data: slots, error: slotsError } = await supabase
    .from('roster_slots')
    .select(`
      *,
      politicians (
        *,
        politician_stats (*),
        parties!current_party_id (*)
      ),
      draft_party:parties!party_at_draft_id (*)
    `)
    .eq('cabinet_id', cabinetId)
    .eq('is_active', true)
    .order('drafted_at')

  if (slotsError) {
    console.error('[getEnrichedCabinet]', slotsError)
    return null
  }

  const enrichedSlots: RosterSlotEnriched[] = (slots ?? []).map(s => ({
    ...s,
    politician: s.politicians,
    stats:      s.politicians?.politician_stats,
    party:      s.politicians?.parties,
    draft_party: s.draft_party,
  })) as unknown as RosterSlotEnriched[]

  return {
    ...(cabinet as Cabinet),
    slots: enrichedSlots,
  }
}

/**
 * Fetch the leagues a cabinet is enrolled in, with rankings.
 */
export async function getCabinetLeagues(cabinetId: string): Promise<
  Array<{ league: League; membership: LeagueMembership }>
> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('league_memberships')
    .select(`
      *,
      leagues (*)
    `)
    .eq('cabinet_id', cabinetId)
    .order('joined_at')

  return (data ?? []).map(row => ({
    league:     row.leagues as unknown as League,
    membership: row as LeagueMembership,
  }))
}

/**
 * Fetch full leaderboard for a league.
 */
export async function getLeagueLeaderboard(
  leagueId: string
): Promise<CabinetRankingRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_cabinet_rankings', {
    p_league_id: leagueId,
  })

  if (error) {
    console.error('[getLeagueLeaderboard]', error)
    return []
  }

  return (data ?? []) as CabinetRankingRow[]
}

/**
 * Fetch public leagues by scope (for league discovery page).
 */
export async function getPublicLeagues(
  scope: 'national' | 'state',
  scopeState?: string
): Promise<League[]> {
  const supabase = await createClient()

  let query = supabase
    .from('leagues')
    .select('*')
    .eq('league_type', 'public')
    .eq('scope', scope)

  if (scope === 'state' && scopeState) {
    query = query.eq('scope_state', scopeState)
  }

  const { data } = await query.order('season', { ascending: false }).limit(1)
  return (data ?? []) as League[]
}

/**
 * Get a private league by invite code.
 */
export async function getLeagueByInviteCode(code: string): Promise<League | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single()

  return data as League | null
}
