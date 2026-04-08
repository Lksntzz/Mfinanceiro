import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Função segura para ler variáveis de ambiente
function getEnvVariable(key) {
  // Tenta import.meta.env primeiro (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[key];
    if (value !== undefined) {
      return value;
    }
  }
  
  // Fallback para variáveis injetadas globalmente (Vercel)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  return undefined;
}

const SUPABASE_URL = getEnvVariable('VITE_SUPABASE_URL') || 
  getEnvVariable('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVariable('VITE_SUPABASE_ANON_KEY') || 
  getEnvVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Validação clara
if (!SUPABASE_URL) {
  console.error('Erro: VITE_SUPABASE_URL não encontrado');
  console.error('Variáveis disponíveis em import.meta.env:', import.meta?.env ? Object.keys(import.meta.env) : 'undefined');
  throw new Error(
    'VITE_SUPABASE_URL não configurado. Defina a variável de ambiente no .env ou Vercel.'
  );
}

if (!SUPABASE_ANON_KEY) {
  console.error('Erro: VITE_SUPABASE_ANON_KEY não encontrado');
  throw new Error(
    'VITE_SUPABASE_ANON_KEY não configurado. Defina a variável de ambiente no .env ou Vercel.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };