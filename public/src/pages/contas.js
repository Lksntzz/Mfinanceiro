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

  if (/(uber|99|metro|Ã´nibus|onibus|combustivel|gasolina|transporte)/.test(normalizedText)) {
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
          <td><span class="${status.statusClass}">${status.label}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="secondary-button small-button" data-action="edit-fixed" data-id="${conta.id}">
                Editar
              </button>
              <button type="button" class="secondary-button small-button" data-action="toggle-fixed" data-id="${conta.id}">
                ${status.action}
              </button>
              <button type="button" class="ghost-button small-button" data-action="delete-fixed" data-id="${conta.id}">
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderDailyExpenses() {
  if (!diaADiaEmptyState) {
    return;
  }

  const data = loadAccountsData();
  const summary = getAccountsDailyExpensesSummary(data);
  const items = [...loadSavedDailyAccounts()].sort((left, right) => {
    return new Date(right.data).getTime() - new Date(left.data).getTime();
  });
  const latestItem = items[0];

  document.getElementById("dia-a-dia-total").textContent = formatAccountsCurrency(summary.total);
  document.getElementById("dia-a-dia-hoje").textContent = formatAccountsCurrency(summary.todayTotal);
  document.getElementById("dia-a-dia-quantidade").textContent = String(items.length);
  document.getElementById("dia-a-dia-status-chip").textContent = items.length
    ? "Gastos registrados"
    : "Sem gastos";

  if (!items.length) {
    diaADiaEmptyState.classList.remove("hidden");
    diaADiaEmptyState.innerHTML = `
      <strong>Nenhum gasto do dia a dia cadastrado</strong>
      Registre despesas variaveis para acompanhar melhor o ritmo do ciclo.
    `;
    return;
  }

  diaADiaEmptyState.classList.add("hidden");
  diaADiaEmptyState.innerHTML = "";

  diaADiaEmptyState.classList.remove("hidden");
  diaADiaEmptyState.innerHTML = `
    <strong>Leitura do dia a dia pronta</strong>
    ${latestItem
      ? `Ultimo gasto registrado: <strong>${latestItem.descricao || "Lancamento"}</strong> em ${formatAccountsDateLong(latestItem.data)} no valor de <strong>${formatAccountsCurrency(latestItem.valor)}</strong>.`
      : "Registre despesas variaveis para acompanhar melhor o ritmo do ciclo."}
  `;
}

function extractTimeLabel(value) {
  if (typeof value !== "string") {
    return "";
  }

  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function renderInstallments() {
  if (!installmentsTableBody || !installmentsEmptyState) {
    return;
  }

  const data = loadAccountsData();
  const summary = getAccountsInstallmentsSummary(data);
  const items = [...loadSavedInstallments()];

  document.getElementById("parcelamentos-total-ciclo").textContent = formatAccountsCurrency(summary.total);
  document.getElementById("parcelamentos-quantidade").textContent = String(items.length);
  document.getElementById("parcelamentos-status-chip").textContent = items.length
    ? "Parcelamentos ativos"
    : "Sem parcelamentos";

  if (!items.length) {
    installmentsTableBody.innerHTML = "";
    installmentsEmptyState.classList.remove("hidden");
    installmentsEmptyState.innerHTML = `
      <strong>Nenhum parcelamento cadastrado</strong>
      Cadastre parcelamentos para incluir somente a parcela do mes no valor comprometido.
    `;
    return;
  }

  const currentInstallments = new Map(
    summary.items.map((item) => [item.id, item])
  );

  installmentsEmptyState.classList.add("hidden");
  installmentsEmptyState.innerHTML = "";
  installmentsTableBody.innerHTML = items
    .map((item) => {
      const currentInstallment = currentInstallments.get(item.id);

      return `
        <tr>
          <td>
            <strong>${item.nome}</strong><br />
            <span class="text-soft">${item.tipo} - ${item.parcelas}x de ${formatAccountsCurrency(item.valorParcela)}</span>
          </td>
          <td>${currentInstallment ? `${currentInstallment.installmentNumber}/${item.parcelas}` : "--"}</td>
          <td>${currentInstallment?.dueDate ? formatAccountsDateLong(currentInstallment.dueDate) : "--"}</td>
          <td><span class="${item.status === "finalizado" ? "status-positive" : "status-warning"}">${item.status}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="secondary-button small-button" data-action="edit-installment" data-id="${item.id}">
                Editar
              </button>
              <button type="button" class="ghost-button small-button" data-action="delete-installment" data-id="${item.id}">
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function processImportFiles() {
  const files = Array.from(importFileInput?.files || []);

  if (!files.length) {
    showImportMessage("error", "Selecione pelo menos uma imagem, print ou PDF para iniciar a leitura.");
    return;
  }

  importedDraftsState = files.map((file) => buildDraftFromFile(file));
  renderImportDrafts();
  syncImportWorkflowState();
  showImportMessage(
    "success",
    "Arquivos lidos. Revise cada lancamento sugerido antes de confirmar a importacao."
  );
}

function updateImportDraft(event) {
  const field = event.target?.dataset?.importField;
  const draftRoot = event.target?.closest?.("[data-import-id]");

  if (!field || !draftRoot) {
    return;
  }

  importedDraftsState = importedDraftsState.map((item) => {
    if (item.id !== draftRoot.dataset.importId) {
      return item;
    }

    return {
      ...item,
      [field]:
        field === "valor"
          ? toAccountsNumber(event.target.value)
          : event.target.value,
    };
  });
}

function handleImportPreviewClick(event) {
  const button = event.target.closest("button[data-action='remove-import']");

  if (!button) {
    return;
  }

  importedDraftsState = importedDraftsState.filter((item) => item.id !== button.dataset.id);
  renderImportDrafts();
  showImportMessage("success", "Item removido da previa de importacao.");
}

function confirmImportedExpenses() {
  if (!importedDraftsState.length) {
    showImportMessage("error", "Nao ha lancamentos importados para confirmar.");
    return;
  }

  const invalidItem = importedDraftsState.find(
    (item) => !item.descricao || !item.data || toAccountsNumber(item.valor) <= 0
  );

  if (invalidItem) {
    showImportMessage(
      "error",
      "Revise todos os itens importados e garanta que descricao, valor e data estejam preenchidos."
    );
    return;
  }

  saveImportedDailyExpenses(
    importedDraftsState.map((item) => ({
      ...item,
      valor: toAccountsNumber(item.valor),
      origem: "importado",
    }))
  );
  importedDraftsState = [];
  if (importFileInput) {
    importFileInput.value = "";
  }
  renderImportDrafts();
  syncImportWorkflowState();
  renderDailyExpenses();

  showImportMessage(
    "success",
    "Lancamentos importados confirmados e adicionados em Contas do dia a dia."
  );
}

async function handleFixedSubmit(event) {
  event.preventDefault();
  const editId = contaFixaForm.dataset.editId;

  const payload = {
    id: editId || createId("conta"),
    nome: document.getElementById("contaNome").value.trim(),
    valor: toAccountsNumber(document.getElementById("contaValor").value),
    dataVencimento: document.getElementById("contaData").value,
    categoria: document.getElementById("contaCategoria").value.trim(),
    recorrente: document.getElementById("contaRecorrente").checked,
    status: "pendente",
    pagaEm: null,
    ultimaQuitacao: null,
  };

  if (!payload.nome || !payload.valor || !payload.dataVencimento) {
    showContaMessage("error", "Preencha nome, valor e vencimento para salvar a conta fixa.");
    return;
  }

  if (editId) {
    const existing = loadAccountsData().contasFixas.find((conta) => conta.id === editId);
    Object.assign(payload, {
      status: existing?.status || "pendente",
      pagaEm: existing?.pagaEm || null,
      ultimaQuitacao: existing?.ultimaQuitacao || null,
    });
  }

  try {
    setFormLoadingState(contaFixaForm, true, editId ? "Atualizando..." : "Salvando...");

    if (typeof getExpenseSyncApi()?.addFixedBill === "function") {
      await getExpenseSyncApi().addFixedBill(payload);
    } else {
      saveFixedAccount(payload);
    }

    contaFixaForm.reset();
    resetFormMode(contaFixaForm, "Salvar conta fixa");
    renderFixedAccounts();
    showContaMessage("success", editId ? "Conta fixa atualizada com sucesso." : "Conta fixa salva com sucesso.");
  } catch (error) {
    console.error("[Contas] Falha ao salvar conta fixa no Supabase.", error);
    showContaMessage("error", "Nao foi possivel salvar a conta fixa agora. Tente novamente.");
  } finally {
    setFormLoadingState(contaFixaForm, false);
  }
}

async function handleDailySubmit(event) {
  event.preventDefault();
  const editId = diaADiaForm.dataset.editId;
  const existingItem = editId
    ? loadAccountsData().contasDiaADia.find((item) => item.id === editId)
    : null;

  const payload = {
    id: editId || createId("gasto"),
    descricao: document.getElementById("gastoDescricao").value.trim(),
    valor: toAccountsNumber(document.getElementById("gastoValor").value),
    data: document.getElementById("gastoData").value,
    categoria: document.getElementById("gastoCategoria").value.trim(),
    tipo: "saida",
    origem: existingItem?.origem || "manual",
  };

  if (!payload.descricao || !payload.valor || !payload.data) {
    showContaMessage("error", "Preencha descricao, valor e data para salvar o gasto.");
    return;
  }

  try {
    setFormLoadingState(diaADiaForm, true, editId ? "Atualizando..." : "Salvando...");

    if (typeof getExpenseSyncApi()?.addExpense === "function") {
      await getExpenseSyncApi().addExpense(payload);
    } else {
      saveDailyExpense(payload);
    }

    diaADiaForm.reset();
    resetFormMode(diaADiaForm, "Salvar gasto");
    renderDailyExpenses();
    showContaMessage("success", editId ? "Gasto atualizado com sucesso." : "Gasto do dia a dia salvo com sucesso.");
  } catch (error) {
    console.error("[Contas] Falha ao salvar gasto no Supabase.", error);
    showContaMessage("error", "Nao foi possivel salvar o gasto agora. Tente novamente.");
  } finally {
    setFormLoadingState(diaADiaForm, false);
  }
}

async function handleInstallmentSubmit(event) {
  event.preventDefault();
  const editId = installmentForm.dataset.editId;

  const payload = {
    id: editId || createId("parcelamento"),
    nome: document.getElementById("parcelamentoNome").value.trim(),
    valorTotal: toAccountsNumber(document.getElementById("parcelamentoValorTotal").value),
    parcelas: toAccountsNumber(document.getElementById("parcelamentoParcelas").value),
    valorParcela: toAccountsNumber(document.getElementById("parcelamentoValorParcela").value),
    dataInicio: document.getElementById("parcelamentoDataInicio").value,
    vencimento: toAccountsNumber(document.getElementById("parcelamentoVencimento").value),
    tipo: document.getElementById("parcelamentoTipo").value,
    status: document.getElementById("parcelamentoStatus").value,
  };

  if (
    !payload.nome ||
    !payload.valorTotal ||
    !payload.parcelas ||
    !payload.valorParcela ||
    !payload.dataInicio ||
    !payload.vencimento
  ) {
    showInstallmentMessage("error", "Preencha todos os campos do parcelamento.");
    return;
  }

  try {
    setFormLoadingState(installmentForm, true, editId ? "Atualizando..." : "Salvando...");

    if (typeof getExpenseSyncApi()?.addInstallment === "function") {
      await getExpenseSyncApi().addInstallment(payload);
    } else {
      saveInstallment(payload);
    }

    installmentForm.reset();
    resetFormMode(installmentForm, "Salvar parcelamento");
    renderInstallments();

    showInstallmentMessage(
      "success",
      editId ? "Parcelamento atualizado com sucesso." : "Parcelamento salvo com sucesso."
    );
  } catch (error) {
    console.error("[Contas] Falha ao salvar parcelamento no Supabase.", error);
    showInstallmentMessage("error", "Nao foi possivel salvar o parcelamento agora. Tente novamente.");
  } finally {
    setFormLoadingState(installmentForm, false);
  }
}

async function handleContasTableClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "delete-fixed") {
    try {
      if (typeof getExpenseSyncApi()?.deleteFixedBill === "function") {
        await getExpenseSyncApi().deleteFixedBill(id);
      } else {
        updateAccountsData((draft) => {
          draft.contasFixas = draft.contasFixas.filter((conta) => conta.id !== id);
          return draft;
        });
      }
      renderFixedAccounts();
      showContaMessage("success", "Conta fixa removida.");
    } catch (error) {
      console.error("[Contas] Falha ao remover conta fixa do Supabase.", error);
      showContaMessage("error", "Nao foi possivel remover a conta fixa agora. Tente novamente.");
    }
    return;
  }

  if (action === "edit-fixed") {
    const conta = editSavedFixedAccount(id);

    if (!conta) {
      return;
    }

    document.getElementById("contaNome").value = conta.nome || "";
    document.getElementById("contaValor").value = conta.valor || "";
    document.getElementById("contaData").value = conta.dataVencimento || "";
    document.getElementById("contaCategoria").value = conta.categoria || "";
    document.getElementById("contaRecorrente").checked = Boolean(conta.recorrente);
    setFormMode(contaFixaForm, conta.id, "Atualizar conta fixa");
    showContaMessage("success", "Conta fixa carregada para edicao.");
    return;
  }

  if (action === "toggle-fixed") {
    updateAccountsData((draft) => {
      draft.contasFixas = draft.contasFixas.map((conta) => {
        if (conta.id !== id) {
          return conta;
        }

        if (conta.recorrente) {
          return {
            ...conta,
            ultimaQuitacao: conta.ultimaQuitacao ? null : new Date().toISOString(),
          };
        }

        return {
          ...conta,
          status: conta.status === "paga" ? "pendente" : "paga",
          pagaEm: conta.status === "paga" ? null : new Date().toISOString(),
        };
      });
      return draft;
    });

    renderFixedAccounts();
    showContaMessage("success", "Status da conta fixa atualizado.");
  }
}

async function handleDailyTableClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "edit-daily") {
    const item = editSavedDailyExpense(id);

    if (!item) {
      return;
    }

    document.getElementById("gastoDescricao").value = item.descricao || "";
    document.getElementById("gastoValor").value = item.valor || "";
    document.getElementById("gastoData").value = item.data || "";
    document.getElementById("gastoCategoria").value = item.categoria || "";
    setFormMode(diaADiaForm, item.id, "Atualizar gasto");
    showContaMessage("success", "Gasto carregado para edicao.");
    return;
  }

  if (action === "delete-daily") {
    try {
      if (typeof getExpenseSyncApi()?.deleteExpense === "function") {
        await getExpenseSyncApi().deleteExpense(id);
      } else {
        updateAccountsData((draft) => {
          draft.contasDiaADia = draft.contasDiaADia.filter((item) => item.id !== id);
          return draft;
        });
      }

      renderDailyExpenses();
      showContaMessage("success", "Gasto removido com sucesso.");
    } catch (error) {
      console.error("[Contas] Falha ao remover gasto do Supabase.", error);
      showContaMessage("error", "Nao foi possivel remover o gasto agora. Tente novamente.");
    }
  }
}

async function handleInstallmentsTableClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "edit-installment") {
    const item = editSavedInstallment(id);

    if (!item) {
      return;
    }

    document.getElementById("parcelamentoNome").value = item.nome || "";
    document.getElementById("parcelamentoValorTotal").value = item.valorTotal || "";
    document.getElementById("parcelamentoParcelas").value = item.parcelas || "";
    document.getElementById("parcelamentoValorParcela").value = item.valorParcela || "";
    document.getElementById("parcelamentoDataInicio").value = item.dataInicio || "";
    document.getElementById("parcelamentoVencimento").value = item.vencimento || "";
    document.getElementById("parcelamentoTipo").value = item.tipo || "cartao";
    document.getElementById("parcelamentoStatus").value = item.status || "ativo";
    setFormMode(installmentForm, item.id, "Atualizar parcelamento");
    showInstallmentMessage("success", "Parcelamento carregado para edicao.");
    return;
  }

  if (action === "delete-installment") {
    try {
      if (typeof getExpenseSyncApi()?.deleteInstallment === "function") {
        await getExpenseSyncApi().deleteInstallment(id);
      } else {
        updateAccountsData((draft) => {
          draft.parcelamentos = draft.parcelamentos.filter((item) => item.id !== id);
          return draft;
        });
      }
      renderInstallments();
      showInstallmentMessage("success", "Parcelamento removido.");
    } catch (error) {
      console.error("[Contas] Falha ao remover parcelamento do Supabase.", error);
      showInstallmentMessage("error", "Nao foi possivel remover o parcelamento agora. Tente novamente.");
    }
  }
}

function getPreferredForm() {
  const activeElement = document.activeElement;
  const candidate = activeElement?.closest?.("form");

  if (candidate) {
    return candidate;
  }

  const currentTab = getCurrentAccountsTab();

  if (currentTab === "dia-a-dia") {
    return diaADiaForm;
  }

  if (currentTab === "parcelamentos") {
    return installmentForm;
  }

  return (
    [contaFixaForm, diaADiaForm, installmentForm].find((form) => form?.dataset?.editId) ||
    contaFixaForm
  );
}

function triggerCurrentFormSubmit() {
  getPreferredForm()?.requestSubmit();
}

function triggerCurrentFormEditReset() {
  const form = getPreferredForm();

  form.reset();

  if (form === contaFixaForm) {
    resetFormMode(contaFixaForm, "Salvar conta fixa");
    document.getElementById("contaRecorrente").checked = false;
    showContaMessage("success", "Formulario de conta fixa liberado para nova edicao.");
    return;
  }

  if (form === diaADiaForm) {
    resetFormMode(diaADiaForm, "Salvar gasto");
    showContaMessage("success", "Formulario de gasto liberado para nova edicao.");
    return;
  }

  if (form === installmentForm) {
    resetFormMode(installmentForm, "Salvar parcelamento");
    showInstallmentMessage("success", "Formulario de parcelamento liberado para nova edicao.");
    return;
  }

}

function renderAccountsPage() {
  renderFixedAccounts();
  renderDailyExpenses();
  renderInstallments();
  renderImportDrafts();
}

if (contaFixaForm) {
  contaFixaForm.addEventListener("submit", handleFixedSubmit);
}

if (diaADiaForm) {
  diaADiaForm.addEventListener("submit", handleDailySubmit);
}

if (installmentForm) {
  installmentForm.addEventListener("submit", handleInstallmentSubmit);
}

if (contasTableBody) {
  contasTableBody.addEventListener("click", handleContasTableClick);
}

if (installmentsTableBody) {
  installmentsTableBody.addEventListener("click", handleInstallmentsTableClick);
}


if (processImportButton) {
  processImportButton.addEventListener("click", processImportFiles);
}

if (confirmImportButton) {
  confirmImportButton.addEventListener("click", confirmImportedExpenses);
}

if (importFileInput) {
  importFileInput.addEventListener("change", () => {
    importedDraftsState = [];
    renderImportDrafts();
    syncImportWorkflowState();

    if (importFileInput.files?.length) {
      showImportMessage(
        "success",
        "Arquivo selecionado. Clique em Ler arquivo para revisar os lancamentos antes de importar."
      );
    } else {
      showImportMessage("hidden", "");
    }
  });
}

if (importPreviewList) {
  importPreviewList.addEventListener("input", updateImportDraft);
  importPreviewList.addEventListener("change", updateImportDraft);
  importPreviewList.addEventListener("click", handleImportPreviewClick);
}

accountTabLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    activateAccountsTab(link.dataset.accountTabLink);
  });
});

window.addEventListener("hashchange", () => {
  syncAccountsTabFromHash();
});

window.addEventListener("app-shell-action", (event) => {
  const action = event.detail?.action;

  if (action === "save-current-form") {
    triggerCurrentFormSubmit();
  }

  if (action === "edit-current-form") {
    triggerCurrentFormEditReset();
  }
});
window.addEventListener("finance-data-updated", () => {
  renderAccountsPage();
});
window.addEventListener("storage", () => {
  renderAccountsPage();
});
window.addEventListener("mfinanceiro-supabase-hydrated", () => {
  ensureExpensesHydrated();
});

syncAccountsTabFromHash({ replaceHash: true });
renderAccountsPage();
syncImportWorkflowState();
ensureExpensesHydrated();
})();



