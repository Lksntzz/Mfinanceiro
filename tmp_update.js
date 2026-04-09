const fs = require('fs');
const files = ['public/contas.html', 'public/cartoes.html', 'public/cadastro-bancario.html', 'public/recebimentos.html'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/<body([^>]*)data-page="([^"]+)"([^>]*)>/, (match, prefix, page, suffix) => {
    if (!match.includes('dashboard-body')) {
      return `<body${prefix}data-page="${page}"${suffix} class="dashboard-body">`;
    }
    return match;
  });

  let isBancoActive = file.includes('cadastro-bancario') ? ' is-active' : '';
  let isContasActive = file.includes('contas.html') ? ' is-active' : '';
  let isCartoesActive = file.includes('cartoes.html') ? ' is-active' : '';
  let isRecebimentosActive = file.includes('recebimentos.html') ? ' is-active' : '';

  const newNav = `<nav class="dashboard-top-tabs" aria-label="Navegacao principal">
              <a href="/dashboard.html" class="dashboard-tab-button">Visao Geral</a>
              <span class="dashboard-nav-divider" aria-hidden="true"></span>
              <a href="/cadastro-bancario.html" class="dashboard-setup-link${isBancoActive}">Banco</a>
              <a href="/contas.html" class="dashboard-setup-link${isContasActive}">Contas</a>
              <a href="/cartoes.html" class="dashboard-setup-link${isCartoesActive}">Cartoes</a>
              <a href="/recebimentos.html" class="dashboard-setup-link${isRecebimentosActive}">Recebimentos</a>
            </nav>`;

  content = content.replace(/<nav class="dashboard-top-tabs"[^>]*>[\s\S]*?<\/nav>/, newNav);

  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
