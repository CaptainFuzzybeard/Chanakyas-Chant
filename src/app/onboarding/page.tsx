'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3 | 4

const STEPS = [
  { n: 1 as Step, label: 'How it works',      sub: 'Before we begin' },
  { n: 2 as Step, label: 'Name your party',   sub: 'Your team in all leagues' },
  { n: 3 as Step, label: 'Choose your scope', sub: 'Lok Sabha or Vidhan Sabha' },
  { n: 4 as Step, label: 'Start drafting',    sub: 'Pick your politicians' },
]

const INDIAN_STATES = [
  // States
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  // Union Territories with elected assemblies
  'Delhi','Jammu & Kashmir','Puducherry',
  // Union Territories (Lok Sabha representation only — no Vidhan Sabha)
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli',
  'Daman & Diu','Lakshadweep','Ladakh',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [step, setStep]         = useState<Step>(1)
  const [partyName, setPartyName] = useState('')
  const [scope, setScope]       = useState<'national' | 'state'>('national')
  const [scopeState, setScopeState] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [nameChecking, setNameChecking] = useState(false)

  // Debounced live duplicate check — fires 500ms after user stops typing
  useEffect(() => {
    const name = partyName.trim()
    if (name.length < 3) { setNameError(null); return }
    setNameChecking(true)
    const timer = setTimeout(async () => {
      const err = await validateName(name)
      setNameError(err)
      setNameChecking(false)
    }, 500)
    return () => { clearTimeout(timer); setNameChecking(false) }
  }, [partyName])

  const progress = `${((step - 1) / 3) * 100}%`

  function handleBack() {
    if (step > 1) setStep((step - 1) as Step)
  }

  async function validateName(name: string): Promise<string | null> {
    if (!name.trim()) return 'Party name is required'
    if (name.trim().length < 3) return 'Must be at least 3 characters'
    if (name.trim().length > 60) return 'Must be 60 characters or fewer'
    const reserved = ['BJP','INC','AAP','TMC','SP','BSP','NCP','DMK','CPI','JDU','RJD','TDP']
    if (reserved.some(r => name.toUpperCase().includes(r)))
      return 'Cannot use a registered ECI party abbreviation'
    const supabase = createClient()
    const { data } = await supabase.from('users').select('id').ilike('party_name', name.trim()).limit(1)
    if (data && data.length > 0) return 'This party name is already taken'
    return null
  }

  async function handleNext() {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      const err = await validateName(partyName)
      if (err) { setNameError(err); return }
      setNameError(null)
      setStep(3)
    } else if (step === 3) {
      if (scope === 'state' && !scopeState) return
      setStep(4)
    }
  }

  async function handleConfirm() {
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Guard: check if user already has a cabinet (back-button / double-submit protection)
    const { count: existingCount } = await supabase
      .from('cabinets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if ((existingCount ?? 0) > 0) {
      // Cabinet already exists — just update party name and send to card bank
      await supabase.from('users').upsert({
        id:                  user.id,
        party_name:          partyName.trim(),
        onboarding_complete: false,
      })
      startTransition(() => router.push('/card-bank?onboarding=1'))
      return
    }

    const { error: profileError } = await supabase.from('users').upsert({
      id:                  user.id,
      party_name:          partyName.trim(),
      onboarding_complete: false,
    })
    if (profileError) {
      const msg = profileError.code === '23505'
        ? 'That party name is already taken — go back and pick another.'
        : 'Something went wrong. Please try again.'
      setSaveError(msg)
      setSaving(false)
      return
    }

    const { data: cabinet, error: cabError } = await supabase
      .from('cabinets')
      .insert({ user_id: user.id, scope, scope_state: scope === 'state' ? scopeState : null })
      .select('id')
      .single()
    if (cabError || !cabinet) {
      setSaveError('Could not create your cabinet. Please try again.')
      setSaving(false)
      return
    }

    startTransition(() => router.push('/card-bank?onboarding=1'))
  }

  const fb: React.CSSProperties = { fontFamily: '"DM Sans",sans-serif' }
  const fd: React.CSSProperties = { fontFamily: '"Playfair Display",Georgia,serif' }
  const fm: React.CSSProperties = { fontFamily: '"DM Mono","Fira Code",monospace' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg0)', ...fb }}>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: '268px', right: 0, height: '2px', background: 'var(--bd0)', zIndex: 200 }}>
        <div style={{ height: '100%', background: 'var(--amber-b)', width: progress, transition: 'width 0.4s' }} />
      </div>

      {/* Rail */}
      <div style={{
        width: '268px', background: 'var(--bg1)', borderRight: '0.5px solid var(--bd0)',
        padding: '36px 24px', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
      }}>
        <div style={{ ...fd, fontSize: '18px', fontStyle: 'italic', fontWeight: 600, color: 'var(--t1)', marginBottom: '42px' }}>
          Chanakya&apos;s <span style={{ color: 'var(--amber-b)' }}>Chant</span>
        </div>

        <div style={{ flex: 1 }}>
          {STEPS.map(({ n, label, sub }) => {
            const done   = step > n
            const active = step === n
            return (
              <div key={n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px', position: 'relative' }}>
                {n < 4 && <div style={{ position: 'absolute', left: '13px', top: '28px', bottom: '-24px', width: '0.5px', background: 'var(--bd0)' }} />}
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                  border: `0.5px solid ${active ? 'var(--amber-b)' : done ? 'var(--green)' : 'var(--bd1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10.5px', fontWeight: 500,
                  background: done ? 'var(--green)' : active ? 'var(--bg2)' : 'var(--bg0)',
                  color: done ? 'white' : active ? 'var(--amber-b)' : 'var(--t3)',
                  ...fm,
                  boxShadow: active ? '0 0 0 3px rgba(232,100,42,.12)' : undefined,
                  transition: 'all 0.2s',
                }}>
                  {done ? '✓' : n}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '1px', color: active ? 'var(--t1)' : done ? 'var(--t2)' : 'var(--t3)', transition: 'color 0.2s' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--t4)' }}>{sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ fontSize: '10px', color: 'var(--t4)', lineHeight: 1.5, borderTop: '0.5px solid var(--bd0)', paddingTop: '13px' }}>
          All politician data from the Election Commission of India. Scores update from verified news only.
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 40px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '500px' }}>

          {/* ─── STEP 1: How it works ─── */}
          {step === 1 && (
            <>
              <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--amber-b)', marginBottom: '9px' }}>
                Welcome
              </div>
              <div style={{ ...fd, fontSize: '30px', fontWeight: 700, lineHeight: 1.15, color: 'var(--t1)', marginBottom: '7px' }}>
                Fantasy politics.<br />Real stakes.
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '28px' }}>
                Pick real Indian politicians. Build your cabinet. Score points from actual governance outcomes. Compete with friends — or the country.
              </div>

              <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '18px', marginBottom: '28px' }}>
                {[
                  { n: '1', head: 'Draft your roster', body: 'Pick up to 20 real politicians — Lok Sabha MPs or state MLAs. Their governance scores update daily from verified news.' },
                  { n: '2', head: 'Build your cabinet', body: 'Assign 12 ministerial positions. Put the right politician in the right ministry to earn a score multiplier.' },
                  { n: '3', head: 'Scores move with the news', body: 'Infrastructure completed, scam filed, election result — every verifiable outcome moves your cabinet score in real time.' },
                  { n: '4', head: 'Compete and collaborate', body: 'National leaderboard, private leagues with friends, and coalition partnerships with other players.' },
                ].map(({ n, head, body }) => (
                  <div key={n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ ...fm, fontSize: '10.5px', color: 'white', background: 'var(--amber-b)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      {n}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>{head}</div>
                      <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5 }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleNext} style={{ ...fb, display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--amber-b)', color: 'white', fontWeight: 600, fontSize: '13.5px', border: 'none', borderRadius: '12px', padding: '11px 22px', cursor: 'pointer' }}>
                  Let&apos;s begin →
                </button>
              </div>
            </>
          )}

          {/* ─── STEP 2: Party name ─── */}
          {step === 2 && (
            <>
              <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--amber-b)', marginBottom: '9px' }}>Step 1 of 3</div>
              <div style={{ ...fd, fontSize: '30px', fontWeight: 700, lineHeight: 1.15, color: 'var(--t1)', marginBottom: '7px' }}>Name your party.</div>
              <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '28px' }}>
                This is how you appear on leaderboards and in friend leagues. Pick something memorable.
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '7px' }}>
                  Party Name
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={e => { setPartyName(e.target.value); setNameError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
                  placeholder="e.g. Pragati Party, Rajniti Rangers…"
                  maxLength={60}
                  autoFocus
                  style={{
                    width: '100%', background: 'var(--bg2)',
                    border: `0.5px solid ${nameError ? 'var(--red)' : 'var(--bd0)'}`,
                    borderRadius: '12px', padding: '13px 15px',
                    ...fd, fontSize: '19px', fontStyle: 'italic', color: 'var(--t1)',
                    outline: 'none', transition: 'border-color 0.13s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--amber-b)' }}
                  onBlur={e => { if (!nameError) e.target.style.borderColor = 'var(--bd0)' }}
                />
                {nameError ? (
                  <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '5px' }}>{nameError}</div>
                ) : partyName.trim().length >= 3 ? (
                  <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                    Looks good
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={handleBack} style={{ ...fb, fontSize: '12.5px', color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
                <button onClick={handleNext} disabled={partyName.trim().length < 3} style={{ ...fb, display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--amber-b)', color: 'white', fontWeight: 600, fontSize: '13.5px', border: 'none', borderRadius: '12px', padding: '11px 22px', cursor: 'pointer', opacity: partyName.trim().length < 3 ? 0.4 : 1, transition: 'opacity 0.13s' }}>
                  Next →
                </button>
              </div>
            </>
          )}

          {/* ─── STEP 3: Scope ─── */}
          {step === 3 && (
            <>
              <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--amber-b)', marginBottom: '9px' }}>Step 2 of 3</div>
              <div style={{ ...fd, fontSize: '30px', fontWeight: 700, lineHeight: 1.15, color: 'var(--t1)', marginBottom: '7px' }}>Choose your arena.</div>
              <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '28px' }}>
                This decides which politicians you draft from. You can&apos;t mix scopes — choose once.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {[
                  {
                    value: 'national' as const,
                    icon: '🇮🇳',
                    name: 'Lok Sabha',
                    desc: '543 Members of Parliament from across India. National governance. Finance, Defence, External Affairs.',
                    badge: 'Free',
                    badgeColor: 'var(--green)',
                  },
                  {
                    value: 'state' as const,
                    icon: '🗺️',
                    name: 'Vidhan Sabha',
                    desc: 'State MLAs from your chosen state. Local governance. PWD, Health, Education, Agriculture.',
                    badge: 'Free',
                    badgeColor: 'var(--green)',
                  },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setScope(opt.value)}
                    style={{
                      background: scope === opt.value ? 'rgba(232,100,42,.06)' : 'var(--bg2)',
                      border: `0.5px solid ${scope === opt.value ? 'var(--amber-b)' : 'var(--bd0)'}`,
                      borderRadius: '14px', padding: '16px', cursor: 'pointer',
                      transition: 'all 0.14s', position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '8px', fontWeight: 700, padding: '2px 7px', borderRadius: '3px', background: 'rgba(27,107,58,.1)', color: opt.badgeColor, border: `0.5px solid ${opt.badgeColor}`, letterSpacing: '.07em' }}>
                      {opt.badge}
                    </div>
                    <div style={{ fontSize: '22px', marginBottom: '9px' }}>{opt.icon}</div>
                    <div style={{ ...fd, fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: '5px' }}>{opt.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t2)', lineHeight: 1.45 }}>{opt.desc}</div>
                  </div>
                ))}
              </div>

              {scope === 'state' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '7px' }}>Choose your state</label>
                  <select
                    value={scopeState}
                    onChange={e => setScopeState(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '10px', padding: '11px 13px', ...fb, fontSize: '14px', color: 'var(--t1)', outline: 'none' }}
                  >
                    <option value="">— Select a state —</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={handleBack} style={{ ...fb, fontSize: '12.5px', color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
                <button
                  onClick={handleNext}
                  disabled={scope === 'state' && !scopeState}
                  style={{ ...fb, display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--amber-b)', color: 'white', fontWeight: 600, fontSize: '13.5px', border: 'none', borderRadius: '12px', padding: '11px 22px', cursor: 'pointer', opacity: scope === 'state' && !scopeState ? 0.4 : 1, transition: 'opacity 0.13s' }}
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {/* ─── STEP 4: Confirm ─── */}
          {step === 4 && (
            <>
              <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--amber-b)', marginBottom: '9px' }}>Step 3 of 3</div>
              <div style={{ ...fd, fontSize: '30px', fontWeight: 700, lineHeight: 1.15, color: 'var(--t1)', marginBottom: '7px' }}>You&apos;re ready.</div>
              <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '28px' }}>
                Confirm your setup and we&apos;ll take you to the Card Bank.
              </div>

              {/* Summary card */}
              <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--bd0)', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--bd0)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--t3)' }}>Party name</span>
                  <span style={{ ...fd, fontSize: '15px', fontWeight: 700, fontStyle: 'italic', color: 'var(--t1)' }}>{partyName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--bd0)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--t3)' }}>Scope</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)' }}>
                    {scope === 'national' ? '🇮🇳 Lok Sabha (National)' : `🗺️ Vidhan Sabha — ${scopeState}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--t3)' }}>Roster size</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)' }}>Up to 20 politicians</span>
                </div>
              </div>

              <div style={{ background: 'var(--amber-g)', border: '0.5px solid var(--bd-a)', borderRadius: '10px', padding: '12px 14px', marginBottom: '24px', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--amber)' }}>What happens next:</strong> You&apos;ll land in the Card Bank. Draft at least 12 politicians, then head to My Cabinet to assign ministry positions. Your score goes live once your cabinet is complete.
              </div>

              {saveError && (
                <div style={{ background: 'rgba(192,57,43,.08)', border: '0.5px solid rgba(192,57,43,.3)', borderRadius: '8px', padding: '10px 13px', marginBottom: '16px', fontSize: '12.5px', color: 'var(--red)', lineHeight: 1.5 }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={handleBack} style={{ ...fb, fontSize: '12.5px', color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  style={{ ...fb, display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--amber-b)', color: 'white', fontWeight: 600, fontSize: '13.5px', border: 'none', borderRadius: '12px', padding: '11px 22px', cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity 0.13s' }}
                >
                  {saving ? 'Setting up…' : 'Start drafting →'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
