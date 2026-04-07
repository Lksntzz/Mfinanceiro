const {
  carregarCadastroBancario: loadDashboardBanking,
  carregarContasVariaveis: loadDashboardVariableAccounts,
  carregarRegistroPagamento: loadDashboardPayment,
  carregarVRVA: loadDashboardVrVa,
  loadAppData: loadDashboardData,
} = window.FinanceStore;
const {
  agruparLancamentosPorDia: groupDashboardEntriesByDay,
  calcularResumoDiario: calculateDashboardDailySummary,
  calcularPrioridadesDoCiclo: calculateCyclePriorities,
  buildBalanceProjection: buildDashboardProjection,
  montarProjecaoSaldoPorDia: buildDashboardBalanceSeries,
  calculateDashboardSummary,
  formatCurrency: formatDashboardCurrency,
  formatDate: formatDashboardDate,
  formatDateLong: formatDashboardDateLong,
  montarSerieGraficoContasVariaveis: buildDashboardDailySeries,
} = window.FinanceCalculations;

const elements = {
  cycleStatusChip: document.getElementById("cycle-status-chip"),
  projectionChip: document.getElementById("projection-chip"),
  alertChip: document.getElementById("alert-chip"),
  summaryChip: document.getElementById("summary-chip"),
  dailySummaryChip: document.getElementById("daily-summary-chip"),
  dailySummaryList: document.getElementById("daily-summary-list"),
  chartBars: document.getElementById("chart-bars"),
  alertList: document.getElementById("alert-list"),
  summaryTableBody: document.getElementById("summary-table-body"),
  emptyState: document.getElementById("dashboard-empty-state"),
  feedback: document.getElementById("dashboard-feedback"),
  cardSaldoAtual: document.getElementById("card-saldo-atual"),
  cardSaldoAtualSubtitle: document.getElementById("card-saldo-atual-subtitle"),
  cardSaldoAtualTrend: document.getElementById("card-saldo-atual-trend"),
  cardProximoPagamento: document.getElementById("card-proximo-pagamento"),
  cardProximoPagamentoSubtitle: document.getElementById("card-proximo-pagamento-subtitle"),
  cardProximoPagamentoTrend: document.getElementById("card-proximo-pagamento-trend"),
  cardLimiteDiario: document.getElementById("card-limite-diario"),
  cardLimiteDiarioSubtitle: document.getElementById("card-limite-diario-subtitle"),
  cardLimiteDiarioTrend: document.getElementById("card-limite-diario-trend"),
  cardValorComprometido: document.getElementById("card-valor-comprometido"),
  cardValorComprometidoSubtitle: document.getElementById("card-valor-comprometido-subtitle"),
  cardValorComprometidoTrend: document.getElementById("card-valor-comprometido-trend"),
  miniStatDias: document.getElementById("mini-stat-dias"),
  miniStatVr: document.getElementById("mini-stat-vr"),
  miniStatInvestimento: document.getElementById("mini-stat-investimento"),
};

window.AppShell.initAppShell();

function showDashboardFeedback(message) {
  if (!elements.feedback || !message) {
    return;
  }

  elements.feedback.textContent = message;
  elements.feedback.className = "message-box success";
}

function setTrendTone(element, tone, text) {
  element.className = `metric-trend ${tone}`;
  element.textContent = text;
}

function getToneByType(type) {
  if (type === "danger") {
    return "trend-down";
  }

  if (type === "warning") {
    return "trend-warn";
  }

  return "trend-up";
}

function getStatusClass(type) {
  if (type === "danger") {
    return "status-danger";
  }

  if (type === "warning") {
    return "status-warning";
  }

  return "status-positive";
}

function calculateDayDistance(targetDate) {
  if (!targetDate) {
    return Infinity;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = new Date(targetDate);
  current.setHours(0, 0, 0, 0);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil((current.getTime() - today.getTime()) / oneDay);
}

function getProjectedBenefitsTotal(summary) {
  if (!summary.paymentInfo.nextDate) {
    return 0;
  }

  return summary.benefits.active.reduce((total, benefit) => {
    if (
      !benefit.nextDate ||
      benefit.nextDate.getTime() > summary.paymentInfo.nextDate.getTime()
    ) {
      return total;
    }

    return total + Number(benefit.value || 0);
  }, 0);
}

function buildDashboardAlerts(data, summary, projection) {
  return calculateCyclePriorities(data);
}

function renderMetrics(summary) {
  const projectedBenefits = getProjectedBenefitsTotal(summary);
  console.log("Atualizando card saldo:", summary.saldoAtual);

  elements.cardSaldoAtual.textContent = formatDashboardCurrency(summary.saldoAtual);
  elements.cardSaldoAtualSubtitle.textContent =
    summary.saldoAtual > 0
      ? `${formatDashboardCurrency(summary.saldoDisponivel)} seguem livres depois dos compromissos do ciclo.`
      : "Informe seu saldo atual para comecar.";
  setTrendTone(
    elements.cardSaldoAtualTrend,
    summary.saldoDisponivel >= 0 ? "trend-up" : "trend-down",
    "Base do ciclo"
  );

  elements.cardProximoPagamento.textContent = formatDashboardCurrency(summary.paymentInfo.value);
  if (summary.paymentInfo.configured && summary.paymentInfo.nextDate) {
    elements.cardProximoPagamentoSubtitle.textContent = `${summary.paymentInfo.daysRemaining} dia(s) ate ${formatDashboardDateLong(summary.paymentInfo.nextDate)}.`;
    setTrendTone(
      elements.cardProximoPagamentoTrend,
      summary.paymentInfo.daysRemaining === 0 ? "trend-warn" : "trend-up",
      summary.paymentInfo.daysRemaining === 0 ? "Recebimento pendente" : "Pagamento previsto"
    );
  } else {
    elements.cardProximoPagamentoSubtitle.textContent = "Configure salario e dias de pagamento.";
    setTrendTone(elements.cardProximoPagamentoTrend, "trend-warn", "Pendente");
  }

  elements.cardLimiteDiario.textContent = formatDashboardCurrency(summary.limiteDiario);
  elements.cardLimiteDiarioSubtitle.textContent =
    summary.diasRestantes > 0
      ? `O valor livre foi dividido por ${summary.diasRestantes} dia(s) restantes no ciclo.`
      : "O sistema mostrara o valor diario quando houver dados suficientes.";
  setTrendTone(
    elements.cardLimiteDiarioTrend,
    summary.limiteDiario > 0 ? "trend-up" : "trend-warn",
    summary.limiteDiario > 0 ? "Calculo ativo" : "Sem calculo"
  );

  elements.cardValorComprometido.textContent = formatDashboardCurrency(summary.valorComprometido);
  elements.cardValorComprometidoSubtitle.textContent =
    summary.valorComprometido > 0
      ? `${formatDashboardCurrency(summary.accounts.total)} em contas, ${formatDashboardCurrency(summary.cards.total)} em cartoes e ${formatDashboardCurrency(summary.installments.total)} em parcelamentos ja estao reservados neste ciclo.`
      : "Adicione contas fixas e cartoes para medir o compromisso real.";
  setTrendTone(
    elements.cardValorComprometidoTrend,
    summary.valorComprometido > 0 ? "trend-down" : "trend-up",
    summary.valorComprometido > 0 ? "Reservado" : "Sem compromissos"
  );

  elements.miniStatDias.textContent = `${summary.diasRestantes} dia(s)`;
  elements.miniStatVr.textContent = formatDashboardCurrency(projectedBenefits);
  elements.miniStatInvestimento.textContent = formatDashboardCurrency(summary.investimento.suggestedValue);

  if (!summary.paymentInfo.configured) {
    elements.cycleStatusChip.textContent = "Configuracao pendente";
    elements.projectionChip.textContent = "Sem dados";
    return;
  }

  elements.cycleStatusChip.textContent =
    summary.saldoDisponivel < 0
      ? "Ciclo de risco: vermelho"
      : summary.limiteDiario <= 25
        ? "Ciclo de risco: amarelo"
        : "Ciclo de risco: verde";
  elements.projectionChip.textContent =
    summary.saldoDisponivel >= 0 ? "Projecao saudavel" : "Risco de ruptura";
}

function renderProjection(summary, projection) {
  if (!projection.length) {
    elements.chartBars.innerHTML = `
      <div class="empty-state">
        <strong>Configure o ciclo financeiro</strong>
        Informe saldo, salario e dias de pagamento para gerar a projecao do saldo ate o proximo recebimento.
      </div>
    `;
    return;
  }

  const referenceHeight = Math.max(
    ...projection.map((item) => Math.abs(item.balance)),
    Math.abs(summary.saldoAtual),
    1
  );

  elements.chartBars.innerHTML = projection
    .map((item) => {
      const tone =
        item.balance < 0
          ? "danger"
          : item.balance <= Math.max(summary.limiteDiario, 0)
            ? "warning"
            : "";
      const height = Math.max((Math.abs(item.balance) / referenceHeight) * 100, 8);

      return `
        <div class="chart-bar-group">
          <div class="chart-bar ${tone}" style="height: ${height}%"></div>
          <span class="chart-label">${item.label}</span>
        </div>
      `;
    })
    .join("");
}

function atualizarGraficoDashboard(summary, projection, dailySeries) {
  if (dailySeries.length) {
    elements.projectionChip.textContent =
      dailySeries.length > 1
        ? "Projecao acumulada com gastos reais"
        : "Projecao com lancamento unico";
  } else if (projection.length) {
    elements.projectionChip.textContent = "Projecao do ciclo";
  }
  renderProjection(summary, projection);
}

function renderDailySummary(dailySummary) {
  if (!elements.dailySummaryList || !elements.dailySummaryChip) {
    return;
  }

  if (!dailySummary.length) {
    elements.dailySummaryChip.textContent = "Sem lancamentos";
    elements.dailySummaryList.innerHTML = `
      <div class="detail-row">
        <span>Resumo diario indisponivel</span>
        <strong>Adicione ou importe lancamentos</strong>
      </div>
    `;
    return;
  }

  elements.dailySummaryChip.textContent = `${dailySummary.length} dia(s)`;
  elements.dailySummaryList.innerHTML = dailySummary
    .slice(-6)
    .reverse()
    .map(
      (item) => `
        <details class="day-accordion">
          <summary class="day-accordion-summary">
            <div>
              <strong>${formatDashboardDateLong(item.data)}</strong>
              <span class="text-soft">Categoria dominante: ${item.categoriaDominante}</span>
            </div>
            <div class="day-accordion-meta">
              <strong>${formatDashboardCurrency(item.totalGasto)}</strong>
              <span class="text-soft">${item.quantidadeLancamentos} lancamento(s)</span>
            </div>
          </summary>
          <div class="day-accordion-content">
            ${(item.items || [])
              .map(
                (entry) => `
                  <div class="day-entry-row">
                    <div class="day-entry-main">
                      <strong>${entry.descricao || "Lancamento"}</strong>
                      <span class="text-soft">${entry.categoria || "Sem categoria"} | ${
                        extractDashboardTimeLabel(entry.data) || "--:--"
                      } | ${entry.tipo || "saida"}</span>
                    </div>
                    <div class="day-entry-side">
                      <strong>${formatDashboardCurrency(entry.valor)}</strong>
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </details>
      `
    )
    .join("");
}

function extractDashboardTimeLabel(value) {
  if (typeof value !== "string") {
    return "";
  }

  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function renderAlerts(alerts) {
  elements.alertChip.textContent = alerts[0]?.completed
    ? "Ciclo concluido"
    : `${alerts.length} prioridade(s)`;
  elements.alertList.innerHTML = alerts
    .map((alert, index) => {
      const tone = getToneByType(alert.type);

      return `
        <li>
          <div class="trend-dot ${tone}">${String(index + 1).padStart(2, "0")}</div>
          <div class="list-text">
            <strong>${alert.title}</strong>
            <small>${alert.description}</small>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderSummaryTable(data, summary, alerts) {
  const projectedBenefits = getProjectedBenefitsTotal(summary);
  const vrVaBenefit = summary.benefits.active.find((benefit) => benefit.key === "vrVa");
  const rows = [
    {
      label: "Saldo atual",
      value: formatDashboardCurrency(summary.saldoAtual),
      statusClass: summary.saldoAtual > 0 ? "status-positive" : "status-warning",
      note: "Valor que o usuario informou como saldo disponivel no banco.",
    },
    {
      label: "Proximo pagamento",
      value: formatDashboardCurrency(summary.paymentInfo.value),
      statusClass: summary.paymentInfo.configured ? "status-positive" : "status-warning",
      note: summary.paymentInfo.configured && summary.paymentInfo.nextDate
        ? `${summary.paymentInfo.daysRemaining} dia(s) ate ${formatDashboardDateLong(summary.paymentInfo.nextDate)}.`
        : "Configure salario, descontos e dias de pagamento em Base financeira.",
    },
    {
      label: "Salario liquido",
      value: formatDashboardCurrency(summary.salarioLiquido),
      statusClass: summary.salarioLiquido > 0 ? "status-positive" : "status-warning",
      note: "Valor calculado automaticamente com base no salario bruto menos os descontos validos.",
    },
    {
      label: "Contas fixas no ciclo",
      value: formatDashboardCurrency(summary.accounts.total),
      statusClass: summary.accounts.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.accounts.items.length} conta(s) pendente(s) entre o ciclo atual e o proximo pagamento.`,
    },
    {
      label: "Fatura do cartao",
      value: formatDashboardCurrency(summary.cards.total),
      statusClass: summary.cards.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.cards.items.length} cartao(es) afetam o ciclo atual.`,
    },
    {
      label: "Parcelamentos no ciclo",
      value: formatDashboardCurrency(summary.installments.total),
      statusClass: summary.installments.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.installments.items.length} parcela(s) entram no valor comprometido do ciclo atual.`,
    },
    {
      label: "Gastos do dia a dia",
      value: formatDashboardCurrency(summary.dailyExpenses.total),
      statusClass: summary.dailyExpenses.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.dailyExpenses.items.length} lancamento(s) ja registrados afetam a leitura de consumo e a projecao do saldo.`,
    },
    {
      label: "Historico de gastos variaveis",
      value: String(summary.dailyExpenses.allItems.length),
      statusClass: summary.dailyExpenses.allItems.length > 0 ? "status-positive" : "status-warning",
      note: summary.dailyExpenses.allItems.length
        ? `${formatDashboardDateLong(summary.dailyExpenses.allItems[0].dataNormalizada)} ate ${formatDashboardDateLong(summary.dailyExpenses.allItems[summary.dailyExpenses.allItems.length - 1].dataNormalizada)}.`
        : "Nenhum lancamento salvo em contas do dia a dia ainda.",
    },
    {
      label: "Categorias mais usadas",
      value: summary.dailyExpenses.topCategories.length
        ? summary.dailyExpenses.topCategories.map((item) => item.categoria).join(", ")
        : "--",
      statusClass: summary.dailyExpenses.topCategories.length ? "status-positive" : "status-warning",
      note: summary.dailyExpenses.topCategories.length
        ? summary.dailyExpenses.topCategories
            .map((item) => `${item.categoria}: ${formatDashboardCurrency(item.total)}`)
            .join(" | ")
        : "As categorias aparecem aqui quando houver gastos registrados no periodo atual.",
    },
    {
      label: "Beneficios previstos no ciclo",
      value: formatDashboardCurrency(projectedBenefits),
      statusClass: projectedBenefits > 0 ? "status-positive" : "status-warning",
      note: vrVaBenefit
        ? `VR/VA ${vrVaBenefit.status === "recebido" ? "recebido" : "pendente"} com previsao de ${formatDashboardCurrency(vrVaBenefit.value)} em ${formatDashboardDateLong(vrVaBenefit.nextDate)}.`
        : "Registre o VR/VA em Recebimentos quando esse beneficio fizer parte da sua leitura financeira.",
    },
    {
      label: "Valor comprometido",
      value: formatDashboardCurrency(summary.valorComprometido),
      statusClass: summary.valorComprometido > 0 ? "status-danger" : "status-positive",
      note: "Soma das contas fixas pendentes e das faturas que comprometem o ciclo atual.",
    },
    {
      label: "Disponivel por dia",
      value: formatDashboardCurrency(summary.limiteDiario),
      statusClass: summary.limiteDiario > 0 ? "status-positive" : "status-warning",
      note: "Saldo disponivel real dividido pelos dias restantes ate o proximo pagamento.",
    },
    {
      label: "Saldo apos gastos variaveis",
      value: formatDashboardCurrency(summary.saldoAposGastosVariaveis),
      statusClass: summary.saldoAposGastosVariaveis >= 0 ? "status-positive" : "status-danger",
      note: "Mostra quanto sobra quando os gastos do dia a dia registrados tambem entram na leitura do ciclo.",
    },
    {
      label: "Sugestao de investimento",
      value: formatDashboardCurrency(summary.investimento.suggestedValue),
      statusClass: summary.investimento.suggestedValue > 0 ? "status-positive" : "status-warning",
      note: `${summary.investimento.percentage}% do dinheiro livre atual, sem usar o valor comprometido.`,
    },
    {
      label: "Valor reservado para investir",
      value: formatDashboardCurrency(summary.investimento.reservedValue),
      statusClass: summary.investimento.reservedValue > 0 ? "status-positive" : "status-warning",
      note:
        summary.investimento.status === "confirmado"
          ? "Reserva confirmada pelo usuario na aba de investimentos."
          : "Ainda nao existe uma reserva confirmada para investimento.",
    },
    {
      label: "Saldo livre apos investimento",
      value: formatDashboardCurrency(summary.investimento.freeAfterSuggestion),
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

  elements.summaryChip.textContent = "Leitura do ciclo";

  const shouldShowEmptyState =
    !summary.saldoAtual &&
    !summary.paymentInfo.configured &&
    data.contasFixas.length === 0 &&
    data.cartoes.length === 0;

  if (shouldShowEmptyState) {
    elements.emptyState.classList.remove("hidden");
    elements.emptyState.innerHTML = `
      <strong>Complete sua base financeira para ativar os calculos</strong>
      <span class="section-note">Informe saldo atual, salario, descontos e ciclo de pagamento para liberar os indicadores do dashboard.</span>
      <div class="button-row align-start">
        <a href="/cadastro-bancario.html" class="primary-button">Configurar agora</a>
      </div>
    `;
  } else {
    elements.emptyState.classList.add("hidden");
    elements.emptyState.innerHTML = "";
  }
}

function atualizarDashboard() {
  const data = loadDashboardData();
  const bankingData = loadDashboardBanking();
  const variableAccounts = loadDashboardVariableAccounts();
  const paymentReceipt = loadDashboardPayment();
  const vrvaReceipt = loadDashboardVrVa();
  data.banking = {
    ...data.banking,
    ...bankingData,
  };
  data.contasDiaADia = variableAccounts;
  data.recebimentos = {
    ...data.recebimentos,
    pagamento: {
      ...data.recebimentos?.pagamento,
      ...paymentReceipt,
    },
    beneficios: {
      ...data.recebimentos?.beneficios,
      vrVa: {
        ...data.recebimentos?.beneficios?.vrVa,
        ...vrvaReceipt,
      },
    },
  };

  console.log("Lendo cadastro bancário no dashboard:", bankingData);
  console.log("Lendo recebimentos no dashboard", {
    pagamento: paymentReceipt,
    vrva: vrvaReceipt,
  });
  console.log("Lendo dados no dashboard", {
    banking: data.banking,
    beneficios: data.recebimentos?.beneficios,
    contasFixas: data.contasFixas,
    contasVariaveis: data.contasDiaADia,
    cartoes: data.cartoes,
    gastosCartao: data.lancamentosCartao,
    investimentos: data.investimentos,
  });
  const summary = calculateDashboardSummary(data);
  console.log("Resumo final do dashboard", summary);
  console.log("Lendo contasVariaveis", data.contasDiaADia);
  const groupedDailyEntries = groupDashboardEntriesByDay(data.contasDiaADia);
  const dailySummary = calculateDashboardDailySummary(data).map((item) => {
    const matchingGroup = groupedDailyEntries.find(
      (group) => group.date?.getTime?.() === item.data?.getTime?.()
    );
    return {
      ...item,
      items: matchingGroup?.items || [],
    };
  });
  console.log("Resumo diário", dailySummary);
  const dailySeries = buildDashboardDailySeries(data);
  console.log("Serie do gráfico", dailySeries);
  const projection = buildDashboardBalanceSeries(data);
  const alerts = buildDashboardAlerts(data, summary, projection);

  renderMetrics(summary);
  atualizarGraficoDashboard(summary, projection, dailySeries);
  renderDailySummary(dailySummary);
  renderAlerts(alerts);
  renderSummaryTable(data, summary, alerts);
}

window.atualizarDashboard = atualizarDashboard;
window.FinanceStore.subscribe(() => {
  atualizarDashboard();
});
window.addEventListener("finance-data-updated", atualizarDashboard);
window.addEventListener("storage", atualizarDashboard);
window.addEventListener("pageshow", atualizarDashboard);
window.addEventListener("focus", atualizarDashboard);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    atualizarDashboard();
  }
});

showDashboardFeedback(window.AppShell.consumeDashboardNotice());
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", atualizarDashboard);
} else {
  atualizarDashboard();
}
