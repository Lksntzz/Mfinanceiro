const SUPABASE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const SUPABASE_URL = window.SUPABASE_URL || 'https://ckpqoqwvnltmbvyqmmme.supabase.co';
const SUPABASE_ANON_KEY =
  window.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcHFvcXd2bmx0bWJ2eXFtbW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjI2NDgsImV4cCI6MjA5MTEzODY0OH0.mlVom68ohDU4A4AjHHsAeCdzlIW6f_7A_G7JANBPfno';

function loadSupabaseScript() {
  if (window.supabase?.createClient) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector('script[data-supabase-cdn="true"]');
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Falha ao carregar a biblioteca do Supabase.')),
        { once: true }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SUPABASE_CDN_URL;
    script.dataset.supabaseCdn = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar a biblioteca do Supabase.'));
    document.head.appendChild(script);
  });
}

async function initializeSupabaseClient() {
  if (window.SupabaseClient) {
    return window.SupabaseClient;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL ou ANON_KEY nao configurados.');
  }

  await loadSupabaseScript();

  const createClient = window.supabase?.createClient;
  if (typeof createClient !== 'function') {
    throw new Error('Biblioteca do Supabase carregada sem createClient disponivel.');
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.SupabaseClient = client;
  return client;
}

window.__supabaseReady = initializeSupabaseClient()
  .then((client) => {
    window.SupabaseInitError = null;
    return client;
  })
  .catch((error) => {
    window.SupabaseInitError = error;
    console.error('[Supabase Bootstrap]', error);
    throw error;
  });
