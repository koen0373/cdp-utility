import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate and log environment variables
console.log('🔧 Supabase Configuration:');
console.log('URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('Key:', supabaseAnonKey ? `✓ Set (${supabaseAnonKey.substring(0, 20)}...)` : '✗ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  throw new Error('Supabase environment variables are not configured');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log('✅ Supabase client initialized successfully');

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


