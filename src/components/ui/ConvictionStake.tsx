'use client'

import { InfoPop, INFO } from '@/components/ui/InfoPop'

import { useState, useTransition } from 'react'
import { stakeConviction } from '@/lib/actions/conviction'
import { CONVICTION_LEVELS, DEFAULT_CONVICTION } from '@/types/database'
import type { ConvictionLevel } from '@/types/database'

interface HerdData {
  total_stakes: number
  certain_pct:  number
  believe_pct:  number
  neutral_pct:  number
  cautious_pct: number
  doubt_pct:    number
  high_pct:     number   // backward compat — equals certain_pct
  is_consensus: boolean
}

interface ConvictionStakeProps {
  politicianId:   string
  politicianName: string
  gameweek:       number
  season:         string
  existingStake?: ConvictionLevel | null
  herd?:          HerdData | null
  stakingOpen:    boolean
}

export function ConvictionStake({
  politicianId,
  politicianName,
  gameweek,
  season,
  existingStake,
  herd,
  stakingOpen,
}: ConvictionStakeProps) {
  const [selected,   setSelected]   = useState<ConvictionLevel>(existingStake ?? DEFAULT_CONVICTION)
  const [saved,      setSaved]      = useState(!!existingStake)
  const [isPending,  startTransition] = useTransition()
  const [saveError,  setSaveError]  = useState<string | null>(null)

  const currentLevel = CONVICTION_LEVELS.find(l => l.value === selected)!
  const currentIdx   = CONVICTION_LEVELS.findIndex(l => l.value === selected)

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    if (!stakingOpen || isPending) return
    const idx = parseInt(e.target.value)
    setSelected(CONVICTION_LEVELS[idx].value)
    setSaved(false)
    setSaveError(null)
  }

  function handleSave() {
    if (!stakingOpen || isPending) return
    setSaveError(null)
    startTransition(async () => {
      const result = await stakeConviction({ politicianId, conviction: selected, gameweek, season })
      if (result.error) {
        setSaveError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  const showHerd = herd && herd.total_stakes >= 10
  const locked   = !stakingOpen

  return (
    <div style={{
      borderTop: '0.5px solid var(--bd0)',
      paddingTop: '10px',
      marginTop: '8px',
    }}>

      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '9px',
      }}>
        <InfoPop {...(locked ? INFO.conviction_lock : INFO.conviction_slider)} inline={false}>
          <span style={{
            fontSize: '8px', fontWeight: 700, letterSpacing: '.12em',
            textTransform: 'uppercase', color: 'var(--t4)',
            fontFamily: '"DM Sans",sans-serif',
          }}>
            {locked ? 'Conviction locked' : 'Conviction'}
          </span>
        </InfoPop>

        {showHerd && (() => {
          const bullish = Math.round((herd!.certain_pct + herd!.believe_pct) * 100)
          const bearish = Math.round((herd!.doubt_pct + herd!.cautious_pct) * 100)
          const label = bullish > 50 ? `${bullish}% bullish` : bearish > 50 ? `${bearish}% bearish` : 'mixed reads'
          const herdInfo = bullish > 50 ? INFO.conviction_herd_bullish : INFO.conviction_herd_bearish
          return (
            <InfoPop {...herdInfo}>
            <span style={{
              fontSize: '9px',
              color: bullish > 50 ? 'var(--green)' : bearish > 50 ? 'var(--red)' : 'var(--t4)',
              fontFamily: '"DM Mono",monospace', letterSpacing: '.04em',
            }}>
              {label} · {herd!.total_stakes} players
            </span>
            </InfoPop>
          )
        })()}
      </div>

      {/* Slider */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        {/* Track fill behind slider */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: '3px', transform: 'translateY(-50%)',
          background: 'var(--bd0)', borderRadius: '2px', pointerEvents: 'none',
        }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            width: `${currentLevel.fillPct}%`,
            background: currentLevel.color,
            transition: 'width 0.15s, background 0.15s',
          }} />
        </div>

        <input
          type="range"
          min={0}
          max={4}
          step={1}
          value={currentIdx}
          disabled={locked || isPending}
          onChange={handleSlider}
          className="conviction-slider"
          style={{
            width: '100%', position: 'relative', zIndex: 1,
            background: 'transparent', height: '18px',
            cursor: locked ? 'default' : 'pointer',
            outline: 'none',
            color: currentLevel.color,
          }}
        />
      </div>

      {/* Level label + multiplier hint */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '9px',
      }}>
        <InfoPop {...INFO[`conviction_${currentLevel.value}` as keyof typeof INFO] ?? INFO.conviction_slider}>
          <span style={{
            fontSize: '12px', fontWeight: 600,
            color: currentLevel.color,
            fontFamily: '"DM Sans",sans-serif',
            transition: 'color 0.15s',
          }}>
            {currentLevel.label}
          </span>
        </InfoPop>

        <span style={{
          fontSize: '9.5px', color: 'var(--t3)',
          fontFamily: '"DM Mono",monospace',
        }}>
          {currentLevel.multiplierUp > 1
            ? `+${Math.round((currentLevel.multiplierUp - 1) * 100)}% on good weeks`
            : currentLevel.multiplierDown > 1
            ? `−${Math.round((currentLevel.multiplierDown - 1) * 100)}% on good weeks`
            : 'no amplification'}
        </span>
      </div>

      {/* Level tick labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        {CONVICTION_LEVELS.map(l => (
          <span
            key={l.value}
            style={{
              fontSize: '8px', letterSpacing: '.04em',
              color: l.value === selected ? l.color : 'var(--t4)',
              fontFamily: '"DM Sans",sans-serif',
              fontWeight: l.value === selected ? 700 : 400,
              transition: 'color 0.15s',
              cursor: locked ? 'default' : 'pointer',
            }}
            onClick={() => {
              if (!locked && !isPending) {
                setSelected(l.value)
                setSaved(false)
              }
            }}
          >
            {l.label}
          </span>
        ))}
      </div>

      {/* Error */}
      {saveError && (
        <div style={{
          fontSize: '10.5px', color: 'var(--red)',
          marginBottom: '7px', fontFamily: '"DM Sans",sans-serif',
        }}>
          {saveError}
        </div>
      )}

      {/* Save / locked state */}
      {stakingOpen ? (
        <button
          onClick={handleSave}
          disabled={isPending || (saved && selected === existingStake)}
          style={{
            width: '100%', padding: '6px',
            background: saved ? 'rgba(27,107,58,.08)' : 'var(--bg3)',
            border: `0.5px solid ${saved ? 'rgba(27,107,58,.25)' : 'var(--bd0)'}`,
            borderRadius: '8px',
            fontFamily: '"DM Sans",sans-serif',
            fontSize: '10.5px', fontWeight: 600,
            color: saved ? 'var(--green)' : 'var(--t2)',
            cursor: (isPending || (saved && selected === existingStake)) ? 'default' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {isPending ? 'Saving…' : saved ? '✓ Conviction set' : 'Set conviction'}
        </button>
      ) : (
        <div style={{
          fontSize: '9.5px', color: 'var(--t4)',
          fontFamily: '"DM Mono",monospace', letterSpacing: '.04em',
          textAlign: 'center', paddingTop: '2px',
        }}>
          Locked until Sunday midnight · resolves at rank lock
        </div>
      )}

    </div>
  )
}
