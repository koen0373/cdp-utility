import { createClient } from '@supabase/supabase-js';

// Supabase credentials - these will be provided after project setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Database types for type safety
export interface Portfolio {
  id: string;
  user_id: string;
  assets: any[];
  coindepo_holdings: any[];
  loans: any[];
  settings: {
    selected_currency: string;
    extra_payout_enabled: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}


