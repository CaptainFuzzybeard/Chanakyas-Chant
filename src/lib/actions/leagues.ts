'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from './roster'

function generateInviteCode(): string {
  // 6 character alphanumeric, uppercase, unambiguous chars only (no 0/O/1/I/L)
  // Uses crypto.getRandomValues for cryptographic randomness (not Math.random)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

/**
 * Create a private league.
 * Pro users only. Max 3 private leagues per user.
 */
export async function createPrivateLeague(
  cabinetId:   string,
  leagueName:  string,
  maxMembers:  number = 50,
): Promise<ActionResult & { leagueId?: string; inviteCode?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Check Pro subscription
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier, subscription_expires_at')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_tier !== 'free' &&
    (profile?.subscription_expires_at == null ||
     new Date(profile.subscription_expires_at) > new Date())

  if (!isPro) {
    return { success: false, error: 'Creating private leagues requires Chanakya Pro' }
  }

  // Validate inputs
  const name = leagueName.trim()
  if (!name || name.length < 3) {
    return { success: false, error: 'League name must be at least 3 characters' }
  }
  if (name.length > 60) {
    return { success: false, error: 'League name must be 60 characters or fewer' }
  }
  if (maxMembers < 2 || maxMembers > 50) {
    return { success: false, error: 'Max members must be between 2 and 50' }
  }

  // Check max 3 private leagues per user
  const { count: existingCount } = await supabase
    .from('leagues')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .eq('league_type', 'private')

  if ((existingCount ?? 0) >= 3) {
    return { success: false, error: 'You can create up to 3 private leagues on Pro' }
  }

  // Verify cabinet belongs to user and get its scope
  const { data: cabinet } = await supabase
    .from('cabinets')
    .select('id, scope, scope_state')
    .eq('id', cabinetId)
    .eq('user_id', user.id)
    .single()

  if (!cabinet) return { success: false, error: 'Cabinet not found' }

  // Generate unique invite code (retry if collision)
  let inviteCode = generateInviteCode()
  let attempts = 0
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('leagues')
      .select('id')
      .eq('invite_code', inviteCode)
      .single()
    if (!existing) break
    inviteCode = generateInviteCode()
    attempts++
  }

  // Create the league
  const { data: league, error: createError } = await supabase
    .from('leagues')
    .insert({
      name:        name,
      league_type: 'private',
      scope:       cabinet.scope,
      scope_state: cabinet.scope_state ?? null,
      invite_code: inviteCode,
      created_by:  user.id,
      max_members: maxMembers,
      season:      1,
    })
    .select('id')
    .single()

  if (createError || !league) {
    console.error('[createPrivateLeague]', createError)
    return { success: false, error: 'Failed to create league — please try again' }
  }

  // Automatically join the creator
  await supabase
    .from('league_memberships')
    .insert({ league_id: league.id, cabinet_id: cabinetId })

  revalidatePath('/leagues')
  return { success: true, leagueId: league.id, inviteCode }
}

// ─────────────────────────────────────────────────────────────────────────────
// Coalition actions
// ─────────────────────────────────────────────────────────────────────────────

export type CoalitionResult =
  | { success: true; coalitionId?: string }
  | { success: false; error: string }

/** Propose a coalition to another cabinet in the same league */
export async function proposeCoalition(
  proposerCabinetId: string,
  acceptorCabinetId: string,
  leagueId:          string,
  coalitionName:     string,
): Promise<CoalitionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const name = coalitionName.trim()
  if (!name || name.length < 3)
    return { success: false, error: 'Coalition name must be at least 3 characters' }
  if (name.length > 60)
    return { success: false, error: 'Coalition name must be 60 characters or fewer' }

  const { data, error } = await supabase.rpc('propose_coalition', {
    p_proposer_cabinet_id: proposerCabinetId,
    p_acceptor_cabinet_id: acceptorCabinetId,
    p_league_id:           leagueId,
    p_name:                name,
  })

  if (error) {
    console.error('[proposeCoalition]', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leagues')
  return { success: true, coalitionId: data }
}

/** Accept a pending coalition proposal */
export async function acceptCoalition(coalitionId: string): Promise<CoalitionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase.rpc('accept_coalition', {
    p_coalition_id: coalitionId,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/leagues')
  return { success: true }
}

/** Dissolve or decline a coalition */
export async function dissolveCoalition(
  coalitionId: string,
  immediate:   boolean = false,
): Promise<CoalitionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase.rpc('dissolve_coalition', {
    p_coalition_id: coalitionId,
    p_immediate:    immediate,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/leagues')
  return { success: true }
}
