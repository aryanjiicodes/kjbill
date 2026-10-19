import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tlxyazpkbalumggwdnrg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRseHlhenBrYmFsdW1nZ3dkbnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MjMyNjksImV4cCI6MjEwNzk5OTI2OX0.cYJzW511UWCHXTxWsovhjQ0du5_p-M6rvDXqa7bLkj0';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
