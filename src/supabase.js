import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Variaveis de ambiente do Supabase nao encontradas. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };