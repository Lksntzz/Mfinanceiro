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

const registerForm = document.getElementById('register-form');
const registerButton = document.getElementById('register-button');
const messageBox = document.getElementById('message');

function showMessage(type, text) {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(registerForm);
  const email = formData.get('email');
  const password = formData.get('senha');

  registerButton.disabled = true;
  registerButton.textContent = 'Cadastrando...';

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    }, {
      redirectTo: `${window.location.origin}/login.html`,
    });

    if (error) {
      throw error;
    }

    showMessage(
      'success',
      'Cadastro concluido com sucesso. Agora faca login para acessar o painel.'
    );
    registerForm.reset();

    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1400);
  } catch (error) {
    showMessage('error', error.message || 'Nao foi possivel concluir o cadastro.');
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = 'Cadastrar';
  }
});
