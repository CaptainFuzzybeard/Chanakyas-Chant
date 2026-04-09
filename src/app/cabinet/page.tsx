import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCabinets, getEnrichedCabinet } from '@/lib/queries/cabinet'
import { getUserStakesForGameweek, getHerdSummary } from '@/lib/actions/conviction'
import { CabinetBuilderClient } from './CabinetBuilderClient'
import { isStakingOpen, getCurrentGameweek, getCurrentSeason } from '@/lib/utils/gameweek'

export default async function CabinetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cabinets = await getUserCabinets()
  if (!cabinets.length) redirect('/onboarding')

  const cabinet  = cabinets[0]
  const enriched = await getEnrichedCabinet(cabinet.id)
  if (!enriched) redirect('/dashboard')

  const gameweek = getCurrentGameweek()
  const season   = getCurrentSeason()
  const stakingWindowOpen = isStakingOpen()

  // Collect all politician IDs in the roster for herd lookup
  const rosterPolIds = enriched.slots
    .map(s => s.politician?.id)
    .filter((id): id is string => Boolean(id))

  const [
    { data: transferWindows },
    { data: partyBreakdown },
    existingStakes,
    herdData,
  ] = await Promise.all([
    supabase.rpc('get_active_transfer_windows', { p_cabinet_id: cabinet.id }),
    supabase.rpc('get_roster_party_breakdown',  { p_cabinet_id: cabinet.id }),
    getUserStakesForGameweek(gameweek, season),
    getHerdSummary(rosterPolIds, gameweek, season),
  ])

  return (
    <CabinetBuilderClient
      cabinetId={cabinet.id}
      cabinetScore={cabinet.cabinet_score}
      slots={enriched.slots}
      transferWindows={transferWindows ?? []}
      partyBreakdown={partyBreakdown ?? []}
      gameweek={gameweek}
      season={season}
      existingStakes={existingStakes}
      herdData={herdData}
      stakingOpen={stakingWindowOpen}
    />
  )
}
