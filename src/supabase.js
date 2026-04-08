import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Lê variáveis injetadas pelo Vite na build (via define no vite.config.js)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação clara com debug
if (!SUPABASE_URL || SUPABASE_URL === '') {
  console.error('[Supabase] Erro crítico: VITE_SUPABASE_URL não foi injetado');
  console.error('[Supabase] import.meta.env:', {
    VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '[REDUZIDO]' : 'undefined',
  });
  throw new Error(
    'VITE_SUPABASE_URL não foi injetado. Verifique se a variável está configurada no .env (local) ou nas variáveis de ambiente da Vercel.'
  );
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === '') {
  console.error('[Supabase] Erro crítico: VITE_SUPABASE_ANON_KEY não foi injetado');
  throw new Error(
    'VITE_SUPABASE_ANON_KEY não foi injetado. Verifique se a variável está configurada no .env (local) ou nas variáveis de ambiente da Vercel.'
  );
}

console.log('[Supabase] Client inicializado com sucesso');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };