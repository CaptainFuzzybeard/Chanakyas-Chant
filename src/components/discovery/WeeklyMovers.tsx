import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface MoverRow {
  politician_id:      string
  name:               string
  party_abbreviation: string | null
  state:              string
  constituency:       string | null
  portrait_url:       string | null
  composite_score:    number
  composite_delta_7d: number
  tag_rising:         boolean
  tag_scam_cloud:     boolean
  tag_defected:       boolean
}

export async function WeeklyMovers() {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_weekly_movers', {
    p_limit:     8,
    p_direction: 'both',
    p_min_move:  5.0,
    p_status:    'in_office',
  })

  if (error || !data?.length) return null

  const movers = data as MoverRow[]
  const risers = movers.filter(m => m.composite_delta_7d > 0).slice(0, 4)
  const fallers = movers.filter(m => m.composite_delta_7d < 0).slice(0, 4)

  return (
    <div
      style={{
        background: 'var(--bg1)',
        border: '0.5px solid var(--bd0)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px',
        borderBottom: '0.5px solid var(--bd0)',
      }}>
        <div>
          <div style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: '16px', fontWeight: 700,
            color: 'var(--t1)',
          }}>
            This Week&apos;s Biggest Movers
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t4)', marginTop: '1px' }}>
            Politicians with the largest score changes in 7 days
          </div>
        </div>
        <Link
          href="/card-bank?sort=rising"
          style={{
            fontSize: '12px', color: 'var(--amber-b)',
            fontWeight: 500, textDecoration: 'none',
          }}
        >
          See all →
        </Link>
      </div>

      {/* Two columns: up / down */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

        {/* Risers */}
        <div style={{ borderRight: '1px solid var(--bd0)' }}>
          <div style={{
            padding: '8px 14px',
            fontSize: '9px', fontWeight: 700, letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: 'var(--green)',
            borderBottom: '0.5px solid var(--bd0)',
            background: 'rgba(27,107,58,.04)',
          }}>
            ↑ Rising
          </div>
          {risers.map((m, i) => (
            <MoverRow key={m.politician_id} row={m} i={i} total={risers.length} />
          ))}
        </div>

        {/* Fallers */}
        <div>
          <div style={{
            padding: '8px 14px',
            fontSize: '9px', fontWeight: 700, letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: 'var(--red)',
            borderBottom: '0.5px solid var(--bd0)',
            background: 'rgba(192,57,43,.04)',
          }}>
            ↓ Falling
          </div>
          {fallers.map((m, i) => (
            <MoverRow key={m.politician_id} row={m} i={i} total={fallers.length} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MoverRow({ row, i, total }: { row: MoverRow; i: number; total: number }) {
  const isUp   = row.composite_delta_7d > 0
  const delta  = Math.abs(row.composite_delta_7d)
  const isLast = i === total - 1

  return (
    <Link
      href={`/p/${row.politician_id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--bd0)',
        textDecoration: 'none',
        transition: 'background .12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bd0)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* Avatar */}
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%',
        background: 'var(--navy)',
        overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {row.portrait_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.portrait_url} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <svg viewBox="0 0 34 34" width="34" height="34" fill="none">
            <ellipse cx="17" cy="13" rx="7" ry="8" fill="#D4956A" opacity=".8"/>
            <path d="M4 34C4 24 8 20 17 18C26 20 30 24 30 34" fill="#1E3A5F" opacity=".8"/>
          </svg>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12.5px', fontWeight: 600,
          color: 'var(--t1)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {row.name}
        </div>
        <div style={{
          fontSize: '10px', color: 'var(--t4)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {row.party_abbreviation} · {row.constituency ?? row.state}
        </div>
      </div>

      {/* Score + delta */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: '"DM Mono",monospace',
          fontSize: '14px', fontWeight: 500,
          color: 'var(--t1)', lineHeight: 1,
        }}>
          {Math.round(row.composite_score)}
        </div>
        <div style={{
          fontFamily: '"DM Mono",monospace',
          fontSize: '11px', fontWeight: 500, marginTop: '1px',
          color: isUp ? 'var(--green)' : 'var(--red)',
        }}>
          {isUp ? '▲' : '▼'} {delta.toFixed(1)}
        </div>
      </div>
    </Link>
  )
}
