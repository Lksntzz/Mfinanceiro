(() => {
  const {
    carregarCartoes: loadSavedCards,
    carregarGastosCartao: loadSavedCardExpenses,
    createId,
    editarCartao: loadCardForEdit,
    editarGastoCartao: loadCardExpenseForEdit,
    loadAppData: loadCardsData,
    salvarCartao: saveCard,
    salvarLancamentoCartao: saveCardExpense,
    toNumber: toCardNumber,
    updateAppData: updateCardsData,
  } = window.FinanceStore;
  const {
    formatCurrency: formatCardsCurrency,
    formatDateLong: formatCardsDateLong,
    getCardsSummary: getCardsDashboardSummary,
  } = window.FinanceCalculations;

  const cardForm = document.getElementById("cartao-form");
  const launchForm = document.getElementById("lancamento-form");
  const cardsMessage = document.getElementById("cartoes-message");
  const cardsTableBody = document.getElementById("cartoes-table-body");
  const launchesTableBody = document.getElementById("lancamentos-table-body");
  const cardsEmptyState = document.getElementById("cartoes-empty-state");
  const launchesEmptyState = document.getElementById("lancamentos-empty-state");
  const cardSelect = document.getElementById("lancamentoCartaoId");

  window.AppShell.initAppShell();

  function showCardsMessage(type, text) {
    if (!cardsMessage) {
      return;
    }

    cardsMessage.textContent = text;
    cardsMessage.className = `message-box ${type}`;
  }

  function getSubmitButton(form) {
    return form?.querySelector('button[type="submit"]');
  }

  function resetFormMode(form, defaultLabel) {
    if (!form) {
      return;
    }

    delete form.dataset.editId;
    const submitButton = getSubmitButton(form);

    if (submitButton) {
      submitButton.textContent = defaultLabel;
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
    }
  }

  function renderCardOptions(cards) {
    if (!cardSelect || !launchForm) {
      return;
    }

    const submitButton = getSubmitButton(launchForm);

    if (!cards.length) {
      cardSelect.innerHTML = `<option value="">Cadastre um cartao primeiro</option>`;
      cardSelect.disabled = true;

      if (submitButton) {
        submitButton.disabled = true;
      }

      return;
    }

    cardSelect.disabled = false;

    if (submitButton) {
      submitButton.disabled = false;
    }

    cardSelect.innerHTML = cards
      .map((card) => `<option value="${card.id}">${card.nome}</option>`)
      .join("");
  }

  function renderCardsPage() {
    if (!cardsTableBody || !launchesTableBody) {
      return;
    }

    const data = loadCardsData();
    const summary = getCardsDashboardSummary(data);
    const cards = loadSavedCards().map((card) => {
      return summary.cards.find((summaryCard) => summaryCard.id === card.id) || card;
    });
    const launches = [...loadSavedCardExpenses()].sort((left, right) => {
      return new Date(right.data).getTime() - new Date(left.data).getTime();
    });

    renderCardOptions(cards);
    document.getElementById("cartoes-status-chip").textContent = cards.length
      ? `${cards.length} cartao(es)`
      : "Sem cartoes";

    if (!cards.length) {
      cardsTableBody.innerHTML = "";
      cardsEmptyState.classList.remove("hidden");
      cardsEmptyState.innerHTML = `
        <strong>Nenhum cartao cadastrado</strong>
        Cadastre seus cartoes para trazer a fatura atual para o dashboard.
      `;
    } else {
      cardsEmptyState.classList.add("hidden");
      cardsEmptyState.innerHTML = "";
      cardsTableBody.innerHTML = cards
        .map((card) => {
          const impactClass = card.impactsCycle ? "status-warning" : "status-positive";
          const impactLabel = card.impactsCycle ? "Compromete o ciclo" : "Fora do ciclo";

          return `
            <tr>
              <td>
                <strong>${card.nome}</strong><br />
                <span class="text-soft">${card.tipo} - Limite ${formatCardsCurrency(card.limite || 0)}</span>
              </td>
              <td>${formatCardsCurrency(card.currentBill || 0)}</td>
              <td>${card.dueDate ? formatCardsDateLong(card.dueDate) : "--"}</td>
              <td><span class="${impactClass}">${impactLabel}</span></td>
              <td>
                <div class="table-actions">
                  <button type="button" class="secondary-button small-button" data-action="edit-card" data-id="${card.id}">
                    Editar
                  </button>
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

    if (!launches.length) {
      launchesTableBody.innerHTML = "";
      launchesEmptyState.classList.remove("hidden");
      launchesEmptyState.innerHTML = `
        <strong>Nenhum gasto de cartao registrado</strong>
        Lance os gastos da fatura para medir o impacto real do cartao no ciclo.
      `;
      return;
    }

    const cardsById = new Map(cards.map((card) => [card.id, card]));

    launchesEmptyState.classList.add("hidden");
    launchesEmptyState.innerHTML = "";
    launchesTableBody.innerHTML = launches
      .map((launch) => {
        const statusClass = launch.status === "pago" ? "status-positive" : "status-warning";

        return `
          <tr>
            <td>
              <strong>${launch.descricao}</strong><br />
              <span class="text-soft">${launch.categoria || "Sem categoria"}</span>
            </td>
            <td>${cardsById.get(launch.cartaoId)?.nome || "Cartao removido"}</td>
            <td>${formatCardsCurrency(launch.valor)}</td>
            <td>${formatCardsDateLong(launch.data)}</td>
            <td><span class="${statusClass}">${launch.status === "pago" ? "Pago" : "Pendente"}</span></td>
            <td>
              <div class="table-actions">
                <button type="button" class="secondary-button small-button" data-action="edit-launch" data-id="${launch.id}">
                  Editar
                </button>
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

  function handleCardSubmit(event) {
    event.preventDefault();
    const editId = cardForm.dataset.editId;

    const payload = {
      id: editId || createId("cartao"),
      nome: document.getElementById("cartaoNome").value.trim(),
      tipo: document.getElementById("cartaoTipo").value,
      limite: toCardNumber(document.getElementById("cartaoLimite").value),
      limiteUsado: toCardNumber(document.getElementById("cartaoLimiteUsado").value),
      dataFechamento: toCardNumber(document.getElementById("cartaoFechamento").value),
      dataVencimento: toCardNumber(document.getElementById("cartaoVencimento").value),
    };

    if (!payload.nome || !payload.dataVencimento) {
      showCardsMessage("error", "Preencha pelo menos o nome do cartao e a data de vencimento.");
      return;
    }

    saveCard(payload);
    cardForm.reset();
    resetFormMode(cardForm, "Salvar cartao");
    renderCardsPage();

    showCardsMessage("success", editId ? "Cartao atualizado com sucesso." : "Cartao salvo com sucesso.");
    window.AppShell.queueDashboardRedirect(
      "Cartao salvo. O dashboard foi atualizado com o impacto da fatura."
    );
  }

  function handleLaunchSubmit(event) {
    event.preventDefault();
    const editId = launchForm.dataset.editId;

    const payload = {
      id: editId || createId("gasto_cartao"),
      cartaoId: cardSelect.value,
      descricao: document.getElementById("lancamentoDescricao").value.trim(),
      valor: toCardNumber(document.getElementById("lancamentoValor").value),
      data: document.getElementById("lancamentoData").value,
      categoria: document.getElementById("lancamentoCategoria").value.trim(),
      status: "pendente",
    };

    if (!payload.cartaoId || !payload.descricao || !payload.valor || !payload.data) {
      showCardsMessage("error", "Preencha cartao, descricao, valor e data para salvar o gasto da fatura.");
      return;
    }

    if (editId) {
      const existingLaunch = loadCardExpenseForEdit(editId);
      payload.status = existingLaunch?.status || "pendente";
    }

    saveCardExpense(payload);
    launchForm.reset();
    resetFormMode(launchForm, "Salvar gasto da fatura");
    renderCardsPage();

    showCardsMessage(
      "success",
      editId ? "Gasto da fatura atualizado com sucesso." : "Gasto da fatura salvo com sucesso."
    );
    window.AppShell.queueDashboardRedirect(
      "Gasto do cartao salvo. O dashboard foi atualizado com o novo lancamento."
    );
  }

  function handleCardsTableClick(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const { action, id } = button.dataset;

    if (action === "edit-card") {
      const card = loadCardForEdit(id);

      if (!card) {
        return;
      }

      document.getElementById("cartaoNome").value = card.nome || "";
      document.getElementById("cartaoTipo").value = card.tipo || "credito";
      document.getElementById("cartaoLimite").value = card.limite || "";
      document.getElementById("cartaoLimiteUsado").value = card.limiteUsado || "";
      document.getElementById("cartaoFechamento").value = card.dataFechamento || "";
      document.getElementById("cartaoVencimento").value = card.dataVencimento || "";
      setFormMode(cardForm, card.id, "Atualizar cartao");
      showCardsMessage("success", "Cartao carregado para edicao.");
      return;
    }

    if (action === "delete-card") {
      updateCardsData((draft) => {
        draft.cartoes = draft.cartoes.filter((card) => card.id !== id);
        draft.lancamentosCartao = draft.lancamentosCartao.filter((launch) => launch.cartaoId !== id);
        return draft;
      });
      renderCardsPage();
      showCardsMessage("success", "Cartao removido com seus gastos.");
      return;
    }

    if (action === "edit-launch") {
      const launch = loadCardExpenseForEdit(id);

      if (!launch) {
        return;
      }

      cardSelect.value = launch.cartaoId || "";
      document.getElementById("lancamentoDescricao").value = launch.descricao || "";
      document.getElementById("lancamentoValor").value = launch.valor || "";
      document.getElementById("lancamentoData").value = launch.data || "";
      document.getElementById("lancamentoCategoria").value = launch.categoria || "";
      setFormMode(launchForm, launch.id, "Atualizar gasto da fatura");
      showCardsMessage("success", "Gasto da fatura carregado para edicao.");
      return;
    }

    if (action === "toggle-launch") {
      updateCardsData((draft) => {
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
      renderCardsPage();
      showCardsMessage("success", "Status do gasto da fatura atualizado.");
      return;
    }

    if (action === "delete-launch") {
      updateCardsData((draft) => {
        draft.lancamentosCartao = draft.lancamentosCartao.filter((launch) => launch.id !== id);
        return draft;
      });
      renderCardsPage();
      showCardsMessage("success", "Gasto da fatura removido.");
    }
  }

  if (cardForm) {
    cardForm.addEventListener("submit", handleCardSubmit);
  }

  if (launchForm) {
    launchForm.addEventListener("submit", handleLaunchSubmit);
  }

  if (cardsTableBody) {
    cardsTableBody.addEventListener("click", handleCardsTableClick);
  }

  if (launchesTableBody) {
    launchesTableBody.addEventListener("click", handleCardsTableClick);
  }

  window.addEventListener("finance-data-updated", renderCardsPage);
  window.addEventListener("storage", renderCardsPage);

  renderCardsPage();
})();
