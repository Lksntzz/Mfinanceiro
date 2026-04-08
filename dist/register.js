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
