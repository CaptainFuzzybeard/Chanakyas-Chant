'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: 'calc(100vh - 88px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '28px', marginBottom: '14px', opacity: 0.5 }}>⚠</div>
      <div style={{
        fontFamily: '"Playfair Display",serif',
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--t1)',
        marginBottom: '6px',
      }}>
        Something went wrong
      </div>
      <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '24px', maxWidth: '340px', lineHeight: 1.6 }}>
        {error.message ?? 'An unexpected error occurred. The pipeline is watching.'}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={reset}
          style={{
            background: 'var(--amber)',
            color: '#000',
            fontWeight: 600,
            fontSize: '13px',
            borderRadius: '8px',
            padding: '8px 16px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: '"DM Sans",sans-serif',
          }}
        >
          Try again
        </button>
        <a
          href="/dashboard"
          style={{
            background: 'transparent',
            color: 'var(--t2)',
            fontSize: '13px',
            borderRadius: '8px',
            padding: '8px 16px',
            border: '0.5px solid var(--bd1)',
            textDecoration: 'none',
            fontFamily: '"DM Sans",sans-serif',
          }}
        >
          Dashboard
        </a>
      </div>
      {error.digest && (
        <div style={{ marginTop: '16px', fontSize: '10px', color: 'var(--t3)', fontFamily: '"DM Mono",monospace' }}>
          Error ID: {error.digest}
        </div>
      )}
    </div>
  )
}
