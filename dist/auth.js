let supabaseInstance = null;

async function getSupabase() {
  if (!supabaseInstance) {
    const module = await import('/src/supabase.js');
    supabaseInstance = module.supabase;
  }
  return supabaseInstance;
}

const AUTH_STORAGE_KEY = "mfinanceiro_auth";

async function saveAuthSession(user) {
  const supabase = await getSupabase();
  const session = await supabase.auth.getSession();
  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user,
      session: session.data.session,
      authenticatedAt: Date.now(),
    })
  );
}

async function getAuthSession() {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    return { user: session.user, session };
  }
  return null;
}

function clearAuthSession() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

async function isAuthenticated() {
  const session = await getAuthSession();
  return Boolean(session?.user?.email);
}

async function requireAuth() {
  if (!(await isAuthenticated())) {
    window.location.replace("/login.html");
    return null;
  }
  return await getAuthSession();
}

window.AuthSession = {
  clearAuthSession,
  getAuthSession,
  isAuthenticated,
  requireAuth,
  saveAuthSession,
};
