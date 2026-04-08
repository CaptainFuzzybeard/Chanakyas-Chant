'use client'

interface WhatsAppShareProps {
  score: number
}

export function WhatsAppShare({ score }: WhatsAppShareProps) {
  return (
    <button
      onClick={() => {
        const text = `My cabinet scored ${Math.round(score).toLocaleString('en-IN')} this week on Chanakya's Chant 🏛️ — the Indian politics fantasy league. Join me: https://chanakyas-chant.in`
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(url, '_blank', 'noopener')
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        background: '#25D366', color: '#fff',
        border: 'none', borderRadius: '8px',
        padding: '5px 10px', cursor: 'pointer',
        fontSize: '10.5px', fontWeight: 600,
        fontFamily: '"DM Sans",sans-serif',
        marginTop: '4px',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.114.554 4.1 1.523 5.824L0 24l6.344-1.502A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 01-5.032-1.378l-.36-.214-3.732.883.946-3.617-.235-.374A9.861 9.861 0 012.118 12C2.118 6.533 6.533 2.118 12 2.118S21.882 6.533 21.882 12 17.467 21.882 12 21.882z"/>
      </svg>
      Share score
    </button>
  )
}
