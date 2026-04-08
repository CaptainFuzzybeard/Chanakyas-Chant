import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPoliticianCards, getAllParties, getRosterPoliticianIds } from '@/lib/queries/politicians'
import { getUserCabinets } from '@/lib/queries/cabinet'
import { CardBankClient } from './CardBankClient'

interface CardBankPageProps {
  searchParams: Promise<{
    search?:      string
    status?:      string   // comma-separated
    parties?:     string   // comma-separated abbreviations
    min?:         string   // min score
    sort?:        string
    page?:        string
    onboarding?:  string   // '1' when coming from onboarding flow
  }>
}

export default async function CardBankPage({ searchParams }: CardBankPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const page   = Math.max(0, parseInt(params.page ?? '0'))
  const limit  = 24
  const offset = page * limit

  // Parse filters from URL
  const statusList  = params.status  ? (params.status.split(',')  as any[]) : ['in_office']
  const partyList   = params.parties ? params.parties.split(',') : []
  const minScore    = parseInt(params.min ?? '0') || 0
  const ALLOWED_SORTS = ['score_desc','score_asc','rising','holders'] as const
  const sort = (ALLOWED_SORTS.includes(params.sort as any) ? params.sort : 'score_desc') as typeof ALLOWED_SORTS[number]

  const [{ cards, total }, allParties, cabinets] = await Promise.all([
    getPoliticianCards({
      search:     params.search,
      status:     statusList,
      party_abbr: partyList.length ? partyList : undefined,
      min_score:  minScore,
      sort,
      limit,
      offset,
    }),
    getAllParties(),
    getUserCabinets(),
  ])

  // Which politicians are already in the user's roster?
  const rosterIds = cabinets.length
    ? await getRosterPoliticianIds(cabinets[0].id)
    : new Set<string>()

  // Which parties are at the 4-player cap? Used to pre-flag cards before drafting.
  const cappedParties = new Set<string>()
  if (cabinets[0]?.id) {
    const { data: partyRows } = await supabase
      .rpc('get_roster_party_breakdown', { p_cabinet_id: cabinets[0].id })
    for (const row of partyRows ?? []) {
      if (row.is_maxed) cappedParties.add(row.party_abbr)
    }
  }

  return (
    <CardBankClient
      initialCards={cards}
      total={total}
      allParties={allParties}
      rosterIds={Array.from(rosterIds)}
      cabinetId={cabinets[0]?.id ?? null}
      isFirstTime={params.onboarding === '1'}
      cabinetScope={cabinets[0]?.scope ?? 'national'}
      cabinetScopeState={cabinets[0]?.scope_state ?? null}
      cappedParties={Array.from(cappedParties)}
      initialFilters={{
        search:  params.search ?? '',
        status:  statusList,
        parties: partyList,
        min:     minScore,
        sort,
      }}
    />
  )
}
