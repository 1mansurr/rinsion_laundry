/**
 * lib/supabase.ts
 *
 * The one Supabase client for the mobile app. Unlike the website (which
 * splits a cookie-based server client and a service-role admin client,
 * src/lib/supabase.ts in the web repo), the app is a pure client — there is
 * no server component or service-role key here. Every request runs under
 * the signed-in user's own session and is scoped by the same RLS policies
 * the website already relies on.
 *
 * Session persistence uses AsyncStorage (there's no cookie jar on a phone).
 */

import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
