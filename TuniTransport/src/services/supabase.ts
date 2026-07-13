// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Supabase client (STEP 5)
// Live mode activates automatically when both public env vars are present.
// ──────────────────────────────────────────────────────────────────────────
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const IS_LIVE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = IS_LIVE
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // On the web build, parse auth tokens from the URL so e-mail links
        // (password recovery, confirmation) establish the session and fire
        // the PASSWORD_RECOVERY event. Native has no URL to read.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
