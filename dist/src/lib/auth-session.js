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

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession);
  } catch (error) {
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
  if (!isAuthenticated()) {
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
};
