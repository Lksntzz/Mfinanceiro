import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = window.SUPABASE_URL;
const supabaseKey = window.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are not configured. Define window.SUPABASE_URL and window.SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);