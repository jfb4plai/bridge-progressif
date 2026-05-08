import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseMisconfigured = !url || !key

// Crée un client factice si les env vars sont absentes (évite le crash au démarrage)
export const supabase = supabaseMisconfigured
  ? createClient('https://placeholder.supabase.co', 'placeholder-key')
  : createClient(url, key)
