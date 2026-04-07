async function getSupabase() {
  const module = await import('./src/supabase.js');
  return module.supabase;
}

async function login(email, password) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  window.AuthSession?.saveAuthSession(data.user);
  window.location.href = 'dashboard.html';
}

const form = document.querySelector('form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;

  await login(email, password);
});