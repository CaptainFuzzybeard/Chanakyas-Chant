/**
 * app/api/webhooks/razorpay/route.ts
 *
 * Razorpay Webhook Handler
 *
 * Receives POST from Razorpay on subscription events and updates
 * the user's subscription_tier in the users table.
 *
 * Configure in Razorpay Dashboard:
 *   Webhook URL: https://yourdomain.com/api/webhooks/razorpay
 *   Secret:      Set RAZORPAY_WEBHOOK_SECRET in .env.local
 *   Events:      subscription.activated, subscription.charged,
 *                subscription.cancelled, subscription.expired,
 *                payment.failed
 *
 * Razorpay signs every webhook with HMAC-SHA256.
 * We verify the signature before processing.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Use service role — webhook runs server-side, needs to bypass RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
}

function verifyRazorpaySignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[razorpay webhook] RAZORPAY_WEBHOOK_SECRET not set')
    return false
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

function planFromNotes(notes: Record<string, string>): 'pro_monthly' | 'pro_annual' {
  return notes?.plan === 'pro_annual' ? 'pro_annual' : 'pro_monthly'
}

export async function POST(request: NextRequest) {
  const body      = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  if (!verifyRazorpaySignature(body, signature)) {
    console.warn('[razorpay webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase    = getServiceClient()
  const event       = payload.event as string
  const entity      = payload.payload?.subscription?.entity ?? payload.payload?.payment?.entity ?? {}
  const notes       = entity.notes ?? {}
  const userId      = notes.user_id as string | undefined

  if (!userId) {
    console.warn('[razorpay webhook] No user_id in notes', payload)
    return NextResponse.json({ received: true }) // Don't 400 — Razorpay will retry
  }

  const plan = planFromNotes(notes)

  // Map Razorpay event → our event_type + subscription_tier
  const eventMap: Record<string, { eventType: string; tier: string; active: boolean }> = {
    'subscription.activated': { eventType: 'subscription_activated', tier: plan,  active: true  },
    'subscription.charged':   { eventType: 'subscription_charged',   tier: plan,  active: true  },
    'subscription.cancelled': { eventType: 'subscription_cancelled', tier: 'free', active: false },
    'subscription.expired':   { eventType: 'subscription_expired',   tier: 'free', active: false },
    'payment.failed':         { eventType: 'payment_failed',         tier: 'free', active: false },
  }

  const mapped = eventMap[event]
  if (!mapped) {
    // Unknown event — log and acknowledge
    console.log('[razorpay webhook] Unhandled event:', event)
    return NextResponse.json({ received: true })
  }

  // 1. Log the subscription event
  await supabase.from('subscription_events').insert({
    user_id:                  userId,
    razorpay_payment_id:      entity.id ?? null,
    razorpay_subscription_id: entity.subscription_id ?? null,
    event_type:               mapped.eventType,
    plan,
    amount_paise:             entity.amount ?? null,
    status:                   entity.status ?? event,
    razorpay_payload:         payload,
  })

  // 2. Update subscription tier + razorpay_customer_id on the user
  const updatePayload: Record<string, any> = {
    subscription_tier: mapped.tier,
  }
  if (entity.customer_id) {
    updatePayload.razorpay_customer_id = entity.customer_id
  }
  if (mapped.active) {
    // Set expiry: monthly = +31 days, annual = +366 days (with buffer)
    const days = plan === 'pro_annual' ? 366 : 31
    const expires = new Date()
    expires.setDate(expires.getDate() + days)
    updatePayload.subscription_expires_at = expires.toISOString()
  } else {
    updatePayload.subscription_expires_at = null
  }

  const { error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', userId)

  if (error) {
    console.error('[razorpay webhook] DB update failed', error)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  console.log(`[razorpay webhook] ${event} → user ${userId} → tier ${mapped.tier}`)
  return NextResponse.json({ received: true })
}
