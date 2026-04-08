'use client'
import { InfoPop, INFO } from '@/components/ui/InfoPop'

import { useState, useTransition } from 'react'
import type { League, LeagueMembership, CabinetRankingRow, MyCoalition, CoalitionLeaderboardRow } from '@/types/database'
import { joinLeagueByCode } from '@/lib/actions/roster'
import { CreateLeagueModal } from '@/components/leagues/CreateLeagueModal'
import { CoalitionPanel } from '@/components/leagues/CoalitionPanel'
import { FirstTimeTutorial } from '@/components/ui/FirstTimeTutorial'

interface LeaguesClientProps {
  myLeagues:            Array<{ league: League; membership: LeagueMembership }>
  leaderboardMap:       Record<string, CabinetRankingRow[]>
  cabinetId:            string
  myCabinetScore:       number
  subscriptionTier:     string
  partyName:            string
  myCoalition:          MyCoalition | null
  coalitionLeaderboard: CoalitionLeaderboardRow[]
}

export function LeaguesClient({
  myLeagues,
  leaderboardMap,
  cabinetId,
  myCabinetScore,
  subscriptionTier,
  partyName,
  myCoalition,
  coalitionLeaderboard,
}: LeaguesClientProps) {
  const [activeLeagueIdx, setActiveLeagueIdx] = useState(0)
  const [inviteCode, setInviteCode] = useState('')
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const safeIdx     = Math.min(activeLeagueIdx, Math.max(0, myLeagues.length - 1))
  const activeLeague = myLeagues[safeIdx]
  const leaderboard  = activeLeague ? leaderboardMap[activeLeague.league.id] ?? [] : []

  async function handleJoin() {
    if (!inviteCode.trim() || !cabinetId) return
    startTransition(async () => {
      const result = await joinLeagueByCode(cabinetId, inviteCode.trim())
      setJoinMsg({ ok: result.success, text: result.success ? 'Joined!' : (result as any).error })
      if (result.success) setInviteCode('')
    })
  }

  return (
    <>
      <FirstTimeTutorial page="leagues" visible={true} onDone={() => {}} />
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '28px 28px 60px' }}>

      {/* My leagues grid */}
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '12px' }}>
        Active Leagues
      </div>

      {/* Prompt to join/create a private league if user is only in public leagues */}
      {myLeagues.filter(l => l.league.league_type !== 'public').length === 0 && (
        <div style={{
          background: 'var(--bg2)', border: '0.5px dashed var(--bd0)',
          borderRadius: '12px', padding: '14px 16px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', marginBottom: '2px' }}>
              No private leagues yet
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--t3)' }}>
              Play against friends — create a league or enter an invite code below
            </div>
          </div>
          <span style={{ fontSize: '18px' }}>🏆</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '30px' }}>
        {myLeagues.map(({ league, membership }, i) => (
          <button
            key={league.id}
            onClick={() => setActiveLeagueIdx(i)}
            style={{
              background: 'var(--bg1)',
              border: `0.5px solid ${i === safeIdx ? 'var(--bd-a)' : 'var(--bd0)'}`,
              borderRadius: '14px',
              padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.12s',
              fontFamily: '"DM Sans",sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '6px' }}>
              <span style={{
                fontSize: '8px',
                padding: '1px 5px',
                borderRadius: '2px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                background: league.league_type === 'public' ? 'rgba(78,158,110,.13)' : 'rgba(60,110,180,.13)',
                color: league.league_type === 'public' ? 'rgba(100,210,150,.85)' : 'rgba(120,170,224,.85)',
              }}>
                {league.league_type === 'public' ? 'Public' : 'Private'}
              </span>
              {league.scope === 'state' ? league.scope_state : 'National'}
            </div>
            <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '14.5px', fontWeight: 600, color: 'var(--t1)', marginBottom: '9px', lineHeight: 1.2 }}>
              {league.name}
            </div>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '9px' }}>
              {membership.current_rank && (
                <div>
                  <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '22px', fontStyle: 'italic', fontWeight: 700, color: 'var(--amber-b)', lineHeight: 1 }}>
                    #{membership.current_rank}
                  </div>
                  <div style={{ fontSize: '8.5px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '1px' }}>Rank</div>
                </div>
              )}
              {membership.rank_delta !== 0 && (
                <div>
                  <InfoPop {...INFO.rank_delta}>
                    <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '18px', fontWeight: 500, color: membership.rank_delta > 0 ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
                      {membership.rank_delta > 0 ? '▲' : '▼'}{Math.abs(membership.rank_delta)}
                    </div>
                  </InfoPop>
                  <div style={{ fontSize: '8.5px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '1px' }}>This week</div>
                </div>
              )}
            </div>
            <div style={{ height: '0.5px', background: 'var(--bd0)', marginBottom: '9px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--t3)' }}>
              <span>Score: <span style={{ color: 'var(--t2)' }}>{myCabinetScore.toLocaleString('en-IN')}</span></span>
              {league.invite_code && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Code:
                  <span style={{ fontFamily: '"DM Mono",monospace', letterSpacing: '0.1em', color: 'var(--t2)' }}>
                    {league.invite_code}
                  </span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        await navigator.clipboard.writeText(league.invite_code ?? '')
                        const el = e.currentTarget as HTMLButtonElement
                        el.textContent = '✓'
                        setTimeout(() => { el.textContent = 'Copy' }, 1500)
                      } catch {}
                    }}
                    style={{
                      fontSize: '8px', fontWeight: 700, padding: '2px 6px',
                      borderRadius: '3px', border: '0.5px solid var(--bd0)',
                      background: 'var(--bg3)', color: 'var(--t3)',
                      cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                      letterSpacing: '.06em', textTransform: 'uppercase',
                    }}
                  >Copy</button>
                </span>
              )}
            </div>
          </button>
        ))}

        {/* Empty slot */}
        <div style={{ background: 'var(--bg1)', border: '0.5px dashed var(--bd0)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '120px', opacity: 0.45 }}>
          <div style={{ fontSize: '20px', color: 'var(--t3)', opacity: 0.3 }}>+</div>
          <div style={{ fontSize: '11px', color: 'var(--t3)' }}>Join or create a private league</div>
        </div>
      </div>

      {/* Active leaderboard */}
      {activeLeague && leaderboard.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)' }}>
              {activeLeague.league.name} — Leaderboard
            </div>
            <div style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: '"DM Mono",monospace' }}>
              Rank lock: Mon 00:00 IST
            </div>
          </div>

          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', overflow: 'hidden', marginBottom: '28px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 110px 90px', padding: '8px 16px', borderBottom: '0.5px solid var(--bd0)', background: 'var(--bg2)' }}>
              {['Rank', 'Party', 'Score', 'This Week'].map((h, i) => (
                <div key={h} style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', textAlign: i > 1 ? 'right' : 'left' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Top 3 */}
            {leaderboard.slice(0, 3).map(row => renderRow(row, cabinetId, partyName))}

            {/* Ellipsis if user not in top 3 */}
            {activeLeague.membership.current_rank && activeLeague.membership.current_rank > 3 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 16px', fontSize: '10px', color: 'var(--t3)', fontFamily: '"DM Mono",monospace', gap: '8px' }}>
                  <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
                  Ranks 4 – {activeLeague.membership.current_rank - 1}
                  <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
                </div>
                {/* User's row */}
                {leaderboard.find(r => r.cabinet_id === cabinetId) &&
                  renderRow(leaderboard.find(r => r.cabinet_id === cabinetId)!, cabinetId, partyName)}
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 16px', fontSize: '10px', color: 'var(--t3)', fontFamily: '"DM Mono",monospace', gap: '8px' }}>
                  <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
                  Ranks {(activeLeague.membership.current_rank ?? 0) + 1} – {leaderboard.length}
                  <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Coalition section */}
      {activeLeague && (
        <>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '14px', marginTop: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Coalitions
            <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
            <span style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              Partner with another player · scores averaged
            </span>
          </div>
          <CoalitionPanel
            cabinetId={cabinetId}
            leagueId={activeLeague.league.id}
            myCoalition={myCoalition}
            coalitionLeaderboard={coalitionLeaderboard}
            leagueLeaderboard={leaderboard}
            myPartyName={partyName}
          />
        </>
      )}

      {/* Private league join / create */}
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Private Leagues
        <span style={{ fontSize: '11px', color: 'var(--amber)', cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>Create a league →</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {/* Join */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: '5px' }}>Join a Private League</div>
          <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5, marginBottom: '14px' }}>
            Enter the 6-character invite code shared by your league admin.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABCD12"
              maxLength={6}
              style={{
                flex: 1,
                background: 'var(--bg2)',
                border: '0.5px solid var(--bd0)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontFamily: '"DM Mono",monospace',
                fontSize: '16px',
                letterSpacing: '0.18em',
                color: 'var(--t1)',
                textTransform: 'uppercase',
                outline: 'none',
              }}
            />
            <button
              onClick={handleJoin}
              disabled={inviteCode.length < 6 || isPending}
              style={{
                background: 'var(--amber)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: '"DM Sans",sans-serif',
                opacity: inviteCode.length < 6 || isPending ? 0.5 : 1,
              }}
            >
              {isPending ? '…' : 'Join'}
            </button>
          </div>
          {joinMsg && (
            <div style={{ fontSize: '11px', marginTop: '6px', color: joinMsg.ok ? 'var(--green)' : 'var(--red)' }}>
              {joinMsg.text}
            </div>
          )}
        </div>

        {/* Create — Pro gate */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: '5px' }}>Create a Private League</div>
          <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5, marginBottom: '14px' }}>
            Start a league with friends. Up to 50 members. Pro feature.
          </div>
          {subscriptionTier === 'free' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 11px', background: 'var(--amber-g)', border: '0.5px solid var(--bd-a)', borderRadius: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--amber)', flex: 1 }}>⚡ Chanakya Pro — ₹99/month</span>
              <span style={{ fontSize: '11px', color: 'var(--amber-b)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Upgrade →</span>
            </div>
          )}
          <CreateLeagueModal
            cabinetId={cabinetId}
            subscriptionTier={subscriptionTier}
          />
        </div>
      </div>
    </div>
    </>
  )
}

function renderRow(row: CabinetRankingRow, myCabinetId: string, myPartyName: string) {
  const isMe = row.cabinet_id === myCabinetId
  return (
    <div
      key={row.cabinet_id}
      style={{
        display: 'grid',
        gridTemplateColumns: '52px 1fr 110px 90px',
        padding: '9px 16px',
        borderBottom: '0.5px solid var(--bd0)',
        alignItems: 'center',
        background: isMe ? 'var(--amber-g)' : undefined,
        borderLeft: isMe ? '2px solid var(--amber)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '12px', fontWeight: 500, color: row.rank <= 3 ? 'var(--amber-b)' : isMe ? 'var(--amber-b)' : 'var(--t3)' }}>
          {row.rank}
        </span>
        {row.rank_delta !== 0 && (
          <InfoPop {...INFO.rank_delta}>
            <span style={{ fontSize: '9px', fontFamily: '"DM Mono",monospace', color: row.rank_delta > 0 ? 'var(--green)' : 'var(--red)', minWidth: '22px' }}>
              {row.rank_delta > 0 ? '▲' : '▼'}{Math.abs(row.rank_delta)}
            </span>
          </InfoPop>
        )}
      </div>
      <div style={{ fontSize: '12.5px', fontWeight: 500, color: isMe ? 'var(--amber-b)' : 'var(--t2)' }}>
        {isMe ? myPartyName : row.party_name}
        {isMe && <span style={{ fontSize: '10px', color: 'var(--amber-d)', marginLeft: '4px' }}>(You)</span>}
      </div>
      <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '12.5px', color: isMe ? 'var(--amber)' : 'var(--t2)', textAlign: 'right' }}>
        {row.cabinet_score.toLocaleString('en-IN')}
      </div>
      <div style={{ textAlign: 'right' }}>—</div>
    </div>
  )
}
