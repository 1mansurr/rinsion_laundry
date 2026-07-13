/**
 * scripts/backfillFieldEncryption.ts
 *
 * One-off backfill for application-level field encryption (see
 * src/lib/crypto/fieldEncryption.ts): encrypts existing plaintext
 * customers.phone, employees.email/phone, join_requests.email/phone, and
 * sms_messages.phone, and populates customers.phone_bidx for every row.
 *
 * join_requests/sms_messages were added later (see
 * docs/deletion_retention_plan.md §6) — same idempotent, envelope-check
 * pattern as the original customers/employees backfill.
 *
 * Safe to re-run: rows already in the `v1:` ciphertext envelope are skipped,
 * so a crash mid-run just needs the script re-invoked, no cleanup required.
 *
 * Run with (from repo root, after loading .env.local into the shell):
 *   set -a && source .env.local && set +a && npx tsx scripts/backfillFieldEncryption.ts
 *
 * Node 20 lacks native WebSocket, which @supabase/supabase-js's realtime
 * client requires even for a script that never uses realtime — the `ws`
 * polyfill below is required for createAdminClient() to not throw.
 */
import WebSocket from 'ws'
;(globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket

import { createAdminClient } from '../src/lib/supabase'
import { encryptField, computeBlindIndex } from '../src/lib/crypto'
import { normalizeCustomerPhone } from '../src/utils/normalizeCustomerPhone'

const BATCH_SIZE = 500
const ENVELOPE_PREFIX = 'v1:'

async function backfillCustomers(): Promise<number> {
  const supabase = createAdminClient()
  let offset = 0
  let updated = 0

  while (true) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, phone')
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) throw new Error(`customers select failed: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      if (row.phone.startsWith(ENVELOPE_PREFIX)) continue // already migrated

      const normalized = normalizeCustomerPhone(row.phone)
      const { error: updErr } = await supabase
        .from('customers')
        .update({ phone: encryptField(normalized), phone_bidx: computeBlindIndex(normalized) })
        .eq('id', row.id)
      if (updErr) throw new Error(`customers update failed for ${row.id}: ${updErr.message}`)
      updated++
    }

    offset += data.length
    console.log(`customers: scanned ${offset} rows so far (${updated} updated)`)
    if (data.length < BATCH_SIZE) break
  }

  return updated
}

async function backfillEmployees(): Promise<number> {
  const supabase = createAdminClient()
  let offset = 0
  let updated = 0

  while (true) {
    const { data, error } = await supabase
      .from('employees')
      .select('id, email, phone')
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) throw new Error(`employees select failed: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      const phoneNeedsEncrypt = !row.phone.startsWith(ENVELOPE_PREFIX)
      const emailNeedsEncrypt = row.email !== null && !row.email.startsWith(ENVELOPE_PREFIX)
      if (!phoneNeedsEncrypt && !emailNeedsEncrypt) continue // already migrated

      const update: Record<string, string> = {}
      if (phoneNeedsEncrypt) update.phone = encryptField(row.phone)
      if (emailNeedsEncrypt) update.email = encryptField(row.email as string)

      const { error: updErr } = await supabase.from('employees').update(update).eq('id', row.id)
      if (updErr) throw new Error(`employees update failed for ${row.id}: ${updErr.message}`)
      updated++
    }

    offset += data.length
    console.log(`employees: scanned ${offset} rows so far (${updated} updated)`)
    if (data.length < BATCH_SIZE) break
  }

  return updated
}

async function backfillJoinRequests(): Promise<number> {
  const supabase = createAdminClient()
  let offset = 0
  let updated = 0

  while (true) {
    const { data, error } = await supabase
      .from('join_requests')
      .select('id, email, phone')
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) throw new Error(`join_requests select failed: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      const emailNeedsEncrypt = !row.email.startsWith(ENVELOPE_PREFIX)
      const phoneNeedsEncrypt = !row.phone.startsWith(ENVELOPE_PREFIX)
      if (!emailNeedsEncrypt && !phoneNeedsEncrypt) continue // already migrated

      const update: Record<string, string> = {}
      if (emailNeedsEncrypt) update.email = encryptField(row.email)
      if (phoneNeedsEncrypt) update.phone = encryptField(row.phone)

      const { error: updErr } = await supabase.from('join_requests').update(update).eq('id', row.id)
      if (updErr) throw new Error(`join_requests update failed for ${row.id}: ${updErr.message}`)
      updated++
    }

    offset += data.length
    console.log(`join_requests: scanned ${offset} rows so far (${updated} updated)`)
    if (data.length < BATCH_SIZE) break
  }

  return updated
}

async function backfillSmsMessages(): Promise<number> {
  const supabase = createAdminClient()
  let offset = 0
  let updated = 0

  while (true) {
    const { data, error } = await supabase
      .from('sms_messages')
      .select('id, phone')
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) throw new Error(`sms_messages select failed: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      if (row.phone.startsWith(ENVELOPE_PREFIX)) continue // already migrated

      const { error: updErr } = await supabase
        .from('sms_messages')
        .update({ phone: encryptField(row.phone) })
        .eq('id', row.id)
      if (updErr) throw new Error(`sms_messages update failed for ${row.id}: ${updErr.message}`)
      updated++
    }

    offset += data.length
    console.log(`sms_messages: scanned ${offset} rows so far (${updated} updated)`)
    if (data.length < BATCH_SIZE) break
  }

  return updated
}

async function main() {
  for (const key of ['FIELD_ENCRYPTION_KEY', 'BLIND_INDEX_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL']) {
    if (!process.env[key]) throw new Error(`${key} is not set — load .env.local into the shell first`)
  }

  console.log('Starting field-encryption backfill...')
  const customersUpdated = await backfillCustomers()
  console.log(`customers backfill complete: ${customersUpdated} rows updated`)
  const employeesUpdated = await backfillEmployees()
  console.log(`employees backfill complete: ${employeesUpdated} rows updated`)
  const joinRequestsUpdated = await backfillJoinRequests()
  console.log(`join_requests backfill complete: ${joinRequestsUpdated} rows updated`)
  const smsMessagesUpdated = await backfillSmsMessages()
  console.log(`sms_messages backfill complete: ${smsMessagesUpdated} rows updated`)
  console.log('Backfill complete.')
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
