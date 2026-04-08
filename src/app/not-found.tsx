import Link from 'next/link'

export default function NotFound() {
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
      <div style={{
        fontFamily: '"Playfair Display",serif',
        fontSize: '80px',
        fontStyle: 'italic',
        fontWeight: 700,
        color: 'var(--amber-d)',
        lineHeight: 1,
        marginBottom: '16px',
        opacity: 0.5,
      }}>
        404
      </div>
      <div style={{
        fontFamily: '"Playfair Display",serif',
        fontSize: '22px',
        fontWeight: 600,
        color: 'var(--t1)',
        marginBottom: '8px',
      }}>
        Page not found
      </div>
      <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '28px', maxWidth: '340px', lineHeight: 1.6 }}>
        The politician may have defected, or this page simply doesn&apos;t exist.
      </div>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--amber)',
          color: '#000',
          fontWeight: 600,
          fontSize: '13px',
          borderRadius: '8px',
          padding: '9px 18px',
          textDecoration: 'none',
          fontFamily: '"DM Sans",sans-serif',
        }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
