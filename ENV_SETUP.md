# Variáveis obrigatórias para o projeto MFinanceiro

## Frontend (Vite)
As variáveis abaixo devem estar configuradas para o cliente Supabase funcionar:

- `VITE_SUPABASE_URL` - URL do projeto Supabase (ex: https://seu-project.supabase.co)
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase

## Backend (Node.js)
- `DB_HOST` - Host do banco de dados
- `DB_PORT` - Porta do banco de dados  
- `DB_USER` - Usuário do banco de dados
- `DB_PASSWORD` - Senha do banco de dados
- `DB_NAME` - Nome do banco de dados
- `PORT` - Porta do servidor Express (padrão: 3000)

## Configuração Local
1. Copie `.env.example` para `.env`
2. Preencha com seus valores reais
3. Execute `npm run dev` ou `npm start`

## Configuração na Vercel
1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá para **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis:
   - `VITE_SUPABASE_URL=https://seu-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=sua-chave-anonima`
4. Faça deploy novamente (clique em "Redeploy")

## Teste
Após configurar as variáveis na Vercel, faça um rebuild:
- Vá para **Deployments**
- Clique nos 3 pontos do último deploy
- Selecione **Redeploy** (sem cache)

Se o erro persistir, verifique no console do navegador se a mensagem de erro mostra que as variáveis estão vazias.