console.log("[Dashboard Scripts] carregado: /src/pages/dashboard-details.js");

function renderExpenseEvolution(summary) {
  if (!summary.evolutionSeries.length) {
    elements.expenseEvolutionChip.textContent = "Sem dados";
    elements.expenseEvolutionCaption.textContent =
      "Os valores aparecem conforme os lancamentos vao sendo registrados no periodo selecionado.";
    elements.expenseEvolutionBars.innerHTML = `
      <div class="empty-state">
        <strong>Nenhum gasto no periodo</strong>
        Adicione ou importe lancamentos para ver a evolucao parcial do periodo atual.
      </div>
    `;
    return;
  }

  const referenceHeight = Math.max(
    ...summary.evolutionSeries.map((item) => Math.abs(item.total)),
    1
  );

  elements.expenseEvolutionChip.textContent = `${summary.evolutionSeries.length} ponto(s)`;
  elements.expenseEvolutionCaption.textContent = `${formatDashboardLongDate(summary.startDate)} ate ${formatDashboardLongDate(summary.endDate)}.`;
  elements.expenseEvolutionBars.innerHTML = summary.evolutionSeries
    .map((item) => {
      const height = Math.max((Math.abs(item.total) / referenceHeight) * 100, 8);

      return `
        <div class="chart-bar-group">
          <div class="chart-bar secondary" style="height: ${height}%"></div>
          <span class="chart-label">${item.label}</span>
        </div>
      `;
    })
    .join("");
}

function renderSummaryTable(summary, alerts, expenseOverview, intelligence) {
  if (!elements.summaryTableBody) {
    return;
  }

  const projectedBenefits = Number(summary.projectedBenefitsInSaldo || 0);
  const vrVaBenefit =
    summary.benefits.active.find(
      (benefit) =>
        benefit.tipo === "vrVa" &&
        benefit.status !== "recebido" &&
        benefit.contabilizarNoSaldo !== false
    ) || null;
  const rows = [
    {
      label: "Saldo inicial",
      value: formatDashboardCurrencyValue(summary.saldoInicial),
      statusClass: summary.saldoInicial >= 0 ? "status-positive" : "status-danger",
      note: "Saldo configurado na base financeira.",
    },
    {
      label: "Beneficios previstos no ciclo",
      value: formatDashboardCurrencyValue(projectedBenefits),
      statusClass: projectedBenefits > 0 ? "status-positive" : "status-warning",
      note: vrVaBenefit
        ? `VR/VA ${vrVaBenefit.status === "recebido" ? "recebido" : "pendente"} com previsao de ${formatDashboardCurrencyValue(vrVaBenefit.value)} em ${formatDashboardLongDate(vrVaBenefit.nextDate)}.${summary.projectedBenefitsInSaldo > 0 ? ` ${formatDashboardCurrencyValue(summary.projectedBenefitsInSaldo)} entram no saldo disponivel.` : ""}`
        : "Registre o VR/VA na base financeira para refletir esse valor no ciclo.",
    },
    {
      label: "Valor comprometido",
      value: formatDashboardCurrencyValue(summary.valorComprometido),
      statusClass: summary.valorComprometido > 0 ? "status-danger" : "status-positive",
      note: `Hoje soma ${formatDashboardCurrencyValue(summary.committedBreakdown.despesasRegistradas)} em despesas registradas, ${formatDashboardCurrencyValue(summary.committedBreakdown.contasFixas)} em contas fixas, ${formatDashboardCurrencyValue(summary.committedBreakdown.faturasCartao)} em faturas do ciclo e ${formatDashboardCurrencyValue(summary.committedBreakdown.parcelamentos)} na parcela vigente do periodo.`,
    },
    {
      label: "Disponivel por dia",
      value: formatDashboardCurrencyValue(summary.limiteDiario),
      statusClass: summary.limiteDiario > 0 ? "status-positive" : "status-warning",
      note: "Saldo disponivel dividido pelos dias restantes ate o proximo pagamento.",
    },
    {
      label: "Saldo apos gastos variaveis",
      value: formatDashboardCurrencyValue(summary.saldoAposGastosVariaveis),
      statusClass: summary.saldoAposGastosVariaveis >= 0 ? "status-positive" : "status-danger",
      note: "Neste momento acompanha o mesmo saldo disponivel, preservando compatibilidade para futuras camadas de comprometimento.",
    },
    {
      label: "Sugestao de investimento",
      value: formatDashboardCurrencyValue(summary.investimento.suggestedValue),
      statusClass: summary.investimento.suggestedValue > 0 ? "status-positive" : "status-warning",
      note: `${summary.investimento.percentage}% do dinheiro livre atual, sem usar o valor comprometido.`,
    },
    {
      label: "Valor reservado para investir",
      value: formatDashboardCurrencyValue(summary.investimento.reservedValue),
      statusClass: summary.investimento.reservedValue > 0 ? "status-positive" : "status-warning",
      note:
        summary.investimento.status === "confirmado"
          ? "Reserva confirmada pelo usuario na aba de investimentos."
          : "Ainda nao existe uma reserva confirmada para investimento.",
    },
    {
      label: "Saldo livre apos investimento",
      value: formatDashboardCurrencyValue(summary.investimento.freeAfterSuggestion),
      statusClass: summary.investimento.freeAfterSuggestion > 0 ? "status-positive" : "status-warning",
      note: "Quanto continuaria livre se a sugestao atual de investimento fosse reservada.",
    },
    {
      label: "Leitura geral",
      value: alerts[0]?.completed ? "Ciclo concluido" : `${alerts.length} prioridade(s)`,
      statusClass: alerts.some((alert) => alert.type === "danger")
        ? "status-danger"
        : alerts.some((alert) => alert.type === "warning")
          ? "status-warning"
          : "status-positive",
      note: "Resumo das proximas acoes financeiras priorizadas dentro do ciclo atual.",
    },
    {
      label: "Ciclo de risco",
      value:
        summary.saldoDisponivel < 0
          ? "vermelho"
          : summary.limiteDiario <= 25
            ? "amarelo"
            : "verde",
      statusClass:
        summary.saldoDisponivel < 0
          ? "status-danger"
          : summary.limiteDiario <= 25
            ? "status-warning"
            : "status-positive",
      note:
        summary.saldoDisponivel < 0
          ? "Risco de faltar dinheiro antes do proximo pagamento."
          : summary.limiteDiario <= 25
            ? "Atencao aos gastos diarios para atravessar o ciclo."
            : "Dentro do limite atual do ciclo.",
    },
  ];

  elements.summaryTableBody.innerHTML = rows
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

  if (elements.summaryChip) {
    elements.summaryChip.textContent = "Leitura do ciclo";
  }

  if (!summary.saldoInicial && !summary.paymentInfo.configured && !summary.committedBreakdown.total) {
    elements.emptyState.classList.remove("hidden");
    elements.emptyState.innerHTML = `
      <strong>Complete sua base financeira para ativar os calculos</strong>
      <span class="section-note">Informe saldo atual, salario, descontos e ciclo de pagamento para liberar os indicadores do dashboard.</span>
      <div class="button-row align-start">
        <a href="/cadastro-bancario.html" class="primary-button">Configurar agora</a>
      </div>
    `;
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.emptyState.innerHTML = "";
}

window.DashboardDetails = {
  renderExpenseEvolution,
  renderSummaryTable,
};
