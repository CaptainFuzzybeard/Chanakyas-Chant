'use client'

import { useState, useTransition } from 'react'
import type { RosterSlotEnriched, CabinetPosition, ConvictionLevel } from '@/types/database'
import { CABINET_POSITIONS, POSITION_LABELS, POSITION_MULTIPLIERS, POSITION_ANCHOR_STATS } from '@/types/database'
import { assignPosition, dropPolitician } from '@/lib/actions/roster'
import { FirstTimeTutorial } from '@/components/ui/FirstTimeTutorial'
import { ConvictionStake } from '@/components/ui/ConvictionStake'
import { InfoPop, INFO } from '@/components/ui/InfoPop'

interface TransferWindow {
  politician_id:             string
  politician_name:           string
  from_party_abbr:           string
  to_party_abbr:             string
  transfer_window_closes_at: string
  hours_remaining:           number
}

interface PartyBreakdown {
  party_id:    string
  party_name:  string
  party_abbr:  string
  count:       number
  max_allowed: number
  is_maxed:    boolean
}

interface CabinetBuilderClientProps {
  cabinetId:        string
  cabinetScore:     number
  slots:            RosterSlotEnriched[]
  transferWindows?: TransferWindow[]
  partyBreakdown?:  PartyBreakdown[]
  gameweek:         number
  season:           string
  existingStakes:   Record<string, ConvictionLevel>
  herdData:         Record<string, { total_stakes: number; certain_pct: number; believe_pct: number; neutral_pct: number; cautious_pct: number; doubt_pct: number; high_pct: number; is_consensus: boolean }>
  stakingOpen:      boolean
}

/** Check if a politician's stats match the anchor stat for a position */
function isAnchorMatch(slot: RosterSlotEnriched, pos: CabinetPosition): boolean {
  const anchors = POSITION_ANCHOR_STATS[pos]
  if (!anchors.length || anchors[0] === 'composite') return false
  const stats = slot.stats
  const statMap: Record<string, number | null> = {
    infrastructure: stats?.score_infrastructure ?? null,
    healthcare:     stats?.score_healthcare ?? null,
    education:      stats?.score_education ?? null,
    jobs_economy:   stats?.score_jobs_economy ?? null,
    approval:       stats?.score_approval ?? null,
    vote_share:     stats?.score_vote_share ?? null,
  }
  const topStat = Object.entries(statMap)
    .filter(([, v]) => v != null)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0]?.[0]
  return topStat != null && anchors.includes(topStat as any)
}

export function CabinetBuilderClient({
  cabinetId,
  cabinetScore,
  slots,
  transferWindows = [],
  partyBreakdown  = [],
  gameweek,
  season,
  existingStakes,
  herdData,
  stakingOpen,
}: CabinetBuilderClientProps) {
  const [isPending, startTransition] = useTransition()
  const [droppingId, setDroppingId] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [positions, setPositions] = useState<Record<string, RosterSlotEnriched | null>>(() => {
    const init: Record<string, RosterSlotEnriched | null> = {}
    CABINET_POSITIONS.forEach(p => { init[p] = null })
    slots.forEach(s => { if (s.cabinet_position && s.cabinet_position !== 'bench') init[s.cabinet_position] = s })
    return init
  })
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const assignedSlotIds = new Set(Object.values(positions).filter(Boolean).map(s => s!.id))
  const bench = slots.filter(s => !Object.values(positions).find(p => p?.id === s.id))
  const filledCount = Object.values(positions).filter(Boolean).length
  const selectedSlot = slots.find(s => s.id === selectedSlotId)

  async function handleAssign(pos: CabinetPosition) {
    if (!selectedSlotId) return
    const slot = slots.find(s => s.id === selectedSlotId)
    if (!slot) return
    setPositions(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(p => { if (next[p]?.id === selectedSlotId) next[p] = null })
      next[pos] = slot
      return next
    })
    setSelectedSlotId(null)
    startTransition(async () => {
      const result = await assignPosition(selectedSlotId, pos, cabinetId)
      if (!result.success) setPositions(prev => ({ ...prev, [pos]: null }))
    })
  }

  async function handleRemove(pos: CabinetPosition) {
    const slot = positions[pos]
    if (!slot) return
    setPositions(prev => ({ ...prev, [pos]: null }))
    startTransition(async () => { await assignPosition(slot.id, null, cabinetId) })
  }

  // Undo state: map of slotId -> timeout handle
  const [pendingDrops, setPendingDrops] = useState<Record<string, ReturnType<typeof setTimeout>>>({})
  const [dropNames, setDropNames] = useState<Record<string, string>>({})

  function handleDrop(slotId: string, politicianName: string) {
    // If already pending undo, cancel it (second click = cancel)
    if (pendingDrops[slotId]) {
      clearTimeout(pendingDrops[slotId])
      setPendingDrops(prev => { const n = { ...prev }; delete n[slotId]; return n })
      setDropNames(prev => { const n = { ...prev }; delete n[slotId]; return n })
      return
    }

    // Stage the drop visually
    setDropNames(prev => ({ ...prev, [slotId]: politicianName }))
    setDroppingId(slotId)

    // 5-second undo window — commit after timeout
    const t = setTimeout(() => {
      setPendingDrops(prev => { const n = { ...prev }; delete n[slotId]; return n })
      setDropNames(prev => { const n = { ...prev }; delete n[slotId]; return n })
      setPositions(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(p => { if (next[p]?.id === slotId) next[p] = null })
        return next
      })
      startTransition(async () => {
        await dropPolitician(slotId)
        setDroppingId(null)
      })
    }, 5000)

    setPendingDrops(prev => ({ ...prev, [slotId]: t }))
  }

  return (
    <>
      <FirstTimeTutorial page="cabinet" visible={true} onDone={() => {}} />
      <div className="layout-cabinet" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 'calc(100vh - 54px)' }}>

      {/* ── Positions panel ── */}
      <div style={{ padding: '22px 22px 80px', borderRight: '0.5px solid var(--bd0)', opacity: isPending ? 0.7 : 1, transition: 'opacity 0.15s' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '20px', fontStyle: 'italic', fontWeight: 600, color: 'var(--t1)', marginBottom: '3px' }}>
              Cabinet Builder
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
              {selectedSlotId
                ? <span style={{ color: 'var(--amber)' }}>Click a ministry to assign {selectedSlot?.politician.name}</span>
                : `Assign politicians to ministries · ${filledCount} / 12 filled`}
            </div>
          </div>

          {/* Score preview */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd-a)', borderRadius: '12px', padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '3px' }}>Cabinet Score</div>
              <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '19px', fontWeight: 500, color: 'var(--amber-b)', lineHeight: 1 }}>
                {cabinetScore.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '12px', padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '3px' }}>Filled</div>
              <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '19px', fontWeight: 500, color: 'var(--t1)', lineHeight: 1 }}>{filledCount}/12</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px' }}>12 Ministry Positions</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {CABINET_POSITIONS.map(pos => {
            const slot = positions[pos]
            const isCap = pos === 'pm_cm'
            const anchor = slot ? isAnchorMatch(slot, pos) : false
            const isTarget = !!selectedSlotId && !slot

            return (
              <div
                key={pos}
                onClick={() => {
                  if (selectedSlotId && !slot) handleAssign(pos)
                }}
                style={{
                  background: isCap ? 'rgba(212,146,10,.04)' : anchor ? 'rgba(78,158,110,.04)' : 'var(--bg2)',
                  border: `0.5px solid ${
                    isCap ? 'var(--bd-a)'
                    : anchor ? 'rgba(78,158,110,.2)'
                    : isTarget ? 'var(--bd-a)'
                    : 'var(--bd0)'
                  }`,
                  borderRadius: '12px',
                  padding: '10px 12px',
                  minHeight: '80px',
                  position: 'relative',
                  cursor: isTarget ? 'pointer' : 'default',
                  transition: 'border-color 0.15s, background 0.15s',
                  ...(isTarget ? { boxShadow: '0 0 0 1px var(--amber-d)' } : {}),
                }}
              >
                {/* Position name row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <div style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isCap ? 'var(--amber)' : anchor ? 'rgba(100,210,150,.85)' : 'var(--t3)' }}>
                    {POSITION_LABELS[pos]}
                  </div>
                  <div style={{ fontSize: '8px', fontFamily: '"DM Mono",monospace', color: isCap ? 'var(--amber-b)' : 'var(--t3)' }}>
                    ×{POSITION_MULTIPLIERS[pos].toFixed(1)}{anchor ? ' ✦' : ''}
                  </div>
                </div>

                {slot ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg3)', border: '0.5px solid var(--bd0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {slot.politician.portrait_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={slot.politician.portrait_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <svg width="20" height="26" viewBox="0 0 20 26" fill="none" style={{ opacity: 0.3 }}><ellipse cx="10" cy="8" rx="5" ry="6" fill="#ece8dc"/><path d="M2 26C2 18 5 15 10 14C15 15 18 18 18 26" fill="#ece8dc"/></svg>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {slot.politician.name}
                        </div>
                        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '10.5px', color: 'var(--amber-b)' }}>
                          {Math.round(slot.stats?.composite_score ?? 0)}
                        </div>
                      </div>
                    </div>
                    {anchor && <div style={{ position: 'absolute', bottom: '6px', right: '8px', fontSize: '7.5px', color: 'rgba(100,210,150,.85)', fontFamily: '"DM Mono",monospace', fontWeight: 600 }}>anchor match ✦</div>}
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(pos) }}
                      style={{ position: 'absolute', top: '7px', right: '8px', fontSize: '11px', color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', fontFamily: 'sans-serif' }}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '44px', gap: '4px', opacity: isTarget ? 0.9 : 0.45 }}>
                    <div style={{ fontSize: isTarget ? '14px' : '16px', color: isTarget ? 'var(--amber)' : 'var(--t3)' }}>
                      {isTarget ? '→' : '+'}
                    </div>
                    <div style={{ fontSize: '8.5px', color: isTarget ? 'var(--amber)' : 'var(--t3)' }}>
                      {isTarget ? 'Click to assign' : POSITION_LABELS[pos]}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bench panel ── */}
      <div style={{ padding: '18px 16px', background: 'var(--bg1)', overflowY: 'auto' }}>

        {saveSuccess && (
          <div style={{ background: 'rgba(27,107,58,.1)', border: '0.5px solid var(--green)', borderRadius: '10px', padding: '10px 13px', marginBottom: '14px', fontSize: '12px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✓</span> Cabinet saved — redirecting to dashboard…
          </div>
        )}

        <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <InfoPop {...INFO.roster_depth}>Your Roster</InfoPop>
          <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
          <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', color: filledCount >= 12 ? 'var(--green)' : 'var(--amber)', fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>
            <InfoPop {...INFO.cabinet_score}>{filledCount}/12 placed</InfoPop>
          </span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--t4)', marginBottom: '12px' }}>
          <InfoPop {...INFO.roster_depth} inline={false}>{slots.length}/20 rostered · {20 - slots.length} roster slots free</InfoPop>
        </div>

        <div style={{ fontSize: '10.5px', color: 'var(--t3)', marginBottom: '14px', lineHeight: 1.4 }}>
          {selectedSlotId
            ? <span style={{ color: 'var(--amber)' }}>Now click an empty ministry slot to assign.</span>
            : 'Select a politician to assign them to a ministry.'}
        </div>

        {slots.map(slot => {
          const isAssigned  = assignedSlotIds.has(slot.id)
          const isSelected  = slot.id === selectedSlotId
          const isPending   = !!pendingDrops[slot.id]
          const isOpp       = slot.politician.office_status === 'opposition'
          const isFmr       = slot.politician.office_status === 'former'

          return (
            <div
              key={slot.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '8px',
                background: isPending ? 'rgba(192,57,43,.06)' : isSelected ? 'var(--amber-g)' : 'var(--bg2)',
                border: `0.5px solid ${isPending ? 'rgba(192,57,43,.3)' : isSelected ? 'var(--bd-a)' : 'var(--bd0)'}`,
                borderRadius: '12px', marginBottom: '6px',
                opacity: isFmr ? 0.45 : 1,
                transition: 'all 0.12s', position: 'relative',
              }}
            >
              {/* Avatar — click to select */}
              <div
                onClick={() => { if (!isAssigned && !isPending) setSelectedSlotId(isSelected ? null : slot.id) }}
                style={{ display: 'flex', alignItems: 'center', gap: '9px', flex: 1, minWidth: 0, cursor: isPending ? 'default' : 'pointer' }}
              >
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg3)', border: '0.5px solid var(--bd0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {slot.politician.portrait_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={slot.politician.portrait_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <svg width="22" height="28" viewBox="0 0 22 28" fill="none" style={{ opacity: 0.3 }}><ellipse cx="11" cy="9" rx="6" ry="7" fill="#ece8dc"/><path d="M2 28C2 19 5 16 11 15C17 16 20 19 20 28" fill="#ece8dc"/></svg>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 500, color: isPending ? 'var(--red)' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {slot.politician.name}
                    {isFmr && <span style={{ fontSize: '9px', color: 'var(--red)', marginLeft: '5px' }}>lost seat</span>}
                    {isOpp && <span style={{ fontSize: '9px', color: 'var(--ti)', marginLeft: '5px' }}>opp</span>}
                  </div>
                  <div style={{ fontSize: '9.5px', color: isPending ? 'var(--red)' : 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isPending ? 'Dropping in 5s — click Undo to cancel'
                      : isAssigned
                        ? (() => {
                            const pos = slot.cabinet_position as import('@/types/database').CabinetPosition ?? 'bench'
                            const infoKey = pos === 'bench' ? 'multiplier_bench'
                              : pos === 'pm_cm' ? 'multiplier_pm'
                              : 'multiplier_anchor'
                            return <InfoPop {...INFO[infoKey]}>{`→ ${POSITION_LABELS[pos]}`}</InfoPop>
                          })()
                        : slot.politician.constituency}
                  </div>
                </div>
              </div>

              {/* Score + tags + drop */}
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '11px', color: isPending ? 'var(--red)' : 'var(--amber-b)', lineHeight: 1 }}>
                  {Math.round(slot.stats?.composite_score ?? 0)}
                </div>
                {isAssigned && !isPending && (
                  <div style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--amber)', background: 'var(--amber-g)', padding: '1px 5px', borderRadius: '2px' }}>
                    Placed
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleDrop(slot.id, slot.politician.name) }}
                  style={{
                    fontSize: '9px',
                    color: isPending ? 'white' : 'var(--red)',
                    background: isPending ? 'var(--red)' : 'rgba(192,57,43,.1)',
                    border: `0.5px solid ${isPending ? 'var(--red)' : 'rgba(192,57,43,.25)'}`,
                    borderRadius: '3px', padding: '2px 7px',
                    cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                    fontWeight: isPending ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {isPending ? 'Undo' : 'Drop'}
                </button>
                {/* Transfer window alert on this politician */}
                {transferWindows.some(tw => tw.politician_id === slot.politician.id) && (() => {
                  const tw = transferWindows.find(t => t.politician_id === slot.politician.id)!
                  return (
                    <div style={{
                      fontSize: '9px', color: 'var(--amber)', marginTop: '4px',
                      fontFamily: '"DM Mono",monospace', letterSpacing: '.03em',
                    }}>
                      <InfoPop {...INFO.transfer_window} inline={false}>
                      <span>⚡ Defected {tw.from_party_abbr}→{tw.to_party_abbr} · {Number(tw.hours_remaining).toFixed(0)}h to replace</span>
                    </InfoPop>
                    </div>
                  )
                })()}
              </div>

              {/* Conviction staking — only on assigned ministry positions, not bench */}
              {isAssigned && (
                <div style={{ width: '100%', marginTop: '6px' }}>
                  <ConvictionStake
                    politicianId={slot.politician.id}
                    politicianName={slot.politician.name}
                    gameweek={gameweek}
                    season={season}
                    existingStake={existingStakes[slot.politician.id] ?? null}
                    herd={herdData[slot.politician.id] ?? null}
                    stakingOpen={stakingOpen}
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Tip */}
        <div style={{ background: 'var(--amber-g)', border: '0.5px solid var(--bd-a)', borderRadius: '8px', padding: '10px 11px', marginTop: '16px' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--amber)', marginBottom: '4px' }}>Anchor match</div>
          <div style={{ fontSize: '10.5px', color: 'var(--t2)', lineHeight: 1.5 }}>
            <InfoPop {...INFO.multiplier_anchor} inline={false}>
              <span>A politician whose top stat matches a ministry&apos;s anchor earns a ×1.2 multiplier. Women &amp; Child rewards both Healthcare + Education.</span>
            </InfoPop>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg1)', borderTop: '0.5px solid var(--bd0)', padding: '12px 22px', display: 'flex', alignItems: 'center', gap: '14px', zIndex: 50 }}>
        <div style={{ fontSize: '12px', color: 'var(--t2)', flex: 1 }}>
          <strong style={{ color: 'var(--t1)' }}>{filledCount} of 12</strong> positions filled
          {filledCount < 12 && <span style={{ color: 'var(--red)' }}> · {12 - filledCount} empty slots score 0</span>}
          {filledCount === 12 && <span style={{ color: 'var(--green)' }}> · Cabinet complete ✓</span>}
        </div>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '14px', color: 'var(--amber-b)' }}>
          {cabinetScore.toLocaleString('en-IN')} pts
        </div>
        <button
          onClick={() => {
            setSaveSuccess(true)
            setTimeout(() => { window.location.href = '/dashboard' }, 1200)
          }}
          disabled={saveSuccess}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: saveSuccess ? 'var(--green)' : 'var(--amber)', color: saveSuccess ? 'white' : '#000', fontWeight: 600, fontSize: '12.5px', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', transition: 'all 0.2s' }}
        >
          {saveSuccess ? '✓ Saved!' : 'Save & Dashboard'}
        </button>
      </div>

      <style>{`.remove-btn { opacity: 0 !important; } div:hover > .remove-btn { opacity: 0.8 !important; }`}</style>
    </div>
    </>
  )
}
