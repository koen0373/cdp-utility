import { createClient } from '@supabase/supabase-js';

// Supabase credentials - these will be provided after project setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  console.error('Please check your .env file and restart the dev server.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

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


