/**
 * lib/actions/onboarding.ts
 *
 * Server Action for onboarding completion.
 *
 * Uses the service-role client for the users upsert because the anon key
 * hits an RLS permission error on INSERT when the row doesn't exist yet.
 * Identity is verified first via auth.getUser() with the anon client —
 * the service role is only used after we know who the user is.
 */

'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export type OnboardingResult =
  | { success: true }
  | { success: false; error: string }

export async function completeOnboarding(
  partyName: string,
  scope: 'national' | 'state',
  scopeState: string | null,
): Promise<OnboardingResult> {
  // 1. Verify identity using the cookie-based anon client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated. Please log in again.' }
  }

  // 2. Use service role for all writes — bypasses RLS safely since
  //    we've already confirmed the user's identity above.
  const admin = createServiceClient()

  // Guard: if cabinet already exists, just update party name and proceed
  const { count: existingCount } = await admin
    .from('cabinets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if ((existingCount ?? 0) > 0) {
    await admin.from('users').upsert({
      id: user.id,
      party_name: partyName.trim(),
      onboarding_complete: false,
    })
    return { success: true }
  }

  // 3. Upsert user profile
  const { error: profileError } = await admin.from('users').upsert({
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

  // 4. Create the cabinet
  const { error: cabError } = await admin
    .from('cabinets')
    .insert({
      user_id:    user.id,
      scope,
      scope_state: scope === 'state' ? scopeState : null,
    })

  if (cabError) {
    return { success: false, error: `Could not create your cabinet: ${cabError.message}` }
  }

  return { success: true }
}
