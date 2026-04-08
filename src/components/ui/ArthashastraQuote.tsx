interface ArthashastraQuoteProps {
  quote: string
  book: string
  theme: string
}

export function ArthashastraQuote({ quote, book, theme }: ArthashastraQuoteProps) {
  return (
    <div style={{
      borderLeft: '2px solid var(--amber)',
      paddingLeft: '1.25rem',
      paddingTop: '0.1rem',
      paddingBottom: '0.1rem',
      margin: '2rem 0',
    }}>
      <p style={{
        fontFamily: 'var(--fd)',   // Playfair Display
        fontStyle: 'italic',
        fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)',
        lineHeight: 1.65,
        color: 'var(--t1)',
        marginBottom: '0.6rem',
      }}>
        &ldquo;{quote}&rdquo;
      </p>
      <span style={{
        fontSize: '0.65rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--t3)',
        fontFamily: 'var(--fm)',
      }}>
        Kautilya · {book}
      </span>
    </div>
  )
}
