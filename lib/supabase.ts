import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// You MUST have the word 'export' before 'const'
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
  // PLACE THE REALTME CONFIGURATION LAYER HERE:
  realtime: {
    params: {
      eventsPerSecond: 40 // Smooths and caps mouse tracking frequency bounds
    }
  }
})