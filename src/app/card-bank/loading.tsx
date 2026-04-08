export default function CardBankLoading() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '228px 1fr', minHeight: 'calc(100vh - 88px)' }}>
      {/* Filter sidebar skeleton */}
      <div style={{
        background: 'var(--bg1)',
        borderRight: '0.5px solid var(--bd0)',
        padding: '18px 14px',
      }}>
        {[80, 60, 70, 55, 65, 50].map((w, i) => (
          <div key={i} style={{ marginBottom: '20px' }}>
            <div className="skeleton" style={{ height: '8px', width: `${w}%`, borderRadius: '4px', marginBottom: '10px' }} />
            {[1,2,3].map(j => (
              <div key={j} className="skeleton" style={{ height: '28px', borderRadius: '8px', marginBottom: '3px' }} />
            ))}
          </div>
        ))}
      </div>

      {/* Card grid skeleton */}
      <div style={{ padding: '18px 22px' }}>
        <div className="skeleton" style={{ height: '16px', width: '200px', borderRadius: '4px', marginBottom: '20px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '12px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg1)',
                border: '0.5px solid var(--bd0)',
                borderRadius: '14px',
                overflow: 'hidden',
              }}
            >
              <div className="skeleton" style={{ height: '100px', borderRadius: 0 }} />
              <div style={{ padding: '8px 10px 12px' }}>
                <div className="skeleton" style={{ height: '13px', width: '80%', borderRadius: '4px', marginBottom: '6px' }} />
                <div className="skeleton" style={{ height: '10px', width: '60%', borderRadius: '4px', marginBottom: '8px' }} />
                <div className="skeleton" style={{ height: '3px', borderRadius: '2px', marginBottom: '4px' }} />
                <div className="skeleton" style={{ height: '3px', width: '85%', borderRadius: '2px', marginBottom: '12px' }} />
                <div className="skeleton" style={{ height: '28px', borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
