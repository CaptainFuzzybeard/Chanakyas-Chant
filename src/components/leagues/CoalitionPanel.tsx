'use client'

import { useState, useTransition } from 'react'
import type { MyCoalition, CoalitionLeaderboardRow, CabinetRankingRow } from '@/types/database'
import { proposeCoalition, acceptCoalition, dissolveCoalition } from '@/lib/actions/leagues'
import { InfoPop, INFO } from '@/components/ui/InfoPop'

interface CoalitionPanelProps {
  cabinetId:            string
  leagueId:             string
  myCoalition:          MyCoalition | null
  coalitionLeaderboard: CoalitionLeaderboardRow[]
  leagueLeaderboard:    CabinetRankingRow[]  // Individual players — to pick a partner from
  myPartyName:          string
}

export function CoalitionPanel({
  cabinetId,
  leagueId,
  myCoalition,
  coalitionLeaderboard,
  leagueLeaderboard,
  myPartyName,
}: CoalitionPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [showPropose, setShowPropose] = useState(false)
  const [coalitionName, setCoalitionName] = useState('')
  const [selectedPartner, setSelectedPartner] = useState<CabinetRankingRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handlePropose() {
    if (!selectedPartner || !coalitionName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await proposeCoalition(
        cabinetId,
        selectedPartner.cabinet_id,
        leagueId,
        coalitionName,
      )
      if (result.success) {
        setSuccessMsg(`Coalition proposal sent to ${selectedPartner.party_name}!`)
        setShowPropose(false)
        setCoalitionName('')
        setSelectedPartner(null)
      } else {
        setError((result as any).error)
      }
    })
  }

  function handleAccept() {
    if (!myCoalition) return
    startTransition(async () => {
      const result = await acceptCoalition(myCoalition.coalition_id)
      if (!result.success) setError((result as any).error)
    })
  }

  function handleDissolve(immediate: boolean) {
    if (!myCoalition) return
    const msg = immediate
      ? 'Dissolve coalition immediately? This cannot be undone.'
      : 'Schedule coalition dissolution at next rank lock (Monday midnight)?'
    if (!confirm(msg)) return
    startTransition(async () => {
      const result = await dissolveCoalition(myCoalition.coalition_id, immediate)
      if (!result.success) setError((result as any).error)
    })
  }

  // Filter out own cabinet from potential partners
  const potentialPartners = leagueLeaderboard.filter(r => r.cabinet_id !== cabinetId)

  const s: React.CSSProperties = {
    fontFamily: '"DM Sans",sans-serif',
  }

  return (
    <div style={{ ...s }}>

      {/* Success message */}
      {successMsg && (
        <div style={{
          background: 'rgba(78,158,110,.1)',
          border: '0.5px solid var(--green, #4e9e6e)',
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '12px', color: 'var(--green, #4e9e6e)',
          marginBottom: '14px',
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(168,50,50,.1)', border: '0.5px solid var(--red, #a83232)',
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '12px', color: 'var(--red, #a83232)',
          marginBottom: '14px',
        }}>
          {error}
        </div>
      )}

      {/* ── Active coalition ── */}
      {myCoalition?.status === 'active' && (
        <div style={{
          background: 'var(--bg2, #1a1a17)',
          border: '0.5px solid var(--bd-a, rgba(212,146,10,.3))',
          borderRadius: '14px', padding: '16px 18px', marginBottom: '18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--amber, #d4920a)', marginBottom: '4px' }}>
                🤝 Active Coalition
              </div>
              <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '18px', fontWeight: 700, color: 'var(--t1, #ece8dc)', lineHeight: 1.1 }}>
                {myCoalition.coalition_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--t3, #5c5850)', marginTop: '3px' }}>
                {myPartyName} + {myCoalition.partner_party}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '8.5px', color: 'var(--t3, #5c5850)', marginBottom: '2px', letterSpacing: '.08em', textTransform: 'uppercase' }}><InfoPop {...INFO.coalition_score}>Coalition Score</InfoPop></div>
              <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '28px', fontWeight: 700, color: 'var(--amber-b, #f5a623)', lineHeight: 1 }}>
                {Math.round(myCoalition.coalition_score).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {myCoalition.dissolves_at_rank_lock && (
            <div style={{ fontSize: '11px', color: 'var(--red, #a83232)', background: 'rgba(168,50,50,.08)', borderRadius: '6px', padding: '6px 10px', marginBottom: '10px' }}>
              ⚠ Scheduled to dissolve at next rank lock (Monday midnight IST)
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {!myCoalition.dissolves_at_rank_lock && (
              <button
                onClick={() => handleDissolve(false)}
                disabled={isPending}
                style={{
                  fontSize: '11.5px', color: 'var(--t3, #5c5850)',
                  background: 'var(--bg3, #222220)', border: '0.5px solid var(--bd0, rgba(236,232,220,.06))',
                  borderRadius: '7px', padding: '6px 12px', cursor: 'pointer',
                  fontFamily: '"DM Sans",sans-serif',
                }}
              >
                Schedule dissolution
              </button>
            )}
            <button
              onClick={() => handleDissolve(true)}
              disabled={isPending}
              style={{
                fontSize: '11.5px', color: 'rgba(212,90,90,.85)',
                background: 'rgba(168,50,50,.1)', border: '0.5px solid rgba(168,50,50,.25)',
                borderRadius: '7px', padding: '6px 12px', cursor: 'pointer',
                fontFamily: '"DM Sans",sans-serif',
              }}
            >
              Dissolve now
            </button>
          </div>
        </div>
      )}

      {/* ── Pending proposal received ── */}
      {myCoalition?.status === 'pending' && myCoalition.partner_party && (
        <div style={{
          background: 'var(--amber-g, rgba(212,146,10,.08))',
          border: '0.5px solid var(--bd-a, rgba(212,146,10,.3))',
          borderRadius: '14px', padding: '16px 18px', marginBottom: '18px',
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--amber, #d4920a)', marginBottom: '8px' }}>
            📨 Coalition Proposal Received
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--t1, #ece8dc)', marginBottom: '4px' }}>
            {myCoalition.partner_party}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--t3, #5c5850)', marginBottom: '14px' }}>
            wants to form &ldquo;{myCoalition.coalition_name}&rdquo; with you
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAccept}
              disabled={isPending}
              style={{
                flex: 1, background: 'var(--amber, #d4920a)', color: '#000',
                border: 'none', borderRadius: '8px', padding: '9px',
                fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                fontFamily: '"DM Sans",sans-serif',
              }}
            >
              {isPending ? 'Accepting…' : '✓ Accept Coalition'}
            </button>
            <button
              onClick={() => handleDissolve(true)}
              disabled={isPending}
              style={{
                background: 'var(--bg2, #1a1a17)', color: 'var(--t3, #5c5850)',
                border: '0.5px solid var(--bd0, rgba(236,232,220,.06))',
                borderRadius: '8px', padding: '9px 14px',
                fontSize: '12.5px', cursor: 'pointer',
                fontFamily: '"DM Sans",sans-serif',
              }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* ── Pending proposal sent ── */}
      {myCoalition?.status === 'pending' && !myCoalition.partner_party && (
        <div style={{
          background: 'var(--bg2, #1a1a17)',
          border: '0.5px solid var(--bd0, rgba(236,232,220,.06))',
          borderRadius: '14px', padding: '14px 16px', marginBottom: '18px',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--t3, #5c5850)' }}>
            ⏳ Coalition proposal pending — waiting for {myCoalition.partner_party ?? 'partner'} to respond
          </div>
        </div>
      )}

      {/* ── Coalition leaderboard ── */}
      {coalitionLeaderboard.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--t3, #5c5850)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Coalition Rankings
            <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0, rgba(236,232,220,.06))' }} />
          </div>
          <div style={{ background: 'var(--bg1, #131310)', border: '0.5px solid var(--bd0, rgba(236,232,220,.06))', borderRadius: '12px', overflow: 'hidden' }}>
            {coalitionLeaderboard.map((row, i) => {
              const isMe = myCoalition?.coalition_id === row.coalition_id
              return (
                <div
                  key={row.coalition_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    borderBottom: i < coalitionLeaderboard.length - 1 ? '0.5px solid var(--bd0, rgba(236,232,220,.06))' : 'none',
                    background: isMe ? 'var(--amber-g, rgba(212,146,10,.08))' : 'transparent',
                  }}
                >
                  <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '12px', color: isMe ? 'var(--amber, #d4920a)' : 'var(--t3, #5c5850)', width: '20px', fontWeight: isMe ? 700 : 400 }}>
                    {row.rank}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isMe ? 'var(--amber-b, #f5a623)' : 'var(--t1, #ece8dc)', marginBottom: '1px' }}>
                      🤝 {row.coalition_name}
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--t3, #5c5850)' }}>
                      {row.party_1_name} + {row.party_2_name}
                      {isMe && <span style={{ color: 'var(--amber, #d4920a)', marginLeft: '6px' }}>(You)</span>}
                    </div>
                  </div>
                  <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '12.5px', color: isMe ? 'var(--amber-b, #f5a623)' : 'var(--t2, #9a9588)', flexShrink: 0 }}>
                    {Math.round(row.coalition_score).toLocaleString('en-IN')}
                  </div>
                  {row.rank_delta !== 0 && (
                    <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', color: row.rank_delta > 0 ? 'var(--green, #4e9e6e)' : 'var(--red, #a83232)', width: '28px', textAlign: 'right', flexShrink: 0 }}>
                      {row.rank_delta > 0 ? '▲' : '▼'}{Math.abs(row.rank_delta)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Propose new coalition ── */}
      {!myCoalition && (
        <>
          <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--t3, #5c5850)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Form a Coalition
            <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0, rgba(236,232,220,.06))' }} />
          </div>

          {!showPropose ? (
            <>
              <div style={{ fontSize: '12px', color: 'var(--t3, #5c5850)', lineHeight: 1.6, marginBottom: '14px' }}>
                Partner with another player in this league. Your coalition score is the average of both cabinet scores — a rising tide lifts both boats.
              </div>
              <button
                onClick={() => setShowPropose(true)}
                style={{
                  width: '100%', padding: '10px',
                  background: 'var(--amber-g, rgba(212,146,10,.08))',
                  border: '0.5px solid var(--bd-a, rgba(212,146,10,.3))',
                  borderRadius: '10px', fontSize: '13px', fontWeight: 500,
                  color: 'var(--amber-b, #f5a623)', cursor: 'pointer',
                  fontFamily: '"DM Sans",sans-serif',
                }}
              >
                🤝 Propose a Coalition
              </button>
            </>
          ) : (
            <div style={{ background: 'var(--bg1, #131310)', border: '0.5px solid var(--bd1, rgba(236,232,220,.11))', borderRadius: '14px', padding: '16px' }}>
              {/* Coalition name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3, #5c5850)', marginBottom: '7px' }}>
                  Coalition Name
                </label>
                <input
                  type="text"
                  value={coalitionName}
                  onChange={e => setCoalitionName(e.target.value)}
                  placeholder="e.g. Grand Alliance, Mahagathbandhan…"
                  maxLength={60}
                  autoFocus
                  style={{
                    width: '100%', background: 'var(--bg2, #1a1a17)',
                    border: '0.5px solid var(--bd0, rgba(236,232,220,.06))',
                    borderRadius: '9px', padding: '10px 13px',
                    fontFamily: '"DM Sans",sans-serif', fontSize: '13px',
                    color: 'var(--t1, #ece8dc)', outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--bd-a, rgba(212,146,10,.3))' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--bd0, rgba(236,232,220,.06))' }}
                />
              </div>

              {/* Partner selection */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3, #5c5850)', marginBottom: '7px' }}>
                  Choose Your Partner
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {potentialPartners.map(partner => (
                    <button
                      key={partner.cabinet_id}
                      onClick={() => setSelectedPartner(partner)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '9px',
                        background: selectedPartner?.cabinet_id === partner.cabinet_id
                          ? 'var(--amber-g, rgba(212,146,10,.08))' : 'var(--bg2, #1a1a17)',
                        border: `0.5px solid ${selectedPartner?.cabinet_id === partner.cabinet_id
                          ? 'var(--bd-a, rgba(212,146,10,.3))' : 'var(--bd0, rgba(236,232,220,.06))'}`,
                        cursor: 'pointer', textAlign: 'left',
                        fontFamily: '"DM Sans",sans-serif',
                        transition: 'all 0.12s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--t1, #ece8dc)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {partner.party_name}
                        </div>
                        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', color: 'var(--t3, #5c5850)' }}>
                          Rank #{partner.rank}
                        </div>
                      </div>
                      <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '12px', color: 'var(--amber-b, #f5a623)', flexShrink: 0 }}>
                        {Math.round(partner.cabinet_score).toLocaleString('en-IN')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coalition score preview */}
              {selectedPartner && (
                <div style={{
                  background: 'var(--amber-g, rgba(212,146,10,.08))',
                  borderRadius: '9px', padding: '10px 12px', marginBottom: '14px',
                  fontSize: '11px', color: 'var(--t2, #9a9588)', lineHeight: 1.6,
                }}>
                  <strong style={{ color: 'var(--amber, #d4920a)' }}>Preview:</strong>{' '}
                  Coalition score ≈{' '}
                  <strong style={{ fontFamily: '"DM Mono",monospace', color: 'var(--amber-b, #f5a623)' }}>
                    {/* We don't have myScore here but show the partner's */}
                    {Math.round(selectedPartner.cabinet_score).toLocaleString('en-IN')} avg
                  </strong>
                  {' '}(average of both cabinet scores, updated each rank lock)
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setShowPropose(false); setError(null) }}
                  style={{
                    flex: 1, background: 'transparent', color: 'var(--t3, #5c5850)',
                    border: '0.5px solid var(--bd0, rgba(236,232,220,.06))',
                    borderRadius: '8px', padding: '9px',
                    fontSize: '12px', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePropose}
                  disabled={!selectedPartner || coalitionName.trim().length < 3 || isPending}
                  style={{
                    flex: 2, background: 'var(--amber, #d4920a)', color: '#000',
                    border: 'none', borderRadius: '8px', padding: '9px',
                    fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: '"DM Sans",sans-serif',
                    opacity: !selectedPartner || coalitionName.trim().length < 3 || isPending ? 0.5 : 1,
                    transition: 'opacity 0.13s',
                  }}
                >
                  {isPending ? 'Sending…' : 'Send Proposal →'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
