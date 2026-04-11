(() => {
const {
  carregarCartoes: loadAccountsCards,
  carregarContasFixas: loadSavedFixedAccounts,
  carregarContasVariaveis: loadSavedDailyAccounts,
  carregarLancamentosCartao: loadAccountsCardExpenses,
  carregarParcelamentos: loadSavedInstallments,
  createId,
  editarContaFixa: editSavedFixedAccount,
  editarContaVariavel: editSavedDailyExpense,
  editarParcelamento: editSavedInstallment,
  loadAppData: loadAccountsData,
  salvarContaFixa: saveFixedAccount,
  salvarContaVariavel: saveDailyExpense,
  salvarContasVariaveisImportadas: saveImportedDailyExpenses,
  salvarParcelamento: saveInstallment,
  toNumber: toAccountsNumber,
  updateAppData: updateAccountsData,
} = window.FinanceStore;
const {
  formatCurrency: formatAccountsCurrency,
  formatDateLong: formatAccountsDateLong,
  getAccountsInCycle: getAccountsCycleSummary,
  getDailyExpensesSummary: getAccountsDailyExpensesSummary,
  getInstallmentsSummary: getAccountsInstallmentsSummary,
  getNextPaymentInfo,
} = window.FinanceCalculations;

const contaFixaForm = document.getElementById("conta-fixa-form");
const contaMessage = document.getElementById("conta-message");
const contasTableBody = document.getElementById("contas-table-body");
const contasEmptyState = document.getElementById("contas-empty-state");
const diaADiaForm = document.getElementById("dia-a-dia-form");
const diaADiaEmptyState = document.getElementById("dia-a-dia-empty-state");
const importMessage = document.getElementById("import-message");
const importFileInput = document.getElementById("gastosImportFile");
const importPreviewList = document.getElementById("import-preview-list");
const importActions = document.querySelector(".import-actions");
const processImportButton = document.getElementById("process-import-button");
const confirmImportButton = document.getElementById("confirm-import-button");
const installmentForm = document.getElementById("parcelamento-form");
const installmentMessage = document.getElementById("parcelamento-message");
const installmentsTableBody = document.getElementById("parcelamentos-table-body");
const installmentsEmptyState = document.getElementById("parcelamentos-empty-state");
const accountTabLinks = Array.from(
  document.querySelectorAll("[data-account-tab-link]")
);
const accountTabPanels = Array.from(
  document.querySelectorAll("[data-account-tab-panel]")
);

const DEFAULT_ACCOUNTS_TAB = "contas-fixas";

window.AppShell.initAppShell();

const DAILY_EXPENSE_CATEGORIES = [
  "alimentacao",
  "transporte",
  "mercado",
  "saude",
  "lazer",
  "compras",
  "outros",
];
let importedDraftsState = [];
let expenseHydrationPromise = null;

function getExpenseSyncApi() {
  return window.MFinanceiroSupabaseSync || null;
}

function isAuthSessionMissingError(error) {
  const message = String(error?.message || "").toLowerCase();
  const name = String(error?.name || "");
  return name === "AuthSessionMissingError" || message.includes("auth session missing");
}

function setFormLoadingState(form, isLoading, loadingLabel) {
  const submitButton = getSubmitButton(form);

  if (!submitButton) {
    return;
  }

  if (!submitButton.dataset.defaultLabel) {
    submitButton.dataset.defaultLabel = submitButton.textContent;
  }

  submitButton.disabled = Boolean(isLoading);
  submitButton.textContent = isLoading
    ? loadingLabel
    : submitButton.dataset.defaultLabel || submitButton.textContent;
}

async function refreshExpensesFromSupabase() {
  const syncApi = getExpenseSyncApi();

  if (typeof syncApi?.getExpenses !== "function") {
    return [];
  }

  const expenses = await syncApi.getExpenses();
  renderDailyExpenses();
  return expenses;
}

async function refreshFixedBillsFromSupabase() {
  const syncApi = getExpenseSyncApi();

  if (typeof syncApi?.getFixedBills !== "function") {
    return [];
  }

  const fixedBills = await syncApi.getFixedBills();
  renderFixedAccounts();
  return fixedBills;
}

async function refreshInstallmentsFromSupabase() {
  const syncApi = getExpenseSyncApi();

  if (typeof syncApi?.getInstallments !== "function") {
    return [];
  }

  const installments = await syncApi.getInstallments();
  renderInstallments();
  return installments;
}

async function ensureExpensesHydrated() {
  if (expenseHydrationPromise) {
    return expenseHydrationPromise;
  }

  expenseHydrationPromise = (async () => {
    try {
      if (window.__mfinanceiroSupabaseHydrationReady) {
        await window.__mfinanceiroSupabaseHydrationReady;
      }

      await refreshFixedBillsFromSupabase();
      await refreshExpensesFromSupabase();
      await refreshInstallmentsFromSupabase();
    } catch (error) {
      if (isAuthSessionMissingError(error)) {
        console.warn(
          "[Contas] Sessao do Supabase ausente; mantendo despesas locais ate uma autenticacao remota valida.",
          error
        );
        return;
      }

      console.error("[Contas] Falha ao carregar despesas do Supabase.", error);
    } finally {
      expenseHydrationPromise = null;
    }
  })();

  return expenseHydrationPromise;
}

function getCurrentAccountsTab() {
  const hash = window.location.hash.replace("#", "").trim();
  const validTab = accountTabPanels.find(
    (panel) => panel.dataset.accountTabPanel === hash
  );

  return validTab ? hash : DEFAULT_ACCOUNTS_TAB;
}

function activateAccountsTab(tabId, { replaceHash = false } = {}) {
  const nextTab = accountTabPanels.find(
    (panel) => panel.dataset.accountTabPanel === tabId
  )
    ? tabId
    : DEFAULT_ACCOUNTS_TAB;

  accountTabPanels.forEach((panel) => {
    const isActive = panel.dataset.accountTabPanel === nextTab;
    panel.classList.toggle("hidden", !isActive);
    panel.classList.toggle("is-active", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
    panel.hidden = !isActive;
    panel.style.display = isActive ? "grid" : "none";
  });

  accountTabLinks.forEach((link) => {
    const isActive = link.dataset.accountTabLink === nextTab;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-selected", String(isActive));
  });

  const nextHash = `#${nextTab}`;

  if (replaceHash) {
    window.history.replaceState(null, "", nextHash);
  } else if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

function syncAccountsTabFromHash({ replaceHash = false } = {}) {
  activateAccountsTab(getCurrentAccountsTab(), { replaceHash });
}

function getSubmitButton(form) {
  if (!form) {
    return null;
  }

  return form.querySelector('button[type="submit"]');
}

function resetFormMode(form, defaultLabel) {
  if (!form) {
    return;
  }

  delete form.dataset.editId;
  const submitButton = getSubmitButton(form);

  if (submitButton) {
    submitButton.textContent = defaultLabel;
    submitButton.dataset.defaultLabel = defaultLabel;
  }
}

function setFormMode(form, editId, editLabel) {
  if (!form) {
    return;
  }

  form.dataset.editId = editId;
  const submitButton = getSubmitButton(form);

  if (submitButton) {
    submitButton.textContent = editLabel;
    submitButton.dataset.defaultLabel = editLabel;
  }
}

function showContaMessage(type, text) {
  contaMessage.textContent = text;
  contaMessage.className = `message-box ${type}`;
}

function showInstallmentMessage(type, text) {
  if (!installmentMessage) {
    return;
  }

  installmentMessage.textContent = text;
  installmentMessage.className = `message-box ${type}`;
}

function showImportMessage(type, text) {
  if (!importMessage) {
    return;
  }

  importMessage.textContent = text;
  importMessage.className = `message-box ${type}`;
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function suggestCategory(text) {
  const normalizedText = String(text || "").toLowerCase();

  if (/(mercado|supermercado|atacadao)/.test(normalizedText)) {
    return "mercado";
  }

  if (/(uber|99|metro|ônibus|onibus|combustivel|gasolina|transporte)/.test(normalizedText)) {
    return "transporte";
  }

  if (/(restaurante|lanche|ifood|almoco|janta|alimenta)/.test(normalizedText)) {
    return "alimentacao";
  }

  if (/(farmacia|medico|hospital|saude)/.test(normalizedText)) {
    return "saude";
  }

  if (/(cinema|streaming|show|lazer)/.test(normalizedText)) {
    return "lazer";
  }

  if (/(compra|loja|shopping|amazon|mercado livre)/.test(normalizedText)) {
    return "compras";
  }

  return "outros";
}

function extractDateFromText(text) {
  const normalizedText = String(text || "");
  const isoMatch = normalizedText.match(/(20\d{2})[-_./](\d{2})[-_./](\d{2})/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brazilianMatch = normalizedText.match(/(\d{2})[-_./](\d{2})[-_./](20\d{2})/);

  if (brazilianMatch) {
    return `${brazilianMatch[3]}-${brazilianMatch[2]}-${brazilianMatch[1]}`;
  }

  return getTodayInputValue();
}

function extractAmountFromText(text) {
  const matches = String(text || "").match(/\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2})?/g);

  if (!matches?.length) {
    return 0;
  }

  return toAccountsNumber(matches[matches.length - 1]);
}

function normalizeImportDescription(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDraftFromFile(file) {
  const description = normalizeImportDescription(file.name);

  return {
    id: createId("importado"),
    arquivoNome: file.name,
    descricao: description || "Lancamento importado",
    valor: extractAmountFromText(file.name),
    data: extractDateFromText(file.name),
    categoria: suggestCategory(file.name),
    tipo: "saida",
    origem: "importado",
    leituraAutomatica: {
      arquivo: file.name,
      tipo: file.type || "desconhecido",
      estrategia: "heuristica_nome_arquivo",
    },
  };
}

function renderImportDrafts() {
  if (!importPreviewList) {
    return;
  }

  if (!importedDraftsState.length) {
    importPreviewList.innerHTML = `
      <div class="subtle-panel">
        <strong>Nenhum arquivo carregado</strong>
        <span class="section-note">
          Depois do upload, os lancamentos sugeridos aparecem aqui para revisao manual.
        </span>
      </div>
    `;
    return;
  }

  importPreviewList.innerHTML = importedDraftsState
    .map(
      (item) => `
        <div class="subtle-panel" data-import-id="${item.id}">
          <strong>${item.arquivoNome}</strong>
          <div class="receipt-form-grid">
            <div class="field">
              <span>Descricao</span>
              <input type="text" data-import-field="descricao" value="${item.descricao}" />
            </div>
            <div class="field">
              <span>Valor</span>
              <input type="text" inputmode="decimal" data-import-field="valor" value="${item.valor || ""}" />
            </div>
            <div class="field">
              <span>Data</span>
              <input type="date" data-import-field="data" value="${item.data}" />
            </div>
            <div class="field">
              <span>Categoria</span>
              <select class="app-select" data-import-field="categoria">
                ${DAILY_EXPENSE_CATEGORIES.map((category) => `
                  <option value="${category}" ${item.categoria === category ? "selected" : ""}>${category}</option>
                `).join("")}
              </select>
            </div>
          </div>
          <div class="button-row align-start">
            <button type="button" class="ghost-button small-button" data-action="remove-import" data-id="${item.id}">
              Remover item
            </button>
          </div>
        </div>
      `
    )
    .join("");
}

function syncImportWorkflowState() {
  const hasFile = Boolean(importFileInput?.files?.length);
  const hasDrafts = importedDraftsState.length > 0;

  if (importActions) {
    importActions.classList.toggle("hidden", !hasFile && !hasDrafts);
  }

  if (processImportButton) {
    processImportButton.classList.toggle("hidden", !hasFile || hasDrafts);
  }

  if (confirmImportButton) {
    confirmImportButton.classList.toggle("hidden", !hasDrafts);
  }

  if (importPreviewList) {
    importPreviewList.classList.toggle("hidden", !hasDrafts);
  }
}

function getContaStatus(conta, paymentInfo) {
  if (!conta.recorrente) {
    const isPaid = conta.status === "paga";
    return {
      label: isPaid ? "Paga" : "Pendente",
      action: isPaid ? "Reabrir" : "Marcar paga",
      statusClass: isPaid ? "status-positive" : "status-warning",
    };
  }

  const paidAt = conta.ultimaQuitacao ? new Date(conta.ultimaQuitacao) : null;
  const paidThisCycle =
    paidAt &&
    paidAt.getTime() >= paymentInfo.cycleStart.getTime() &&
    paidAt.getTime() <= paymentInfo.cycleEnd.getTime();

  return {
    label: paidThisCycle ? "Paga no ciclo" : "Pendente no ciclo",
    action: paidThisCycle ? "Reabrir ciclo" : "Marcar paga",
    statusClass: paidThisCycle ? "status-positive" : "status-warning",
  };
}

function renderFixedAccounts() {
  if (!contasTableBody || !contasEmptyState) {
    return;
  }

  const data = loadAccountsData();
  const paymentInfo = getNextPaymentInfo(data);
  const contas = [...loadSavedFixedAccounts()].sort((left, right) => {
    return new Date(left.dataVencimento).getTime() - new Date(right.dataVencimento).getTime();
  });
  const fixedSummaryTotal = contas.reduce((sum, conta) => sum + Number(conta.valor || 0), 0);
  const nextDue = [...contas]
    .sort((left, right) => new Date(left.dataVencimento).getTime() - new Date(right.dataVencimento).getTime())[0];

  document.getElementById("contas-total-ciclo").textContent = formatAccountsCurrency(fixedSummaryTotal);
  document.getElementById("contas-quantidade").textContent = String(contas.length);
  document.getElementById("contas-proxima-data").textContent = nextDue
    ? `${nextDue.nome} em ${formatAccountsDateLong(nextDue.dataVencimento)}`
    : "--";
  document.getElementById("contas-status-chip").textContent = contas.length
    ? "Contas fixas ativas"
    : "Sem contas";

  if (!contas.length) {
    contasTableBody.innerHTML = "";
    contasEmptyState.classList.remove("hidden");
    contasEmptyState.innerHTML = `
      <strong>Nenhuma conta fixa cadastrada</strong>
      Adicione contas fixas para alimentar o valor comprometido e o resumo do ciclo.
    `;
    return;
  }

  contasEmptyState.classList.add("hidden");
  contasEmptyState.innerHTML = "";

  contasTableBody.innerHTML = contas
    .map((conta) => {
      const status = getContaStatus(conta, paymentInfo);

      return `
        <tr>
          <td>
            <strong>${conta.nome}</strong><br />
            <span class="text-soft">${conta.categoria || "Sem categoria"}${conta.recorrente ? " - Recorrente" : ""}</span>
          </td>
          <td>${formatAccountsCurrency(conta.valor)}</td>
          <td>${formatAccountsDateLong(conta.dataVencimento)}</td>
})();

