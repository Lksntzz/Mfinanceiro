const {
  createId: createContaId,
  loadAppData: loadContasData,
  toNumber: toContaNumber,
  updateAppData: updateContasData,
} = window.FinanceStore;
const {
  formatCurrency: formatContaCurrency,
  formatDateLong: formatContaDateLong,
  getAccountsInCycle,
  getNextPaymentInfo: getContasPaymentInfo,
} = window.FinanceCalculations;

const contaForm = document.getElementById("conta-form");
const contaMessage = document.getElementById("conta-message");
const contasTableBody = document.getElementById("contas-table-body");
const contasEmptyState = document.getElementById("contas-empty-state");

window.AppShell.initAppShell();

function showContaMessage(type, text) {
  contaMessage.textContent = text;
  contaMessage.className = `message-box ${type}`;
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

function renderContasSummary() {
  const data = loadContasData();
  const cycleAccounts = getAccountsInCycle(data);
  const nextDue = [...cycleAccounts.items]
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())[0];

  document.getElementById("contas-total-ciclo").textContent = formatContaCurrency(cycleAccounts.total);
  document.getElementById("contas-quantidade").textContent = String(cycleAccounts.items.length);
  document.getElementById("contas-proxima-data").textContent = nextDue
    ? `${nextDue.nome} em ${formatContaDateLong(nextDue.dueDate)}`
    : "--";
  document.getElementById("contas-status-chip").textContent = cycleAccounts.items.length
    ? "Compromissos ativos"
    : "Sem contas";
}

function renderContasTable() {
  const data = loadContasData();
  const paymentInfo = getContasPaymentInfo(data);
  const contas = [...data.contasFixas].sort((left, right) => {
    return new Date(left.dataVencimento).getTime() - new Date(right.dataVencimento).getTime();
  });

  if (!contas.length) {
    contasTableBody.innerHTML = "";
    contasEmptyState.classList.remove("hidden");
    contasEmptyState.innerHTML = `
      <strong>Nenhuma conta cadastrada ainda</strong>
      Adicione contas fixas para calcular o valor comprometido e deixar o disponivel por dia mais realista.
    `;
    renderContasSummary();
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
            <span class="text-soft">${conta.categoria || "Sem categoria"}${conta.recorrente ? " • Recorrente" : ""}</span>
          </td>
          <td>${formatContaCurrency(conta.valor)}</td>
          <td>${formatContaDateLong(conta.dataVencimento)}</td>
          <td><span class="${status.statusClass}">${status.label}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="secondary-button small-button" data-action="toggle" data-id="${conta.id}">
                ${status.action}
              </button>
              <button type="button" class="ghost-button small-button" data-action="delete" data-id="${conta.id}">
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  renderContasSummary();
}

function handleContaSubmit(event) {
  event.preventDefault();

  const payload = {
    id: createContaId("conta"),
    nome: document.getElementById("contaNome").value.trim(),
    valor: toContaNumber(document.getElementById("contaValor").value),
    dataVencimento: document.getElementById("contaData").value,
    categoria: document.getElementById("contaCategoria").value.trim(),
    recorrente: document.getElementById("contaRecorrente").checked,
    status: "pendente",
    pagaEm: null,
    ultimaQuitacao: null,
  };

  if (!payload.nome || !payload.valor || !payload.dataVencimento) {
    showContaMessage("error", "Preencha nome, valor e data de vencimento para salvar a conta.");
    return;
  }

  updateContasData((draft) => {
    draft.contasFixas.push(payload);
    return draft;
  });

  contaForm.reset();
  renderContasTable();
  showContaMessage("success", "Conta salva com sucesso e adicionada ao ciclo.");
}

function handleContasTableClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "delete") {
    updateContasData((draft) => {
      draft.contasFixas = draft.contasFixas.filter((conta) => conta.id !== id);
      return draft;
    });
    renderContasTable();
    showContaMessage("success", "Conta removida com sucesso.");
    return;
  }

  if (action === "toggle") {
    updateContasData((draft) => {
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

    renderContasTable();
    showContaMessage("success", "Status da conta atualizado.");
  }
}

contaForm.addEventListener("submit", handleContaSubmit);
contasTableBody.addEventListener("click", handleContasTableClick);

renderContasTable();
