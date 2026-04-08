'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cc_card_bank_url'

/** Called from CardBankClient when user clicks through to a politician detail */
export function saveCardBankUrl() {
  try {
    sessionStorage.setItem(STORAGE_KEY, window.location.pathname + window.location.search)
  } catch { /* ignore */ }
}

/** Breadcrumb that links back to card bank with filters restored */
export function BackToCardBank({ politicianName }: { politicianName: string }) {
  const [backUrl, setBackUrl] = useState('/card-bank')
  const [label, setLabel]     = useState('Draft Politicians')

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        setBackUrl(saved)
        const params = new URLSearchParams(saved.split('?')[1] ?? '')
        const parts: string[] = []
        if (params.get('search'))  parts.push(`"${params.get('search')}"`)
        if (params.get('parties')) parts.push(params.get('parties')!.split(',').join(', '))
        const statusRaw = params.get('status')
        if (statusRaw && statusRaw !== 'in_office') parts.push(statusRaw.replace(/_/g, ' '))
        setLabel(parts.length ? `Draft Politicians · ${parts.join(' · ')}` : 'Draft Politicians')
      }
    } catch { /* ignore */ }
  }, [])

  return (
    <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <a
        href={backUrl}
        style={{ color: 'var(--t3)', textDecoration: 'none', transition: 'color 0.12s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}
      >
        ← {label}
      </a>
      <span style={{ opacity: 0.4 }}>/</span>
      <span style={{ color: 'var(--t2)' }}>{politicianName}</span>
    </div>
  )
}
