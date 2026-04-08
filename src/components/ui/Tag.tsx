import React from 'react'

type TagVariant = 'warn' | 'danger' | 'info' | 'success' | 'neutral'

const VARIANT_STYLES: Record<TagVariant, React.CSSProperties> = {
  warn:    { background: 'rgba(200,136,42,.13)',  color: 'rgba(200,136,42,.85)' },
  danger:  { background: 'rgba(168,50,50,.13)',   color: 'rgba(212,90,90,.85)' },
  info:    { background: 'rgba(60,110,180,.13)',  color: 'rgba(120,170,224,.85)' },
  success: { background: 'rgba(78,158,110,.13)',  color: 'rgba(100,210,150,.85)' },
  neutral: { background: 'rgba(236,232,220,.06)', color: 'var(--t2)' },
}

interface TagProps {
  variant?: TagVariant
  children: React.ReactNode
  style?: React.CSSProperties
}

export function Tag({ variant = 'neutral', children, style }: TagProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        fontSize: '9.5px',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: '3px',
        whiteSpace: 'nowrap',
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/** Derive tag variant and label from politician_stats tags */
export function PoliticianTags({
  tagScamCloud,
  tagSycophancy,
  tagBias,
  tagDisputed,
  tagDefected,
  tagRising,
}: {
  tagScamCloud:  boolean
  tagSycophancy: boolean
  tagBias:       boolean
  tagDisputed:   boolean
  tagDefected:   boolean
  tagRising:     boolean
}) {
  const tags: Array<{ variant: TagVariant; label: string }> = []

  if (tagDefected)   tags.push({ variant: 'danger',  label: '⚡ Defected' })
  if (tagScamCloud)  tags.push({ variant: 'danger',  label: '⚠ Scam cloud' })
  if (tagDisputed)   tags.push({ variant: 'warn',    label: '⊘ Disputed' })
  if (tagSycophancy) tags.push({ variant: 'warn',    label: '? Sycophancy' })
  if (tagBias)       tags.push({ variant: 'warn',    label: '~ Bias' })
  if (tagRising)     tags.push({ variant: 'success', label: '↑ Rising' })

  if (tags.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {tags.map(t => (
        <Tag key={t.label} variant={t.variant}>{t.label}</Tag>
      ))}
    </div>
  )
}
