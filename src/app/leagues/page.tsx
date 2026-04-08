import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCabinets, getCabinetLeagues, getLeagueLeaderboard } from '@/lib/queries/cabinet'
import { LeaguesClient } from './LeaguesClient'

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cabinets = await getUserCabinets()
  if (!cabinets.length) redirect('/onboarding')

  const cabinet   = cabinets[0]
  const myLeagues = await getCabinetLeagues(cabinet.id)

  const leaderboards = await Promise.all(
    myLeagues.slice(0, 3).map(async ({ league }) => ({
      leagueId: league.id,
      rows:     await getLeagueLeaderboard(league.id),
    }))
  )
  const leaderboardMap = Object.fromEntries(leaderboards.map(l => [l.leagueId, l.rows]))

  // Coalition data for the first league
  const firstLeagueId = myLeagues[0]?.league.id ?? null
  let myCoalition          = null
  let coalitionLeaderboard = []

  if (firstLeagueId) {
    const [coalResult, coalLbResult] = await Promise.all([
      supabase.rpc('get_my_coalition', { p_cabinet_id: cabinet.id }),
      supabase.rpc('get_coalition_leaderboard', { p_league_id: firstLeagueId }),
    ])
    myCoalition          = coalResult.data?.[0]  ?? null
    coalitionLeaderboard = coalLbResult.data      ?? []
  }

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier, party_name')
    .eq('id', user.id)
    .single()

  return (
    <LeaguesClient
      myLeagues={myLeagues}
      leaderboardMap={leaderboardMap}
      cabinetId={cabinet.id}
      myCabinetScore={cabinet.cabinet_score}
      subscriptionTier={profile?.subscription_tier ?? 'free'}
      partyName={profile?.party_name ?? ''}
      myCoalition={myCoalition}
      coalitionLeaderboard={coalitionLeaderboard}
    />
  )
}
