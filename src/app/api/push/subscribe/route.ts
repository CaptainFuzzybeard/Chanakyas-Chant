/**
 * POST /api/push/subscribe — stores WebPush subscription for authenticated user.
 * DELETE /api/push/subscribe — removes subscription.
 *
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in env.
 * Full delivery via pipeline/shared/push_notify.py (sends on defection/rank events).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  if (!body?.endpoint || !body?.keys?.auth || !body?.keys?.p256dh)
    return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })

  const { error } = await sb.from('users')
    .update({ push_subscription: body }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  await sb.from('users').update({ push_subscription: null }).eq('id', user.id)
  return NextResponse.json({ success: true })
}
