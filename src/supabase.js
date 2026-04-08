import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

let supabaseInstance = null;

// Factory function que cria o client apenas quando necessário
function initializeSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Lê configuração injetada globalmente via window.APP_CONFIG ou diretamente via Vite
  const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Validação clara com debug
  const invalidUrl =
    !SUPABASE_URL ||
    typeof SUPABASE_URL !== 'string' ||
    !/^https?:\/\//.test(SUPABASE_URL.trim());

  if (invalidUrl) {
    console.error('[Supabase] Erro crítico: VITE_SUPABASE_URL inválido');
    console.error('[Supabase] URL lido:', SUPABASE_URL);
    console.error('[Supabase] window.APP_CONFIG:', window.APP_CONFIG);
    console.error('[Supabase] import.meta.env:', {
      VITE_SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY ? '[REDUZIDO]' : 'undefined',
    });
    throw new Error(
      'VITE_SUPABASE_URL não configurado corretamente. Deve ser um URL HTTP ou HTTPS.'
    );
  }

  if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== 'string') {
    console.error('[Supabase] Erro crítico: VITE_SUPABASE_ANON_KEY inválido');
    console.error('[Supabase] ANON KEY lido:', SUPABASE_ANON_KEY);
    throw new Error(
      'VITE_SUPABASE_ANON_KEY não configurado corretamente. Verifique o valor no .env ou Vercel.'
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