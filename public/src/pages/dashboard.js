const {
  carregarCadastroBancario: loadDashboardBanking,
  carregarContasVariaveis: loadDashboardVariableAccounts,
  carregarLedgerMovimentacoes: loadDashboardLedger,
  carregarRegistroPagamento: loadDashboardPayment,
  carregarVRVA: loadDashboardVrVa,
  loadAppData: loadDashboardData,
} = window.FinanceStore;
const {
  calcularPrioridadesDoCiclo: calculateCyclePriorities,
  calculateFinancialIntelligence: computeDashboardFinancialIntelligence,
  calculateDashboardSummary,
  formatCurrency: formatDashboardCurrency,
  formatDateLong: formatDashboardDateLong,
  getExpenseOverviewSummary: getDashboardExpenseOverviewSummary,
  getExpensePeriodSummary: getDashboardExpensePeriodSummary,
  getLedgerExpenseEntries: getDashboardLedgerExpenseEntries,
  getLedgerMovements: getDashboardLedgerMovements,
  montarProjecaoSaldoPorDia: buildDashboardBalanceSeries,
  montarSerieGraficoContasVariaveis: buildDashboardDailySeries,
  normalizeDate: normalizeDashboardDate,
} = window.FinanceCalculations;

const dashboardState = {
  selectedExpensePeriod: "week",
};

const elements = {
  dashboardTabButtons: Array.from(document.querySelectorAll("[data-dashboard-tab-link]")),
  dashboardTabPanels: Array.from(document.querySelectorAll("[data-dashboard-panel]")),
  cycleStatusChip: document.getElementById("cycle-status-chip"),
  projectionChip: document.getElementById("projection-chip"),
  alertChip: document.getElementById("alert-chip"),
  summaryChip: document.getElementById("summary-chip"),
  nextPaymentChip: document.getElementById("next-payment-chip"),
  committedChip: document.getElementById("committed-chip"),
  overviewCycleAlertCard: document.getElementById("overview-cycle-alert-card"),
  overviewCycleAlertTitle: document.getElementById("overview-cycle-alert-title"),
  overviewCycleAlertBody: document.getElementById("overview-cycle-alert-body"),
  overviewDailyInsightCard: document.getElementById("overview-daily-insight-card"),
  overviewInsightChip: document.getElementById("overview-insight-chip"),
  overviewDailyInsightTitle: document.getElementById("overview-daily-insight-title"),
  overviewDailyInsightBody: document.getElementById("overview-daily-insight-body"),
  overviewAverageDaily: document.getElementById("overview-average-daily"),
  overviewAverageNote: document.getElementById("overview-average-note"),
  overviewTopCategoryNote: document.getElementById("overview-top-category-note"),
  overviewBudgetProgressLabel: document.getElementById("overview-budget-progress-label"),
  overviewBudgetProgressFill: document.getElementById("overview-budget-progress-fill"),
  overviewQuickTipTitle: document.getElementById("overview-quick-tip-title"),
  overviewQuickTipBody: document.getElementById("overview-quick-tip-body"),
  recentTransactionsList: document.getElementById("recent-transactions-list"),
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
  cardDiasRestantes: document.getElementById("card-dias-restantes"),
  cardDiasRestantesSubtitle: document.getElementById("card-dias-restantes-subtitle"),
  cardDiasRestantesTrend: document.getElementById("card-dias-restantes-trend"),
  cardLimiteDiario: document.getElementById("card-limite-diario"),
  cardLimiteDiarioPanel: document.getElementById("card-limite-diario-panel"),
  cardLimiteDiarioSubtitle: document.getElementById("card-limite-diario-subtitle"),
  cardLimiteDiarioTrend: document.getElementById("card-limite-diario-trend"),
  dailyLimitProgressFill: document.getElementById("daily-limit-progress-fill"),
  dailyLimitProgressLabel: document.getElementById("daily-limit-progress-label"),
  cardGastoDia: document.getElementById("card-gasto-dia"),
  cardGastoDiaPanel: document.getElementById("card-gasto-dia-panel"),
  cardGastoDiaSubtitle: document.getElementById("card-gasto-dia-subtitle"),
  cardGastoDiaTrend: document.getElementById("card-gasto-dia-trend"),
  miniStatDias: document.getElementById("mini-stat-dias"),
  miniStatVr: document.getElementById("mini-stat-vr"),
  miniStatInvestimento: document.getElementById("mini-stat-investimento"),
  expensePeriodChip: document.getElementById("expense-period-chip"),
  expenseTotalDay: document.getElementById("expense-total-day"),
  expenseTotalDayNote: document.getElementById("expense-total-day-note"),
  detailsExpenseTotalDay: document.getElementById("details-expense-total-day"),
  detailsExpenseTotalDayNote: document.getElementById("details-expense-total-day-note"),
  expenseTotalYesterday: document.getElementById("expense-total-yesterday"),
  expenseTotalYesterdayNote: document.getElementById("expense-total-yesterday-note"),
  expenseTotalWeek: document.getElementById("expense-total-week"),
  expenseTotalWeekNote: document.getElementById("expense-total-week-note"),
  detailsExpenseTotalWeek: document.getElementById("details-expense-total-week"),
  detailsExpenseTotalWeekNote: document.getElementById("details-expense-total-week-note"),
  expenseTotalMonth: document.getElementById("expense-total-month"),
  expenseTotalMonthNote: document.getElementById("expense-total-month-note"),
  detailsExpenseTotalMonth: document.getElementById("details-expense-total-month"),
  detailsExpenseTotalMonthNote: document.getElementById("details-expense-total-month-note"),
  expensePeriodTotal: document.getElementById("expense-period-total"),
  expensePeriodCount: document.getElementById("expense-period-count"),
  expensePeriodTopCategory: document.getElementById("expense-period-top-category"),
  expenseEvolutionBars: document.getElementById("expense-evolution-bars"),
  expenseEvolutionChip: document.getElementById("expense-evolution-chip"),
  expenseEvolutionCaption: document.getElementById("expense-evolution-caption"),
  expenseCategoryList: document.getElementById("expense-category-list"),
  expenseCategoryChip: document.getElementById("expense-category-chip"),
  insightsChip: document.getElementById("insights-chip"),
  insightsList: document.getElementById("insights-list"),
  expensePeriodButtons: Array.from(document.querySelectorAll("[data-expense-period]")),
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

function setMetricFooter(element, tone, badge, text) {
  if (!element) {
    return;
  }

  element.className = `metric-trend ${tone}`;
  element.innerHTML = `
    <span class="metric-trend-badge">${badge}</span>
    <span class="metric-trend-text">${text}</span>
  `;
}

function setChipTone(element, tone) {
  if (!element) {
    return;
  }

  element.classList.remove(
    "status-chip-blue",
    "status-chip-green",
    "status-chip-yellow",
    "status-chip-red",
    "status-chip-muted"
  );

  if (tone) {
    element.classList.add(`status-chip-${tone}`);
  }
}

function setSurfaceTone(element, tone) {
  if (!element) {
    return;
  }

  element.classList.remove(
    "dashboard-surface-green",
    "dashboard-surface-yellow",
    "dashboard-surface-red",
    "dashboard-surface-muted",
    "dashboard-surface-blue"
  );

  if (tone) {
    element.classList.add(`dashboard-surface-${tone}`);
  }
}

function switchDashboardTab(tabId = "overview") {
  elements.dashboardTabButtons.forEach((button) => {
    const isActive = button.dataset.dashboardTabLink === tabId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  elements.dashboardTabPanels.forEach((panel) => {
    const isActive = panel.dataset.dashboardPanel === tabId;
    panel.classList.toggle("is-active", isActive);
  });
}

function setDailyLimitHighlight(color) {
  if (!elements.cardLimiteDiarioPanel) {
    return;
  }

  elements.cardLimiteDiarioPanel.classList.remove(
    "dashboard-card-highlight-green",
    "dashboard-card-highlight-yellow",
    "dashboard-card-highlight-red",
    "dashboard-card-highlight-muted"
  );

  if (color) {
    elements.cardLimiteDiarioPanel.classList.add(`dashboard-card-highlight-${color}`);
  }
}

function setDashboardCardSignal(element, color) {
  if (!element) {
    return;
  }

  element.classList.remove(
    "dashboard-card-signal-green",
    "dashboard-card-signal-yellow",
    "dashboard-card-signal-red",
    "dashboard-card-signal-muted"
  );

  if (color) {
    element.classList.add(`dashboard-card-signal-${color}`);
  }
}

function setMessageBoxTone(element, color) {
  if (!element) {
    return;
  }

  element.classList.remove("success", "warning", "error");

  if (color === "red") {
    element.classList.add("error");
    return;
  }

  if (color === "yellow" || color === "muted") {
    element.classList.add("warning");
    return;
  }

  element.classList.add("success");
}

function getDailyLimitStatus(summary, expenseOverview) {
  const limit = Number(summary.limiteDiario || 0);
  const spentToday = Number(expenseOverview.today.totalGasto || 0);

  if (limit <= 0) {
    return {
      color: "muted",
      message: "Limite diario indisponivel",
      trendClass: "trend-warn",
      ratio: 0,
      percentage: 0,
      progressWidth: 0,
      detail: "Configure um limite diario valido para acompanhar o consumo de hoje.",
    };
  }

  const ratio = spentToday / limit;
  const percentage = ratio * 100;
  const safePercentage = Math.max(percentage, 0);
  const progressWidth = Math.min(safePercentage, 100);

  if (ratio <= 0.7) {
    return {
      color: "green",
      message: "Dentro do limite",
      trendClass: "trend-up",
      ratio,
      percentage,
      progressWidth,
      detail: `${formatDashboardCurrency(spentToday)} de ${formatDashboardCurrency(limit)} usados hoje.`,
    };
  }

  if (ratio <= 1) {
    return {
      color: "yellow",
      message: "Atencao: perto do limite",
      trendClass: "trend-warn",
      ratio,
      percentage,
      progressWidth,
      detail: `${formatDashboardCurrency(spentToday)} de ${formatDashboardCurrency(limit)} usados hoje.`,
    };
  }

  return {
    color: "red",
    message: "Voce ultrapassou o limite",
    trendClass: "trend-down",
    ratio,
    percentage,
    progressWidth,
    detail: `${formatDashboardCurrency(spentToday)} gastos para um limite diario de ${formatDashboardCurrency(limit)}.`,
  };
}

function formatPercent(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getInclusiveDaySpan(startDate, endDate) {
  const start = normalizeDashboardDate(startDate);
  const end = normalizeDashboardDate(endDate);
  const differenceInMs = end.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.max(Math.floor(differenceInMs / oneDay) + 1, 1);
}

function formatDayEstimate(days) {
  if (!Number.isFinite(days)) {
    return "mais do que o restante do ciclo";
  }

  if (days <= 1) {
    return "menos de 1 dia";
  }

  return `${Math.floor(days)} dia(s)`;
}

function getCategoryGlyph(category) {
  const value = String(category || "").toLowerCase();

  if (value.includes("compra")) {
    return "cart";
  }

  if (value.includes("transporte")) {
    return "car";
  }

  if (value.includes("saude")) {
    return "health";
  }

  if (value.includes("aliment")) {
    return "bag";
  }

  if (value.includes("outro")) {
    return "dots";
  }

  return "bag";
}

function getWeekdayLabel(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
  }).format(normalizeDashboardDate(date));
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

function buildFinancialHealthStatus(summary) {
  const hasFinancialBase =
    summary.paymentInfo.configured ||
    summary.saldoInicial > 0 ||
    summary.totalDespesas > 0;

  if (!hasFinancialBase) {
    return {
      color: "muted",
      type: "warning",
      title: "Dados financeiros insuficientes",
      shortLabel: "Configuracao pendente",
      projectionLabel: "Sem base suficiente",
      message:
        "Preencha saldo inicial e proximo pagamento para ativar a leitura automatica do ciclo.",
      alerts: [
        {
          type: "warning",
          title: "Complete sua base financeira",
          description:
            "Sem saldo inicial e data do proximo pagamento, o dashboard ainda nao consegue avaliar a saude do ciclo.",
        },
      ],
    };
  }

  if (summary.saldoDisponivel <= 0 || summary.diasRestantes <= 1) {
    return {
      color: "red",
      type: "danger",
      title: "Risco no ciclo financeiro",
      shortLabel: "Ciclo vermelho",
      projectionLabel: "Risco de ruptura",
      message:
        summary.saldoDisponivel <= 0
          ? "Risco: seu saldo disponivel nao cobre o restante do ciclo."
          : "Risco: faltam poucos dias para o proximo pagamento e a margem ficou critica.",
      alerts: [
        summary.saldoDisponivel <= 0
          ? {
              type: "danger",
              title: "Saldo disponivel negativo",
              description:
                "O valor comprometido ja consumiu todo o saldo inicial do ciclo. Revise gastos e prioridades imediatamente.",
            }
          : {
              type: "danger",
              title: "Dias restantes criticos",
              description:
                `Restam ${summary.diasRestantes} dia(s) para o proximo pagamento. O ciclo precisa de acompanhamento diario.`,
            },
      ],
    };
  }

  if (summary.limiteDiario <= 25 || summary.diasRestantes <= 3) {
    return {
      color: "yellow",
      type: "warning",
      title: "Atencao no ciclo financeiro",
      shortLabel: "Ciclo amarelo",
      projectionLabel: "Margem apertada",
      message:
        summary.limiteDiario <= 25
          ? "Atencao: seu limite diario esta apertado."
          : "Atencao: os dias restantes estao acabando e a margem do ciclo encolheu.",
      alerts: [
        summary.limiteDiario <= 25
          ? {
              type: "warning",
              title: "Limite diario baixo",
              description:
                `O valor livre por dia caiu para ${formatDashboardCurrency(summary.limiteDiario)}. Vale reduzir gastos ate o proximo pagamento.`,
            }
          : {
              type: "warning",
              title: "Janela curta ate o pagamento",
              description:
                `Restam ${summary.diasRestantes} dia(s) para atravessar o ciclo com ${formatDashboardCurrency(summary.saldoDisponivel)} de saldo disponivel.`,
            },
      ],
    };
  }

  return {
    color: "green",
    type: "success",
    title: "Ciclo financeiro saudavel",
    shortLabel: "Ciclo verde",
    projectionLabel: "Projecao saudavel",
    message: "Seu ciclo esta saudavel.",
    alerts: [
      {
        type: "success",
        title: "Seu ciclo esta saudavel",
        description:
          `O saldo disponivel esta positivo e o limite diario atual de ${formatDashboardCurrency(summary.limiteDiario)} indica uma margem mais confortavel.`,
      },
    ],
  };
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

function buildDashboardAlerts(data) {
  return calculateCyclePriorities(data);
}

function renderMetrics(summary, expenseOverview) {
  const projectedBenefits = getProjectedBenefitsTotal(summary);
  const healthStatus = buildFinancialHealthStatus(summary);
  const todayExpenseTotal = expenseOverview.today.totalGasto;
  const todayExpenseCount = expenseOverview.today.quantidadeLancamentos;
  const dailyLimitStatus = getDailyLimitStatus(summary, expenseOverview);

  elements.cardSaldoAtual.textContent = formatDashboardCurrency(summary.saldoDisponivel);
  elements.cardSaldoAtualSubtitle.textContent =
    summary.saldoInicial > 0 || summary.totalDespesas > 0
      ? summary.projectedBenefitsInSaldo > 0
        ? `${formatDashboardCurrency(summary.projectedBenefitsInSaldo)} em beneficios entram no ciclo.`
        : "Saldo livre para atravessar o ciclo atual."
      : "Informe seu saldo inicial para comecar o calculo real.";
  setMetricFooter(
    elements.cardSaldoAtualTrend,
    summary.saldoDisponivel >= 0 ? "trend-up" : "trend-down",
    summary.saldoDisponivel >= 0 ? "Seguro" : "Risco",
    summary.saldoDisponivel >= 0 ? "Saldo positivo" : "Saldo comprometido"
  );

  if (summary.paymentInfo.configured && summary.paymentInfo.nextDate) {
    elements.cardDiasRestantes.textContent = `${summary.paymentInfo.daysRemaining} dia(s)`;
    elements.cardDiasRestantesSubtitle.textContent = `Proximo pagamento em ${formatDashboardDateLong(summary.paymentInfo.nextDate)}.`;
    setMetricFooter(
      elements.cardDiasRestantesTrend,
      summary.paymentInfo.daysRemaining === 0 ? "trend-warn" : "trend-up",
      `ate ${summary.paymentInfo.nextDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
      getWeekdayLabel(summary.paymentInfo.nextDate)
    );
    elements.nextPaymentChip.textContent = "Proximo pagamento";
    elements.committedChip.textContent = formatDashboardDateLong(summary.paymentInfo.nextDate);
  } else {
    elements.cardDiasRestantes.textContent = "0 dia(s)";
    elements.cardDiasRestantesSubtitle.textContent = "Configure salario e dias de pagamento.";
    setMetricFooter(elements.cardDiasRestantesTrend, "trend-warn", "sem data", "Pagamento pendente");
    elements.nextPaymentChip.textContent = "Pagamento pendente";
    elements.committedChip.textContent = "Sem data definida";
  }

  elements.cardLimiteDiario.textContent = formatDashboardCurrency(summary.limiteDiario);
  elements.cardLimiteDiarioSubtitle.textContent =
    summary.diasRestantes > 0
      ? `${formatDashboardCurrency(summary.saldoDisponivel)} divididos por ${summary.diasRestantes} dia(s) restantes ate o proximo pagamento. ${dailyLimitStatus.detail}`
      : "Sem dias restantes validos para dividir o saldo disponivel.";
  setMetricFooter(
    elements.cardLimiteDiarioTrend,
    summary.limiteDiario > 0 ? dailyLimitStatus.trendClass : "trend-warn",
    summary.limiteDiario > 0 ? "Por dia" : "Sem base",
    summary.limiteDiario > 0 ? "Ate o proximo pagamento" : "Configure o ciclo"
  );
  setDailyLimitHighlight(dailyLimitStatus.color);
  if (elements.dailyLimitProgressFill) {
    elements.dailyLimitProgressFill.className = `daily-limit-progress-fill daily-limit-progress-fill-${dailyLimitStatus.color}`;
    elements.dailyLimitProgressFill.style.width = `${dailyLimitStatus.progressWidth}%`;
  }
  if (elements.dailyLimitProgressLabel) {
    elements.dailyLimitProgressLabel.textContent =
      summary.limiteDiario > 0
        ? `${Math.round(dailyLimitStatus.percentage)}%`
        : "--";
  }

  elements.cardGastoDia.textContent = formatDashboardCurrency(todayExpenseTotal);
  elements.cardGastoDiaSubtitle.textContent =
    todayExpenseCount > 0
      ? `${todayExpenseCount} lancamento(s) registrado(s) hoje. ${dailyLimitStatus.detail}`
      : summary.limiteDiario > 0
        ? dailyLimitStatus.detail
        : "Nenhum gasto registrado na data atual.";
  setMetricFooter(
    elements.cardGastoDiaTrend,
    summary.limiteDiario > 0
      ? dailyLimitStatus.trendClass
      : todayExpenseTotal > 0
        ? "trend-warn"
        : "trend-up",
    summary.limiteDiario > 0
      ? todayExpenseTotal > 0
        ? "Consumo"
        : "Sem gastos"
      : todayExpenseTotal > 0
        ? "Consumo"
        : "Sem gastos",
    summary.limiteDiario > 0
      ? todayExpenseTotal > 0
        ? dailyLimitStatus.message
        : "Voce esta no controle"
      : todayExpenseTotal > 0
        ? "Consumo em andamento"
        : "Voce esta no controle"
  );
  setDashboardCardSignal(elements.cardGastoDiaPanel, dailyLimitStatus.color);

  setChipTone(elements.nextPaymentChip, summary.paymentInfo.configured ? "blue" : "yellow");
  setChipTone(elements.committedChip, "muted");

  elements.miniStatDias.textContent = `${summary.diasRestantes} dia(s)`;
  elements.miniStatVr.textContent = formatDashboardCurrency(projectedBenefits);
  elements.miniStatInvestimento.textContent = formatDashboardCurrency(summary.investimento.suggestedValue);
  elements.cycleStatusChip.textContent =
    summary.limiteDiario > 0 ? dailyLimitStatus.message : healthStatus.shortLabel;
  elements.projectionChip.textContent = healthStatus.projectionLabel;
  setChipTone(
    elements.cycleStatusChip,
    summary.limiteDiario > 0 ? dailyLimitStatus.color : healthStatus.color
  );
  setChipTone(elements.projectionChip, healthStatus.color);

  if (elements.feedback) {
    elements.feedback.textContent =
      summary.limiteDiario > 0
        ? `${dailyLimitStatus.message}. ${dailyLimitStatus.detail}`
        : healthStatus.message;
    elements.feedback.className = "message-box";
    setMessageBoxTone(
      elements.feedback,
      summary.limiteDiario > 0 ? dailyLimitStatus.color : healthStatus.color
    );
  }
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

  const chartWidth = 760;
  const chartHeight = 248;
  const padding = { top: 20, right: 112, bottom: 42, left: 62 };
  const balances = projection.map((item) => Number(item.balance || 0));
  const rawMin = Math.min(...balances, 0);
  const rawMax = Math.max(...balances, 0);
  const amplitude = Math.max(rawMax - rawMin, 1);
  const paddingValue = amplitude * 0.14;
  const minValue = rawMin - paddingValue;
  const maxValue = rawMax + paddingValue;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const zeroY =
    padding.top + ((maxValue - 0) / Math.max(maxValue - minValue, 1)) * innerHeight;
  const xStep = projection.length > 1 ? innerWidth / (projection.length - 1) : 0;

  const points = projection.map((item, index) => {
    const x = padding.left + xStep * index;
    const y =
      padding.top +
      ((maxValue - Number(item.balance || 0)) / Math.max(maxValue - minValue, 1)) * innerHeight;
    return {
      ...item,
      x,
      y,
      tone:
        Number(item.balance || 0) < 0
          ? "danger"
          : Number(item.balance || 0) <= Math.max(Number(summary.limiteDiario || 0), 0)
            ? "warning"
            : "safe",
    };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaData = `${pathData} L ${points[points.length - 1].x.toFixed(2)} ${zeroY.toFixed(2)} L ${points[0].x.toFixed(2)} ${zeroY.toFixed(2)} Z`;
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = maxValue - ((maxValue - minValue) / 4) * index;
    const y = padding.top + (innerHeight / 4) * index;
    return { value, y };
  });
  const lastPoint = points[points.length - 1];

  elements.chartBars.innerHTML = `
    <div class="projection-chart">
      <div class="projection-chart-axis projection-chart-axis-y">
        ${yTicks
          .map(
            (tick) => `
              <span style="top:${tick.y.toFixed(2)}px">${formatDashboardCurrency(tick.value)}</span>
            `
          )
          .join("")}
      </div>
      <svg class="projection-chart-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" aria-label="Grafico de evolucao do saldo no periodo">
        <defs>
          <linearGradient id="projection-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#5be49d"></stop>
            <stop offset="48%" stop-color="#ffc857"></stop>
            <stop offset="100%" stop-color="#ff5d6c"></stop>
          </linearGradient>
          <linearGradient id="projection-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#67d8ff"></stop>
            <stop offset="100%" stop-color="rgba(103, 216, 255, 0)"></stop>
          </linearGradient>
        </defs>
        ${yTicks
          .map(
            (tick) => `
              <line class="projection-grid-line" x1="${padding.left}" y1="${tick.y.toFixed(2)}" x2="${chartWidth - padding.right}" y2="${tick.y.toFixed(2)}"></line>
            `
          )
          .join("")}
        <line class="projection-zero-line" x1="${padding.left}" y1="${zeroY.toFixed(2)}" x2="${chartWidth - padding.right}" y2="${zeroY.toFixed(2)}"></line>
        <path class="projection-area-path" d="${areaData}"></path>
        <path class="projection-line-path" d="${pathData}"></path>
        ${points
          .map(
            (point) => `
              <circle class="projection-point projection-point-${point.tone}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4.4"></circle>
            `
          )
          .join("")}
      </svg>
      <div class="projection-chart-axis projection-chart-axis-x">
        ${points
          .map(
            (point) => `
              <span style="left:${((point.x - padding.left) / Math.max(innerWidth, 1)) * 100}%">${point.label}</span>
            `
          )
          .join("")}
      </div>
      <div class="projection-chart-callout projection-chart-callout-${lastPoint.tone}">
        <span>${lastPoint.label}</span>
        <strong>Saldo projetado</strong>
        <em>${formatDashboardCurrency(lastPoint.balance)}</em>
      </div>
    </div>
  `;
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

function extractDashboardTimeLabel(value) {
  if (typeof value !== "string") {
    return "";
  }

  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function buildSummaryNote(summary, fallbackText) {
  if (!summary.quantidadeLancamentos) {
    return fallbackText;
  }

  return `${summary.quantidadeLancamentos} lancamento(s) | Categoria lider: ${summary.categoriaDominante}`;
}

function renderExpenseOverview(summary, overview, selectedSummary, intelligence) {
  const averageDailySpend = Number(intelligence?.forecast?.averageDailySpend || 0);
  const dominantCategory = intelligence?.dominantCategory || null;
  const budgetBase = Math.max(
    Number(summary?.saldoInicial || 0) + Number(summary?.projectedBenefitsInSaldo || 0),
    Number(selectedSummary.totalGasto || 0),
    1
  );
  const committedBase = Math.max(Number(selectedSummary.totalGasto || 0), 0);
  const budgetProgress = Math.min((committedBase / budgetBase) * 100 || 0, 100);

  elements.expenseTotalDay.textContent = formatDashboardCurrency(overview.today.totalGasto);
  elements.expenseTotalDayNote.textContent =
    intelligence?.automaticSummaries?.day?.body ||
    buildSummaryNote(overview.today, "Sem gastos hoje.");
  if (elements.detailsExpenseTotalDay) {
    elements.detailsExpenseTotalDay.textContent = formatDashboardCurrency(overview.today.totalGasto);
  }
  if (elements.detailsExpenseTotalDayNote) {
    elements.detailsExpenseTotalDayNote.textContent = buildSummaryNote(
      overview.today,
      "Sem gastos hoje."
    );
  }
  elements.expenseTotalYesterday.textContent = formatDashboardCurrency(
    overview.yesterday.totalGasto
  );
  elements.expenseTotalYesterdayNote.textContent = buildSummaryNote(
    overview.yesterday,
    "Sem gastos ontem."
  );
  elements.expenseTotalWeek.textContent = formatDashboardCurrency(overview.week.totalGasto);
  elements.expenseTotalWeekNote.textContent =
    intelligence?.automaticSummaries?.week?.body ||
    buildSummaryNote(overview.week, "Sem gastos nesta semana.");
  if (elements.detailsExpenseTotalWeek) {
    elements.detailsExpenseTotalWeek.textContent = formatDashboardCurrency(overview.week.totalGasto);
  }
  if (elements.detailsExpenseTotalWeekNote) {
    elements.detailsExpenseTotalWeekNote.textContent = buildSummaryNote(
      overview.week,
      "Sem gastos nesta semana."
    );
  }
  elements.expenseTotalMonth.textContent = formatDashboardCurrency(overview.month.totalGasto);
  elements.expenseTotalMonthNote.textContent =
    intelligence?.automaticSummaries?.month?.body ||
    buildSummaryNote(overview.month, "Sem gastos neste mes.");
  if (elements.detailsExpenseTotalMonth) {
    elements.detailsExpenseTotalMonth.textContent = formatDashboardCurrency(
      overview.month.totalGasto
    );
  }
  if (elements.detailsExpenseTotalMonthNote) {
    elements.detailsExpenseTotalMonthNote.textContent = buildSummaryNote(
      overview.month,
      "Sem gastos neste mes."
    );
  }
  elements.expensePeriodChip.textContent = `${selectedSummary.label} em foco`;
  elements.expensePeriodTotal.textContent = formatDashboardCurrency(selectedSummary.totalGasto);
  elements.expensePeriodCount.textContent = `${selectedSummary.quantidadeLancamentos} lancamento(s)`;
  elements.expensePeriodTopCategory.textContent = intelligence?.dominantCategory
    ? `${intelligence.dominantCategory.categoria} (${formatPercent(intelligence.dominantCategory.percentual)}%)`
    : selectedSummary.categoriaDominante;
  if (elements.overviewAverageDaily) {
    elements.overviewAverageDaily.textContent = formatDashboardCurrency(averageDailySpend);
  }
  if (elements.overviewAverageNote) {
    elements.overviewAverageNote.textContent =
      averageDailySpend > 0
        ? `Ritmo medio em ${selectedSummary.label.toLowerCase()}.`
        : "Sem base recente";
  }
  if (elements.overviewTopCategoryNote) {
    elements.overviewTopCategoryNote.textContent = dominantCategory
      ? `${formatDashboardCurrency(dominantCategory.total)} no periodo atual.`
      : "Aguardando gastos";
  }
  if (elements.overviewBudgetProgressLabel) {
    elements.overviewBudgetProgressLabel.textContent = `${Math.round(budgetProgress)}%`;
  }
  if (elements.overviewBudgetProgressFill) {
    elements.overviewBudgetProgressFill.style.width = `${budgetProgress}%`;
  }
}

function renderOverviewSpotlights(summary, selectedSummary, expenseOverview, intelligence) {
  const healthStatus = buildFinancialHealthStatus(summary);
  const primaryInsight = Array.isArray(intelligence?.insightMessages)
    ? intelligence.insightMessages[0]
    : null;
  const supportInsight = Array.isArray(intelligence?.insightMessages)
    ? intelligence.insightMessages[1] || primaryInsight
    : null;
  const overviewTone =
    healthStatus.color === "green"
      ? "green"
      : healthStatus.color === "yellow"
        ? "yellow"
        : healthStatus.color === "red"
          ? "red"
          : "muted";
  const insightTone = supportInsight?.tone || primaryInsight?.tone || "muted";

  setSurfaceTone(elements.overviewCycleAlertCard, overviewTone);
  setSurfaceTone(elements.overviewDailyInsightCard, insightTone);
  setChipTone(elements.cycleStatusChip, overviewTone);
  setChipTone(elements.overviewInsightChip, insightTone);

  if (elements.overviewCycleAlertTitle) {
    elements.overviewCycleAlertTitle.textContent = healthStatus.title;
  }
  if (elements.overviewCycleAlertBody) {
    elements.overviewCycleAlertBody.textContent = healthStatus.message;
  }
  if (elements.overviewInsightChip) {
    elements.overviewInsightChip.textContent =
      insightTone === "red"
        ? "Atencao alta"
        : insightTone === "yellow"
          ? "Leitura ativa"
          : insightTone === "green"
            ? "Favoravel"
            : "Sem base";
  }
  if (elements.overviewDailyInsightTitle) {
    elements.overviewDailyInsightTitle.textContent =
      supportInsight?.title ||
      primaryInsight?.title ||
      "Os insights ficam mais objetivos conforme seus dados crescem";
  }
  if (elements.overviewDailyInsightBody) {
    elements.overviewDailyInsightBody.textContent =
      supportInsight?.body ||
      primaryInsight?.body ||
      `Hoje soma ${formatDashboardCurrency(expenseOverview.today.totalGasto)} em ${selectedSummary.label.toLowerCase()}.`;
  }
  if (elements.overviewQuickTipTitle) {
    elements.overviewQuickTipTitle.textContent =
      primaryInsight?.label || "O proximo melhor passo aparece aqui";
  }
  if (elements.overviewQuickTipBody) {
    elements.overviewQuickTipBody.textContent =
      primaryInsight?.body ||
      `Mantenha o foco no limite diario de ${formatDashboardCurrency(summary.limiteDiario)} e no gasto de hoje.`;
  }
}

function renderRecentTransactions(selectedSummary) {
  if (!elements.recentTransactionsList) {
    return;
  }

  const recentItems = (selectedSummary.groups || [])
    .flatMap((group) => group.items || [])
    .slice()
    .sort((left, right) => String(right.data || "").localeCompare(String(left.data || "")))
    .slice(0, 5);

  if (!recentItems.length) {
    elements.recentTransactionsList.innerHTML = `
      <div class="detail-row">
        <span>Nenhum lancamento recente</span>
        <strong>Adicione ou importe movimentacoes</strong>
      </div>
    `;
    return;
  }

  elements.recentTransactionsList.innerHTML = recentItems
    .map(
      (entry) => `
        <article class="recent-transaction-item">
          <div class="recent-transaction-icon recent-transaction-icon-${getCategoryGlyph(entry.categoria)}"></div>
          <div class="recent-transaction-main">
            <strong>${entry.descricao || "Lancamento"}</strong>
            <span>${entry.categoria || "Sem categoria"} | ${extractDashboardTimeLabel(entry.data) || formatDashboardDateLong(entry.data)}</span>
          </div>
          <div class="recent-transaction-side">
            <strong class="recent-transaction-value">${formatDashboardCurrency(entry.valor)}</strong>
            <span>${extractDashboardTimeLabel(entry.data) || "Hoje"}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderExpensePeriodFilters() {
  elements.expensePeriodButtons.forEach((button) => {
    const isActive = button.dataset.expensePeriod === dashboardState.selectedExpensePeriod;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

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
  elements.expenseEvolutionCaption.textContent = `${formatDashboardDateLong(summary.startDate)} ate ${formatDashboardDateLong(summary.endDate)}.`;
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

function renderExpenseCategories(summary) {
  if (!summary.categorySeries.length) {
    elements.expenseCategoryChip.textContent = "Sem categorias";
    elements.expenseCategoryList.innerHTML = `
      <div class="empty-state">
        <strong>Categorias ainda vazias</strong>
        Os gastos por categoria aparecem automaticamente quando houver lancamentos no periodo.
      </div>
    `;
    return;
  }

  const referenceTotal = Math.max(summary.categorySeries[0]?.total || 0, 1);

  elements.expenseCategoryChip.textContent = summary.categoriaDominante;
  elements.expenseCategoryList.innerHTML = summary.categorySeries
    .slice(0, 3)
    .map((item) => {
      const width = Math.max((item.total / referenceTotal) * 100, 10);
      const glyph = getCategoryGlyph(item.categoria);

      return `
        <div class="category-bar-row">
          <div class="category-bar-leading">
            <div class="category-bar-icon category-bar-icon-${glyph}"></div>
            <div class="category-bar-meta">
              <strong>${item.categoria}</strong>
              <span>${formatDashboardCurrency(item.total)}</span>
            </div>
          </div>
          <div class="category-bar-side">
            <strong>${formatPercent(item.percentual)}%</strong>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderInsights(summary, selectedSummary, expenseOverview, intelligence) {
  if (!elements.insightsList || !elements.insightsChip) {
    return;
  }

  const generatedInsights = Array.isArray(intelligence?.insightMessages)
    ? intelligence.insightMessages
    : [];

  if (generatedInsights.length) {
    const insightTone =
      generatedInsights.some((item) => item.tone === "red")
        ? "red"
        : generatedInsights.some((item) => item.tone === "yellow")
          ? "yellow"
          : generatedInsights.some((item) => item.tone === "green")
            ? "green"
            : "muted";

    elements.insightsChip.textContent =
      insightTone === "red"
        ? "Atencao alta"
        : insightTone === "yellow"
          ? "Atencao moderada"
          : insightTone === "green"
            ? "Leitura favoravel"
            : "Sem leitura suficiente";
    setChipTone(elements.insightsChip, insightTone);
    elements.insightsList.innerHTML = generatedInsights
      .map(
        (insight) => `
          <article class="insight-item insight-item-${insight.tone}">
            <span class="insight-label">${insight.label}</span>
            <strong>${insight.title}</strong>
            <p>${insight.body}</p>
          </article>
        `
      )
      .join("");
    return;
  }

  const forecast = intelligence?.forecast || {};
  const dominantCategory = intelligence?.dominantCategory || null;
  const comparison = intelligence?.comparison || {};
  const alerts = intelligence?.alerts || {};
  const weeklyTrend = intelligence?.weeklyTrend || null;
  const automaticSummaries = intelligence?.automaticSummaries || {};
  const categoryAutomation = intelligence?.categoryAutomation || {};
  const dailyLimitStatus = getDailyLimitStatus(summary, expenseOverview);

  const forecastInsight =
    forecast.averageDailySpend <= 0
      ? {
          label: "Previsao ate o pagamento",
          tone: "muted",
          title: "Ainda nao existe ritmo suficiente para prever o fim do ciclo",
          body: "Sem gastos no periodo em foco, o saldo ainda nao mostra desgaste suficiente para uma previsao util.",
        }
      : forecast.reachesNextPayment
        ? {
            label: "Previsao ate o pagamento",
            tone:
              forecast.estimatedDaysWithBalance <= summary.diasRestantes + 2 ? "yellow" : "green",
            title:
              forecast.projectedBalanceAtPayment >= 0
                ? "No ritmo atual o saldo chega ao proximo pagamento"
                : "Voce ainda chega ao pagamento, mas com margem curta",
            body: `O ritmo medio esta em ${formatDashboardCurrency(forecast.averageDailySpend)} por dia. O saldo atual dura cerca de ${formatDayEstimate(forecast.estimatedDaysWithBalance)} e deve ${forecast.projectedBalanceAtPayment >= 0 ? `sobrar ${formatDashboardCurrency(forecast.projectedBalanceAtPayment)}` : `ficar apertado em ${formatDashboardCurrency(Math.abs(forecast.projectedBalanceAtPayment))}`} ate o proximo pagamento.`,
          }
        : {
            label: "Previsao ate o pagamento",
            tone: "red",
            title: "No ritmo atual o saldo nao chega ao proximo pagamento",
            body: `Mantido o ritmo medio de ${formatDashboardCurrency(forecast.averageDailySpend)} por dia, o saldo acaba cerca de ${formatDayEstimate(forecast.daysBeforeBalanceRunsOut)} antes do pagamento e pode faltar ${formatDashboardCurrency(forecast.estimatedDeficit)}.`,
          };

  const categoryInsight = dominantCategory
    ? {
        label: "Categoria dominante",
        tone: dominantCategory.percentual >= 45 ? "yellow" : "blue",
        title: `${dominantCategory.categoria} lidera os gastos do periodo`,
        body: `${formatDashboardCurrency(dominantCategory.total)} representam ${formatPercent(dominantCategory.percentual)}% do total em ${selectedSummary.label.toLowerCase()}.`,
      }
    : {
        label: "Categoria dominante",
        tone: "muted",
        title: "Ainda nao existe categoria dominante",
        body: "Quando houver gastos no periodo selecionado, a categoria mais pesada aparecera aqui.",
      };

  let comparisonInsight;
  if (comparison.recentAverageDailySpend <= 0) {
    comparisonInsight = {
      label: "Comparacao com media",
      tone: expenseOverview.today.totalGasto > 0 ? "yellow" : "muted",
      title:
        expenseOverview.today.totalGasto > 0
          ? "Hoje abriu a media recente"
          : "Sem base recente para comparar o gasto de hoje",
      body:
        expenseOverview.today.totalGasto > 0
          ? `Hoje soma ${formatDashboardCurrency(expenseOverview.today.totalGasto)} e ainda nao existe historico semanal suficiente para comparar.`
          : "Registre alguns dias de gasto para destravar a comparacao com a media diaria recente.",
    };
  } else if (comparison.difference > 0) {
    comparisonInsight = {
      label: "Comparacao com media",
      tone: comparison.difference / comparison.recentAverageDailySpend > 0.35 ? "red" : "yellow",
      title: "Hoje esta acima da media diaria recente",
      body: `${formatDashboardCurrency(expenseOverview.today.totalGasto)} hoje contra media de ${formatDashboardCurrency(comparison.recentAverageDailySpend)}. Excesso atual: ${formatDashboardCurrency(comparison.difference)}.`,
    };
  } else if (comparison.difference < 0) {
    comparisonInsight = {
      label: "Comparacao com media",
      tone: "green",
      title: "Hoje esta abaixo da media diaria recente",
      body: `${formatDashboardCurrency(expenseOverview.today.totalGasto)} hoje contra media de ${formatDashboardCurrency(comparison.recentAverageDailySpend)}. Folga atual: ${formatDashboardCurrency(Math.abs(comparison.difference))}.`,
    };
  } else {
    comparisonInsight = {
      label: "Comparacao com media",
      tone: "blue",
      title: "Hoje esta alinhado com a media diaria recente",
      body: `${formatDashboardCurrency(expenseOverview.today.totalGasto)} hoje, praticamente igual a media recente de ${formatDashboardCurrency(comparison.recentAverageDailySpend)}.`,
    };
  }

  const weeklyTrendInsight = weeklyTrend
    ? {
        label: "Tendencia semanal",
        tone: weeklyTrend.percentual >= 45 ? "yellow" : "blue",
        title: `${weeklyTrend.weekday} concentra a maior parte do gasto semanal`,
        body: `${formatDashboardCurrency(weeklyTrend.total)} sairam nesse dia, o que representa ${formatPercent(weeklyTrend.percentual)}% da semana atual.`,
      }
    : {
        label: "Tendencia semanal",
        tone: "muted",
        title: "Ainda nao existe padrao semanal claro",
        body: "Com mais gastos distribuidos na semana, o dashboard vai apontar o dia de maior concentracao.",
      };

  let preventiveAlertInsight;
  if (!summary.paymentInfo.configured || summary.diasRestantes <= 0) {
    preventiveAlertInsight = {
      label: "Alertas preventivos",
      tone: "muted",
      title: "Configure o proximo pagamento para ativar os alertas preventivos",
      body: "Sem a data do proximo recebimento, o dashboard ainda nao consegue medir o risco real do ciclo.",
    };
  } else if (alerts.riskBeforePayment) {
    preventiveAlertInsight = {
      label: "Alertas preventivos",
      tone: "red",
      title: "Existe risco claro de faltar dinheiro antes do pagamento",
      body: `O ritmo atual pede ajuste imediato. ${dailyLimitStatus.message}.`,
    };
  } else if (alerts.aboveDailyLimit || alerts.aboveWeeklyAverage || alerts.nearDailyLimit) {
    const warningMessages = [];

    if (alerts.aboveDailyLimit) {
      warningMessages.push("o gasto de hoje ja passou do limite diario");
    } else if (alerts.nearDailyLimit) {
      warningMessages.push("o gasto de hoje esta perto do limite diario");
    }

    if (alerts.aboveWeeklyAverage) {
      warningMessages.push("hoje esta acima da media semanal recente");
    }

    preventiveAlertInsight = {
      label: "Alertas preventivos",
      tone: alerts.aboveDailyLimit ? "red" : "yellow",
      title: "O dia pede mais atencao",
      body: `Sinal preventivo: ${warningMessages.join(" e ")}.`,
    };
  } else {
    preventiveAlertInsight = {
      label: "Alertas preventivos",
      tone: "green",
      title: "Sem alerta preventivo forte neste momento",
      body: "O gasto de hoje, a media recente e a previsao ate o pagamento seguem em uma faixa mais controlada.",
    };
  }

  const insights = [
    forecastInsight,
    categoryInsight,
    comparisonInsight,
    preventiveAlertInsight,
    weeklyTrendInsight,
    {
      label: automaticSummaries.day?.label || "Resumo do dia",
      tone: automaticSummaries.day?.tone || "muted",
      title: automaticSummaries.day?.title || "Sem resumo do dia",
      body: automaticSummaries.day?.body || "Adicione gastos para gerar um resumo automatico do dia.",
    },
    {
      label: automaticSummaries.week?.label || "Resumo da semana",
      tone: automaticSummaries.week?.tone || "muted",
      title: automaticSummaries.week?.title || "Sem resumo da semana",
      body: automaticSummaries.week?.body || "Adicione gastos para gerar um resumo automatico da semana.",
    },
    {
      label: automaticSummaries.month?.label || "Resumo do mes",
      tone: automaticSummaries.month?.tone || "muted",
      title: automaticSummaries.month?.title || "Sem resumo do mes",
      body: `${automaticSummaries.month?.body || "Adicione gastos para gerar um resumo automatico do mes."}${
        categoryAutomation?.rules?.length
          ? ` ${categoryAutomation.matchedEntries || 0} descricao(oes) ja combinam com ${categoryAutomation.rules.length} regra(s) de classificacao automatica.`
          : ""
      }`,
    },
  ];
  const insightTone =
    insights.some((item) => item.tone === "red")
      ? "red"
      : insights.some((item) => item.tone === "yellow")
        ? "yellow"
        : insights.some((item) => item.tone === "green")
          ? "green"
          : "muted";

  elements.insightsChip.textContent =
    insightTone === "red"
      ? "Risco no ciclo"
      : insightTone === "yellow"
        ? "Leitura em atencao"
        : insightTone === "green"
          ? "Leitura favoravel"
          : "Sem base suficiente";
  setChipTone(elements.insightsChip, insightTone);

  elements.insightsList.innerHTML = insights
    .map(
      (insight) => `
        <article class="insight-item insight-item-${insight.tone}">
          <span class="insight-label">${insight.label}</span>
          <strong>${insight.title}</strong>
          <p>${insight.body}</p>
        </article>
      `
    )
    .join("");
}

function renderDailySummary(periodSummary) {
  if (!elements.dailySummaryList || !elements.dailySummaryChip) {
    return;
  }

  if (!periodSummary.groups.length) {
    elements.dailySummaryChip.textContent = "Sem lancamentos";
    elements.dailySummaryList.innerHTML = `
      <div class="detail-row">
        <span>Resumo do periodo indisponivel</span>
        <strong>Adicione ou importe lancamentos</strong>
      </div>
    `;
    return;
  }

  elements.dailySummaryChip.textContent = `${periodSummary.groups.length} dia(s)`;
  elements.dailySummaryList.innerHTML = periodSummary.groups
    .slice()
    .reverse()
    .map(
      (group, index) => `
        <details class="day-accordion"${index === 0 ? " open" : ""}>
          <summary class="day-accordion-summary">
            <div>
              <strong>${formatDashboardDateLong(group.date)}</strong>
              <span class="text-soft">Categoria dominante: ${group.topCategory}</span>
            </div>
            <div class="day-accordion-meta">
              <strong>${formatDashboardCurrency(group.saidas)}</strong>
              <span class="text-soft">${group.count} lancamento(s)</span>
            </div>
          </summary>
          <div class="day-accordion-content">
            ${(group.items || [])
              .map(
                (entry) => `
                  <div class="day-entry-row">
                    <div class="day-entry-main">
                      <strong>${entry.descricao || "Lancamento"}</strong>
                      <span class="text-soft">${entry.categoria || "Sem categoria"} | ${
                        extractDashboardTimeLabel(entry.data) || "--:--"
                      } | ${entry.origem || "manual"}</span>
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

function renderAlerts(summary, alerts) {
  const healthStatus = buildFinancialHealthStatus(summary);
  const combinedAlerts = [...healthStatus.alerts, ...alerts].slice(0, 4);

  elements.alertChip.textContent = combinedAlerts[0]?.completed
    ? "Ciclo concluido"
    : `${combinedAlerts.length} alerta(s)`;
  setChipTone(elements.alertChip, healthStatus.color);
  elements.alertList.innerHTML = combinedAlerts
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

function renderSummaryTable(data, summary, alerts, expenseOverview, intelligence) {
  const healthStatus = buildFinancialHealthStatus(summary);
  const projectedBenefits = getProjectedBenefitsTotal(summary);
  const vrVaBenefit = summary.benefits.active.find((benefit) => benefit.key === "vrVa");
  const categoryAutomation = intelligence?.categoryAutomation || {};
  const rows = [
    {
      label: "Status do ciclo",
      value: healthStatus.title,
      statusClass:
        healthStatus.color === "green"
          ? "status-positive"
          : healthStatus.color === "yellow"
            ? "status-warning"
            : healthStatus.color === "red"
              ? "status-danger"
              : "status-warning",
      note: healthStatus.message,
    },
    {
      label: "Saldo disponivel",
      value: formatDashboardCurrency(summary.saldoDisponivel),
      statusClass: summary.saldoDisponivel >= 0 ? "status-positive" : "status-danger",
      note: summary.projectedBenefitsInSaldo > 0
        ? `Saldo inicial mais ${formatDashboardCurrency(summary.projectedBenefitsInSaldo)} em beneficios contabilizados no saldo, menos o valor comprometido do ciclo.`
        : "Saldo inicial menos o valor comprometido ja registrado para o usuario autenticado.",
    },
    {
      label: "Saldo restante (alias)",
      value: formatDashboardCurrency(summary.saldoRestante),
      statusClass: summary.saldoRestante >= 0 ? "status-positive" : "status-danger",
      note: "Mantido como alias de saldo disponivel para preservar compatibilidade com o restante do sistema.",
    },
    {
      label: "Proximo pagamento",
      value: formatDashboardCurrency(summary.paymentInfo.value),
      statusClass: summary.paymentInfo.configured ? "status-positive" : "status-warning",
      note:
        summary.paymentInfo.configured && summary.paymentInfo.nextDate
          ? `${summary.paymentInfo.daysRemaining} dia(s) ate ${formatDashboardDateLong(summary.paymentInfo.nextDate)}.`
          : "Configure salario, descontos e dias de pagamento em Base financeira.",
    },
    {
      label: "Dias restantes",
      value: `${summary.diasRestantes} dia(s)`,
      statusClass: summary.diasRestantes > 0 ? "status-positive" : "status-warning",
      note: "Diferenca entre hoje e a data do proximo pagamento salva para o usuario.",
    },
    {
      label: "Total de despesas",
      value: formatDashboardCurrency(summary.totalDespesas),
      statusClass: summary.totalDespesas > 0 ? "status-warning" : "status-positive",
      note: "Soma das despesas salvas no Supabase para o usuario autenticado.",
    },
    {
      label: "Gasto de hoje",
      value: formatDashboardCurrency(expenseOverview.today.totalGasto),
      statusClass: expenseOverview.today.totalGasto > 0 ? "status-warning" : "status-positive",
      note: `${expenseOverview.today.quantidadeLancamentos} lancamento(s) registrados no dia atual.`,
    },
    {
      label: "Resumo de ontem",
      value: formatDashboardCurrency(expenseOverview.yesterday.totalGasto),
      statusClass: expenseOverview.yesterday.totalGasto > 0 ? "status-warning" : "status-positive",
      note: `${expenseOverview.yesterday.quantidadeLancamentos} lancamento(s) do dia anterior.`,
    },
    {
      label: "Semana ate agora",
      value: formatDashboardCurrency(expenseOverview.week.totalGasto),
      statusClass: expenseOverview.week.totalGasto > 0 ? "status-warning" : "status-positive",
      note: `${expenseOverview.week.quantidadeLancamentos} lancamento(s) de segunda-feira ate hoje.`,
    },
    {
      label: "Mes ate agora",
      value: formatDashboardCurrency(expenseOverview.month.totalGasto),
      statusClass: expenseOverview.month.totalGasto > 0 ? "status-warning" : "status-positive",
      note: `${expenseOverview.month.quantidadeLancamentos} lancamento(s) do dia 1 ate hoje.`,
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
      label: "Saidas variaveis no ledger",
      value: formatDashboardCurrency(summary.dailyExpenses.total),
      statusClass: summary.dailyExpenses.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.dailyExpenses.items.length} movimentacao(oes) de saida no ledger ja afetam a leitura de consumo, os insights e a projecao do saldo.`,
    },
    {
      label: "Categorias mais usadas no mes",
      value: expenseOverview.month.categorySeries.length
        ? expenseOverview.month.categorySeries.map((item) => item.categoria).slice(0, 3).join(", ")
        : "--",
      statusClass: expenseOverview.month.categorySeries.length ? "status-positive" : "status-warning",
      note: expenseOverview.month.categorySeries.length
        ? expenseOverview.month.categorySeries
            .slice(0, 3)
            .map((item) => `${item.categoria}: ${formatDashboardCurrency(item.total)}`)
            .join(" | ")
        : "As categorias aparecem aqui conforme os gastos do mes forem sendo registrados.",
    },
    {
      label: "Classificacao automatica",
      value: `${categoryAutomation.matchedEntries || 0} descricao(oes) reconhecidas`,
      statusClass:
        (categoryAutomation.matchedEntries || 0) > 0 ? "status-positive" : "status-warning",
      note: categoryAutomation.rules?.length
        ? `${categoryAutomation.rules.length} regra(s) ja estao prontas para apoiar a classificacao automatica futura por descricao.`
        : "As regras de classificacao automatica ainda nao foram configuradas.",
    },
    {
      label: "Beneficios previstos no ciclo",
      value: formatDashboardCurrency(projectedBenefits),
      statusClass: projectedBenefits > 0 ? "status-positive" : "status-warning",
      note: vrVaBenefit
        ? `VR/VA ${vrVaBenefit.status === "recebido" ? "recebido" : "pendente"} com previsao de ${formatDashboardCurrency(vrVaBenefit.value)} em ${formatDashboardDateLong(vrVaBenefit.nextDate)}.${summary.projectedBenefitsInSaldo > 0 ? ` ${formatDashboardCurrency(summary.projectedBenefitsInSaldo)} entram no saldo disponivel.` : ""}`
        : "Registre o VR/VA em Recebimentos quando esse beneficio fizer parte da sua leitura financeira.",
    },
    {
      label: "Valor comprometido",
      value: formatDashboardCurrency(summary.valorComprometido),
      statusClass: summary.valorComprometido > 0 ? "status-danger" : "status-positive",
      note: `Hoje soma ${formatDashboardCurrency(summary.committedBreakdown.despesasRegistradas)} em despesas registradas, ${formatDashboardCurrency(summary.committedBreakdown.contasFixas)} em contas fixas, ${formatDashboardCurrency(summary.committedBreakdown.faturasCartao)} em faturas do ciclo e ${formatDashboardCurrency(summary.committedBreakdown.parcelamentos)} na parcela vigente do periodo.`,
    },
    {
      label: "Disponivel por dia",
      value: formatDashboardCurrency(summary.limiteDiario),
      statusClass: summary.limiteDiario > 0 ? "status-positive" : "status-warning",
      note: "Saldo disponivel dividido pelos dias restantes ate o proximo pagamento.",
    },
    {
      label: "Saldo apos gastos variaveis",
      value: formatDashboardCurrency(summary.saldoAposGastosVariaveis),
      statusClass: summary.saldoAposGastosVariaveis >= 0 ? "status-positive" : "status-danger",
      note: "Neste momento acompanha o mesmo saldo disponivel, preservando compatibilidade para futuras camadas de comprometimento.",
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
    !summary.saldoInicial &&
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
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.emptyState.innerHTML = "";
}

function bindExpensePeriodFilters() {
  elements.expensePeriodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextPeriod = button.dataset.expensePeriod;

      if (!nextPeriod || nextPeriod === dashboardState.selectedExpensePeriod) {
        return;
      }

      dashboardState.selectedExpensePeriod = nextPeriod;
      atualizarDashboard();
    });
  });
}

function bindDashboardTabs() {
  elements.dashboardTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.dashboardTabLink || "overview";
      switchDashboardTab(nextTab);
    });
  });
}

function logDashboardIntegrationDebug(data, summary, expenseOverview, selectedSummary, intelligence) {
  if (window.__MFINANCEIRO_DEBUG_INTEGRATION__ === false) {
    return;
  }

  const rawLedger = Array.isArray(data?.ledgerMovimentacoes) ? data.ledgerMovimentacoes : [];
  const normalizedLedger = getDashboardLedgerMovements(data);
  const normalizedExpenses = getDashboardLedgerExpenseEntries(data);
  const comparisonPayload = {
    ledgerBruto: rawLedger.length,
    ledgerNormalizado: normalizedLedger.length,
    saidasNormalizadas: normalizedExpenses.length,
    contasDiaADia: Array.isArray(data?.contasDiaADia) ? data.contasDiaADia.length : 0,
    totalDespesasResumo: Number(summary?.totalDespesas || 0),
    totalGastosDiaADiaResumo: Number(summary?.dailyExpenses?.total || 0),
    totalHoje: Number(expenseOverview?.today?.totalGasto || 0),
    totalPeriodoSelecionado: Number(selectedSummary?.totalGasto || 0),
    categoriaDominante: intelligence?.dominantCategory?.categoria || selectedSummary?.categoriaDominante || "--",
    tendenciaSemanal: intelligence?.weeklyTrend?.weekday || "--",
    fonteLedger: intelligence?.ledger?.source || "desconhecida",
  };

  console.groupCollapsed("[MFinanceiro Debug] Integracao dados -> ledger -> calculos -> dashboard");
  console.log("Contagem de registros no ledger:", {
    bruto: rawLedger.length,
    normalizado: normalizedLedger.length,
    saidas: normalizedExpenses.length,
  });
  console.log("Totais calculados:", {
    totalDespesasResumo: comparisonPayload.totalDespesasResumo,
    totalGastosDiaADiaResumo: comparisonPayload.totalGastosDiaADiaResumo,
    totalHoje: comparisonPayload.totalHoje,
    totalPeriodoSelecionado: comparisonPayload.totalPeriodoSelecionado,
  });
  console.log("Comparacao bruto x calculado:", comparisonPayload);
  console.groupEnd();
}

function hydrateDashboardData() {
  const data = loadDashboardData();
  const bankingData = loadDashboardBanking();
  const variableAccounts = loadDashboardVariableAccounts();
  const ledgerMovements = loadDashboardLedger();
  const paymentReceipt = loadDashboardPayment();
  const vrvaReceipt = loadDashboardVrVa();

  data.banking = {
    ...data.banking,
    ...bankingData,
  };
  data.contasDiaADia = variableAccounts;
  data.ledgerMovimentacoes = ledgerMovements;
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

  return data;
}

function atualizarDashboard() {
  const data = hydrateDashboardData();
  const summary = calculateDashboardSummary(data);
  const expenseOverview = getDashboardExpenseOverviewSummary(data);
  const selectedSummary = getDashboardExpensePeriodSummary(
    data,
    dashboardState.selectedExpensePeriod
  );
  const intelligence = computeDashboardFinancialIntelligence(
    data,
    dashboardState.selectedExpensePeriod
  );
  const dailySeries = buildDashboardDailySeries(data);
  const projection = buildDashboardBalanceSeries(data);
  const alerts = buildDashboardAlerts(data);

  logDashboardIntegrationDebug(data, summary, expenseOverview, selectedSummary, intelligence);

  renderMetrics(summary, expenseOverview);
  renderExpensePeriodFilters();
  renderExpenseOverview(summary, expenseOverview, selectedSummary, intelligence);
  renderOverviewSpotlights(summary, selectedSummary, expenseOverview, intelligence);
  renderInsights(summary, selectedSummary, expenseOverview, intelligence);
  renderExpenseEvolution(selectedSummary);
  renderExpenseCategories(selectedSummary);
  renderRecentTransactions(selectedSummary);
  atualizarGraficoDashboard(summary, projection, dailySeries);
  renderDailySummary(selectedSummary);
  renderAlerts(summary, alerts);
  renderSummaryTable(data, summary, alerts, expenseOverview, intelligence);
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

bindExpensePeriodFilters();
bindDashboardTabs();
switchDashboardTab("overview");
showDashboardFeedback(window.AppShell.consumeDashboardNotice());
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", atualizarDashboard);
} else {
  atualizarDashboard();
}
