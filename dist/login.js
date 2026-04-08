async function getSupabase() {
  try {
    const module = await import('../src/supabase.js');
    return module.supabase;
  } catch (error) {
    console.error('Erro ao carregar Supabase:', error);
    throw new Error(
      'Falha ao inicializar Supabase. Verifique se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas.'
    );
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
