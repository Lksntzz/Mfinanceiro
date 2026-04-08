async function getSupabase() {
  if (window.SupabaseClient) {
    return window.SupabaseClient;
  }

  if (window.__supabaseReady) {
    return window.__supabaseReady;
  }

  if (window.SupabaseInitError) {
    throw window.SupabaseInitError;
  }

  throw new Error('Cliente do Supabase nao foi inicializado.');
}

const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const messageBox = document.getElementById('message');

function showMessage(type, text) {
  if (!messageBox) {
    return;
  }

  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
}

if (!loginForm) {
  throw new Error('Formulario de login nao encontrado');
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    window.AuthSession?.saveAuthSession(data.user);
    showMessage('success', 'Login realizado com sucesso. Redirecionando para o dashboard...');

    setTimeout(() => {
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
