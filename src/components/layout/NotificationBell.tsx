'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id:                string
  notification_type: string
  title:             string
  body:              string
  is_read:           boolean
  created_at:        string
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const unread = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[])
      })

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          setNotifications(prev => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function handleOpen() {
    setOpen(o => !o)
    if (unread > 0) {
      const supabase = createClient()
      await supabase.rpc('mark_notifications_read', { p_user_id: userId })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          background: 'none',
          border: '0.5px solid var(--bd0)',
          borderRadius: '8px',
          padding: '5px 9px',
          cursor: 'pointer',
          fontSize: '14px',
          lineHeight: 1,
          color: 'var(--t2)',
          transition: 'all 0.12s',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: 'var(--amber)',
            color: '#000',
            fontSize: '9px',
            fontWeight: 700,
            fontFamily: '"DM Mono",monospace',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '36px',
            right: 0,
            width: '320px',
            background: 'var(--bg1)',
            border: '0.5px solid var(--bd1)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 99,
          }}>
            <div style={{
              padding: '12px 14px',
              borderBottom: '0.5px solid var(--bd0)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--t3)',
            }}>
              Notifications
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '20px 14px', fontSize: '12px', color: 'var(--t3)', textAlign: 'center', fontStyle: 'italic' }}>
                No notifications yet
              </div>
            ) : (
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '0.5px solid var(--bd0)',
                      background: n.is_read ? 'transparent' : 'rgba(212,146,10,0.04)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px', lineHeight: 1.3 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t2)', lineHeight: 1.4, marginBottom: '4px' }}>
                      {n.body}
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--t3)', fontFamily: '"DM Mono",monospace' }}>
                      {new Date(n.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
