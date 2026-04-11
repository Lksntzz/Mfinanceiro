$path = 'public/src/pages/contas.js'
$content = Get-Content -Raw -Path $path
$pattern = '(?s)function renderCards\(\) \{.*?\r?\n\}\r?\n\r?\nasync function handleFixedSubmit'
$replacement = @"
function renderCards() {
  if (!cartoesListaVisuais || !lancamentosTableBody || !cartoesEmptyState || !lancamentosEmptyState) {
    return;
  }

  const data = loadAccountsData();
  const summary = getAccountsCardsSummary(data);
  const cards = loadAccountsCards().map((card) => {
    return summary.cards.find((summaryCard) => summaryCard.id === card.id) || card;
  });
  const launches = [...loadAccountsCardExpenses()].sort((left, right) => {
    return new Date(right.data).getTime() - new Date(left.data).getTime();
  });
  const totalLimit = cards.reduce((sum, card) => sum + Number(card.limite || 0), 0);
  const totalUsed = cards.reduce((sum, card) => sum + Number(card.currentBill || 0), 0);
  const totalAvailable = Math.max(totalLimit - totalUsed, 0);
  const cardsPageCard = cartoesListaVisuais.closest(".accounts-page-card");
  const cardHeader = cardsPageCard?.querySelector(".card-header");
  const existingHeaderActions = cardHeader?.querySelector(".card-header-actions");
  let cartoesResumoTotal = document.getElementById("cartoes-resumo-total");
  let cartoesResumoUtilizado = document.getElementById("cartoes-resumo-utilizado");
  let cartoesResumoDisponivel = document.getElementById("cartoes-resumo-disponivel");
  let cartoesNovoButton = document.getElementById("cartoes-novo-button");

  if (cardsPageCard && !cartoesResumoTotal) {
    const overviewStrip = document.createElement("section");
    overviewStrip.className = "cards-overview-strip";
    overviewStrip.innerHTML = `
      <article class="summary-card analytics-card card-surface-compact">
        <span>Limite total</span>
        <strong id="cartoes-resumo-total">R$ 0,00</strong>
        <small>Soma dos limites cadastrados</small>
      </article>
      <article class="summary-card analytics-card card-surface-compact">
        <span>Utilizado</span>
        <strong id="cartoes-resumo-utilizado">R$ 0,00</strong>
        <small>Faturas em aberto</small>
      </article>
      <article class="summary-card analytics-card card-surface-compact">
        <span>Disponível</span>
        <strong id="cartoes-resumo-disponivel">R$ 0,00</strong>
        <small>Limite ainda livre</small>
      </article>
    `;
    cardHeader?.insertAdjacentElement("afterend", overviewStrip);
    cartoesResumoTotal = overviewStrip.querySelector("#cartoes-resumo-total");
    cartoesResumoUtilizado = overviewStrip.querySelector("#cartoes-resumo-utilizado");
    cartoesResumoDisponivel = overviewStrip.querySelector("#cartoes-resumo-disponivel");
  }

  if (cardsPageCard && !cartoesNovoButton && cardHeader) {
    const actions = existingHeaderActions || document.createElement("div");
    actions.className = "card-header-actions";
    if (!actions.isConnected) {
      cardHeader.appendChild(actions);
    }
    cartoesNovoButton = document.createElement("button");
    cartoesNovoButton.type = "button";
    cartoesNovoButton.className = "secondary-button small-button";
    cartoesNovoButton.id = "cartoes-novo-button";
    cartoesNovoButton.textContent = "Novo cartão";
    cartoesNovoButton.addEventListener("click", () => {
      document.getElementById("cartaoNome")?.focus();
    });
    actions.appendChild(cartoesNovoButton);
  }

  renderCardOptions(cards);
  document.getElementById("cartoes-status-chip").textContent = cards.length
    ? `${cards.length} cartao(es)`
    : "Sem cartoes";

  if (cartoesResumoTotal) {
    cartoesResumoTotal.textContent = formatAccountsCurrency(totalLimit);
  }
  if (cartoesResumoUtilizado) {
    cartoesResumoUtilizado.textContent = formatAccountsCurrency(totalUsed);
  }
  if (cartoesResumoDisponivel) {
    cartoesResumoDisponivel.textContent = formatAccountsCurrency(totalAvailable);
  }
  if (cartoesNovoButton) {
    cartoesNovoButton.onclick = () => {
      document.getElementById("cartaoNome")?.focus();
    };
  }

  if (!cards.length) {
    cartoesListaVisuais.innerHTML = "";
    cartoesEmptyState.classList.remove("hidden");
    cartoesEmptyState.innerHTML = `
      <strong>Nenhum cartao cadastrado</strong>
      Cadastre seus cartoes para medir o impacto da fatura no ciclo.
    `;
  } else {
    cartoesEmptyState.classList.add("hidden");
    cartoesEmptyState.innerHTML = "";
    cartoesListaVisuais.innerHTML = cards
      .map((card) => {
        const limit = Number(card.limite || 0);
        const used = Number(card.currentBill || 0);
        const available = Math.max(limit - used, 0);
        const impactClass = card.impactsCycle ? "status-warning" : "status-positive";
        const impactLabel = card.impactsCycle ? "Compromete o ciclo" : "Fora do ciclo";
        const cardInitial = String(card.nome || "C").trim().charAt(0).toUpperCase() || "C";

        return `
          <article class="card-visual-item">
            <header class="card-visual-header">
              <div class="card-miniature" aria-hidden="true">${cardInitial}</div>
              <div class="card-visual-main">
                <strong>${card.nome}</strong>
                <span class="text-soft">Final ${String(card.numeroFinal || card.final || "").slice(-4) || "--"} · ${card.tipo || "credito"}</span>
              </div>
              <span class="status-chip ${impactClass}">${impactLabel}</span>
            </header>
            <div class="card-visual-kpis">
              <div class="card-visual-kpi">
                <span>Limite total</span>
                <strong>${formatAccountsCurrency(limit)}</strong>
              </div>
              <div class="card-visual-kpi">
                <span>Utilizado</span>
                <strong>${formatAccountsCurrency(used)}</strong>
              </div>
              <div class="card-visual-kpi">
                <span>Disponível</span>
                <strong>${formatAccountsCurrency(available)}</strong>
              </div>
              <div class="card-visual-kpi">
                <span>Fatura atual</span>
                <strong>${formatAccountsCurrency(card.currentBill)}</strong>
              </div>
              <div class="card-visual-kpi">
                <span>Vencimento</span>
                <strong>${card.dueDate ? formatAccountsDateLong(card.dueDate) : "--"}</strong>
              </div>
            </div>
            <div class="table-actions card-visual-actions">
              <button type="button" class="secondary-button small-button" data-action="edit-card" data-id="${card.id}">Editar</button>
              <button type="button" class="ghost-button small-button" data-action="delete-card" data-id="${card.id}">Excluir</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (!launches.length) {
    lancamentosTableBody.innerHTML = "";
    lancamentosEmptyState.classList.remove("hidden");
    lancamentosEmptyState.innerHTML = `
      <strong>Nenhum gasto de cartao registrado</strong>
      Lance os gastos da fatura para acompanhar o valor real do cartao.
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
          <td>${formatAccountsCurrency(launch.valor)}</td>
          <td>${formatAccountsDateLong(launch.data)}</td>
          <td><span class="${statusClass}">${launch.status === "pago" ? "Pago" : "Pendente"}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="secondary-button small-button" data-action="edit-launch" data-id="${launch.id}">Editar</button>
              <button type="button" class="secondary-button small-button" data-action="toggle-launch" data-id="${launch.id}">${launch.status === "pago" ? "Reabrir" : "Marcar pago"}</button>
              <button type="button" class="ghost-button small-button" data-action="delete-launch" data-id="${launch.id}">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function handleFixedSubmit
"@
$content = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)
Set-Content -Path $path -Value $content
