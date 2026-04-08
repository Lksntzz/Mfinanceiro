const page = document.body?.dataset.page;

async function bootPage() {
  if (page === 'index') {
    window.location.replace('/dashboard.html');
    return;
  }

  if (page === 'login') {
    await import('../auth.js');
    await import('./login.js');
    return;
  }

  if (page === 'register') {
    await import('../auth.js');
    await import('./register.js');
  }
}

bootPage();
