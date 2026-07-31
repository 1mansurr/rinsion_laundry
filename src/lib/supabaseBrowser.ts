/**
 * lib/supabaseBrowser.ts
 *
 * The one client-side Supabase client, kept separate from lib/supabase.ts
 * (which imports next/headers and cannot be pulled into a browser bundle).
 * Anon key only, no cookie access — used for the rider notification badge's
 * Supabase Realtime subscription ('use client' components only).
 */

import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
