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
    define: {
      // Fallback para import.meta.env se necessário
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(VITE_SUPABASE_ANON_KEY),
    },
    plugins: [
      // Plugin para substituir placeholders no arquivo de configuração
      {
        name: 'inject-env',
        transform(code, id) {
          if (id.includes('src/config.js')) {
            console.log('[Vite Plugin] Injetando variáveis em config.js');
            return code
              .replace('__VITE_SUPABASE_URL__', VITE_SUPABASE_URL)
              .replace('__VITE_SUPABASE_ANON_KEY__', VITE_SUPABASE_ANON_KEY);
          }
        },
      },
    ],
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