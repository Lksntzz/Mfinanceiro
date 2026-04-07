async function getSupabase() {
  const module = await import('./src/supabase.js');
  return module.supabase;
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    window.AuthSession?.saveAuthSession(data.user);

    showMessage(
      'success',
      `Login realizado com sucesso. Redirecionando para o dashboard...`
    );

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1200);
  } catch (error) {
    showMessage('error', error.message || 'Nao foi possivel fazer login.');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
  }
});
