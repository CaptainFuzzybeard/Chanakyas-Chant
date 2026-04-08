'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationBell } from './NotificationBell'

interface NavProps {
  partyName:          string
  subscriptionTier:   string
  userId?:            string
  onboardingComplete: boolean
}

const NAV_LINKS = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/card-bank',  label: 'Draft Politicians' },
  { href: '/cabinet',    label: 'My Cabinet' },
  { href: '/leagues',    label: 'Leagues' },
  { href: '/reckoning',  label: 'Reckoning' },
]

export function Nav({ partyName, subscriptionTier, userId, onboardingComplete }: NavProps) {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        padding: '0 22px',
        height: '54px',
        background: 'var(--navy)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'var(--amber-b)', flexShrink: 0, display: 'inline-block',
        }} />
        <span style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '16px',
          fontStyle: 'italic',
          fontWeight: 600,
          color: 'white',
          letterSpacing: '-0.01em',
        }}>
          Chanakya&apos;s{' '}
          <span style={{ color: 'var(--amber-b)', fontStyle: 'normal' }}>Chant</span>
        </span>
      </Link>

      {/* Links — hidden until onboarding is complete */}
      <ul
        style={{
          display: 'flex',
          gap: '2px',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {onboardingComplete && NAV_LINKS.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  color: active ? 'var(--amber-b)' : 'rgba(255,255,255,0.45)',
                  background: 'transparent',
                  transition: 'color 0.12s, background 0.12s',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.color = 'white'
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {userId && <NotificationBell userId={userId} />}
        {subscriptionTier !== 'free' && (
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: '3px',
              background: 'var(--amber-g)',
              color: 'var(--amber-b)',
              border: '0.5px solid var(--bd-a)',
            }}
          >
            Pro
          </span>
        )}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '3px 9px',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.45)',
            border: '0.5px solid rgba(255,255,255,0.15)',
          }}
        >
          Season 1 · National
        </span>
      </div>
    </nav>
  )
}
