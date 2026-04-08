import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  // Carrega variáveis do .env
  const env = loadEnv(mode, process.cwd(), '');
  const VITE_SUPABASE_URL = env.VITE_SUPABASE_URL || '';
  const VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

  console.log('[Vite] VITE_SUPABASE_URL carregado:', VITE_SUPABASE_URL ? 'OK' : 'VAZIO');
  console.log('[Vite] VITE_SUPABASE_ANON_KEY carregado:', VITE_SUPABASE_ANON_KEY ? 'OK' : 'VAZIO');

  return {
    // Vite já expõe import.meta.env para módulos
    // Não precisamos do plugin de placeholders para src/config.js
    // As envs serão lidas diretamente via import.meta.env
    base: '',
    plugins: [],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          login: resolve(__dirname, 'login.html'),
          register: resolve(__dirname, 'register.html'),
        },
      },
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
  };
});