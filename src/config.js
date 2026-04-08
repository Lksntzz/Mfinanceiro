// Configuração do Supabase injetada pelo Vite
// Usa import.meta.env diretamente para evitar placeholders
const APP_CONFIG = Object.freeze({
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

window.APP_CONFIG = APP_CONFIG;

export { APP_CONFIG };
