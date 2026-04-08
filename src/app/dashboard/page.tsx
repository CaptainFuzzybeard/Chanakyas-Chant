import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCabinets, getEnrichedCabinet, getCabinetLeagues, getLeagueLeaderboard } from '@/lib/queries/cabinet'
import { CABINET_POSITIONS, POSITION_LABELS, POSITION_MULTIPLIERS } from '@/types/database'
import type { RosterSlotEnriched, CabinetPosition } from '@/types/database'
import { WeeklyMovers } from '@/components/discovery/WeeklyMovers'
import { DashboardSlot } from '@/components/dashboard/DashboardSlot'
import { DashboardTutorial } from '@/components/dashboard/DashboardTutorial'
import { LiveCabinetScore } from '@/components/dashboard/LiveCabinetScore'
import { ArthashastraQuote } from '@/components/ui/ArthashastraQuote'
import { InfoPop, INFO } from '@/components/ui/InfoPop'
import { getCurrentGameweek, getCurrentSeason } from '@/lib/utils/gameweek'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [cabinets, profile] = await Promise.all([
    getUserCabinets(),
    supabase.from('users').select('party_name').eq('id', user.id).single().then(r => r.data),
  ])

  if (!cabinets.length) redirect('/onboarding')

  const cabinet = cabinets[0]
  const [enriched, leagues] = await Promise.all([
    getEnrichedCabinet(cabinet.id),
    getCabinetLeagues(cabinet.id),
  ])

  // Fetch actionable data for alert banners
  const [transferWindowsResult, pendingCoalitionResult] = await Promise.all([
    supabase.rpc('get_active_transfer_windows', { p_cabinet_id: cabinet.id }),
    supabase
      .from('coalitions')
      .select('id, name, proposer_cabinet_id, cabinets!proposer_cabinet_id(users(party_name))')
      .eq('acceptor_cabinet_id', cabinet.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle(),
  ])
  const transferWindows = transferWindowsResult.data ?? []

  // Supabase foreign-key joins always return arrays. Normalise to the shape
  // the rest of the component expects: cabinets as a single object, not an array.
  type PendingCoalition = {
    id: string
    name: string
    cabinets: { users: { party_name: string } | null } | null
  }
  let pendingCoalition: PendingCoalition | null = null
  if (pendingCoalitionResult.data) {
    const raw = pendingCoalitionResult.data as {
      id: string
      name: string
      proposer_cabinet_id: string
      cabinets: { users: { party_name: string }[] }[]
    }
    const firstCabinet = raw.cabinets?.[0] ?? null
    const firstUser    = firstCabinet?.users?.[0] ?? null
    pendingCoalition = {
      id:       raw.id,
      name:     raw.name,
      cabinets: firstCabinet ? { users: firstUser } : null,
    }
  }


  const leaderboard = leagues.length > 0
    ? await getLeagueLeaderboard(leagues[0].league.id)
    : []

  // Gameweek quote — IST-correct, monotonic gameweek number
  const currentGameweek = getCurrentGameweek()
  const currentSeason   = getCurrentSeason()
  const { data: quoteRows } = await supabase.rpc('get_gameweek_quote', {
    p_gameweek: currentGameweek,
    p_season:   currentSeason,
  })
  const weekQuote = quoteRows?.[0] ?? null

  const rosterCount = enriched?.slots.length ?? 0
  const slotByPosition: Record<string, RosterSlotEnriched | undefined> = {}
  enriched?.slots.forEach(slot => {
    if (slot.cabinet_position) slotByPosition[slot.cabinet_position] = slot
  })

  const filledCount = enriched?.slots.filter(
    s => s.cabinet_position && s.cabinet_position !== 'bench'
  ).length ?? 0

  const score     = cabinet.cabinet_score
  const prevScore = cabinet.cabinet_score_prev_week ?? score
  const weekDelta = score - prevScore
  const myRank    = leaderboard.find(r => r.cabinet_id === cabinet.id)

  // Scope label for display
  const scopeLabel = cabinet.scope === 'national'
    ? 'Lok Sabha'
    : `Vidhan Sabha · ${cabinet.scope_state ?? ''}`

  return (
    <>
      <DashboardTutorial />
      <div className="layout-dashboard" style={{ display: 'grid', gridTemplateColumns: '1fr 308px', minHeight: 'calc(100vh - 88px)' }}>

      {/* ── Main ── */}
      <div style={{ padding: '24px', borderRight: '0.5px solid var(--bd0)', overflowY: 'auto' }}>

        {/* Cabinet header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
          <div>
            <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '24px', fontStyle: 'italic', fontWeight: 600, color: 'var(--t1)', lineHeight: 1.1, marginBottom: '3px' }}>
              {profile?.party_name ?? 'My Party'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
              {scopeLabel} ·{' '}
              <InfoPop {...INFO.cabinet_score}>
                <span style={{ color: 'var(--t2)' }}>{filledCount} / 12 positions filled</span>
              </InfoPop>
              {' '}· {rosterCount}/20 rostered · Season 1
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Cabinet Score — live via Realtime */}
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd-a)', borderRadius: '12px', padding: '11px 16px', textAlign: 'center', minWidth: '84px' }}>
              <InfoPop {...INFO.cabinet_score}>
                <div style={{ fontSize: '8.5px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '3px' }}>Cabinet Score</div>
              </InfoPop>
              <LiveCabinetScore cabinetId={cabinet.id} initialScore={Math.round(score)} />
              {weekDelta !== 0 && (
                <InfoPop {...INFO.composite_delta}>
                  <div style={{ fontSize: '9px', marginTop: '2px', fontFamily: '"DM Mono",monospace', color: weekDelta > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {weekDelta > 0 ? '▲' : '▼'} {Math.abs(weekDelta).toLocaleString()} this week
                  </div>
                </InfoPop>
              )}
            </div>
            {/* League rank — static, updates at rank lock */}
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '12px', padding: '11px 16px', textAlign: 'center', minWidth: '84px' }}>
              <InfoPop {...INFO.rank_delta}>
                <div style={{ fontSize: '8.5px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '3px' }}>{scopeLabel} Rank</div>
              </InfoPop>
              <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '20px', fontWeight: 500, color: 'var(--t1)', lineHeight: 1 }}>
                {myRank ? `#${myRank.rank}` : '—'}
              </div>
              {myRank?.rank_delta != null && myRank.rank_delta !== 0 && (
                <div style={{ fontSize: '9px', marginTop: '2px', fontFamily: '"DM Mono",monospace', color: myRank.rank_delta > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {myRank.rank_delta > 0 ? '▲' : '▼'} {Math.abs(myRank.rank_delta)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Actionable alert banners ── */}

        {pendingCoalition && (
          <div style={{ background: 'rgba(201,148,26,.08)', border: '0.5px solid var(--bd-a)', borderRadius: '12px', padding: '12px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '18px', flexShrink: 0 }}>🤝</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>
                Coalition proposal from {(pendingCoalition.cabinets as any)?.users?.party_name ?? 'another player'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--t2)' }}>
                They want to form &ldquo;{pendingCoalition.name}&rdquo; — accept or decline in Leagues.
              </div>
            </div>
            <a href="/leagues" style={{ background: 'var(--amber)', color: '#000', fontWeight: 600, fontSize: '11.5px', border: 'none', borderRadius: '8px', padding: '7px 13px', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: '"DM Sans",sans-serif', flexShrink: 0 }}>
              Review →
            </a>
          </div>
        )}

        {transferWindows.length > 0 && (
          <div style={{ background: 'rgba(192,57,43,.06)', border: '0.5px solid rgba(192,57,43,.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <InfoPop {...INFO.transfer_window} inline={false}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--red)', letterSpacing: '.06em' }}>
                  ⚡ Emergency Transfer Window{transferWindows.length > 1 ? 's' : ''} Open
                </div>
              </InfoPop>
              <a href="/cabinet" style={{ fontSize: '11px', color: 'var(--amber)', textDecoration: 'none', fontFamily: '"DM Sans",sans-serif' }}>Go to Cabinet →</a>
            </div>
            {transferWindows.map((tw: any) => (
              <div key={tw.politician_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderTop: '0.5px solid rgba(192,57,43,.12)' }}>
                <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{tw.politician_name}</span>
                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{tw.from_party_abbr} → {tw.to_party_abbr}</span>
                <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10.5px', color: 'var(--red)' }}>{Number(tw.hours_remaining).toFixed(0)}h left</span>
              </div>
            ))}
          </div>
        )}

        {rosterCount === 0 && (
          <div style={{ background: 'var(--amber-g)', border: '0.5px solid var(--bd-a)', borderRadius: '14px', padding: '20px 22px', marginBottom: '16px' }}>
            <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700, color: 'var(--t1)', marginBottom: '6px' }}>👋 Welcome to Chanakya&apos;s Chant</div>
            <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '14px' }}>
              Draft at least <strong style={{ color: 'var(--t1)' }}>12 politicians</strong> from the Card Bank, then assign ministry positions here. Your score goes live once all 12 slots are filled.
            </div>
            <a href="/card-bank" style={{ display: 'inline-block', background: 'var(--amber-b)', color: 'white', fontWeight: 600, fontSize: '13px', border: 'none', borderRadius: '9px', padding: '9px 18px', textDecoration: 'none', fontFamily: '"DM Sans",sans-serif' }}>Go to Card Bank →</a>
          </div>
        )}

        {rosterCount > 0 && filledCount === 0 && (
          <div style={{ background: 'var(--amber-g)', border: '0.5px solid var(--bd-a)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '18px' }}>🏛</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>Assign your politicians to ministries</div>
              <div style={{ fontSize: '11.5px', color: 'var(--t2)' }}>You have {rosterCount} politicians rostered. Head to Cabinet Builder to assign all 12 positions and go live.</div>
            </div>
            <a href="/cabinet" style={{ background: 'var(--amber)', color: '#000', fontWeight: 600, fontSize: '12px', border: 'none', borderRadius: '8px', padding: '8px 14px', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: '"DM Sans",sans-serif', flexShrink: 0 }}>Build Cabinet →</a>
          </div>
        )}

        {filledCount > 0 && filledCount < 12 && (
          <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, fontSize: '11.5px', color: 'var(--t2)' }}>
              <InfoPop {...INFO.multiplier_empty} inline={false}>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>{12 - filledCount} empty</span>
              </InfoPop> ministry slots currently scoring 0.
            </div>
            <a href="/cabinet" style={{ fontSize: '11px', color: 'var(--amber)', textDecoration: 'none', fontFamily: '"DM Sans",sans-serif', whiteSpace: 'nowrap' }}>Fill remaining →</a>
          </div>
        )}

        {/* Cabinet grid */}
        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '12px' }}>Active Cabinet</div>

        <div className="layout-ministry-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '28px' }}>
          {CABINET_POSITIONS.map(pos => {
            const slot  = slotByPosition[pos]
            const isCap = pos === 'pm_cm'

            if (!slot) {
              return (
                <a key={pos} href="/cabinet" style={{ background: 'var(--bg2)', border: '0.5px dashed var(--bd0)', borderRadius: '12px', padding: '9px 10px 8px', minHeight: '86px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', opacity: 0.45, textDecoration: 'none', cursor: 'pointer' }}>
                  <div style={{ fontSize: '14px', color: 'var(--t3)', opacity: 0.4 }}>+</div>
                  <div style={{ fontSize: '8.5px', color: 'var(--t3)' }}>{POSITION_LABELS[pos]}</div>
                </a>
              )
            }

            return (
              <DashboardSlot key={pos} pos={pos as CabinetPosition} slot={slot} isCap={isCap} />
            )
          })}
        </div>

        {/* Weekly movers — the Monday hook */}
        <WeeklyMovers />

        {/* Arthashastra quote — keyed to dominant news theme of the week */}
        {weekQuote && (
          <ArthashastraQuote
            quote={weekQuote.quote}
            book={weekQuote.book}
            theme={weekQuote.theme}
          />
        )}
      </div>

      {/* ── Sidebar ── */}
      <div style={{ padding: '22px 18px', background: 'var(--bg1)', overflowY: 'auto' }}>
        <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          My Leagues
          <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
        </div>

        {leagues.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--t3)', fontStyle: 'italic', marginBottom: '18px' }}>No leagues yet — join one in the Leagues tab.</div>
        ) : leagues.map(({ league, membership }) => (
          <div key={league.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '12px', padding: '13px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '2px' }}>{league.name}</div>
            {membership.current_rank && (
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '28px', fontStyle: 'italic', fontWeight: 700, color: 'var(--amber-b)', lineHeight: 1 }}>
                  #{membership.current_rank}
                </div>
                {membership.rank_delta !== 0 && (
                  <div style={{ fontSize: '10.5px', fontFamily: '"DM Mono",monospace', color: membership.rank_delta > 0 ? 'var(--green)' : 'var(--red)', background: membership.rank_delta > 0 ? 'rgba(78,158,110,.1)' : 'rgba(168,50,50,.1)', padding: '2px 6px', borderRadius: '3px' }}>
                    {membership.rank_delta > 0 ? '▲' : '▼'} {Math.abs(membership.rank_delta)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Leaderboard preview */}
        {leaderboard.length > 0 && (
          <>
            <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px', marginTop: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Top 5
              <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
            </div>
            {leaderboard.slice(0, 5).map(row => {
              const isMe = row.cabinet_id === cabinet.id
              return (
                <div key={row.cabinet_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '0.5px solid var(--bd0)', fontSize: '11px' }}>
                  <div style={{ fontFamily: '"DM Mono",monospace', color: isMe ? 'var(--amber)' : 'var(--t3)', width: '18px', fontSize: '9.5px', fontWeight: isMe ? 700 : 400 }}>{row.rank}</div>
                  <div style={{ flex: 1, color: isMe ? 'var(--t1)' : 'var(--t2)', fontWeight: isMe ? 500 : 400 }}>
                    {row.party_name} {isMe && '(You)'}
                  </div>
                  <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '10.5px', color: isMe ? 'var(--amber-b)' : 'var(--t3)' }}>
                    {row.cabinet_score.toLocaleString('en-IN')}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Rank lock countdown */}
        <div style={{ marginTop: '16px', background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <InfoPop {...INFO.rank_lock}>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>Rank locks Sunday midnight IST</div>
          </InfoPop>
          {/* WhatsApp share — core viral loop for India */}
          <button
            onClick={() => {
              const text = `My cabinet scored ${Math.round(score).toLocaleString('en-IN')} this week on Chanakya's Chant 🏛️ — the Indian politics fantasy league. Join me: https://chanakyas-chant.in`
              const url = `https://wa.me/?text=${encodeURIComponent(text)}`
              window.open(url, '_blank', 'noopener')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: '#25D366', color: '#fff',
              border: 'none', borderRadius: '8px',
              padding: '5px 10px', cursor: 'pointer',
              fontSize: '10.5px', fontWeight: 600,
              fontFamily: '"DM Sans",sans-serif',
              marginTop: '4px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.524 5.855L.057 23.882l6.154-1.612A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.369l-.359-.214-3.725.978.994-3.629-.234-.374A9.818 9.818 0 1112 21.818z"/>
            </svg>
            Share on WhatsApp
          </button>
          <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '12px', fontWeight: 500, color: 'var(--t2)' }}>
            5d 14h
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
