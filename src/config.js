// Configuração do Supabase injetada pelo Vite
// Usa import.meta.env diretamente para evitar placeholders
window.APP_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};
