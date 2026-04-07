const {
  createId: createCartaoId,
  loadAppData: loadCartoesData,
  toNumber: toCartaoNumber,
  updateAppData: updateCartoesData,
} = window.FinanceStore;
const {
  formatCurrency: formatCartaoCurrency,
  formatDateLong: formatCartaoDateLong,
  getCardsSummary,
} = window.FinanceCalculations;

const cartaoForm = document.getElementById("cartao-form");
const lancamentoForm = document.getElementById("lancamento-form");
const cartoesMessage = document.getElementById("cartoes-message");
const cartoesTableBody = document.getElementById("cartoes-table-body");
const lancamentosTableBody = document.getElementById("lancamentos-table-body");
const cartoesEmptyState = document.getElementById("cartoes-empty-state");
const lancamentosEmptyState = document.getElementById("lancamentos-empty-state");
const cartaoSelect = document.getElementById("lancamentoCartaoId");

window.AppShell.initAppShell();

function showCartoesMessage(type, text) {
  cartoesMessage.textContent = text;
  cartoesMessage.className = `message-box ${type}`;
}

function renderCartaoOptions(cards) {
  if (!cards.length) {
    cartaoSelect.innerHTML = `<option value="">Cadastre um cartao primeiro</option>`;
    cartaoSelect.disabled = true;
    lancamentoForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  cartaoSelect.disabled = false;
  lancamentoForm.querySelector('button[type="submit"]').disabled = false;
  cartaoSelect.innerHTML = cards
    .map((card) => `<option value="${card.id}">${card.nome}</option>`)
    .join("");
}

function renderCartoesTable() {
  const data = loadCartoesData();
  const summary = getCardsSummary(data);
  const cards = summary.cards;

  renderCartaoOptions(cards);
  document.getElementById("cartoes-status-chip").textContent = cards.length
    ? `${cards.length} cartao(es)`
    : "Sem cartoes";

  if (!cards.length) {
    cartoesTableBody.innerHTML = "";
    cartoesEmptyState.classList.remove("hidden");
    cartoesEmptyState.innerHTML = `
      <strong>Nenhum cartao cadastrado</strong>
      Cadastre seus cartoes para trazer a fatura atual para o valor comprometido do ciclo.
    `;
  } else {
    cartoesEmptyState.classList.add("hidden");
    cartoesEmptyState.innerHTML = "";
    cartoesTableBody.innerHTML = cards
      .map((card) => {
        const impactClass = card.impactsCycle ? "status-warning" : "status-positive";
        const impactLabel = card.impactsCycle ? "Compromete o ciclo" : "Fora do ciclo";

        return `
          <tr>
            <td>
              <strong>${card.nome}</strong><br />
              <span class="text-soft">${card.tipo}</span>
            </td>
            <td>${formatCartaoCurrency(card.currentBill)}</td>
            <td>${card.dueDate ? formatCartaoDateLong(card.dueDate) : "--"}</td>
            <td><span class="${impactClass}">${impactLabel}</span></td>
            <td>
              <div class="table-actions">
                <button type="button" class="ghost-button small-button" data-action="delete-card" data-id="${card.id}">
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  const launches = [...data.lancamentosCartao].sort((left, right) => {
    return new Date(right.data).getTime() - new Date(left.data).getTime();
  });

  if (!launches.length) {
    lancamentosTableBody.innerHTML = "";
    lancamentosEmptyState.classList.remove("hidden");
    lancamentosEmptyState.innerHTML = `
      <strong>Nenhum lancamento no cartao</strong>
      Adicione gastos para acompanhar a fatura atual e o impacto no ciclo.
    `;
    return;
  }

  const cardsById = new Map(cards.map((card) => [card.id, card]));

  lancamentosEmptyState.classList.add("hidden");
  lancamentosEmptyState.innerHTML = "";
  lancamentosTableBody.innerHTML = launches
    .map((launch) => {
      const statusClass = launch.status === "pago" ? "status-positive" : "status-warning";

      return `
        <tr>
          <td>
            <strong>${launch.descricao}</strong><br />
            <span class="text-soft">${launch.categoria || "Sem categoria"}</span>
          </td>
          <td>${cardsById.get(launch.cartaoId)?.nome || "Cartao removido"}</td>
          <td>${formatCartaoCurrency(launch.valor)}</td>
          <td>${formatCartaoDateLong(launch.data)}</td>
          <td><span class="${statusClass}">${launch.status === "pago" ? "Pago" : "Pendente"}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="secondary-button small-button" data-action="toggle-launch" data-id="${launch.id}">
                ${launch.status === "pago" ? "Reabrir" : "Marcar pago"}
              </button>
              <button type="button" class="ghost-button small-button" data-action="delete-launch" data-id="${launch.id}">
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function handleCartaoSubmit(event) {
  event.preventDefault();

  const payload = {
    id: createCartaoId("cartao"),
    nome: document.getElementById("cartaoNome").value.trim(),
    tipo: document.getElementById("cartaoTipo").value,
    limite: toCartaoNumber(document.getElementById("cartaoLimite").value),
    dataFechamento: toCartaoNumber(document.getElementById("cartaoFechamento").value),
    dataVencimento: toCartaoNumber(document.getElementById("cartaoVencimento").value),
  };

  if (!payload.nome || !payload.dataVencimento) {
    showCartoesMessage("error", "Preencha pelo menos o nome do cartao e a data de vencimento.");
    return;
  }

  updateCartoesData((draft) => {
    draft.cartoes.push(payload);
    return draft;
  });

  cartaoForm.reset();
  renderCartoesTable();
  showCartoesMessage("success", "Cartao cadastrado com sucesso.");
}

function handleLancamentoSubmit(event) {
  event.preventDefault();

  const payload = {
    id: createCartaoId("lancamento"),
    cartaoId: cartaoSelect.value,
    descricao: document.getElementById("lancamentoDescricao").value.trim(),
    valor: toCartaoNumber(document.getElementById("lancamentoValor").value),
    data: document.getElementById("lancamentoData").value,
    categoria: document.getElementById("lancamentoCategoria").value.trim(),
    status: "pendente",
  };

  if (!payload.cartaoId || !payload.descricao || !payload.valor || !payload.data) {
    showCartoesMessage("error", "Preencha cartao, descricao, valor e data para salvar o gasto.");
    return;
  }

  updateCartoesData((draft) => {
    draft.lancamentosCartao.push(payload);
    return draft;
  });

  lancamentoForm.reset();
  renderCartoesTable();
  showCartoesMessage("success", "Lancamento salvo e adicionado a fatura atual.");
}

function handleCartoesTablesClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "delete-card") {
    updateCartoesData((draft) => {
      draft.cartoes = draft.cartoes.filter((card) => card.id !== id);
      draft.lancamentosCartao = draft.lancamentosCartao.filter((launch) => launch.cartaoId !== id);
      return draft;
    });
    renderCartoesTable();
    showCartoesMessage("success", "Cartao removido com seus lancamentos.");
    return;
  }

  if (action === "toggle-launch") {
    updateCartoesData((draft) => {
      draft.lancamentosCartao = draft.lancamentosCartao.map((launch) => {
        if (launch.id !== id) {
          return launch;
        }

        return {
          ...launch,
          status: launch.status === "pago" ? "pendente" : "pago",
        };
      });
      return draft;
    });
    renderCartoesTable();
    showCartoesMessage("success", "Status do lancamento atualizado.");
    return;
  }

  if (action === "delete-launch") {
    updateCartoesData((draft) => {
      draft.lancamentosCartao = draft.lancamentosCartao.filter((launch) => launch.id !== id);
      return draft;
    });
    renderCartoesTable();
    showCartoesMessage("success", "Lancamento removido com sucesso.");
  }
}

cartaoForm.addEventListener("submit", handleCartaoSubmit);
lancamentoForm.addEventListener("submit", handleLancamentoSubmit);
cartoesTableBody.addEventListener("click", handleCartoesTablesClick);
lancamentosTableBody.addEventListener("click", handleCartoesTablesClick);

renderCartoesTable();
