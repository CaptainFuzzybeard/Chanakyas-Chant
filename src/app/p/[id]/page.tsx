import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getPoliticianDetail, getPoliticianNewsTrail, getPoliticianSentiment, getRosterPoliticianIds } from '@/lib/queries/politicians'
import { getUserCabinets } from '@/lib/queries/cabinet'
import { StatBar, PenaltyBar } from '@/components/ui/StatBar'
import { PoliticianTags } from '@/components/ui/Tag'
import { BackToCardBank } from '@/components/ui/BackToCardBank'
import { DetailTutorial } from './DetailTutorial'
import { CardReadingGuide } from '@/components/ui/CardReadingGuide'
import { DraftButton } from './DraftButton'
import { LiveScoreUpdater } from '@/components/live/LiveScoreUpdater'
import { ScoreExplainer } from '@/components/ui/ScoreExplainer'
import { InfoPop, INFO } from '@/components/ui/InfoPop'
import { ConvictionStake } from '@/components/ui/ConvictionStake'
import { getUserStakesForGameweek, getHerdSummary } from '@/lib/actions/conviction'
import { isStakingOpen, getCurrentGameweek, getCurrentSeason } from '@/lib/utils/gameweek'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const card = await getPoliticianDetail(id)
  if (!card) return { title: "Chanakya's Chant" }

  const score = Math.round(card.stats?.composite_score ?? 0)
  const party = card.party?.abbreviation ?? ''
  const name  = card.politician.name
  const state = card.politician.state ?? 'India'
  const title = `${name} · ${party} — Chanakya's Chant`
  const desc  = `${name} (${party}, ${state}) scores ${score.toLocaleString('en-IN')} in the Indian politics fantasy league. Track real governance performance.`

  return {
    title,
    description: desc,
    openGraph: { title, description: desc, siteName: "Chanakya's Chant", type: 'website' },
    twitter:    { card: 'summary', title, description: desc },
  }
}

export default async function PoliticianDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const gameweek = getCurrentGameweek()
  const season   = getCurrentSeason()
  const stakingWindowOpen = isStakingOpen()

  const [card, trail, sentiment, cabinets] = await Promise.all([
    getPoliticianDetail(id),
    getPoliticianNewsTrail(id, 10),
    getPoliticianSentiment(id),
    getUserCabinets(),
  ])

  if (!card) notFound()

  const rosterIds  = cabinets.length ? await getRosterPoliticianIds(cabinets[0].id) : new Set<string>()
  const inRoster   = rosterIds.has(id)
  const rosterCount = rosterIds.size
  const cabinetId = cabinets[0]?.id ?? null

  // Conviction data for this politician (only if in roster)
  const existingStakesMap = inRoster
    ? await getUserStakesForGameweek(gameweek, season)
    : {}
  const existingStake = existingStakesMap[id] ?? null
  const herdMap = inRoster
    ? await getHerdSummary([id], gameweek, season)
    : {}
  const herd = herdMap[id] ?? null

  const { politician: pol, stats, party } = card
  const isOpp = pol.office_status === 'opposition'

  const statRows = [
    { label: 'Infrastructure',  val: stats.score_infrastructure, window: '90d avg' },
    { label: 'Healthcare',      val: stats.score_healthcare,     window: '90d avg' },
    { label: 'Education',       val: stats.score_education,      window: '90d avg' },
    { label: 'Jobs / Economy',  val: stats.score_jobs_economy,   window: '30d avg' },
    { label: 'Approval Rating', val: stats.score_approval,       window: 'direct'  },
    { label: 'Vote Share',      val: stats.score_vote_share,     window: 'trailing' },
  ]

  const bestPositions = [
    pol.office_status === 'in_office' ? { pos: 'PM / CM', mult: '×1.5', condition: 'Always' } : null,
    stats.score_infrastructure != null && stats.score_infrastructure >= 70
      ? { pos: 'Infrastructure', mult: '×1.2', condition: `Infra ${Math.round(stats.score_infrastructure)}` } : null,
    stats.score_healthcare != null && stats.score_healthcare >= 70
      ? { pos: 'Health', mult: '×1.2', condition: `Health ${Math.round(stats.score_healthcare)}` } : null,
    stats.score_education != null && stats.score_education >= 70
      ? { pos: 'Education', mult: '×1.2', condition: `Edu ${Math.round(stats.score_education)}` } : null,
    stats.score_jobs_economy != null && stats.score_jobs_economy >= 70
      ? { pos: 'Finance / Commerce', mult: '×1.2', condition: `Economy ${Math.round(stats.score_jobs_economy)}` } : null,
  ].filter(Boolean) as { pos: string; mult: string; condition: string }[]

  return (
    <>
      <DetailTutorial />
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '28px 28px 60px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

      {/* ── Left ── */}
      <div>
        {/* Breadcrumb with filter preservation */}
        <BackToCardBank politicianName={pol.name} />

        {/* Reading guide — permanent, collapsible, remembers state */}
        <CardReadingGuide />

        {/* Hero */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd1)', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
          {/* Tricolour stripe */}
          <div style={{ height: '5px', display: 'flex' }}>
            <div style={{ flex: 1, background: '#E8642A' }} />
            <div style={{ flex: 1, background: '#fff' }} />
            <div style={{ flex: 1, background: '#1B6B3A' }} />
          </div>
          {/* Portrait */}
          <div style={{ height: '220px', background: 'var(--navy-m)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {pol.portrait_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pol.portrait_url} alt={pol.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="120" height="158" viewBox="0 0 120 158" fill="none" style={{ opacity: 0.15 }}>
                <ellipse cx="60" cy="52" rx="30" ry="36" fill="#ece8dc"/>
                <path d="M10 158C10 112 28 94 60 90C92 94 110 112 110 158" fill="#ece8dc"/>
              </svg>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, var(--bg1))' }} />

            {/* Status badge */}
            <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '3px', zIndex: 2, ...(
              pol.office_status === 'in_office'
                ? { background: 'rgba(78,158,110,.18)', color: 'var(--green)', border: '0.5px solid rgba(78,158,110,.25)' }
                : pol.office_status === 'opposition'
                ? { background: 'rgba(60,110,180,.13)', color: 'rgba(120,170,224,.85)', border: '0.5px solid rgba(60,110,180,.25)' }
                : { background: 'var(--bg3)', color: 'var(--t3)', border: '0.5px solid var(--bd0)' }
            ) }}>
              {pol.office_status === 'in_office' && <span className="live-dot" style={{ width: '4px', height: '4px' }} />}
              {pol.office_status === 'in_office' ? 'In Office' : pol.office_status === 'opposition' ? 'Opposition' : 'Former'}
            </div>

            {/* Live score badge — Realtime */}
            <LiveScoreUpdater
              politicianId={pol.id}
              initialScore={Math.round(stats.composite_score)}
              initialDelta7d={stats.composite_delta_7d}
            >
              {(score, delta7d, justUpdated) => (
                <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(15,27,45,0.92)', border: `0.5px solid ${justUpdated ? 'var(--amber-b)' : 'rgba(232,100,42,0.3)'}`, borderRadius: '10px', padding: '8px 14px', textAlign: 'center', backdropFilter: 'blur(8px)', zIndex: 2, transition: 'border-color 0.3s' }}>
                  <InfoPop {...INFO.composite_score}>
                    <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '24px', fontWeight: 700, color: justUpdated ? 'var(--amber-b)' : 'white', lineHeight: 1, transition: 'color 0.3s' }}>{score}</div>
                  </InfoPop>
                  {delta7d != null && (
                    <InfoPop {...INFO.composite_delta}>
                    <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', marginTop: '2px', color: delta7d >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {delta7d >= 0 ? '▲' : '▼'} {Math.abs(delta7d).toFixed(1)} this week
                    </div>
                    </InfoPop>
                  )}
                  {justUpdated && (
                    <div style={{ fontSize: '8px', color: 'var(--amber)', marginTop: '2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live</div>
                  )}
                </div>
              )}
            </LiveScoreUpdater>
          </div>

          {/* Hero body */}
          <div style={{ padding: '16px 18px 18px' }}>
            <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '26px', fontWeight: 700, color: 'var(--t1)', lineHeight: 1.1, marginBottom: '6px' }}>
              {pol.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                {pol.constituency ?? 'Rajya Sabha'} · {pol.state}
              </span>
              <span style={{ color: 'var(--bd1)' }}>·</span>
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--amber)', background: 'var(--amber-g)', padding: '2px 8px', borderRadius: '3px' }}>
                {party.abbreviation}
              </span>
              {party.alliance && (
                <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{party.alliance}</span>
              )}
            </div>

            {/* Opposition note */}
            {isOpp && (
              <div style={{ fontSize: '11px', color: 'rgba(120,170,224,.85)', background: 'rgba(60,110,180,.1)', border: '0.5px solid rgba(60,110,180,.2)', borderRadius: '6px', padding: '6px 10px', marginBottom: '8px', lineHeight: 1.4 }}>
                <strong>Opposition MP</strong> — scores points from the bench. Cannot hold a ministry position unless their party forms government.
              </div>
            )}

            <PoliticianTags
              tagScamCloud={stats.tag_scam_cloud}
              tagSycophancy={stats.tag_sycophancy}
              tagBias={stats.tag_bias}
              tagDisputed={stats.tag_disputed}
              tagDefected={stats.tag_defected}
              tagRising={stats.tag_rising}
            />
          </div>
        </div>

        {/* Stats */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '16px 18px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)' }}>Stat Tracks</div>
            <div style={{ fontSize: '10px', color: 'var(--t3)' }}>
              Tap score → for breakdown
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {statRows.map(row => row.val != null && (
              <StatBar key={row.label} label={row.label} value={row.val} showWindow={row.window} />
            ))}
          </div>
          {(stats.penalty_scam > 0 || stats.penalty_bias > 0) && (
            <>
              <div style={{ height: '0.5px', background: 'var(--bd0)', margin: '10px 0' }} />
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '8px' }}>Active Penalties</div>
              <InfoPop {...INFO.penalty_scam} inline={false}>
                <PenaltyBar value={stats.penalty_scam * 100} label="Scam cloud" />
              </InfoPop>
              <InfoPop {...INFO.penalty_bias} inline={false}>
                <PenaltyBar value={stats.penalty_bias * 100} label="Bias tag" />
              </InfoPop>
            </>
          )}
        </div>

        {/* Profile summary — AI-generated, shown if available */}
        {pol.profile_bio && (
          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '16px 18px', marginBottom: '16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px' }}>Profile</div>
            <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.7 }}>
              {pol.profile_bio}
            </div>
          </div>
        )}

        {/* News trail */}
        {trail.length > 0 && (
          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '16px 18px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '14px' }}>Score History</div>
            {trail.map(item => {
              const EVENT_LABELS: Record<string, string> = {
                infrastructure_completion: 'Infrastructure',
                healthcare_outcome:        'Healthcare',
                education_outcome:         'Education',
                economic_data:             'Economy',
                election_result:           'Election',
                scam_confirmed:            'Scam confirmed',
                scam_allegation:           'Allegation',
                communal_speech:           'Communal speech',
                approval_survey:           'Approval survey',
                defection:                 'Defection',
                criminal_conviction:       'Conviction',
              }
              const eventLabel = item.event_type ? EVENT_LABELS[item.event_type] ?? item.event_type : null
              return (
              <div key={item.event_id} style={{ display: 'flex', gap: '10px', padding: '9px 0', borderBottom: '0.5px solid var(--bd0)', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '11px', fontWeight: 500, minWidth: '36px', textAlign: 'right', flexShrink: 0, marginTop: '1px', color: item.delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {item.delta >= 0 ? '+' : ''}{item.delta.toFixed(1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                    {eventLabel && (() => {
                      const isDefection = item.event_type === 'defection'
                      const badge = (
                        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: '2px', background: 'var(--bg3)', color: isDefection ? 'var(--red)' : 'var(--t3)', flexShrink: 0 }}>
                          {eventLabel}
                        </span>
                      )
                      const eventInfoMap: Record<string, keyof typeof INFO> = {
                        defection:                'defection_penalty',
                        scam_allegation:          'penalty_scam',
                        scam_confirmed:           'penalty_scam',
                        criminal_conviction:      'penalty_scam',
                        communal_speech:          'penalty_bias',
                        infrastructure_completion:'track_infrastructure',
                        healthcare_outcome:       'track_healthcare',
                        education_outcome:        'track_education',
                        economic_data:            'track_economy',
                        approval_survey:          'track_approval',
                        election_result:          'track_vote_share',
                      }
                      const infoKey = item.event_type ? eventInfoMap[item.event_type] : undefined
                      return <InfoPop {...(infoKey ? INFO[infoKey] : INFO.event_type_badge)}>{badge}</InfoPop>
                    })()}
                    <div style={{ fontSize: '12px', color: 'var(--t1)', lineHeight: 1.4 }}>
                      {item.headline ?? 'Score event'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--t3)', flexWrap: 'wrap' }}>
                    {item.corroborating_source_count === 0 && (item.source_tier ?? 0) >= 3 && (
                      <InfoPop {...INFO.corroboration_pending}>
                        <span style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: '2px', background: 'rgba(200,160,10,.1)', color: 'var(--amber-d)', border: '0.5px solid rgba(200,160,10,.2)', flexShrink: 0 }}>
                          pending
                        </span>
                      </InfoPop>
                    )}
                    {item.source_domain && (
                      item.source_url
                        ? <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--bg3)', padding: '1px 6px', borderRadius: '2px', fontFamily: '"DM Mono",monospace', color: 'var(--amber)', textDecoration: 'none' }}>{item.source_domain} ↗</a>
                        : <span style={{ background: 'var(--bg3)', padding: '1px 6px', borderRadius: '2px', fontFamily: '"DM Mono",monospace' }}>{item.source_domain}</span>
                    )}
                    {item.source_tier && (() => {
                      const tierKey = item.source_tier <= 1 ? 'source_tier_1'
                        : item.source_tier === 2 ? 'source_tier_2'
                        : item.source_tier === 3 ? 'source_tier_3'
                        : 'source_tier_discounted'
                      return (
                        <InfoPop {...INFO[tierKey as keyof typeof INFO]}>
                          <span style={{ color: 'var(--amber-d)' }}>Tier {item.source_tier}</span>
                        </InfoPop>
                      )
                    })()}
                    <span style={{ marginLeft: 'auto' }}>{new Date(item.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {item.reasoning && (
                    <div style={{ fontSize: '10.5px', color: 'var(--t3)', fontStyle: 'italic', marginTop: '2px', lineHeight: 1.4 }}>
                      {item.reasoning}
                    </div>
                  )}
                </div>
              </div>
              )
            })}            
          </div>
        )}
      </div>

      {/* ── Right ── */}
      <div>
        {/* Score — with explainer */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '9px' }}>Composite Score</div>
          <LiveScoreUpdater politicianId={pol.id} initialScore={Math.round(stats.composite_score)} initialDelta7d={stats.composite_delta_7d}>
            {(score, delta7d, justUpdated) => (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '42px', fontWeight: 700, color: justUpdated ? 'var(--amber-b)' : 'var(--t1)', lineHeight: 1, transition: 'color 0.3s' }}>
                    <ScoreExplainer stats={stats} politicianName={pol.name} />
                  </div>
                  <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '12px', color: 'var(--t3)' }}>/1000</span>
                </div>
                {delta7d != null && (
                  <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '12px', color: delta7d >= 0 ? 'var(--green)' : 'var(--red)', marginBottom: '4px' }}>
                    {delta7d >= 0 ? '▲' : '▼'} {Math.abs(delta7d).toFixed(1)} this week
                  </div>
                )}
                {justUpdated && (
                  <div style={{ fontSize: '9px', color: 'var(--amber)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Score just updated live</div>
                )}
              </div>
            )}
          </LiveScoreUpdater>
        </div>

        {/* Details */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px' }}>Details</div>
          {[
            { key: 'Party',        val: party.name },
            { key: 'Alliance',     val: party.alliance ?? '—' },
            { key: 'Constituency', val: pol.constituency ?? 'Rajya Sabha' },
            { key: 'State',        val: pol.state },
            { key: 'Gender',       val: pol.gender ?? '—' },
            { key: 'Terms served', val: pol.terms_served?.toString() ?? '—' },
            { key: 'Tier',         val: pol.tier === 'national' ? 'National (Lok Sabha)' : 'State (MLA)' },
            { key: 'Status',       val: pol.office_status === 'in_office' ? 'In Office' : pol.office_status === 'opposition' ? 'In Opposition' : 'Former' },
          ].map(({ key, val }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--bd0)', fontSize: '11.5px' }}>
              <span style={{ color: 'var(--t3)' }}>{key}</span>
              <span style={{ color: 'var(--t1)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Sentiment */}
        {sentiment && (
          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px' }}>Player Sentiment</div>
            <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '28px', fontWeight: 500, color: 'var(--amber-b)', lineHeight: 1, marginBottom: '2px' }}>
              {sentiment.hold_pct.toFixed(1)}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '10px' }}>of active players hold this politician</div>
            <div style={{ height: '4px', background: 'var(--bd0)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', background: 'var(--amber)', borderRadius: '2px', width: `${Math.min(100, sentiment.hold_pct)}%` }} />
            </div>
            {sentiment.defection_drop_pct != null && (
              <div style={{ fontSize: '10.5px', color: 'var(--t3)', lineHeight: 1.4 }}>
                <span style={{ color: 'var(--red)' }}>{sentiment.defection_drop_pct.toFixed(0)}%</span> dropped during last defection window
              </div>
            )}
          </div>
        )}

        {/* Best positions */}
        {bestPositions.length > 0 && pol.office_status === 'in_office' && (
          <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px' }}>Best Cabinet Positions</div>
            {bestPositions.slice(0, 3).map(bp => (
              <div key={bp.pos} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--bd0)', fontSize: '11.5px' }}>
                <span style={{ color: 'var(--t2)' }}>{bp.pos}</span>
                <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10.5px', color: 'var(--green)' }}>{bp.mult} · {bp.condition}</span>
              </div>
            ))}
          </div>
        )}

        {/* Conviction — only show when politician is in user's roster */}
        {inRoster && (
          <div style={{ marginBottom: '14px' }}>
            <ConvictionStake
              politicianId={pol.id}
              politicianName={pol.name}
              gameweek={gameweek}
              season={season}
              existingStake={existingStake}
              herd={herd}
              stakingOpen={stakingWindowOpen}
            />
          </div>
        )}

        {/* Draft CTA */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '10px', lineHeight: 1.4 }}>
            {inRoster ? (
              <><strong style={{ color: 'var(--t1)' }}>In your roster.</strong> Go to Cabinet Builder to assign a position.</>
            ) : pol.office_status === 'former' ? (
              <span style={{ color: 'var(--t3)' }}>This politician is no longer in any elected capacity and cannot be drafted.</span>
            ) : (
              <>{pol.office_status === 'opposition'
                ? <><strong style={{ color: 'var(--t1)' }}>Opposition MP.</strong> Can be drafted — scores from the bench. Cannot hold a ministry position.</>
                : <><strong style={{ color: 'var(--t1)' }}>Not in your roster.</strong> Add them to assign a ministry position.</>
              }</>
            )}
          </div>
          {pol.office_status !== 'former' && (
            <DraftButton politicianId={pol.id} cabinetId={cabinetId} inRoster={inRoster} rosterCount={rosterCount} />
          )}
          {inRoster && (
            <a href="/cabinet" style={{ display: 'block', textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--amber)', textDecoration: 'none' }}>
              Cabinet Builder →
            </a>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
