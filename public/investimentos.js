(() => {
const {
  carregarInvestimentos: loadSavedInvestments,
  loadAppData: loadInvestmentData,
  salvarInvestimento: saveInvestment,
  toNumber: toInvestmentNumber,
} = window.FinanceStore;
const {
  calculateDashboardSummary: calculateInvestmentSummary,
  formatCurrency: formatInvestmentCurrency,
} = window.FinanceCalculations;

const investimentoForm = document.getElementById("investimento-form");
const investimentoMessage = document.getElementById("investimento-message");
const investimentoTableBody = document.getElementById("investimento-table-body");

window.AppShell.initAppShell();

function showInvestmentMessage(type, text) {
  investimentoMessage.textContent = text;
  investimentoMessage.className = `message-box ${type}`;
}

function renderInvestmentPage() {
  const data = loadInvestmentData();
  const investmentData = loadSavedInvestments();
  const summary = calculateInvestmentSummary(data);
  const suggestion = summary.investimento;

  console.log("Lendo investimentos", investmentData);

  document.getElementById("investimentoPercentual").value =
    investmentData.percentualEscolhido ?? suggestion.percentage;
  document.getElementById("investimento-saldo-disponivel").textContent = formatInvestmentCurrency(summary.saldoDisponivel);
  document.getElementById("investimento-percentual-valor").textContent = `${suggestion.chosenPercentage}%`;
  document.getElementById("investimento-valor-sugerido").textContent = formatInvestmentCurrency(suggestion.suggestedValue);

  const statusChip = document.getElementById("investimento-status-chip");
  if (summary.saldoDisponivel <= 0) {
    statusChip.textContent = "Sem folga";
  } else if (suggestion.status === "confirmado") {
    statusChip.textContent = "Sugestao confirmada";
  } else if (suggestion.status === "ignorado") {
    statusChip.textContent = "Ignorado";
  } else {
    statusChip.textContent = "Sugestao ativa";
  }

  const rows = [
    {
      label: "Saldo disponivel real",
      value: formatInvestmentCurrency(summary.saldoDisponivel),
      note: "Dinheiro livre depois de preservar contas fixas e faturas do ciclo.",
      statusClass: summary.saldoDisponivel > 0 ? "status-positive" : "status-warning",
    },
    {
      label: "Percentual da sugestao",
      value: `${suggestion.chosenPercentage}%`,
      note: "Percentual salvo pelo usuario para a recomendacao automatica.",
      statusClass: "status-positive",
    },
    {
      label: "Valor sugerido",
      value: formatInvestmentCurrency(suggestion.suggestedValue),
      note: "Montante recomendado para investir sem tocar no dinheiro comprometido.",
      statusClass: suggestion.suggestedValue > 0 ? "status-positive" : "status-warning",
    },
    {
      label: "Valor reservado para investir",
      value: formatInvestmentCurrency(suggestion.reservedValue),
      note: "So recebe valor quando a sugestao foi confirmada pelo usuario.",
      statusClass: suggestion.reservedValue > 0 ? "status-positive" : "status-warning",
    },
    {
      label: "Saldo livre apos sugestao",
      value: formatInvestmentCurrency(suggestion.freeAfterSuggestion),
      note: "Mostra quanto ainda fica livre depois da reserva sugerida para investimento.",
      statusClass: suggestion.freeAfterSuggestion > 0 ? "status-positive" : "status-warning",
    },
    {
      label: "Valor comprometido",
      value: formatInvestmentCurrency(summary.valorComprometido),
      note: "Soma das contas fixas pendentes e das faturas que afetam o ciclo atual.",
      statusClass: summary.valorComprometido > 0 ? "status-warning" : "status-positive",
    },
    {
      label: "Dias restantes",
      value: `${summary.diasRestantes} dia(s)`,
      note: "Quantidade de dias ate o proximo pagamento configurado.",
      statusClass: summary.diasRestantes > 0 ? "status-positive" : "status-warning",
    },
    {
      label: "Ultima decisao",
      value: suggestion.status,
      note: "Mostra se a sugestao mais recente foi confirmada, ignorada ou ainda nao decidida.",
      statusClass:
        suggestion.status === "confirmado"
          ? "status-positive"
          : suggestion.status === "ignorado"
            ? "status-warning"
            : "status-warning",
    },
  ];

  investimentoTableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.label}</td>
          <td><span class="${row.statusClass}">${row.value}</span></td>
          <td>${row.note}</td>
        </tr>
      `
    )
    .join("");
}

function handleInvestmentSubmit(event) {
  event.preventDefault();

  const percentage = toInvestmentNumber(document.getElementById("investimentoPercentual").value);

  console.log("Salvando investimento", {
    percentualSugerido: Math.min(Math.max(percentage, 0), 100),
    percentualEscolhido: Math.min(Math.max(percentage, 0), 100),
    ultimaAcao: "pendente",
    valorReservado: 0,
  });

  saveInvestment({
    percentualSugerido: Math.min(Math.max(percentage, 0), 100),
    percentualEscolhido: Math.min(Math.max(percentage, 0), 100),
    ultimaAcao: "pendente",
    valorReservado: 0,
  });

  renderInvestmentPage();
  showInvestmentMessage("success", "Percentual da sugestao salvo com sucesso.");
  window.AppShell.queueDashboardRedirect(
    "Investimentos atualizados. O dashboard foi recalculado com a nova sugestao."
  );
}

function confirmSuggestion() {
  const data = loadInvestmentData();
  const summary = calculateInvestmentSummary(data);

  saveInvestment({
    percentualEscolhido: summary.investimento.chosenPercentage,
    ultimaAcao: "confirmado",
    ultimoValorSugerido: summary.investimento.suggestedValue,
    valorReservado: summary.investimento.suggestedValue,
  });

  renderInvestmentPage();
  showInvestmentMessage(
    "success",
    `Sugestao de ${formatInvestmentCurrency(summary.investimento.suggestedValue)} confirmada no app.`
  );
  window.AppShell.queueDashboardRedirect(
    "Sugestao de investimento confirmada. O dashboard foi atualizado."
  );
}

function ignoreSuggestion() {
  const data = loadInvestmentData();
  const summary = calculateInvestmentSummary(data);

  saveInvestment({
    percentualEscolhido: summary.investimento.chosenPercentage,
    ultimaAcao: "ignorado",
    ultimoValorSugerido: summary.investimento.suggestedValue,
    valorReservado: 0,
  });

  renderInvestmentPage();
  showInvestmentMessage("success", "Sugestao ignorada por enquanto.");
  window.AppShell.queueDashboardRedirect(
    "Decisao de investimento registrada. O dashboard foi atualizado."
  );
}

investimentoForm.addEventListener("submit", handleInvestmentSubmit);
document
  .getElementById("confirm-investment-button")
  .addEventListener("click", confirmSuggestion);
document
  .getElementById("ignore-investment-button")
  .addEventListener("click", ignoreSuggestion);
window.addEventListener("finance-data-updated", renderInvestmentPage);
window.FinanceStore.subscribe(() => {
  renderInvestmentPage();
});
window.addEventListener("storage", renderInvestmentPage);

renderInvestmentPage();
})();
