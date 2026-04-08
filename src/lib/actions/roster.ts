/**
 * lib/actions/roster.ts
 *
 * Server Actions for roster mutations.
 * Called from Client Components via form actions or direct invocation.
 * All mutations go through RLS — users can only affect their own data.
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CabinetPosition } from '@/types/database'

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string }

/**
 * Draft a politician into the user's roster.
 * Enforces: max 20 per cabinet, no duplicates.
 * Both in_office AND opposition politicians can be drafted —
 * opposition politicians score points but cannot hold ministry positions.
 * Former politicians (no longer serving) cannot be drafted at all.
 */
export async function draftPolitician(
  cabinetId: string,
  politicianId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Verify the cabinet belongs to this user
  const { data: cabinet } = await supabase
    .from('cabinets')
    .select('id, user_id')
    .eq('id', cabinetId)
    .eq('user_id', user.id)
    .single()

  if (!cabinet) return { success: false, error: 'Cabinet not found' }

  // Check roster size
  const { count: rosterSize } = await supabase
    .from('roster_slots')
    .select('*', { count: 'exact', head: true })
    .eq('cabinet_id', cabinetId)
    .eq('is_active', true)

  if ((rosterSize ?? 0) >= 20) {
    return { success: false, error: 'Roster is full (20/20)' }
  }

  // Check not already in roster
  const { data: existing } = await supabase
    .from('roster_slots')
    .select('id')
    .eq('cabinet_id', cabinetId)
    .eq('politician_id', politicianId)
    .eq('is_active', true)
    .single()

  if (existing) return { success: false, error: 'Already in roster' }

  // Bug 5 fix: check 24h re-draft cooldown (prevents transfer window abuse)
  const { data: recentlyDropped } = await supabase
    .rpc('politician_recently_dropped', {
      p_cabinet_id:    cabinetId,
      p_politician_id: politicianId,
      p_cooldown_hours: 24,
    })

  if (recentlyDropped) {
    return {
      success: false,
      error: 'You dropped this politician recently. Wait 24 hours before re-drafting.',
    }
  }

  // Party diversity cap: max 4 from any single party in the roster
  const { data: diversityRows } = await supabase
    .rpc('check_party_diversity', {
      p_cabinet_id:    cabinetId,
      p_politician_id: politicianId,
      p_max_per_party: 4,
    })

  const diversity = diversityRows?.[0]
  if (diversity && !diversity.allowed) {
    return {
      success: false,
      error: `Coalition rule: you already have 4 ${diversity.party_abbr} politicians. Maximum 4 per party — your cabinet must represent at least 3 parties.`,
    }
  }

  // Fetch the politician's current party (snapshot at draft time)
  const { data: politician } = await supabase
    .from('politicians')
    .select('current_party_id, office_status')
    .eq('id', politicianId)
    .single()

  if (!politician) return { success: false, error: 'Politician not found' }

  // Former politicians (no longer serving in any capacity) cannot be drafted.
  // Opposition politicians CAN be drafted but cannot hold ministry positions.
  if (politician.office_status === 'former') {
    return { success: false, error: 'This politician is no longer in any elected capacity' }
  }

  // Draft them
  const { error } = await supabase.from('roster_slots').insert({
    cabinet_id:       cabinetId,
    politician_id:    politicianId,
    party_at_draft_id: politician.current_party_id,  // Immutable snapshot
  })

  if (error) {
    console.error('[draftPolitician]', error)
    return { success: false, error: 'Failed to draft — please try again' }
  }

  revalidatePath('/card-bank')
  revalidatePath('/cabinet')
  return { success: true, message: 'Added to roster' }
}

/**
 * Drop a politician from the roster.
 * Soft-delete: sets is_active=false, records dropped_at.
 * Only allowed during a transfer window for cabinet-position players.
 */
export async function dropPolitician(
  slotId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('roster_slots')
    .update({
      is_active:  false,
      dropped_at: new Date().toISOString(),
    })
    .eq('id', slotId)
    // RLS ensures only owner can update their own slots

  if (error) return { success: false, error: 'Failed to drop politician' }

  revalidatePath('/cabinet')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Assign a politician to a cabinet position.
 * Clears any existing assignment for that position first.
 * Only in_office politicians can hold ministry positions (not bench).
 * Opposition politicians remain on bench only.
 */
export async function assignPosition(
  slotId: string,
  position: CabinetPosition | null,
  cabinetId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Bug 1 fix: if assigning to a real position (not bench/null),
  // verify the politician is in_office — opposition MPs cannot hold ministries
  if (position && position !== 'bench') {
    const { data: slotWithPol } = await supabase
      .from('roster_slots')
      .select('id, politicians!politician_id(office_status)')
      .eq('id', slotId)
      .single()

    const officeStatus = (slotWithPol?.politicians as any)?.office_status
    if (officeStatus && officeStatus !== 'in_office') {
      return {
        success: false,
        error: 'Opposition politicians cannot hold ministry positions. They score points from the bench.',
      }
    }
  }

  // If assigning to a position (not clearing), clear it from any other slot first
  if (position && position !== 'bench') {
    await supabase
      .from('roster_slots')
      .update({ cabinet_position: null, position_assigned_at: null })
      .eq('cabinet_id', cabinetId)
      .eq('cabinet_position', position)
      .eq('is_active', true)
  }

  // Compute multiplier
  const multiplier = computePositionMultiplier(position)

  const { error } = await supabase
    .from('roster_slots')
    .update({
      cabinet_position:     position,
      position_multiplier:  multiplier,
      position_assigned_at: position ? new Date().toISOString() : null,
    })
    .eq('id', slotId)

  if (error) return { success: false, error: 'Failed to assign position' }

  // Mark onboarding complete once all 12 positions are filled for the first time
  const { count } = await supabase
    .from('roster_slots')
    .select('id', { count: 'exact', head: true })
    .eq('cabinet_id', cabinetId)
    .eq('is_active', true)
    .not('cabinet_position', 'is', null)
    .neq('cabinet_position', 'bench')

  if ((count ?? 0) >= 12) {
    await supabase
      .from('users')
      .update({ onboarding_complete: true })
      .eq('id', user.id)
      .eq('onboarding_complete', false) // only write if not already set
  }

  revalidatePath('/cabinet')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Join a private league by invite code.
 */
export async function joinLeagueByCode(
  cabinetId: string,
  inviteCode: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Find league
  const { data: league } = await supabase
    .from('leagues')
    .select('id, max_members')
    .eq('invite_code', inviteCode.toUpperCase())
    .single()

  if (!league) return { success: false, error: 'Invalid invite code' }

  // Check member limit
  if (league.max_members) {
    const { count } = await supabase
      .from('league_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', league.id)

    if ((count ?? 0) >= league.max_members) {
      return { success: false, error: 'League is full' }
    }
  }

  const { error } = await supabase
    .from('league_memberships')
    .insert({ league_id: league.id, cabinet_id: cabinetId })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Already in this league' }
    return { success: false, error: 'Failed to join league' }
  }

  revalidatePath('/leagues')
  return { success: true, message: 'Joined league' }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computePositionMultiplier(position: CabinetPosition | null): number {
  if (!position) return 1.0
  if (position === 'pm_cm') return 1.5
  // All other positions: 1.0 base (anchor match computed by E4, not here)
  return 1.0
}
