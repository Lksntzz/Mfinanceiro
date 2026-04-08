import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    // Fallback para import.meta.env se necessário
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
  },
  plugins: [
    // Plugin para substituir placeholders no arquivo de configuração
    {
      name: 'inject-env',
      transform(code, id) {
        if (id.includes('src/config.js')) {
          const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
          const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
          
          return code
            .replace('__VITE_SUPABASE_URL__', supabaseUrl)
            .replace('__VITE_SUPABASE_ANON_KEY__', supabaseKey);
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
});