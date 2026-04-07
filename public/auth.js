const AUTH_STORAGE_KEY = "mfinanceiro_auth";

function saveAuthSession(user) {
  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user,
      authenticatedAt: Date.now(),
    })
  );
}

function getAuthSession() {
  const rawSession = sessionStorage.getItem(AUTH_STORAGE_KEY);
  console.log('getAuthSession: rawSession =', rawSession);

  if (!rawSession) {
    console.log('Nenhuma sessão encontrada no sessionStorage');
    return null;
  }

  try {
    const session = JSON.parse(rawSession);
    console.log('Sessão parseada:', session);
    return session;
  } catch (error) {
    console.log('Erro ao parsear sessão:', error);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function clearAuthSession() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function isAuthenticated() {
  const session = getAuthSession();
  return Boolean(session?.user?.email);
}

function requireAuth() {
  console.log('requireAuth chamado');
  if (!isAuthenticated()) {
    console.log('Usuário não autenticado, redirecionando para login');
    window.location.replace("/login.html");
    return null;
  }

  return getAuthSession();
}

window.AuthSession = {
  clearAuthSession,
  getAuthSession,
  isAuthenticated,
  requireAuth,
  saveAuthSession,
  saveAuthSession,
};
