import { supabase } from './supabase.js';

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  window.AuthSession?.saveAuthSession(data.user);
  window.location.href = '/dashboard.html';
}

const form = document.querySelector('form');

if (!form) {
  throw new Error('Formulario de login nao encontrado');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.querySelector('#email').value;
  const password = document.querySelector('#senha').value;

  await login(email, password);
});
