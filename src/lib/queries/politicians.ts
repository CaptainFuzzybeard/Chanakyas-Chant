/**
 * lib/queries/politicians.ts
 *
 * Server-side data fetching for politician data.
 * All functions are async, called from Server Components or Route Handlers.
 * None of these run in the browser.
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Politician,
  PoliticianStats,
  Party,
  PoliticianCard,
  CardNewsTrailItem,
  PoliticianSentiment,
  OfficeStatus,
  CabinetPosition,
} from '@/types/database'

export type PoliticianFilter = {
  search?:       string
  status?:       OfficeStatus[]
  party_abbr?:   string[]
  min_score?:    number
  tag_rising?:   boolean
  hide_disputed?: boolean
  sort?:         'score_desc' | 'score_asc' | 'rising' | 'holders'
  limit?:        number
  offset?:       number
}

/**
 * Fetch paginated politician cards for the Card Bank.
 * Returns politicians + their stats + party in one query.
 */
export async function getPoliticianCards(
  filter: PoliticianFilter = {}
): Promise<{ cards: PoliticianCard[]; total: number }> {
  const supabase = await createClient()
  const {
    search,
    status,
    party_abbr,
    min_score = 0,
    tag_rising,
    hide_disputed = false,
    sort = 'score_desc',
    limit = 24,
    offset = 0,
  } = filter

  // Build the query — join politicians → politician_stats → parties
  let query = supabase
    .from('politicians')
    .select(
      `
      *,
      politician_stats (*),
      parties!current_party_id (*)
      `,
      { count: 'exact' }
    )

  // Filters
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,constituency.ilike.%${search}%`
    )
  }

  if (status?.length) {
    query = query.in('office_status', status)
  }

  // Bug 3 fix: party filter belongs in the DB query (using a subquery join),
  // not post-fetch JS filtering. That way `total` is accurate.
  // We fetch party ids for the given abbreviations first, then filter.
  if (party_abbr?.length) {
    const { data: matchedParties } = await supabase
      .from('parties')
      .select('id')
      .in('abbreviation', party_abbr)

    const partyIds = (matchedParties ?? []).map(p => p.id)
    if (partyIds.length) {
      query = query.in('current_party_id', partyIds)
    } else {
      // No parties matched — return empty result
      return { cards: [], total: 0 }
    }
  }

  if (min_score > 0) {
    query = query.gte('politician_stats.composite_score', min_score)
  }

  if (tag_rising) {
    query = query.eq('politician_stats.tag_rising', true)
  }

  if (hide_disputed) {
    query = query.eq('politician_stats.tag_disputed', false)
  }

  // Sort
  switch (sort) {
    case 'score_asc':
      query = query.order('composite_score', {
        referencedTable: 'politician_stats',
        ascending: true,
      })
      break
    case 'rising':
      query = query
        .eq('politician_stats.tag_rising', true)
        .order('composite_score', {
          referencedTable: 'politician_stats',
          ascending: false,
        })
      break
    case 'holders':
      query = query.order('sentiment_hold_pct', {
        referencedTable: 'politician_stats',
        ascending: false,
        nullsFirst: false,
      })
      break
    default:
      query = query.order('composite_score', {
        referencedTable: 'politician_stats',
        ascending: false,
      })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[getPoliticianCards]', error)
    return { cards: [], total: 0 }
  }

  // Reshape into PoliticianCard format
  const cards: PoliticianCard[] = (data || [])
    .filter(
      (row): row is typeof row & {
        politician_stats: PoliticianStats
        parties: Party
      } => !!row.politician_stats && !!row.parties
    )
    .map(row => ({
      politician: row as unknown as Politician,
      stats:      row.politician_stats,
      party:      row.parties,
    }))

  return { cards, total: count ?? 0 }
}

/**
 * Fetch a single politician's full detail view.
 */
export async function getPoliticianDetail(id: string): Promise<PoliticianCard | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('politicians')
    .select(`
      *,
      politician_stats (*),
      parties!current_party_id (*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    politician: data as unknown as Politician,
    stats:      data.politician_stats as unknown as PoliticianStats,
    party:      data.parties as unknown as Party,
  }
}

/**
 * Fetch news trail for politician card — calls the get_card_news_trail RPC.
 */
export async function getPoliticianNewsTrail(
  politicianId: string,
  limit: number = 5
): Promise<CardNewsTrailItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_card_news_trail', {
    p_politician_id: politicianId,
    p_limit:         limit,
  })

  if (error) {
    console.error('[getPoliticianNewsTrail]', error)
    return []
  }

  return (data ?? []) as CardNewsTrailItem[]
}

/**
 * Fetch public sentiment data for a politician.
 */
export async function getPoliticianSentiment(
  politicianId: string
): Promise<PoliticianSentiment | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_politician_sentiment', {
    p_politician_id: politicianId,
  })

  if (error || !data?.length) return null
  return data[0] as PoliticianSentiment
}

/**
 * Fetch all distinct parties for the filter sidebar.
 */
export async function getAllParties(): Promise<Party[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('parties')
    .select('*')
    .order('abbreviation')

  return (data ?? []) as Party[]
}

/**
 * Given a list of politician IDs, return which ones are in the user's roster.
 * Used to show "In Roster" state on cards in the Card Bank.
 */
export async function getRosterPoliticianIds(cabinetId: string): Promise<Set<string>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('roster_slots')
    .select('politician_id')
    .eq('cabinet_id', cabinetId)
    .eq('is_active', true)

  return new Set((data ?? []).map(r => r.politician_id))
}
