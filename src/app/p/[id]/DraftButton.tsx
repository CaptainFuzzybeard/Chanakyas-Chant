'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { draftPolitician } from '@/lib/actions/roster'

interface DraftButtonProps {
  politicianId: string
  cabinetId:    string | null
  inRoster:     boolean
  rosterCount:  number   // so we can show "Go to Cabinet" when near/at 12
}

export function DraftButton({ politicianId, cabinetId, inRoster, rosterCount }: DraftButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(inRoster)
  const [error, setError]     = useState<string | null>(null)
  const [newCount, setNewCount] = useState(rosterCount)

  async function handleDraft() {
    if (!cabinetId || done) return
    setLoading(true)
    setError(null)
    const result = await draftPolitician(cabinetId, politicianId)
    if (result.success) {
      setDone(true)
      setNewCount(c => c + 1)
      router.refresh()
    } else {
      setError((result as any).error ?? 'Could not add to roster')
    }
    setLoading(false)
  }

  const justReached12 = done && newCount >= 12

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={handleDraft}
        disabled={done || loading || !cabinetId}
        style={{
          width: '100%', padding: '11px',
          background: error ? 'rgba(192,57,43,.08)' : done ? 'var(--amber-g)' : 'var(--amber-b)',
          color: error ? 'var(--red)' : done ? 'var(--amber-b)' : 'white',
          border: error ? '0.5px solid rgba(192,57,43,.3)' : done ? '0.5px solid var(--bd-a)' : 'none',
          borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
          cursor: done ? 'default' : 'pointer',
          fontFamily: '"DM Sans",sans-serif', transition: 'all 0.13s',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Adding…'
          : error ? error
          : done ? `✓ In Your Roster (${newCount}/20)`
          : '+ Add to Roster'}
      </button>

      {/* Post-draft CTAs */}
      {done && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {justReached12 ? (
            <a
              href="/cabinet"
              style={{
                flex: 1, display: 'block', textAlign: 'center',
                padding: '9px', background: 'var(--green)', color: 'white',
                fontWeight: 600, fontSize: '12.5px', border: 'none',
                borderRadius: '9px', textDecoration: 'none',
                fontFamily: '"DM Sans",sans-serif', transition: 'background 0.13s',
              }}
            >
              Build Cabinet → ({newCount}/20 rostered)
            </a>
          ) : (
            <>
              <a
                href="/card-bank"
                style={{
                  flex: 1, display: 'block', textAlign: 'center',
                  padding: '8px', background: 'var(--bg2)',
                  color: 'var(--t2)', fontSize: '12px',
                  border: '0.5px solid var(--bd0)', borderRadius: '8px',
                  textDecoration: 'none', fontFamily: '"DM Sans",sans-serif',
                }}
              >
                ← Draft more
              </a>
              {newCount >= 12 && (
                <a
                  href="/cabinet"
                  style={{
                    flex: 1, display: 'block', textAlign: 'center',
                    padding: '8px', background: 'var(--amber-g)',
                    color: 'var(--amber)', fontSize: '12px',
                    border: '0.5px solid var(--bd-a)', borderRadius: '8px',
                    textDecoration: 'none', fontFamily: '"DM Sans",sans-serif',
                  }}
                >
                  Build Cabinet →
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
