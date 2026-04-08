'use client'

import { useState } from 'react'
import type { PoliticianCard as PoliticianCardType, CabinetPosition } from '@/types/database'
import { POSITION_LABELS, POSITION_MULTIPLIERS } from '@/types/database'
import { StatBar } from '@/components/ui/StatBar'
import { PoliticianTags, Tag } from '@/components/ui/Tag'
import type { CardNewsTrailItem } from '@/types/database'

interface PoliticianCardProps {
  data: PoliticianCardType
  /** Whether this politician is in the user's active cabinet */
  cabinetPosition?: CabinetPosition | null
  /** Whether this politician is in the user's roster */
  inRoster?: boolean
  /** Show party change indicator if they defected post-draft */
  draftPartyAbbr?: string | null
  /** News trail items (passed in — fetched by parent Server Component) */
  newsTrail?: CardNewsTrailItem[]
  /** Callback when Draft button clicked */
  onDraft?: () => void
  /** Callback when clicking the card body (for detail navigation) */
  onClick?: () => void
}

export function PoliticianCard({
  data,
  cabinetPosition,
  inRoster,
  draftPartyAbbr,
  newsTrail,
  onDraft,
  onClick,
}: PoliticianCardProps) {
  const [trailOpen, setTrailOpen] = useState(false)
  const { politician: pol, stats, party } = data

  const score = Math.round(stats.composite_score)
  const delta7d = stats.composite_delta_7d ?? 0
  const isDisputed = stats.tag_disputed
  const isDefected = stats.tag_defected
  const partyChanged = draftPartyAbbr && draftPartyAbbr !== party.abbreviation

  // Status badge
  const statusLabel =
    pol.office_status === 'in_office'  ? 'In Office'
    : pol.office_status === 'opposition' ? 'In Opposition'
    : 'Former'

  const statusStyle: React.CSSProperties =
    pol.office_status === 'in_office'
      ? { background: 'rgba(78,158,110,.18)', color: 'var(--green)', border: '0.5px solid rgba(78,158,110,.25)' }
      : pol.office_status === 'opposition'
      ? { background: 'rgba(60,110,180,.13)', color: 'rgba(120,170,224,.85)', border: '0.5px solid rgba(60,110,180,.25)' }
      : { background: 'var(--bg3)', color: 'var(--t3)', border: '0.5px solid var(--bd0)' }

  const scoreColor =
    score >= 650 ? 'var(--amber-b)'
    : score >= 450 ? 'var(--t1)'
    : 'var(--red)'

  return (
    <div
      className="relative overflow-hidden flex flex-col cursor-pointer"
      style={{
        width: '272px',
        background: 'var(--bg1)',
        borderRadius: '14px',
        border: cabinetPosition
          ? '0.5px solid var(--amber-d)'
          : isDefected
          ? '0.5px solid rgba(212,90,90,.5)'
          : '0.5px solid var(--bd1)',
        boxShadow: cabinetPosition ? '0 0 0 1px var(--amber-d)' : undefined,
        transition: 'transform 0.18s, border-color 0.18s, box-shadow 0.18s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
      onClick={onClick}
    >
      {/* ── Portrait ── */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          height: '172px',
          background: isDefected ? '#120a0c' : cabinetPosition ? '#17170f' : 'var(--bg2)',
        }}
      >
        {/* Hatching texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(-45deg,transparent,transparent 3px,rgba(236,232,220,.012) 3px,rgba(236,232,220,.012) 4px)',
          }}
        />

        {/* Portrait placeholder — replaced by actual illustrated portrait */}
        {pol.portrait_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pol.portrait_url}
            alt={pol.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <svg width="88" height="116" viewBox="0 0 88 116" fill="none" style={{ opacity: 0.18 }}>
            <ellipse cx="44" cy="38" rx="22" ry="26" fill="#ece8dc" />
            <path d="M8 116C8 82 22 68 44 66C66 68 80 82 80 116" fill="#ece8dc" />
            <line x1="44" y1="66" x2="44" y2="92" stroke="#c8c4b8" strokeWidth="1.5" />
            <line x1="26" y1="74" x2="18" y2="116" stroke="#c8c4b8" strokeWidth="1.5" />
            <line x1="62" y1="74" x2="70" y2="116" stroke="#c8c4b8" strokeWidth="1.5" />
          </svg>
        )}

        {/* Portrait fade */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '64px',
            background: `linear-gradient(transparent, ${
              isDefected ? '#120a0c' : cabinetPosition ? '#17170f' : 'var(--bg1)'
            })`,
          }}
        />

        {/* Office status badge */}
        <div
          className="absolute top-[10px] left-[10px] flex items-center gap-[5px] text-[8.5px] font-semibold tracking-[0.09em] uppercase px-2 py-[2px] rounded-[3px]"
          style={statusStyle}
        >
          {pol.office_status === 'in_office' && <span className="live-dot" style={{ width: '4px', height: '4px' }} />}
          {statusLabel}
        </div>

        {/* Composite score badge */}
        <div
          className="absolute top-[10px] right-[10px] text-center rounded-lg px-[9px] py-[5px]"
          style={{
            background: 'rgba(12,12,10,.8)',
            border: '0.5px solid var(--bd1)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '17px', fontWeight: 500, color: isDisputed ? 'var(--t3)' : scoreColor, lineHeight: 1 }}>
            {isDisputed ? '???' : score}
          </div>
          {!isDisputed && (
            <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '9px', marginTop: '2px', color: delta7d >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {delta7d >= 0 ? '▲' : '▼'} {Math.abs(delta7d).toFixed(1)}
            </div>
          )}
          {isDisputed && (
            <div style={{ fontSize: '9px', marginTop: '2px', color: 'var(--t3)' }}>Frozen</div>
          )}
        </div>

        {/* Disputed overlay */}
        {isDisputed && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-[14px]"
            style={{ background: 'rgba(12,12,10,.6)', backdropFilter: 'blur(3px)', zIndex: 10 }}
          >
            <div className="text-center px-5">
              <div style={{ fontSize: '26px', marginBottom: '6px', opacity: 0.6 }}>⊘</div>
              <div style={{ fontSize: '11px', color: 'rgba(200,136,42,.85)', fontWeight: 600, marginBottom: '3px', letterSpacing: '0.04em' }}>
                Score Disputed
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--t3)' }}>Sources conflict · Frozen 48h</div>
            </div>
          </div>
        )}
      </div>

      {/* Cabinet position strip */}
      {cabinetPosition && (
        <div
          className="flex items-center justify-between px-[14px] py-[6px]"
          style={{ background: 'var(--amber-g)', borderTop: '0.5px solid var(--bd-a)' }}
        >
          <span className="text-[8.5px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--amber)' }}>
            {POSITION_LABELS[cabinetPosition]}
          </span>
          <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '9.5px', color: 'var(--amber-b)' }}>
            ×{POSITION_MULTIPLIERS[cabinetPosition].toFixed(1)}
          </span>
        </div>
      )}

      {/* ── Card body ── */}
      <div className="px-[14px] pt-[12px] pb-[13px]" onClick={e => e.stopPropagation()}>

        {/* Identity */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '15.5px', fontWeight: 600, color: 'var(--t1)', lineHeight: 1.2, marginBottom: '4px' }}>
            {pol.name}
          </div>
          <div className="flex items-center gap-[6px] flex-wrap">
            <span style={{ fontSize: '10.5px', color: 'var(--t3)' }}>
              {pol.constituency ?? 'Rajya Sabha'} · {pol.state}
            </span>
            <span style={{ color: 'var(--bd1)', fontSize: '10px' }}>·</span>
            <span
              className="text-[9px] font-semibold tracking-[0.05em] px-[6px] py-[1px] rounded-[3px]"
              style={{ color: 'var(--amber)', background: 'var(--amber-g)' }}
            >
              {party.abbreviation}
            </span>
          </div>

          {/* Party change indicator */}
          {partyChanged && (
            <div
              className="inline-flex items-center gap-1 text-[9.5px] px-[7px] py-[2px] rounded-[3px] mt-1"
              style={{ background: 'rgba(168,50,50,.13)', color: 'rgba(212,90,90,.85)' }}
            >
              ⚡ Drafted as: {draftPartyAbbr} · Now: {party.abbreviation}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-[9px] mt-[7px]">
          <PoliticianTags
            tagScamCloud={stats.tag_scam_cloud}
            tagSycophancy={stats.tag_sycophancy}
            tagBias={stats.tag_bias}
            tagDisputed={stats.tag_disputed}
            tagDefected={stats.tag_defected}
            tagRising={stats.tag_rising}
          />
        </div>

        {/* Stat bars */}
        {!isDisputed && (
          <div className="flex flex-col gap-[5px] mb-[10px]">
            <StatBar label="Infra"      value={stats.score_infrastructure ?? 50} />
            <StatBar label="Healthcare" value={stats.score_healthcare ?? 50} />
            <StatBar label="Education"  value={stats.score_education ?? 50} />
            <StatBar label="Economy"    value={stats.score_jobs_economy ?? 50} />
            <StatBar label="Approval"   value={stats.score_approval ?? 50} />
            <StatBar label="Vote share" value={stats.score_vote_share ?? 50} />
          </div>
        )}

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--bd0)', marginBottom: '10px' }} />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div style={{ fontSize: '9.5px', color: 'var(--t3)' }}>
            <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10.5px', color: 'var(--t2)' }}>
              {stats.sentiment_hold_pct != null ? `${stats.sentiment_hold_pct}%` : '—'}
            </span>{' '}
            of players hold
          </div>

          <div className="flex gap-[6px]">
            {newsTrail && newsTrail.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setTrailOpen(o => !o) }}
                className="text-[9.5px] rounded-[3px] px-2 py-[3px] transition-all duration-100"
                style={{
                  color: 'var(--t3)',
                  background: 'none',
                  border: '0.5px solid var(--bd0)',
                  cursor: 'pointer',
                  fontFamily: '"DM Sans",sans-serif',
                }}
              >
                Trail {trailOpen ? '▴' : '▾'}
              </button>
            )}
            {onDraft && !inRoster && (
              <button
                onClick={e => { e.stopPropagation(); onDraft() }}
                className="text-[10px] rounded-[3px] px-2 py-[3px] transition-all duration-100"
                style={{
                  color: 'var(--amber)',
                  background: 'var(--amber-g)',
                  border: '0.5px solid var(--bd-a)',
                  cursor: 'pointer',
                  fontFamily: '"DM Sans",sans-serif',
                }}
              >
                + Draft
              </button>
            )}
            {inRoster && (
              <span className="text-[9.5px] px-2 py-[3px] rounded-[3px]" style={{ color: 'var(--amber)', background: 'var(--amber-g)' }}>
                In Roster
              </span>
            )}
          </div>
        </div>

        {/* News trail drawer */}
        {trailOpen && newsTrail && newsTrail.length > 0 && (
          <div style={{ borderTop: '0.5px solid var(--bd0)', marginTop: '10px', paddingTop: '9px' }}>
            {newsTrail.slice(0, 5).map(item => (
              <div
                key={item.event_id}
                className="flex items-start gap-[7px] py-[4px]"
                style={{ borderBottom: '0.5px solid var(--bd0)' }}
              >
                <div
                  style={{
                    fontFamily: '"DM Mono",monospace',
                    fontSize: '9.5px',
                    fontWeight: 500,
                    minWidth: '30px',
                    textAlign: 'right',
                    flexShrink: 0,
                    color: item.delta >= 0 ? 'var(--green)' : 'var(--red)',
                  }}
                >
                  {item.delta >= 0 ? '+' : ''}{item.delta.toFixed(1)}
                </div>
                <div style={{ fontSize: '9.5px', color: 'var(--t2)', lineHeight: 1.4, flex: 1 }}>
                  {item.headline ?? item.reasoning ?? 'Score event'}
                </div>
                <div
                  className="flex-shrink-0 px-[5px] py-[1px] rounded-[2px] text-[8.5px]"
                  style={{ background: 'var(--bg3)', color: 'var(--t3)', fontFamily: '"DM Mono",monospace' }}
                >
                  T{item.source_tier}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
