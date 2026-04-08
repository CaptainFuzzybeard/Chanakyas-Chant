'use client'

import { useState, useTransition } from 'react'
import { createPrivateLeague } from '@/lib/actions/leagues'

interface CreateLeagueModalProps {
  cabinetId:        string
  subscriptionTier: string
  onCreated?:       (leagueId: string, inviteCode: string) => void
}

export function CreateLeagueModal({
  cabinetId,
  subscriptionTier,
  onCreated,
}: CreateLeagueModalProps) {
  const [open, setOpen]         = useState(false)
  const [name, setName]         = useState('')
  const [maxMembers, setMax]    = useState(20)
  const [error, setError]       = useState<string | null>(null)
  const [created, setCreated]   = useState<{ inviteCode: string } | null>(null)
  const [isPending, startTrans] = useTransition()

  const isPro = subscriptionTier !== 'free'

  async function handleCreate() {
    if (!name.trim() || !cabinetId) return
    setError(null)
    startTrans(async () => {
      const result = await createPrivateLeague(cabinetId, name, maxMembers)
      if (result.success && result.inviteCode) {
        setCreated({ inviteCode: result.inviteCode })
        onCreated?.(result.leagueId!, result.inviteCode)
      } else if (!result.success) {
        setError((result as any).error)
      }
    })
  }

  function handleClose() {
    setOpen(false)
    setName('')
    setMax(20)
    setError(null)
    setCreated(null)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        disabled={!isPro}
        style={{
          width: '100%',
          padding: '9px',
          background: isPro ? 'transparent' : 'var(--bg2)',
          color: isPro ? 'var(--t2)' : 'var(--t3)',
          border: `0.5px solid ${isPro ? 'var(--bd1)' : 'var(--bd0)'}`,
          borderRadius: '8px',
          fontSize: '12px',
          cursor: isPro ? 'pointer' : 'not-allowed',
          fontFamily: '"DM Sans",sans-serif',
          opacity: isPro ? 1 : 0.55,
          transition: 'all 0.13s',
        }}
      >
        Create League
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(12,12,10,.7)', backdropFilter: 'blur(4px)',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              width: '90%', maxWidth: '420px',
              background: 'var(--bg1)',
              border: '0.5px solid var(--bd1)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '0.5px solid var(--bd0)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '17px', fontWeight: 600, color: 'var(--t1)' }}>
                {created ? 'League created ✓' : 'Create a Private League'}
              </div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 6px' }}>×</button>
            </div>

            <div style={{ padding: '20px' }}>
              {created ? (
                /* Success state */
                <>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '16px' }}>
                      Share this invite code with your friends.
                    </div>
                    <div style={{
                      fontFamily: '"DM Mono",monospace',
                      fontSize: '36px', fontWeight: 500,
                      letterSpacing: '0.22em',
                      color: 'var(--amber-b)',
                      background: 'var(--amber-g)',
                      border: '0.5px solid var(--bd-a)',
                      borderRadius: '12px',
                      padding: '16px 24px',
                      display: 'inline-block',
                      marginBottom: '10px',
                    }}>
                      {created.inviteCode}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                      Up to {maxMembers} members can join with this code
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(created.inviteCode)}
                    style={{
                      width: '100%', padding: '10px',
                      background: 'var(--bg2)', border: '0.5px solid var(--bd0)',
                      borderRadius: '8px', color: 'var(--t2)',
                      fontSize: '13px', cursor: 'pointer',
                      fontFamily: '"DM Sans",sans-serif', marginBottom: '8px',
                    }}
                  >
                    Copy invite code
                  </button>
                  <button
                    onClick={handleClose}
                    style={{
                      width: '100%', padding: '10px',
                      background: 'var(--amber)', border: 'none',
                      borderRadius: '8px', color: '#000',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      fontFamily: '"DM Sans",sans-serif',
                    }}
                  >
                    Done
                  </button>
                </>
              ) : (
                /* Create form */
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '7px' }}>
                      League Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Dhaba Debate Society…"
                      maxLength={60}
                      autoFocus
                      style={{
                        width: '100%',
                        background: 'var(--bg2)', border: '0.5px solid var(--bd0)',
                        borderRadius: '10px', padding: '11px 13px',
                        fontFamily: '"DM Sans",sans-serif', fontSize: '14px',
                        color: 'var(--t1)', outline: 'none',
                        transition: 'border-color 0.13s',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--bd-a)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--bd0)' }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '7px' }}>
                      Max Members — <span style={{ color: 'var(--amber-b)', fontFamily: '"DM Mono",monospace', fontWeight: 500, fontSize: '11px', letterSpacing: 0, textTransform: 'none' }}>{maxMembers}</span>
                    </label>
                    <input
                      type="range" min={2} max={50} value={maxMembers}
                      onChange={e => setMax(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--amber)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--t3)', fontFamily: '"DM Mono",monospace', marginTop: '2px' }}>
                      <span>2</span><span>50</span>
                    </div>
                  </div>

                  {error && (
                    <div style={{ fontSize: '11px', color: 'var(--red)', marginBottom: '12px', padding: '8px 10px', background: 'rgba(168,50,50,.1)', borderRadius: '6px' }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid var(--bd1)', borderRadius: '8px', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif' }}>
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={name.trim().length < 3 || isPending}
                      style={{
                        flex: 2, padding: '10px',
                        background: 'var(--amber)', border: 'none',
                        borderRadius: '8px', color: '#000',
                        fontSize: '13px', fontWeight: 600,
                        cursor: name.trim().length < 3 || isPending ? 'default' : 'pointer',
                        opacity: name.trim().length < 3 || isPending ? 0.6 : 1,
                        fontFamily: '"DM Sans",sans-serif',
                        transition: 'opacity 0.13s',
                      }}
                    >
                      {isPending ? 'Creating…' : 'Create League'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
