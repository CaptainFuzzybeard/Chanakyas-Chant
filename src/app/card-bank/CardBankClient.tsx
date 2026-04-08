'use client'
import { InfoPop, INFO } from '@/components/ui/InfoPop'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PoliticianCard, Party } from '@/types/database'
import { draftPolitician } from '@/lib/actions/roster'
import { FirstTimeTutorial } from '@/components/ui/FirstTimeTutorial'
import { saveCardBankUrl } from '@/components/ui/BackToCardBank'

interface CardBankClientProps {
  initialCards:      PoliticianCard[]
  total:             number
  allParties:        Party[]
  rosterIds:         string[]
  cabinetId:         string | null
  isFirstTime:       boolean
  cabinetScope:      'national' | 'state'
  cabinetScopeState: string | null
  cappedParties:     string[]   // party abbreviations at 4-player cap
  initialFilters: {
    search:  string
    status:  string[]
    parties: string[]
    min:     number
    sort:    string
  }
}

const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Score ↓' },
  { value: 'score_asc',  label: 'Score ↑' },
  { value: 'rising',     label: 'Rising this week' },
  { value: 'holders',    label: 'Most held' },
]

const STATUS_OPTIONS = [
  { value: 'in_office',  label: 'In Office',   count: 543 },
  { value: 'opposition', label: 'Opposition',  count: 287 },
  { value: 'former',     label: 'Former',      count: 1204 },
]

export function CardBankClient({
  initialCards,
  total,
  allParties,
  rosterIds: initialRosterIds,
  cabinetId,
  isFirstTime,
  cabinetScope,
  cabinetScopeState,
  cappedParties,
  initialFilters,
}: CardBankClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rosterIds, setRosterIds]     = useState(new Set(initialRosterIds))
  const [draftingId, setDraftingId]   = useState<string | null>(null)
  const cappedPartySet = new Set(cappedParties)
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({})

  const [filters, setFilters] = useState(initialFilters)

  function applyFilters(next: typeof filters) {
    setFilters(next)
    const params = new URLSearchParams()
    if (next.search)  params.set('search', next.search)
    if (next.status.length) params.set('status', next.status.join(','))
    if (next.parties.length) params.set('parties', next.parties.join(','))
    if (next.min > 0) params.set('min', String(next.min))
    if (next.sort !== 'score_desc') params.set('sort', next.sort)
    startTransition(() => router.push(`/card-bank?${params.toString()}`))
  }

  function toggleStatus(v: string) {
    const next = filters.status.includes(v)
      ? filters.status.filter(s => s !== v)
      : [...filters.status, v]
    applyFilters({ ...filters, status: next })
  }

  function toggleParty(abbr: string) {
    const next = filters.parties.includes(abbr)
      ? filters.parties.filter(p => p !== abbr)
      : [...filters.parties, abbr]
    applyFilters({ ...filters, parties: next })
  }

  async function handleDraft(politicianId: string) {
    if (!cabinetId) return
    setDraftingId(politicianId)
    setDraftErrors(prev => { const n = { ...prev }; delete n[politicianId]; return n })

    const result = await draftPolitician(cabinetId, politicianId)
    if (result.success) {
      setRosterIds(prev => new Set([...Array.from(prev), politicianId]))
    } else {
      const msg = (result as any).error ?? 'Could not add to roster'
      setDraftErrors(prev => ({ ...prev, [politicianId]: msg }))
      setTimeout(() => {
        setDraftErrors(prev => { const n = { ...prev }; delete n[politicianId]; return n })
      }, 6000)
    }
    setDraftingId(null)
  }

  const cards       = initialCards
  const rosterCount = rosterIds.size
  const rosterFull  = rosterCount >= 20
  const canGoToCabinet = rosterCount >= 12

  function handleLoadMore() {
    const params = new URLSearchParams(window.location.search)
    const currentPage = parseInt(params.get('page') ?? '0')
    params.set('page', String(currentPage + 1))
    startTransition(() => router.push(`/card-bank?${params.toString()}`))
  }

  return (
    <>
      <FirstTimeTutorial
        page="card-bank"
        visible={true}
        onDone={() => {}}
      />
      <div className="layout-cardbank" style={{ display: 'grid', gridTemplateColumns: '228px 1fr', minHeight: 'calc(100vh - 88px)' }}>

      {/* ── Filter sidebar ── */}
      <div style={{
        background: 'var(--bg1)',
        borderRight: '0.5px solid var(--bd0)',
        padding: '18px 14px',
        position: 'sticky',
        top: '88px',
        height: 'calc(100vh - 88px)',
        overflowY: 'auto',
      }}>
        {/* Scope reminder */}
        <div style={{
          background: cabinetScope === 'state' ? 'rgba(27,107,58,.07)' : 'rgba(201,148,26,.07)',
          border: `0.5px solid ${cabinetScope === 'state' ? 'rgba(27,107,58,.2)' : 'var(--bd-a)'}`,
          borderRadius: '8px', padding: '9px 11px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: cabinetScope === 'state' ? 'var(--green)' : 'var(--amber)', marginBottom: '3px' }}>
            {cabinetScope === 'national' ? '🇮🇳 Lok Sabha' : `🗺️ Vidhan Sabha`}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t2)', lineHeight: 1.45 }}>
            {cabinetScope === 'national'
              ? 'Showing all 543 Lok Sabha MPs'
              : `Showing MLAs for ${cabinetScopeState ?? 'your state'} only`}
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '4px', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)' }}>Search</div>
        <input
          type="text"
          value={filters.search}
          onChange={e => applyFilters({ ...filters, search: e.target.value })}
          placeholder="Name, constituency…"
          style={{
            width: '100%',
            background: 'var(--bg2)',
            border: '0.5px solid var(--bd0)',
            borderRadius: '8px',
            padding: '7px 11px',
            fontFamily: '"DM Sans",sans-serif',
            fontSize: '12px',
            color: 'var(--t1)',
            outline: 'none',
            marginBottom: '16px',
          }}
        />

        {/* Status */}
        <FilterSection title="Status">
          {STATUS_OPTIONS.map(opt => (
            <FilterPill
              key={opt.value}
              label={opt.label}
              count={opt.count}
              active={filters.status.includes(opt.value)}
              onClick={() => toggleStatus(opt.value)}
            />
          ))}
        </FilterSection>

        {/* Parties */}
        <FilterSection title="Party">
          {allParties.map(p => (
            <FilterPill
              key={p.id}
              label={p.abbreviation ?? p.name}
              active={filters.parties.includes(p.abbreviation ?? '')}
              onClick={() => toggleParty(p.abbreviation ?? '')}
            />
          ))}
        </FilterSection>

        {/* Min score */}
        <FilterSection title="Min. Score">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--t3)', fontFamily: '"DM Mono",monospace', marginBottom: '3px' }}>
            <span>0</span><span>{filters.min}+</span>
          </div>
          <input
            type="range"
            min={0}
            max={900}
            step={50}
            value={filters.min}
            onChange={e => applyFilters({ ...filters, min: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--amber)' }}
          />
        </FilterSection>

        <button
          onClick={() => applyFilters({ search: '', status: ['in_office'], parties: [], min: 0, sort: 'score_desc' })}
          style={{ fontSize: '10.5px', color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '14px', textDecoration: 'underline', fontFamily: '"DM Sans",sans-serif' }}
        >
          Clear all filters
        </button>
      </div>

      {/* ── Card grid ── */}
      <div style={{ padding: '18px 22px 80px', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>

        {/* First-time onboarding welcome */}
        {isFirstTime && rosterCount === 0 && (
          <div style={{ background: 'var(--amber-g)', border: '0.5px solid var(--bd-a)', borderRadius: '14px', padding: '16px 18px', marginBottom: '18px' }}>
            <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '17px', fontWeight: 700, color: 'var(--t1)', marginBottom: '5px' }}>
              Step 1: Build your roster
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '12px' }}>
              Browse and click <strong style={{ color: 'var(--t1)' }}>+ Add to Roster</strong> on politicians you want. Pick at least <strong style={{ color: 'var(--t1)' }}>12</strong> to fill all ministry positions — up to 20 total. Check their stat tracks to find the right anchors for each ministry.
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--t3)' }}>
              <InfoPop {...INFO.roster_depth}>
              <span>🏛 12 min · 20 max</span>
            </InfoPop>
              <span>⚖ Max 4 per party</span>
              <span>📊 Score = governance outcomes</span>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--t3)', flex: 1 }}>
            Showing <strong style={{ color: 'var(--t1)' }}>{cards.length}</strong> of {total} politicians
          </div>
          <select
            value={filters.sort}
            onChange={e => applyFilters({ ...filters, sort: e.target.value })}
            style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '8px', padding: '5px 9px', fontSize: '11.5px', color: 'var(--t2)', fontFamily: '"DM Sans",sans-serif', cursor: 'pointer', outline: 'none' }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value === filters.sort ? `Sort: ${o.label}` : o.label}</option>)}
          </select>
        </div>

        {/* Grid */}
        {cards.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px',
            color: 'var(--t3)', fontFamily: '"DM Sans",sans-serif',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t2)', marginBottom: '6px' }}>
              No politicians match your filters
            </div>
            <div style={{ fontSize: '12.5px', lineHeight: 1.6 }}>
              Try adjusting the search or status filters, or{' '}
              <button
                onClick={() => applyFilters({ search: '', status: ['in_office'], parties: [], min: 0, sort: 'score_desc' })}
                style={{ background: 'none', border: 'none', color: 'var(--amber)', cursor: 'pointer', fontSize: '12.5px', fontFamily: '"DM Sans",sans-serif', fontWeight: 600 }}
              >
                clear all filters
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '12px' }}>
          {cards.map(card => {
            const inRoster  = rosterIds.has(card.politician.id)
            const isCapped  = !inRoster && !!card.party.abbreviation && cappedPartySet.has(card.party.abbreviation)
            const stats = card.stats
            const score = Math.round(stats.composite_score)

            return (
              <div
                key={card.politician.id}
                style={{
                  background: 'var(--bg1)',
                  border: `0.5px solid ${inRoster ? 'var(--amber-d)' : 'var(--bd0)'}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: isCapped ? 'default' : 'pointer',
                  transition: 'transform 0.14s, border-color 0.14s',
                  position: 'relative',
                  opacity: isCapped ? 0.55 : 1,
                }}
                onMouseEnter={e => { if (!isCapped) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                onClick={() => { saveCardBankUrl(); router.push(`/p/${card.politician.id}`) }}
              >
                {inRoster && (
                  <div style={{ position: 'absolute', top: '7px', right: '7px', fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--amber)', color: '#000', padding: '2px 6px', borderRadius: '3px', zIndex: 5 }}>
                    In Roster
                  </div>
                )}
                {isCapped && (
                  <InfoPop {...INFO.party_cap}>
                    <div style={{ position: 'absolute', top: '7px', right: '7px', fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(192,57,43,.85)', color: 'white', padding: '2px 6px', borderRadius: '3px', zIndex: 5 }}>
                      4/4 {card.party.abbreviation}
                    </div>
                  </InfoPop>
                )}

                {/* Tricolour stripe — 5px, always present */}
                <div style={{ height: '5px', display: 'flex', flexShrink: 0 }}>
                  <div style={{ flex: 1, background: '#E8642A' }} />
                  <div style={{ flex: 1, background: '#fff' }} />
                  <div style={{ flex: 1, background: '#1B6B3A' }} />
                </div>

                {/* Portrait */}
                <div style={{ height: '110px', background: 'var(--navy-m)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {card.politician.portrait_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.politician.portrait_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="44" height="58" viewBox="0 0 44 58" fill="none" style={{ opacity: 0.18 }}>
                      <ellipse cx="22" cy="18" rx="11" ry="13" fill="#ece8dc"/>
                      <path d="M4 58C4 40 10 33 22 31C34 33 40 40 40 58" fill="#ece8dc"/>
                    </svg>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '36px', background: 'linear-gradient(transparent,var(--bg1))' }} />
                  {card.politician.office_status === 'opposition'
                    ? (
                      <InfoPop {...INFO.opposition_status} inline={false}>
                        <div style={{ position: 'absolute', top: '7px', left: '7px', width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(120,170,224,.85)' }} />
                      </InfoPop>
                    ) : (
                      <div style={{ position: 'absolute', top: '7px', left: '7px', width: '5px', height: '5px', borderRadius: '50%', background: card.politician.office_status === 'in_office' ? 'var(--green)' : 'var(--t3)' }} />
                    )
                  }
                  <InfoPop {...INFO.composite_score}>
                    <div style={{ position: 'absolute', bottom: '6px', right: '7px', background: 'rgba(15,27,45,0.88)', border: '0.5px solid rgba(232,100,42,0.4)', borderRadius: '4px', padding: '2px 6px', fontFamily: '"DM Mono",monospace', fontSize: '12px', fontWeight: 500, color: 'var(--amber-b)' }}>
                      {score}
                    </div>
                  </InfoPop>
                </div>

                {/* Body */}
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.politician.name}
                  </div>
                  <div style={{ fontSize: '9.5px', color: 'var(--t3)', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.politician.constituency} · {card.politician.state}
                  </div>
                  <div
                    title={card.party.name}
                    style={{ display: 'inline-block', fontSize: '8.5px', fontWeight: 600, color: 'var(--amber)', background: 'var(--amber-g)', padding: '1px 5px', borderRadius: '2px', marginBottom: '6px', cursor: 'help' }}
                  >
                    {card.party.abbreviation}
                  </div>

                  {/* Top 2 stats — show the politician's actual strongest stats */}
                  {(() => {
                    const statPairs = [
                      { label: 'Infra',    val: stats.score_infrastructure },
                      { label: 'Health',   val: stats.score_healthcare },
                      { label: 'Edu',      val: stats.score_education },
                      { label: 'Economy',  val: stats.score_jobs_economy },
                      { label: 'Approval', val: stats.score_approval },
                    ].filter(s => s.val != null)
                     .sort((a, b) => (b.val ?? 0) - (a.val ?? 0))
                     .slice(0, 2)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '7px' }}>
                        {statPairs.map(s => (
                          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ fontSize: '8px', color: 'var(--t3)', width: '38px', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{s.label}</div>
                            <div style={{ flex: 1, height: '3px', background: 'var(--bd0)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '2px', width: `${s.val}%`, background: (s.val ?? 0) >= 65 ? 'var(--green)' : (s.val ?? 0) >= 40 ? 'var(--gold)' : 'var(--red)' }} />
                            </div>
                            <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '9px', color: 'var(--t3)', width: '20px', textAlign: 'right', flexShrink: 0 }}>{Math.round(s.val ?? 0)}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Tags row — Rising, Scam, Sycophancy, Disputed, Defected */}
                  {(stats.tag_rising || stats.tag_scam_cloud || stats.tag_sycophancy || stats.tag_disputed || stats.tag_defected) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '7px' }}>
                      {stats.tag_rising && (
                        <span style={{ fontSize: '8.5px', fontWeight: 600, padding: '1px 6px', borderRadius: '20px', background: 'rgba(27,107,58,.1)', color: 'var(--green)' }}>↑ Rising</span>
                      )}
                      {stats.tag_scam_cloud && (
                        <span style={{ fontSize: '8.5px', fontWeight: 600, padding: '1px 6px', borderRadius: '20px', background: 'rgba(192,57,43,.1)', color: 'var(--red)' }}>☁ Scam</span>
                      )}
                      {stats.tag_sycophancy && (
                        <span style={{ fontSize: '8.5px', fontWeight: 600, padding: '1px 6px', borderRadius: '20px', background: 'rgba(201,148,26,.1)', color: 'var(--amber)' }}>? Syco</span>
                      )}
                      {stats.tag_disputed && (
                        <span style={{ fontSize: '8.5px', fontWeight: 600, padding: '1px 6px', borderRadius: '20px', background: 'var(--bg3)', color: 'var(--t3)' }}>⊘ Disputed</span>
                      )}
                      {stats.tag_defected && (
                        <span style={{ fontSize: '8.5px', fontWeight: 600, padding: '1px 6px', borderRadius: '20px', background: 'rgba(232,100,42,.08)', color: 'var(--amber-b)' }}>↔ Defected</span>
                      )}
                    </div>
                  )}

                  <button
                    disabled={inRoster || isCapped || draftingId === card.politician.id || !cabinetId || rosterFull}
                    onClick={e => { e.stopPropagation(); handleDraft(card.politician.id) }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: draftErrors[card.politician.id] ? 'rgba(192,57,43,.08)'
                               : inRoster ? 'var(--amber-g)'
                               : isCapped ? 'rgba(192,57,43,.06)' : 'var(--bg2)',
                      border: `0.5px solid ${draftErrors[card.politician.id] ? 'rgba(192,57,43,.3)'
                             : inRoster ? 'var(--bd-a)'
                             : isCapped ? 'rgba(192,57,43,.2)' : 'var(--bd0)'}`,
                      borderRadius: '8px',
                      fontFamily: '"DM Sans",sans-serif',
                      fontSize: '10.5px',
                      fontWeight: 500,
                      color: draftErrors[card.politician.id] ? 'var(--red)'
                           : inRoster ? 'var(--amber-b)' : 'var(--t2)',
                      cursor: inRoster || rosterFull ? 'default' : 'pointer',
                      transition: 'all 0.13s',
                    }}
                  >
                    {draftingId === card.politician.id ? 'Adding…'
                      : draftErrors[card.politician.id]
                        ? (draftErrors[card.politician.id]?.includes('24 hour')
                          ? <InfoPop {...INFO.cooldown_24h}><span>{draftErrors[card.politician.id]}</span></InfoPop>
                          : draftErrors[card.politician.id])
                      : inRoster ? '✓ In Your Roster'
                      : rosterFull ? 'Roster full (20/20)'
                      : isCapped ? `${card.party.abbreviation} cap reached (4/4)`
                      : '+ Add to Roster'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Load more ── */}
        {cards.length < total && (
          <div style={{ textAlign: 'center', padding: '28px 0 8px' }}>
            <button
              onClick={handleLoadMore}
              disabled={isPending}
              style={{
                background: 'var(--bg1)',
                border: '0.5px solid var(--bd1)',
                borderRadius: '10px',
                padding: '9px 24px',
                fontSize: '12.5px',
                color: 'var(--t2)',
                cursor: 'pointer',
                fontFamily: '"DM Sans",sans-serif',
                opacity: isPending ? 0.5 : 1,
                transition: 'all 0.13s',
              }}
            >
              {isPending ? 'Loading…' : `Load more · ${total - cards.length} remaining`}
            </button>
          </div>
        )}
      </div>

      {/* ── Sticky roster bar ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '228px',
        right: 0,
        background: 'var(--bg1)',
        borderTop: '0.5px solid var(--bd0)',
        padding: '10px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 -2px 12px rgba(26,18,8,.07)',
        zIndex: 50,
      }}>
        {/* Count */}
        <div style={{ fontSize: '12.5px', color: 'var(--t3)', flexShrink: 0 }}>
          <strong style={{ color: 'var(--t1)', fontFamily: '"DM Mono",monospace' }}>{rosterCount}</strong>
          <span style={{ color: 'var(--t4)' }}> / 20</span>
          <span style={{ marginLeft: '6px' }}>in roster</span>
        </div>

        {/* Progress bar */}
        <div style={{ flex: 1, height: '4px', background: 'var(--bd0)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            borderRadius: '2px',
            background: rosterFull ? 'var(--green)' : 'var(--amber-b)',
            width: `${(rosterCount / 20) * 100}%`,
            transition: 'width 0.3s',
          }} />
        </div>

        {/* Party cap note */}
        <div style={{ fontSize: '10.5px', color: 'var(--t3)', flexShrink: 0 }}>
          Coalition rule: max 4 per party
        </div>

        {/* CTA */}
        {rosterCount === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--t4)', flexShrink: 0 }}>
            Pick at least 12 to form a cabinet
          </div>
        ) : rosterCount < 12 ? (
          <div style={{ fontSize: '11px', color: 'var(--amber)', flexShrink: 0 }}>
            {12 - rosterCount} more needed for cabinet
          </div>
        ) : (
          <a
            href="/cabinet"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--amber-b)',
              color: 'white',
              fontWeight: 600,
              fontSize: '12.5px',
              border: 'none',
              borderRadius: '9px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontFamily: '"DM Sans",sans-serif',
              textDecoration: 'none',
              flexShrink: 0,
              transition: 'background 0.13s',
            }}
          >
            Build Cabinet →
          </a>
        )}
      </div>
    </div>
    </>
  )
}

/* ── Filter UI sub-components ── */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {title}
        <span style={{ flex: 1, height: '0.5px', background: 'var(--bd0)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {children}
      </div>
    </div>
  )
}

function FilterPill({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '5px 9px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: active ? 'var(--amber-g)' : 'none',
        color: active ? 'var(--amber-b)' : 'var(--t2)',
        fontSize: '11.5px',
        border: 'none',
        fontFamily: '"DM Sans",sans-serif',
        transition: 'all 0.1s',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div style={{ width: '13px', height: '13px', border: `0.5px solid ${active ? 'var(--amber)' : 'var(--bd1)'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', background: active ? 'var(--amber)' : 'none', color: active ? '#000' : 'transparent', flexShrink: 0 }}>
        {active && '✓'}
      </div>
      {label}
      {count != null && (
        <span style={{ marginLeft: 'auto', fontSize: '9.5px', color: 'var(--t3)', fontFamily: '"DM Mono",monospace' }}>{count.toLocaleString()}</span>
      )}
    </button>
  )
}
