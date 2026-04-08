import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

let supabaseInstance = null;

// Factory function que cria o client apenas quando necessário
function initializeSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Lê configuração injetada globalmente via window.APP_CONFIG
  const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Validação clara com debug
  if (!SUPABASE_URL || SUPABASE_URL === '') {
    console.error('[Supabase] Erro crítico: VITE_SUPABASE_URL não foi injetado');
    console.error('[Supabase] window.APP_CONFIG:', window.APP_CONFIG);
    console.error('[Supabase] import.meta.env:', {
      VITE_SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY ? '[REDUZIDO]' : 'undefined',
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
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseInstance;
}

// Getter que inicializa lazily
const supabase = new Proxy({}, {
  get(target, prop) {
    if (supabaseInstance === null) {
      initializeSupabaseClient();
    }
    return supabaseInstance[prop];
  },
});

export { supabase };