'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationBell } from './NotificationBell'

interface NavProps {
  partyName:        string
  subscriptionTier: string
  userId?:          string
}

const NAV_LINKS = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/card-bank',  label: 'Draft Politicians' },
  { href: '/cabinet',    label: 'My Cabinet' },
  { href: '/leagues',    label: 'Leagues' },
  { href: '/reckoning',  label: 'Reckoning' },
]

export function Nav({ partyName, subscriptionTier, userId }: NavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="sticky top-0 z-50 flex items-center gap-7 px-[22px]"
      style={{
        height: '54px',
        background: 'var(--bg1)',
        borderBottom: '0.5px solid var(--bd0)',
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex-shrink-0 no-underline"
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '16px',
          fontStyle: 'italic',
          fontWeight: 600,
          color: 'var(--t1)',
          letterSpacing: '-0.01em',
        }}
      >
        Chanakya&apos;s{' '}
        <span style={{ color: 'var(--amber)' }}>Chant</span>
      </Link>

      {/* Links */}
      <ul className="flex gap-[2px] list-none">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className="block no-underline rounded-md px-[10px] py-[5px] transition-all duration-100"
                style={{
                  fontSize: '12px',
                  color: active ? 'var(--amber)' : 'var(--t3)',
                  background: active ? 'transparent' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    ;(e.target as HTMLElement).style.color = 'var(--t1)'
                    ;(e.target as HTMLElement).style.background = 'var(--bg2)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    ;(e.target as HTMLElement).style.color = 'var(--t3)'
                    ;(e.target as HTMLElement).style.background = 'transparent'
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
      <div className="ml-auto flex items-center gap-[10px]">
        {userId && <NotificationBell userId={userId} />}
        {subscriptionTier !== 'free' && (
          <span
            className="text-[9px] font-bold tracking-[0.1em] uppercase px-[7px] py-[2px] rounded-[3px]"
            style={{ background: 'var(--amber-g)', color: 'var(--amber)', border: '0.5px solid var(--bd-a)' }}
          >
            Pro
          </span>
        )}
        <span
          className="text-[10px] font-medium tracking-[0.1em] uppercase px-[9px] py-[3px] rounded-md"
          style={{ color: 'var(--t3)', border: '0.5px solid var(--bd0)' }}
        >
          Season 1 · National
        </span>
      </div>
    </nav>
  )
}
