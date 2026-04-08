// Aguarda até que APP_CONFIG esteja disponível (carregado pelo script de config.js)
async function waitForAppConfig(maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i++) {
    if (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) {
      return window.APP_CONFIG;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('APP_CONFIG não foi carregado em tempo hábil');
}

async function getSupabase() {
  try {
    // Garante que a configuração está disponível
    const config = await waitForAppConfig();
    
    // Verifica se as variáveis estão presentes
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      throw new Error(
        'Variáveis do Supabase não configuradas. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env ou Vercel.'
      );
    }
    
    const module = await import('../src/supabase.js');
    return module.supabase;
  } catch (error) {
    console.error('Erro ao carregar Supabase:', error);
    throw error;
  }
}

const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const messageBox = document.getElementById('message');

function showMessage(type, text) {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const email = formData.get('email');
  const password = formData.get('senha');

  loginButton.disabled = true;
  loginButton.textContent = 'Entrando...';

  try {
    const supabase = await getSupabase();
    console.log('Tentando login com:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Resposta do login:', { data, error });

    if (error) {
      throw error;
    }

    console.log('Usuário logado:', data.user);
    window.AuthSession?.saveAuthSession(data.user);

    showMessage(
      'success',
      `Login realizado com sucesso. Redirecionando para o dashboard...`
    );

    console.log('Redirecionando em 1.2s...');
    setTimeout(() => {
      console.log('Executando redirecionamento para /dashboard.html');
      window.location.href = '/dashboard.html';
    }, 1200);
  } catch (error) {
    const message =
      error.message === 'Email not confirmed'
        ? 'Email ainda nao confirmado. Verifique seu email e confirme o cadastro.'
        : error.message || 'Nao foi possivel fazer login.';

    showMessage('error', message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
  }
});
