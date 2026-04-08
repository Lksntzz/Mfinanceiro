// Inicializa Supabase para scripts estáticos em public/
// Lê das credenciais definidas no HTML ou do window

const { createClient } = window.supabase;

const SUPABASE_URL = window.SUPABASE_URL || 'https://ckpqoqwvnltmbvyqmmme.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcHFvcXd2bmx0bWJ2eXFtbW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjI2NDgsImV4cCI6MjA5MTEzODY0OH0.mlVom68ohDU4A4AjHHsAeCdzlIW6f_7A_G7JANBPfno';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase Init] Credenciais não encontradas');
  throw new Error('Supabase URL ou ANON_KEY não configurados');
}

console.log('[Supabase Init] Inicializando com URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expõe globalmente para scripts estáticos
window.SupabaseClient = supabase;
console.log('[Supabase Init] Client disponível em window.SupabaseClient');
