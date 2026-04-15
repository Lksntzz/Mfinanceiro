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
  mergeLedgerMovementsWithManualExpenses,
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

let contaFixaForm;
let contaMessage;
let contasTableBody;
let contasEmptyState;
let diaADiaForm;
let diaADiaEmptyState;
let importMessage;
let importFileInput;
let importPreviewList;
let importActions;
let processImportButton;
let confirmImportButton;
let installmentForm;
let installmentMessage;
let installmentsTableBody;
let installmentsEmptyState;
let accountTabLinks = [];
let accountTabPanels = [];

const DEFAULT_ACCOUNTS_TAB = "contas-fixas";
const FIXED_BILL_REMINDER_STORAGE_KEY = "mfinanceiro_fixed_bill_reminders";

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

function loadFixedBillReminderState() {
  try {
    const raw = window.localStorage.getItem(FIXED_BILL_REMINDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("[Contas] Nao foi possivel carregar estado de lembretes.", error);
    return {};
  }
}

function saveFixedBillReminderState(state) {
  try {
    window.localStorage.setItem(
      FIXED_BILL_REMINDER_STORAGE_KEY,
      JSON.stringify(state && typeof state === "object" ? state : {})
    );
  } catch (error) {
    console.warn("[Contas] Nao foi possivel salvar estado de lembretes.", error);
  }
}

function normalizeFixedPaymentDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function buildFixedPaymentExpenseId(contaId, paidAt) {
  const paymentDate = normalizeFixedPaymentDate(paidAt);
  return paymentDate ? `conta_fixa_paga_${contaId}_${paymentDate}` : `conta_fixa_paga_${contaId}`;
}

function buildFixedPaymentExpensePayload(conta, paidAt) {
  const paymentDate = normalizeFixedPaymentDate(paidAt);

  if (!conta?.id || !paymentDate) {
    return null;
  }

  return {
    id: buildFixedPaymentExpenseId(conta.id, paidAt),
    descricao: conta.nome || "Conta fixa paga",
    valor: toAccountsNumber(conta.valor),
    data: paymentDate,
    categoria: conta.categoria || "outros",
    tipo: "saida",
    origem: "conta_fixa_paga",
    contaFixaId: conta.id,
  };
}

function syncFixedPaymentExpenseLocally(draft, expensePayload, expenseIdToRemove) {
  const currentItems = Array.isArray(draft.contasDiaADia) ? draft.contasDiaADia : [];
  const nextItems = currentItems.filter((item) => {
    const itemId = String(item?.id || "");
    return itemId !== String(expenseIdToRemove || "");
  });

  if (expensePayload) {
    nextItems.push(expensePayload);
  }

  draft.contasDiaADia = nextItems;
  draft.ledgerMovimentacoes = mergeLedgerMovementsWithManualExpenses(
    draft.ledgerMovimentacoes,
    draft.contasDiaADia
  );
  return draft;
}

function getContaDueDateForReminder(conta, referenceDate = new Date()) {
  if (!conta?.dataVencimento) {
    return null;
  }

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const baseDate = new Date(conta.dataVencimento);

  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  if (!conta.recorrente) {
    baseDate.setHours(0, 0, 0, 0);
    return baseDate;
  }

  const dueDay = baseDate.getDate();
  const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate;
}

function isContaPaidForCurrentCycle(conta, paymentInfo) {
  if (!conta) {
    return false;
  }

  if (!conta.recorrente) {
    return conta.status === "paga";
  }

  const paidAt = conta.ultimaQuitacao ? new Date(conta.ultimaQuitacao) : null;
  return Boolean(
    paidAt &&
    paidAt.getTime() >= paymentInfo.cycleStart.getTime() &&
    paidAt.getTime() <= paymentInfo.cycleEnd.getTime()
  );
}

function getContaStateSnapshot(conta, paymentInfo, referenceDate = new Date()) {
  const dueDate = getContaDueDateForReminder(conta, referenceDate);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const paid = isContaPaidForCurrentCycle(conta, paymentInfo);
  const isDueToday = Boolean(dueDate && dueDate.getTime() === today.getTime() && !paid);
  const isOverdue = Boolean(dueDate && dueDate.getTime() < today.getTime() && !paid);

  return {
    dueDate,
    paid,
    isDueToday,
    isOverdue,
  };
}

async function persistFixedBillToggle(conta, shouldMarkPaid, paidAt) {
  const syncApi = getExpenseSyncApi();
  const expensePayload = shouldMarkPaid ? buildFixedPaymentExpensePayload(conta, paidAt) : null;
  const expenseIdToRemove = buildFixedPaymentExpenseId(conta.id, conta.recorrente ? conta.ultimaQuitacao : conta.pagaEm);

  if (typeof syncApi?.addFixedBill === "function") {
    await syncApi.addFixedBill({
      ...conta,
      status: shouldMarkPaid ? "paga" : "pendente",
      pagaEm: conta.recorrente ? conta.pagaEm || null : shouldMarkPaid ? paidAt : null,
      ultimaQuitacao: conta.recorrente ? shouldMarkPaid ? paidAt : null : conta.ultimaQuitacao || null,
    });
  }

  if (typeof syncApi?.addExpense === "function" && expensePayload) {
    await syncApi.addExpense(expensePayload);
  } else if (typeof syncApi?.deleteExpense === "function" && !shouldMarkPaid) {
    await syncApi.deleteExpense(expenseIdToRemove);
  }
}

async function toggleFixedBillPayment(id, options = {}) {
  const currentConta = loadAccountsData().contasFixas.find((conta) => conta.id === id);

  if (!currentConta) {
    return false;
  }

  const shouldMarkPaid = typeof options.forcePaid === "boolean"
    ? options.forcePaid
    : currentConta.recorrente
      ? !currentConta.ultimaQuitacao
      : currentConta.status !== "paga";
  const paidAt = shouldMarkPaid ? new Date().toISOString() : null;
  const expenseIdToRemove = buildFixedPaymentExpenseId(
    currentConta.id,
    currentConta.recorrente ? currentConta.ultimaQuitacao : currentConta.pagaEm
  );

  if (typeof getExpenseSyncApi()?.addFixedBill === "function") {
    await persistFixedBillToggle(currentConta, shouldMarkPaid, paidAt);
    await refreshFixedBillsFromSupabase();
    await refreshExpensesFromSupabase();
    return true;
  }

  updateAccountsData((draft) => {
    draft.contasFixas = draft.contasFixas.map((conta) => {
      if (conta.id !== id) {
        return conta;
      }

      if (conta.recorrente) {
        return {
          ...conta,
          ultimaQuitacao: shouldMarkPaid ? paidAt : null,
        };
      }

      return {
        ...conta,
        status: shouldMarkPaid ? "paga" : "pendente",
        pagaEm: shouldMarkPaid ? paidAt : null,
      };
    });

    const updatedConta = draft.contasFixas.find((conta) => conta.id === id) || null;
    const expensePayload = shouldMarkPaid
      ? buildFixedPaymentExpensePayload(updatedConta, paidAt)
      : null;

    syncFixedPaymentExpenseLocally(draft, expensePayload, expenseIdToRemove);
    return draft;
  });

  return true;
}

async function evaluateFixedBillReminders() {
  const data = loadAccountsData();
  const paymentInfo = getNextPaymentInfo(data);
  const accounts = Array.isArray(data.contasFixas) ? data.contasFixas : [];
  const reminderState = loadFixedBillReminderState();
  const todayKey = new Date().toISOString().slice(0, 10);
  let dueTodayNotices = 0;
  let overduePrompts = 0;

  for (const conta of accounts) {
    const snapshot = getContaStateSnapshot(conta, paymentInfo, new Date());
    const reminderKey = String(conta.id || "");

    if (!reminderKey || snapshot.paid) {
      continue;
    }

    if (snapshot.isDueToday) {
      const dueState = reminderState[reminderKey]?.dueTodayNoticeAt;

      if (dueState !== todayKey) {
        dueTodayNotices += 1;
        reminderState[reminderKey] = {
          ...(reminderState[reminderKey] || {}),
          dueTodayNoticeAt: todayKey,
        };
      }
    }

    if (snapshot.isOverdue) {
      const overdueState = reminderState[reminderKey]?.overduePromptAt;

      if (overdueState === todayKey) {
        continue;
      }

      overduePrompts += 1;
      reminderState[reminderKey] = {
        ...(reminderState[reminderKey] || {}),
        overduePromptAt: todayKey,
      };
      saveFixedBillReminderState(reminderState);

      const message = `A conta fixa "${conta.nome}" venceu em ${formatAccountsDateLong(snapshot.dueDate)}. Ela foi paga?`;
      const wasPaid = window.confirm(message);
      await toggleFixedBillPayment(conta.id, { forcePaid: wasPaid });
    }
  }

  saveFixedBillReminderState(reminderState);

  if (dueTodayNotices || overduePrompts) {
    const fragments = [];

    if (dueTodayNotices) {
      fragments.push(
        `${dueTodayNotices} conta(s) vencem hoje e precisam de confirmacao de pagamento.`
      );
    }

    if (overduePrompts) {
      fragments.push(
        `${overduePrompts} conta(s) vencidas foram revisadas para evitar pendencia inconsistente.`
      );
    }

    showContaMessage("error", fragments.join(" "));
    renderAccountsPage();
  }
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

  if (/(mercadinho|mini mercado|mercearia|varejao|atacado|atacarejo)/.test(normalizedText)) {
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
    categoriaSugerida: suggestCategory(file.name),
    tipo: "saida",
    origem: "importado",
    leituraAutomatica: {
      arquivo: file.name,
      tipo: file.type || "desconhecido",
      estrategia: "heuristica_nome_arquivo",
    },
  };
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];

      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeCsvDate(value) {
  const normalized = String(value || "").trim();
  const isoMatch = normalized.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  return "";
}

function isStatementSummaryDescription(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return (
    !normalized ||
    normalized.includes("INITIAL_BALANCE") ||
    normalized.includes("FINAL_BALANCE") ||
    normalized.includes("PARTIAL_BALANCE") ||
    normalized.includes("SALDO INICIAL") ||
    normalized.includes("SALDO FINAL") ||
    normalized.includes("SALDO PARCIAL") ||
    normalized.includes("RESUMO")
  );
}

async function buildDraftsFromCsvFile(file) {
  const text = await file.text();
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const headerIndex = lines.findIndex((line) => {
    const cells = splitDelimitedLine(line, ";").map((cell) => cell.toUpperCase());
    return cells.includes("RELEASE_DATE") && cells.includes("TRANSACTION_TYPE") && cells.includes("TRANSACTION_NET_AMOUNT");
  });

  if (headerIndex === -1) {
    return [buildDraftFromFile(file)];
  }

  const header = splitDelimitedLine(lines[headerIndex], ";").map((cell) => cell.toUpperCase());
  const indexes = {
    data: header.indexOf("RELEASE_DATE"),
    descricao: header.indexOf("TRANSACTION_TYPE"),
    referencia: header.indexOf("REFERENCE_ID"),
    valor: header.indexOf("TRANSACTION_NET_AMOUNT"),
    saldo: header.indexOf("PARTIAL_BALANCE"),
  };

  const drafts = [];

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const row = splitDelimitedLine(lines[index], ";");
    if (row.length <= Math.max(indexes.data, indexes.descricao, indexes.valor)) {
      continue;
    }

    const descricao = String(row[indexes.descricao] || "").trim();
    const data = normalizeCsvDate(row[indexes.data]);
    const valor = toAccountsNumber(row[indexes.valor]);
    const externalId = indexes.referencia >= 0 ? String(row[indexes.referencia] || "").trim() : "";
    const saldo = indexes.saldo >= 0 ? String(row[indexes.saldo] || "").trim() : "";
    const tipo = valor < 0 ? "saida" : "entrada";

    if (!data || !valor || isStatementSummaryDescription(descricao)) {
      continue;
    }

    drafts.push({
      id: createId("importado"),
      arquivoNome: file.name,
      descricao: descricao.toLowerCase(),
      valor: Math.abs(valor),
      data,
      categoria: suggestCategory(descricao),
      categoriaSugerida: suggestCategory(descricao),
      tipo,
      origem: "importado",
      external_id: externalId || null,
      linha_origem: index + 1,
      saldo,
      leituraAutomatica: {
        arquivo: file.name,
        tipo: file.type || "desconhecido",
        estrategia: "csv_transacoes_individuais",
      },
    });
  }

  return drafts.length ? drafts : [buildDraftFromFile(file)];
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
  const state = getContaStateSnapshot(conta, paymentInfo, new Date());

  if (!conta.recorrente) {
    const isPaid = state.paid;
    return {
      label: isPaid ? "Paga" : state.isOverdue ? "Vencida" : state.isDueToday ? "Vence hoje" : "Pendente",
      action: isPaid ? "Reabrir" : "Marcar paga",
      statusClass: isPaid ? "status-positive" : state.isOverdue ? "status-danger" : "status-warning",
    };
  }

  return {
    label: state.paid
      ? "Paga no ciclo"
      : state.isOverdue
        ? "Vencida no ciclo"
        : state.isDueToday
          ? "Vence hoje"
          : "Pendente no ciclo",
    action: state.paid ? "Reabrir ciclo" : "Marcar paga",
    statusClass: state.paid ? "status-positive" : state.isOverdue ? "status-danger" : "status-warning",
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

async function processImportFiles() {
  const files = Array.from(importFileInput?.files || []);

  if (!files.length) {
    showImportMessage("error", "Selecione pelo menos uma imagem, print ou PDF para iniciar a leitura.");
    return;
  }

  const parsedDrafts = [];
  for (const file of files) {
    if (String(file.name || "").toLowerCase().endsWith(".csv")) {
      const drafts = await buildDraftsFromCsvFile(file);
      parsedDrafts.push(...drafts);
    } else {
      parsedDrafts.push(buildDraftFromFile(file));
    }
  }

  importedDraftsState = parsedDrafts;
  renderImportDrafts();
  syncImportWorkflowState();
  confirmImportedExpenses();
  importedDraftsState = [];
  if (importFileInput) {
    importFileInput.value = "";
  }
  renderImportDrafts();
  syncImportWorkflowState();
  showImportMessage(
    "success",
    "Arquivos lidos e importados automaticamente."
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
      categoria:
        item.categoria && item.categoria !== "outros"
          ? item.categoria
          : item.categoriaSugerida || item.categoria || "outros",
      categoriaSugerida: item.categoriaSugerida || item.categoria || "outros",
      tipo: item.tipo === "entrada" ? "entrada" : "saida",
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
    try {
      await toggleFixedBillPayment(id);
      renderFixedAccounts();
      renderDailyExpenses();
      showContaMessage("success", "Status da conta fixa atualizado.");
    } catch (error) {
      console.error("[Contas] Falha ao atualizar status da conta fixa.", error);
      showContaMessage("error", "Nao foi possivel atualizar o status da conta fixa.");
    }
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

const CONTAS_UI_TEMPLATE = `
      <header class="db2-topbar" id="db2-topbar">
        <div class="db2-brand">
          <div class="db2-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="7" width="20" height="14" rx="3" fill="url(#brand-grad)"/>
              <path d="M7 7V5a5 5 0 0 1 10 0v2" stroke="url(#brand-grad)" stroke-width="2" stroke-linecap="round"/>
              <defs>
                <linearGradient id="brand-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#818cf8"/>
                  <stop offset="1" stop-color="#38bdf8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="db2-brand-name">MFinanceiro</span>
        </div>

        <nav class="db2-nav" aria-label="Navegação principal">
          <a href="/dashboard.html" class="db2-nav-link">
            <svg class="db2-tab-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity=".9"/><rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity=".5"/><rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity=".5"/><rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity=".3"/></svg>
            Visão Geral
          </a>
          <span class="db2-nav-sep" aria-hidden="true"></span>
          <a href="/cadastro-bancario.html" class="db2-nav-link" id="link-banco">Base Financeira</a>
          <a href="/contas.html" class="db2-nav-link is-active" id="link-contas">Contas</a>
          <a href="/cartoes.html" class="db2-nav-link" id="link-cartoes">Cartões</a>
          <a href="/recebimentos.html" class="db2-nav-link" id="link-recebimentos">Recebimentos</a>
        </nav>

        <div class="db2-topbar-right">
          <div class="db2-user-pill" id="db2-user-pill">
            <div class="db2-avatar" data-user-initial>U</div>
            <span class="db2-user-name" data-user-name>Usuário</span>
            <button type="button" class="db2-logout-btn secondary-button dashboard-logout-button" data-logout-button aria-label="Sair">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="16 17 21 12 16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </header>

      <div class="db2-panels">
        <section class="db2-panel is-active" style="overflow: visible; overflow-x: hidden;">
          <div class="dashboard-secondary-grid accounts-page-grid" style="padding: var(--db2-gap);">

                <!-- Sub-tabs de contas -->
                <nav class="section-anchor-nav accounts-anchor-nav" aria-label="Abas de contas">
                  <a href="#contas-fixas" class="anchor-pill active" data-account-tab-link="contas-fixas" aria-selected="true" aria-controls="contas-fixas">Contas fixas</a>
                  <a href="#dia-a-dia" class="anchor-pill" data-account-tab-link="dia-a-dia" aria-selected="false" aria-controls="dia-a-dia">Contas do dia a dia</a>
                  <a href="#parcelamentos" class="anchor-pill" data-account-tab-link="parcelamentos" aria-selected="false" aria-controls="parcelamentos">Parcelamentos</a>
                </nav>

                <!-- Contas Fixas -->
                <section class="section-stack is-active" id="contas-fixas" data-account-tab-panel="contas-fixas" aria-hidden="false">
                  <article class="dashboard-surface dashboard-secondary-surface accounts-page-card">
                    <div class="card-header">
                      <div>
                        <div class="card-label">Contas fixas</div>
                        <h2 class="section-title">Compromissos recorrentes ou pontuais</h2>
                        <p class="table-caption section-subtitle">
                          Estas contas entram no valor comprometido quando vencem dentro do ciclo atual.
                        </p>
                      </div>
                      <div class="status-chip" id="contas-status-chip">Sem contas</div>
                    </div>

                    <section class="dual-grid">
                      <article class="dashboard-card">
                        <form id="conta-fixa-form" class="settings-grid compact-grid">
                          <div class="field">
                            <span>Nome da conta</span>
                            <input type="text" id="contaNome" placeholder="Ex.: Aluguel" required />
                          </div>
                          <div class="field">
                            <span>Valor</span>
                            <input type="text" inputmode="decimal" id="contaValor" placeholder="0,00" required />
                          </div>
                          <div class="field">
                            <span>Vencimento</span>
                            <input type="date" id="contaData" required />
                          </div>
                          <div class="field">
                            <span>Categoria</span>
                            <input type="text" id="contaCategoria" placeholder="Moradia, servicos..." />
                          </div>
                          <label class="toggle-row">
                            <input type="checkbox" id="contaRecorrente" />
                            <span>Conta recorrente</span>
                          </label>
                          <button type="submit" class="primary-button">Salvar conta fixa</button>
                        </form>
                      </article>

                      <article class="dashboard-card">
                        <div class="detail-list">
                          <div class="detail-row">
                            <span>Total comprometido no ciclo</span>
                            <strong id="contas-total-ciclo">R$ 0,00</strong>
                          </div>
                          <div class="detail-row">
                            <span>Quantidade de contas</span>
                            <strong id="contas-quantidade">0</strong>
                          </div>
                          <div class="detail-row">
                            <span>Mais proxima do vencimento</span>
                            <strong id="contas-proxima-data">--</strong>
                          </div>
                        </div>
                      </article>
                    </section>

                    <div id="conta-message" class="message-box hidden" aria-live="polite"></div>

                    <table class="finance-table">
                      <thead>
                        <tr>
                          <th>Conta</th>
                          <th>Valor</th>
                          <th>Vencimento</th>
                          <th>Status</th>
                          <th>Acoes</th>
                        </tr>
                      </thead>
                      <tbody id="contas-table-body"></tbody>
                    </table>
                    <div id="contas-empty-state" class="empty-state hidden"></div>
                  </article>
                </section>

                <!-- Dia a dia -->
                <section class="section-stack hidden" id="dia-a-dia" data-account-tab-panel="dia-a-dia" aria-hidden="true">
                  <article class="dashboard-surface dashboard-secondary-surface accounts-page-card">
                    <div class="card-header">
                      <div>
                        <div class="card-label">Contas do dia a dia</div>
                        <h2 class="section-title">Gastos variaveis registrados pelo usuario</h2>
                        <p class="table-caption section-subtitle">
                          Use esta lista para registrar o que ja saiu do bolso ou o que esta programado para os proximos dias.
                        </p>
                      </div>
                      <div class="status-chip" id="dia-a-dia-status-chip">Sem gastos</div>
                    </div>

                    <section class="dual-grid">
                      <article class="dashboard-card">
                        <form id="dia-a-dia-form" class="settings-grid compact-grid">
                          <div class="field">
                            <span>Descricao</span>
                            <input type="text" id="gastoDescricao" placeholder="Ex.: Mercado" required />
                          </div>
                          <div class="field">
                            <span>Valor</span>
                            <input type="text" inputmode="decimal" id="gastoValor" placeholder="0,00" required />
                          </div>
                          <div class="field">
                            <span>Data</span>
                            <input type="date" id="gastoData" required />
                          </div>
                          <div class="field">
                            <span>Categoria</span>
                            <input type="text" id="gastoCategoria" placeholder="Alimentacao, transporte..." />
                          </div>
                          <button type="submit" class="primary-button">Salvar gasto</button>
                        </form>
                      </article>

                      <article class="dashboard-card">
                        <div class="detail-list">
                          <div class="detail-row">
                            <span>Total no ciclo</span>
                            <strong id="dia-a-dia-total">R$ 0,00</strong>
                          </div>
                          <div class="detail-row">
                            <span>Gasto de hoje</span>
                            <strong id="dia-a-dia-hoje">R$ 0,00</strong>
                          </div>
                          <div class="detail-row">
                            <span>Quantidade de lancamentos</span>
                            <strong id="dia-a-dia-quantidade">0</strong>
                          </div>
                        </div>
                        <div class="import-section">
                          <label for="gastosImportFile" class="file-input-label">
                            <input type="file" id="gastosImportFile" accept=".csv,.xlsx,.xls" />
                            <span>Importar gastos do Excel/CSV</span>
                          </label>
                          <div id="import-preview-list" class="import-preview hidden"></div>
                          <div class="import-actions hidden">
                            <button type="button" id="process-import-button" class="secondary-button">Ler arquivo</button>
                            <button type="button" id="confirm-import-button" class="primary-button">Confirmar importação</button>
                          </div>
                        </div>
                      </article>
                    </section>

                    <div id="import-message" class="message-box hidden" aria-live="polite"></div>
                    <div id="dia-a-dia-empty-state" class="empty-state hidden"></div>
                  </article>
                </section>

                <!-- Parcelamentos -->
                <section class="section-stack hidden" id="parcelamentos" data-account-tab-panel="parcelamentos" aria-hidden="true">
                  <article class="dashboard-surface dashboard-secondary-surface accounts-page-card">
                    <div class="card-header">
                      <div>
                        <div class="card-label">Parcelamentos</div>
                        <h2 class="section-title">Controle das parcelas que entram no ciclo</h2>
                        <p class="table-caption section-subtitle">
                          Apenas a parcela do mes entra no valor comprometido enquanto o parcelamento estiver ativo.
                        </p>
                      </div>
                      <div class="status-chip" id="parcelamentos-status-chip">Sem parcelamentos</div>
                    </div>

                    <section class="dual-grid">
                      <article class="dashboard-card">
                        <form id="parcelamento-form" class="settings-grid compact-grid">
                          <div class="field">
                            <span>Nome</span>
                            <input type="text" id="parcelamentoNome" placeholder="Ex.: Notebook" required />
                          </div>
                          <div class="field">
                            <span>Valor total</span>
                            <input type="text" inputmode="decimal" id="parcelamentoValorTotal" placeholder="0,00" required />
                          </div>
                          <div class="field">
                            <span>Parcelas</span>
                            <input type="number" min="1" id="parcelamentoParcelas" required />
                          </div>
                          <div class="field">
                            <span>Valor da parcela</span>
                            <input type="text" inputmode="decimal" id="parcelamentoValorParcela" placeholder="0,00" required />
                          </div>
                          <div class="field">
                            <span>Data inicio</span>
                            <input type="date" id="parcelamentoDataInicio" required />
                          </div>
                          <div class="field">
                            <span>Vencimento</span>
                            <input type="number" min="1" max="31" id="parcelamentoVencimento" required />
                          </div>
                          <div class="field">
                            <span>Tipo</span>
                            <select id="parcelamentoTipo" class="app-select">
                              <option value="cartao">Cartao</option>
                              <option value="boleto">Boleto</option>
                            </select>
                          </div>
                          <div class="field">
                            <span>Status</span>
                            <select id="parcelamentoStatus" class="app-select">
                              <option value="ativo">Ativo</option>
                              <option value="finalizado">Finalizado</option>
                            </select>
                          </div>
                          <button type="submit" class="primary-button">Salvar parcelamento</button>
                        </form>
                      </article>

                      <article class="dashboard-card">
                        <div class="detail-list">
                          <div class="detail-row">
                            <span>Total do ciclo</span>
                            <strong id="parcelamentos-total-ciclo">R$ 0,00</strong>
                          </div>
                          <div class="detail-row">
                            <span>Parcelamentos ativos</span>
                            <strong id="parcelamentos-quantidade">0</strong>
                          </div>
                        </div>
                      </article>
                    </section>

                    <div id="parcelamento-message" class="message-box hidden" aria-live="polite"></div>

                    <table class="finance-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Parcela atual</th>
                          <th>Vencimento</th>
                          <th>Status</th>
                          <th>Acoes</th>
                        </tr>
                      </thead>
                      <tbody id="parcelamentos-table-body"></tbody>
                    </table>
                    <div id="parcelamentos-empty-state" class="empty-state hidden"></div>
                  </article>
                </section>
              </div>
        </section>
      </div><!-- /db2-panels -->
`;

function bindEvents() {
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
          "Arquivo selecionado. Clique em Ler arquivo para importar automaticamente."
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
}

function initContasModule() {
  try {
    const shell = document.querySelector(".db2-shell");
    if (shell && !shell.innerHTML.trim()) {
      shell.innerHTML = CONTAS_UI_TEMPLATE;
    }

    contaFixaForm = document.getElementById("conta-fixa-form");
    contaMessage = document.getElementById("conta-message");
    contasTableBody = document.getElementById("contas-table-body");
    contasEmptyState = document.getElementById("contas-empty-state");
    diaADiaForm = document.getElementById("dia-a-dia-form");
    diaADiaEmptyState = document.getElementById("dia-a-dia-empty-state");
    importMessage = document.getElementById("import-message");
    importFileInput = document.getElementById("gastosImportFile");
    importPreviewList = document.getElementById("import-preview-list");
    importActions = document.querySelector(".import-actions");
    processImportButton = document.getElementById("process-import-button");
    confirmImportButton = document.getElementById("confirm-import-button");
    installmentForm = document.getElementById("parcelamento-form");
    installmentMessage = document.getElementById("parcelamento-message");
    installmentsTableBody = document.getElementById("parcelamentos-table-body");
    installmentsEmptyState = document.getElementById("parcelamentos-empty-state");
    accountTabLinks = Array.from(document.querySelectorAll("[data-account-tab-link]"));
    accountTabPanels = Array.from(document.querySelectorAll("[data-account-tab-panel]"));

    bindEvents();

    if (window.AppShell?.initAppShell) {
      window.AppShell.initAppShell();
    }
    
    syncAccountsTabFromHash({ replaceHash: true });
    renderAccountsPage();
    syncImportWorkflowState();
    ensureExpensesHydrated();
    evaluateFixedBillReminders().catch((error) => {
      console.error("[Contas] Falha ao avaliar lembretes de contas fixas.", error);
    });
  } catch (error) {
    console.error("[Contas] Runtime error during rendering:", error);
  }
}

initContasModule();
})();
