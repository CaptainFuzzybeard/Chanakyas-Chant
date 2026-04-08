'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    })
    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg0)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontFamily: '"Playfair Display",serif', fontSize: '28px', fontStyle: 'italic', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>
            Chanakya&apos;s <span style={{ color: 'var(--amber)' }}>Chant</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--t3)' }}>
            Fantasy cabinet league for Indian democracy.
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg1)', border: '0.5px solid var(--bd1)', borderRadius: '14px', padding: '28px 26px' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>✉️</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Check your email</div>
              <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>
                We sent a sign-in link to <strong style={{ color: 'var(--t1)' }}>{email}</strong>.
                Click the link to access your account.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--t1)', marginBottom: '6px' }}>Sign in</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '22px', lineHeight: 1.5 }}>
                Enter your email — we&apos;ll send you a magic link. No password needed.
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '7px' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'var(--bg2)',
                    border: '0.5px solid var(--bd0)',
                    borderRadius: '8px',
                    padding: '11px 13px',
                    fontFamily: '"DM Sans",sans-serif',
                    fontSize: '14px',
                    color: 'var(--t1)',
                    outline: 'none',
                    transition: 'border-color 0.12s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--bd-a)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--bd0)' }}
                />
              </div>
              {error && (
                <div style={{ fontSize: '11px', color: 'var(--red)', marginBottom: '12px' }}>{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: 'var(--amber)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  fontFamily: '"DM Sans",sans-serif',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.13s',
                }}
              >
                {loading ? 'Sending…' : 'Send magic link →'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--t3)', lineHeight: 1.5 }}>
          All politician data from the Election Commission of India.
          Scores update from verified news events.
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg0)" }} />}>
      <LoginForm />
    </Suspense>
  )
}
