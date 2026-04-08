/**
 * lib/actions/onboarding.ts
 *
 * Server Action for onboarding completion.
 * Runs server-side so the cabinet insert and user upsert
 * execute in the same authenticated context, avoiding any
 * client-side RLS ambiguity on the .select() after insert.
 */

'use server'

import { createClient } from '@/lib/supabase/server'

export type OnboardingResult =
  | { success: true }
  | { success: false; error: string }

export async function completeOnboarding(
  partyName: string,
  scope: 'national' | 'state',
  scopeState: string | null,
): Promise<OnboardingResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated. Please log in again.' }
  }

  // Guard: if cabinet already exists, just update party name and proceed
  const { count: existingCount } = await supabase
    .from('cabinets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if ((existingCount ?? 0) > 0) {
    const { error: nameErr } = await supabase.from('users').upsert({
      id: user.id,
      party_name: partyName.trim(),
      onboarding_complete: false,
    })
    if (nameErr && nameErr.code !== '23505') {
      return { success: false, error: 'Could not save party name. Please try again.' }
    }
    return { success: true }
  }

  // 1. Upsert user profile
  const { error: profileError } = await supabase.from('users').upsert({
    id: user.id,
    party_name: partyName.trim(),
    onboarding_complete: false,
  })

  if (profileError) {
    if (profileError.code === '23505') {
      return { success: false, error: 'That party name is already taken — go back and pick another.' }
    }
    return { success: false, error: `Could not save your profile: ${profileError.message}` }
  }

  // 2. Create the cabinet
  const { error: cabError } = await supabase
    .from('cabinets')
    .insert({
      user_id: user.id,
      scope,
      scope_state: scope === 'state' ? scopeState : null,
    })

  if (cabError) {
    return { success: false, error: `Could not create your cabinet: ${cabError.message}` }
  }

  return { success: true }
}
