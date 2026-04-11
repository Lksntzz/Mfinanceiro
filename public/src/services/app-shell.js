const APP_NAVIGATION = [
  {
    title: "Visao geral",
    items: [{ label: "Dashboard", href: "/dashboard.html", page: "dashboard" }],
  },
  {
    title: "Operacao",
    items: [
      { label: "Base financeira", href: "/cadastro-bancario.html", page: "banking" },
      { label: "Recebimentos", href: "/recebimentos.html", page: "recebimentos" },
      { label: "Contas", href: "/contas.html#contas-fixas", page: "contas" },
      { label: "Cartoes", href: "/cartoes.html", page: "cartoes" },
    ],
  },
  {
    title: "Planejamento",
    items: [{ label: "Investimentos", href: "/investimentos.html", page: "investimentos" }],
  },
];

let hasInitializedAppShell = false;
const DASHBOARD_NOTICE_KEY = "mfinanceiro_dashboard_notice";

function getCurrentPageId() {
  return document.body.dataset.page || "";
}

function getCurrentHash() {
  return window.location.hash || "";
}

function isItemActive(item) {
  const currentPage = getCurrentPageId();
  const currentHash = getCurrentHash();

  if (item.page === "dashboard") {
    return currentPage === "dashboard";
  }

  if (item.page !== currentPage) {
    return false;
  }

  if (!item.href.includes("#")) {
    return !currentHash;
  }

  return item.href.endsWith(currentHash);
}

function renderSidebarNavigation() {
  return APP_NAVIGATION.map((group) => `
    <div class="sidebar-nav-group">
      <div class="sidebar-nav-group-title">${group.title}</div>
      <div class="sidebar-nav-group-links">
        ${group.items
          .map((item) => {
            const isActive = isItemActive(item);

            return `
              <a class="sidebar-link ${isActive ? "active" : ""}" href="${item.href}">
                <span><strong>${item.label}</strong></span>
              </a>
            `;
          })
          .join("")}
      </div>
    </div>
  `).join("");
}

function getPageQuickActions() {
  const page = getCurrentPageId();

  if (page === "banking") {
    return [
      { type: "button", label: "Salvar", action: "save-banking" },
      { type: "button", label: "Editar", action: "edit-banking" },
      { type: "link", label: "Adicionar conta", href: "/contas.html" },
    ];
  }

  if (page === "contas") {
    return [
      { type: "button", label: "Salvar", action: "save-current-form" },
      { type: "button", label: "Editar", action: "edit-current-form" },
      { type: "link", label: "Adicionar conta", href: "/contas.html#contas-fixas" },
    ];
  }

  if (page === "dashboard") {
    return [
      { type: "link", label: "Configurar salario", href: "/cadastro-bancario.html" },
      { type: "link", label: "Adicionar conta", href: "/contas.html" },
    ];
  }

  return [];
}

function renderSidebarActions() {
  const actions = getPageQuickActions();

  if (!actions.length) {
    return "";
  }

  return `
    <div class="sidebar-group sidebar-actions-group">
      <div class="sidebar-group-title">Acoes</div>
      <div class="sidebar-subnav">
        ${actions
          .map((action) => {
            if (action.type === "link") {
              return `<a class="sidebar-sublink" href="${action.href}">${action.label}</a>`;
            }

            return `<button type="button" class="sidebar-sublink sidebar-action-button" data-shell-action="${action.action}">${action.label}</button>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderSidebar() {
  const sidebar = document.getElementById("app-sidebar");

  if (!sidebar) {
    return;
  }

  const user = getDisplayUser();

  sidebar.innerHTML = `
    <a href="/profile.html" class="sidebar-identity">
      <div class="brand">
        <div class="brand-mark">MF</div>
        <div class="brand-copy">
          <h2>MFinanceiro</h2>
          <p>Planejamento ate o proximo pagamento</p>
        </div>
      </div>

      <div class="user-panel sidebar-profile-panel">
        <div class="user-avatar" data-user-initial>U</div>
        <div class="sidebar-user-copy">
          <strong data-user-name>${user.nome}</strong>
          <p>${user.email || "Sessao ativa no navegador"}</p>
        </div>
      </div>
    </a>

    <nav class="sidebar-nav">
      ${renderSidebarNavigation()}
    </nav>

    <div class="sidebar-footer">
      <button type="button" class="ghost-button" data-logout-button>
        Sair
      </button>
    </div>
  `;
}

function getDisplayUser() {
  const sessionUser = window.AuthSession.getAuthSession()?.user || {};
  const profile = window.FinanceStore.loadAppData().profile || {};

  return {
    nome: profile.nome || sessionUser.nome || "Usuario",
    email: profile.email || sessionUser.email || "",
    foto: profile.foto || "",
  };
}

function fillUserData() {
  const user = getDisplayUser();
  const userNameNodes = document.querySelectorAll("[data-user-name]");
  const userEmailNodes = document.querySelectorAll("[data-user-email]");
  const userInitialNodes = document.querySelectorAll("[data-user-initial]");
  const initial = user.nome
    ? user.nome.charAt(0).toUpperCase()
    : "U";

  userNameNodes.forEach((node) => {
    node.textContent = user.nome;
  });

  userEmailNodes.forEach((node) => {
    node.textContent = user.email;
  });

  userInitialNodes.forEach((node) => {
    node.textContent = initial;

    if (user.foto) {
      node.classList.add("has-photo");
      node.style.backgroundImage = `url(${user.foto})`;
    } else {
      node.classList.remove("has-photo");
      node.style.backgroundImage = "";
    }
  });
}

function bindLogoutButtons() {
  document.querySelectorAll("[data-logout-button]").forEach((button) => {
    button.onclick = async () => {
      try {
        const supabase =
          window.SupabaseClient ||
          (window.__supabaseReady ? await window.__supabaseReady : null);

        if (supabase?.auth?.signOut) {
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error("Falha ao encerrar a sessao do Supabase:", error);
      }

      window.AuthSession.clearAuthSession();
      window.location.replace("/login.html");
    };
  });
}

function bindAppShellActions() {
  document.querySelectorAll("[data-shell-action]").forEach((button) => {
    button.onclick = () => {
      window.dispatchEvent(
        new CustomEvent("app-shell-action", {
          detail: {
            action: button.dataset.shellAction,
          },
        })
      );
    };
  });
}

function consumeDashboardNotice() {
  const notice = sessionStorage.getItem(DASHBOARD_NOTICE_KEY);

  if (notice) {
    sessionStorage.removeItem(DASHBOARD_NOTICE_KEY);
  }

  return notice;
}

function refreshAppShell() {
  const sidebarRoot = document.getElementById("app-sidebar");

  if (!sidebarRoot) {
    return;
  }

  renderSidebar();
  fillUserData();
  bindLogoutButtons();
  bindAppShellActions();
}

function initAppShell() {
  if (hasInitializedAppShell) {
    refreshAppShell();
    return;
  }

  const sidebarRoot = document.getElementById("app-sidebar");

  if (!sidebarRoot) {
    return;
  }

  hasInitializedAppShell = true;
  refreshAppShell();
}

window.AppShell = {
  consumeDashboardNotice,
  initAppShell,
  refreshAppShell,
};

window.addEventListener("finance-data-updated", refreshAppShell);
window.addEventListener("storage", refreshAppShell);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAppShell);
} else {
  initAppShell();
}
