import { NextRequest, NextResponse } from 'next/server'
import { advanceSubscriptionStatus } from '@/services/subscriptions/advanceSubscriptionStatus'

/**
 * Vercel Cron endpoint — runs daily at 00:00 UTC.
 * Advances subscription statuses and sends renewal reminder SMS.
 *
 * Auth: Bearer token matched against CRON_SECRET env var.
 * Vercel injects this automatically when configured in vercel.json.
 *
 * Spec reference: Rinsion_Technical_Overview.md → Background Jobs
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await advanceSubscriptionStatus()

  if (result.errors.length > 0) {
    console.error('[cron] advance-subscriptions errors:', result.errors)
  }

  console.log(`[cron] advance-subscriptions: processed=${result.processed} transitioned=${result.transitioned} remindersSent=${result.remindersSent}`)

  return NextResponse.json({ ok: true, ...result })
}
