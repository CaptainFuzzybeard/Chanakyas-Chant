'use client'

import { useEffect, useRef } from 'react'
import { InfoPop, INFO } from './InfoPop'

interface StatBarProps {
  value: number          // 0–100
  label: string
  showValue?: boolean
  showWindow?: string    // e.g. "90d avg"
  className?: string
}

function getBarClass(value: number): string {
  if (value >= 65) return 'hi'
  if (value >= 40) return 'mid'
  return 'lo'
}

function getBarColor(value: number): string {
  if (value >= 65) return 'var(--green)'
  if (value >= 40) return 'var(--gold)'
  return 'var(--red)'
}

export function StatBar({ value, label, showValue = true, showWindow, className }: StatBarProps) {
  const fillRef = useRef<HTMLDivElement>(null)

  // Animate bar width on mount
  useEffect(() => {
    if (!fillRef.current) return
    const el = fillRef.current
    // Start at 0, animate to value
    el.style.width = '0%'
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'width 0.5s cubic-bezier(0.16,1,0.3,1)'
      el.style.width = `${Math.min(100, Math.max(0, value))}%`
    })
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Label — each track has an InfoPop story */}
      {(() => {
        const trackKey: Record<string, keyof typeof INFO> = {
          'Infrastructure': 'track_infrastructure',
          'Healthcare':     'track_healthcare',
          'Education':      'track_education',
          'Economy':        'track_economy',
          'Approval':       'track_approval',
          'Vote share':     'track_vote_share',
        }
        const infoKey = trackKey[label]
        const labelEl = (
          <div
            style={{ flexShrink: 0, fontSize: '8.5px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', width: '80px' }}
          >
            {label}
          </div>
        )
        return infoKey
          ? <InfoPop {...INFO[infoKey]} inline={false}>{labelEl}</InfoPop>
          : labelEl
      })()}

      {/* Bar */}
      <div
        style={{ flex: 1, borderRadius: '2px', overflow: 'hidden', height: '3px', background: 'var(--bd0)' }}
      >
        <div
          ref={fillRef}
          style={{
            height: '100%',
            borderRadius: '2px',
            width: '0%',
            background: getBarColor(value),
          }}
        />
      </div>

      {/* Value */}
      {showValue && (
        <div
          style={{
            flexShrink: 0,
            textAlign: 'right',
            fontFamily: '"DM Mono", monospace',
            fontSize: '9.5px',
            color: 'var(--t2)',
            width: '20px',
          }}
        >
          {Math.round(value)}
        </div>
      )}

      {/* Window label */}
      {showWindow && (
        <div
          style={{ flexShrink: 0, textAlign: 'right', fontSize: '8.5px', color: 'var(--t3)', width: '48px' }}
        >
          {showWindow}
        </div>
      )}
    </div>
  )
}

/** Penalty bar — red only, subtractive */
export function PenaltyBar({ value, label }: { value: number; label: string }) {
  const fillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fillRef.current || value <= 0) return
    const el = fillRef.current
    el.style.width = '0%'
    requestAnimationFrame(() => {
      el.style.transition = 'width 0.5s cubic-bezier(0.16,1,0.3,1)'
      el.style.width = `${Math.min(100, value)}%`
    })
  }, [value])

  if (value <= 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{ flexShrink: 0, fontSize: '8.5px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(212,90,90,0.7)', width: '80px' }}
      >
        {label}
      </div>
      <div
        style={{ flex: 1, borderRadius: '2px', overflow: 'hidden', height: '3px', background: 'var(--bd0)' }}
      >
        <div
          ref={fillRef}
          style={{ height: '100%', borderRadius: '2px', width: '0%', background: 'var(--red)' }}
        />
      </div>
      <div
        style={{ flexShrink: 0, textAlign: 'right', fontFamily: '"DM Mono", monospace', fontSize: '9.5px', color: 'var(--red)', width: '20px' }}
      >
        −{Math.round(value)}
      </div>
    </div>
  )
}
