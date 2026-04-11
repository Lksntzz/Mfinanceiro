console.log("[Dashboard Scripts] carregado: /src/pages/dashboard.js");

let loadDashboardBanking;
let loadDashboardVariableAccounts;
let loadDashboardLedger;
let loadDashboardPayment;
let loadDashboardVrVa;
let loadDashboardData;

let buildDashboardSpendingRhythmDataset;
let calculateCyclePriorities;
let computeDashboardFinancialInsights;
let calculateDashboardFinancialSummary;
let formatDashboardCurrencyValue;
let formatDashboardLongDate;
let getDashboardExpenseOverviewData;
let getDashboardExpensePeriodData;
let getDashboardLedgerExpenseData;
let getDashboardLedgerMovementData;
let buildDashboardBalanceSeries;
let buildDashboardDailySeries;
let normalizeDashboardBaseDate;

const dashboardState = {
  selectedExpensePeriod: "week",
  selectedSpendingRhythmPeriod: "day",
  selectedHistoryPeriod: "7d",
  historyVisibleGroups: 6,
  historyCustomStart: "",
  historyCustomEnd: "",
  historyIndividualDeleteConfirmedUntil: 0,
};

let overviewRenderer;
let dashboardAppInitialized = false;
let dashboardTabsBound = false;

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
  historyPanelSubtitle: document.getElementById("history-panel-subtitle"),
  historyCustomStart: document.getElementById("history-custom-start"),
  historyCustomEnd: document.getElementById("history-custom-end"),
  historyCustomApply: document.getElementById("history-custom-apply"),
  historyLoadMore: document.getElementById("history-load-more"),
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
  spendingRhythmSubtitle: document.getElementById("spending-rhythm-subtitle"),
  spendingRhythmChip: document.getElementById("spending-rhythm-chip"),
  spendingRhythmChart: document.getElementById("spending-rhythm-chart"),
  spendingRhythmTotal: document.getElementById("spending-rhythm-total"),
  spendingRhythmAverage: document.getElementById("spending-rhythm-average"),
  spendingRhythmPeriodButtons: Array.from(
    document.querySelectorAll("[data-spending-rhythm-period]")
  ),
  historyPeriodButtons: Array.from(document.querySelectorAll("[data-history-period]")),
  insightsChip: document.getElementById("insights-chip"),
  insightsList: document.getElementById("insights-list"),
  expensePeriodButtons: Array.from(document.querySelectorAll("[data-expense-period]")),
  recentTransactionsSubtitle: document.getElementById("recent-transactions-subtitle"),
};

const overviewHelpers = {
  buildFinancialHealthStatus,
  formatCurrency(value) {
    return formatDashboardCurrencyValue(value);
  },
  formatDateLong(value) {
    return formatDashboardLongDate(value);
  },
  formatPercent,
  getDailyLimitStatus,
  getWeekdayLabel,
  setChipTone,
  setDailyLimitHighlight,
  setDashboardCardSignal,
  setMessageBoxTone,
  setMetricFooter,
  setSurfaceTone,
};

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
  console.log("[Dashboard Tabs] switchDashboardTab recebeu:", tabId);

  const dashboardTabButtons = Array.from(
    document.querySelectorAll("[data-dashboard-tab-link]")
  );
  const dashboardTabPanels = Array.from(
    document.querySelectorAll("[data-dashboard-panel]")
  );

  dashboardTabButtons.forEach((button) => {
    const isActive = button.dataset.dashboardTabLink === tabId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  dashboardTabPanels.forEach((panel) => {
    const isActive = panel.dataset.dashboardPanel === tabId;
    panel.classList.toggle("is-active", isActive);
  });

  const activePanels = dashboardTabPanels
    .filter((panel) => panel.classList.contains("is-active"))
    .map((panel) => panel.dataset.dashboardPanel);
  console.log("[Dashboard Tabs] painÃ©is ativos:", activePanels);
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
      detail: `${formatDashboardCurrencyValue(spentToday)} de ${formatDashboardCurrencyValue(limit)} usados hoje.`,
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
      detail: `${formatDashboardCurrencyValue(spentToday)} de ${formatDashboardCurrencyValue(limit)} usados hoje.`,
    };
  }

  return {
    color: "red",
    message: "Voce ultrapassou o limite",
    trendClass: "trend-down",
    ratio,
    percentage,
    progressWidth,
    detail: `${formatDashboardCurrencyValue(spentToday)} gastos para um limite diario de ${formatDashboardCurrencyValue(limit)}.`,
  };
}

function formatPercent(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getInclusiveDaySpan(startDate, endDate) {
  const start = normalizeDashboardBaseDate(startDate);
  const end = normalizeDashboardBaseDate(endDate);
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
  }).format(normalizeDashboardBaseDate(date));
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
              `O valor livre por dia caiu para ${formatDashboardCurrencyValue(summary.limiteDiario)}. Vale reduzir gastos ate o proximo pagamento.`,
          }
          : {
            type: "warning",
            title: "Janela curta ate o pagamento",
            description:
              `Restam ${summary.diasRestantes} dia(s) para atravessar o ciclo com ${formatDashboardCurrencyValue(summary.saldoDisponivel)} de saldo disponivel.`,
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
          `O saldo disponivel esta positivo e o limite diario atual de ${formatDashboardCurrencyValue(summary.limiteDiario)} indica uma margem mais confortavel.`,
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
  overviewRenderer.renderMetrics({
    elements,
    summary,
    expenseOverview,
    helpers: overviewHelpers,
  });
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

  const chartWidth = 920;
  const chartHeight = 320;
  const padding = { top: 12, right: 22, bottom: 34, left: 76 };
  const balances = projection.map((item) => Number(item.balance || 0));
  const rawMin = Math.min(...balances, 0);
  const rawMax = Math.max(...balances, 0);
  const amplitude = Math.max(rawMax - rawMin, 1);
  const paddingValue = amplitude * 0.1;
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
    const yPx = padding.top + (innerHeight / 4) * index;
    const yPercent = (yPx / chartHeight) * 100;
    return { value, y: yPx, yPercent: yPercent };
  });
  elements.chartBars.innerHTML = `
    <div class="projection-chart">
      <div class="projection-chart-axis projection-chart-axis-y">
        ${yTicks
      .map(
        (tick) => `
              <span style="top:${tick.yPercent.toFixed(2)}%">${formatDashboardCurrencyValue(tick.value)}</span>
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
              <circle class="projection-point projection-point-${point.tone}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4.4">
                <title>${point.label} | Saldo projetado ${formatDashboardCurrencyValue(point.balance)}</title>
              </circle>
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

function buildDashboardHistoryGroups(entries) {
  const groups = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const date = normalizeDashboardHistoryDate(entry.data || entry.dataHora || entry.dataNormalizada);
    if (!date) {
      return;
    }

    const key = date.toISOString().slice(0, 10);
    const current = groups.get(key) || {
      date,
      dateKey: key,
      saidas: 0,
      count: 0,
      items: [],
      topCategory: "Sem categoria",
    };

    const value = Number(entry.valor || 0);
    current.saidas += value;
    current.count += 1;
    current.items.push(entry);
    groups.set(key, current);
  });

  return [...groups.values()]
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .map((group) => {
      const categoryTotals = group.items.reduce((accumulator, item) => {
        const category = item.categoria || "Sem categoria";
        accumulator.set(category, (accumulator.get(category) || 0) + Number(item.valor || 0));
        return accumulator;
      }, new Map());
      const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Sem categoria";
      return {
        ...group,
        topCategory,
        items: group.items.slice().sort((left, right) => {
          const leftTime = normalizeDashboardHistoryDate(left.data || left.dataHora)?.getTime?.() || 0;
          const rightTime = normalizeDashboardHistoryDate(right.data || right.dataHora)?.getTime?.() || 0;
          return leftTime - rightTime;
        }),
      };
    });
}

function normalizeDashboardHistoryDate(value) {
  if (!value) {
    return null;
  }

  const date = normalizeDashboardBaseDate?.(value) || new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDashboardHistoryPeriodDescriptor(period, referenceDate = new Date(), customStart, customEnd) {
  const today = normalizeDashboardBaseDate(referenceDate);
  const normalizedPeriod = String(period || "7d");

  if (normalizedPeriod === "today") {
    return { label: "Hoje", startDate: today, endDate: today };
  }

  if (normalizedPeriod === "7d") {
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    return { label: "Ultimos 7 dias", startDate, endDate: today };
  }

  if (normalizedPeriod === "30d") {
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29);
    return { label: "Ultimos 30 dias", startDate, endDate: today };
  }

  if (normalizedPeriod === "month") {
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    return { label: "Mes atual", startDate, endDate: today };
  }

  const normalizedStart = normalizeDashboardHistoryDate(customStart) || new Date(today.getFullYear(), today.getMonth(), 1);
  const normalizedEnd = normalizeDashboardHistoryDate(customEnd) || today;
  return {
    label: "Periodo personalizado",
    startDate: normalizedStart,
    endDate: normalizedEnd,
  };
}

function formatDashboardHistorySummaryLabel(periodSummary, period, visibleGroups) {
  const descriptor = getDashboardHistoryPeriodDescriptor(
    period,
    new Date(),
    dashboardState.historyCustomStart,
    dashboardState.historyCustomEnd
  );

  return `${descriptor.label} | ${periodSummary.quantidadeLancamentos || 0} lancamento(s) | ${formatDashboardCurrencyValue(
    periodSummary.totalGasto || 0
  )} em saidas | ${visibleGroups} grupo(s) visivel(is)`;
}

function renderDashboardHistoryEmptyState(title, body) {
  return `
    <div class="history-empty-state">
      <strong>${title}</strong>
      <span>${body}</span>
    </div>
  `;
}

function renderDashboardHistoryGroups(groups, visibleGroups) {
  return groups.slice(0, visibleGroups).map((group, index) => `
    <details class="history-day-card"${index === 0 ? " open" : ""} data-history-date="${group.dateKey || ""}">
      <summary class="history-day-summary">
        <div class="history-day-summary-main">
          <strong class="history-day-date">${formatDashboardLongDate(group.date)}</strong>
          <span class="history-day-category">Categoria dominante: ${group.topCategory || "Sem categoria"}</span>
        </div>
        <div class="history-day-summary-meta">
          <strong class="history-day-total">${formatDashboardCurrencyValue(group.saidas)}</strong>
          <span class="history-day-count">${group.count} lancamento(s)</span>
        </div>
      </summary>
      <div class="history-day-content">
        <div class="history-day-actions">
          <button type="button" class="history-entry-delete history-day-delete" data-history-action="delete-day" data-history-date="${group.dateKey || ""}" aria-label="Apagar lancamentos do dia ${formatDashboardLongDate(group.date)}">Apagar dia</button>
        </div>
        ${(group.items || []).map((entry) => `
          <div class="history-entry-row" data-history-entry-id="${entry.id || entry.external_id || ""}">
            <div class="history-entry-main">
              <strong>${entry.descricao || "Lancamento"}</strong>
              <span>${entry.categoria || "Sem categoria"} · ${extractDashboardTimeLabel(entry.data) || "--:--"}</span>
            </div>
            <div class="history-entry-value">
              <strong>${formatDashboardCurrencyValue(entry.valor)}</strong>
              <button type="button" class="history-entry-delete" data-history-action="delete-entry" data-history-entry-id="${entry.id || entry.external_id || ""}" aria-label="Apagar lancamento ${entry.descricao || "Lancamento"}">Apagar</button>
            </div>
          </div>
        `).join("")}
      </div>
    </details>
  `).join("");
}

function buildSummaryNote(summary, fallbackText) {
  if (!summary.quantidadeLancamentos) {
    return fallbackText;
  }

  return `${summary.quantidadeLancamentos} lancamento(s) | Categoria lider: ${summary.categoriaDominante}`;
}

function renderExpenseOverview(summary, overview, selectedSummary, intelligence) {
  overviewRenderer.renderExpenseOverview({
    elements,
    summary,
    overview,
    selectedSummary,
    intelligence,
    helpers: overviewHelpers,
  });
}

function renderOverviewSpotlights(summary, selectedSummary, expenseOverview, intelligence) {
  overviewRenderer.renderOverviewSpotlights({
    elements,
    summary,
    selectedSummary,
    expenseOverview,
    intelligence,
    helpers: overviewHelpers,
  });
}

function renderRecentTransactions(selectedSummary) {
  overviewRenderer.renderRecentTransactions({
    elements,
    selectedSummary,
    helpers: overviewHelpers,
  });
}

function renderExpensePeriodFilters() {
  overviewRenderer.renderExpensePeriodFilters({
    elements,
    state: dashboardState,
  });
}





function renderSpendingRhythm(dataset) {
  overviewRenderer.renderSpendingRhythm({
    elements,
    state: dashboardState,
    dataset,
    helpers: overviewHelpers,
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
    .map((item, index) => {
      const width = Math.max((item.total / referenceTotal) * 100, 10);
      const colorMap = ["#f43f5e", "#60a5fa", "#94a3b8"]; // Pink, Blue, Grey
      const bgMap = ["rgba(244,63,94,0.12)", "rgba(96,165,250,0.12)", "rgba(148,163,184,0.12)"];
      const c = colorMap[index] || colorMap[2];
      const bg = bgMap[index] || bgMap[2];

      let iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
      if (item.categoria.toLowerCase() === "compras") {
        iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="21" r="1" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="21" r="1" stroke="currentColor" stroke-width="2"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      } else if (item.categoria.toLowerCase() === "transporte") {
        iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2.5 2.5 0 1 1-5 0m5 0a2.5 2.5 0 1 0-5 0m-8 0a2.5 2.5 0 1 1-5 0m5 0a2.5 2.5 0 1 0-5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      } else if (item.categoria.toLowerCase() === "outros") {
        iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2"/><circle cx="19" cy="12" r="1" stroke="currentColor" stroke-width="2"/></svg>`;
      }

      return `
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
          <div style="width:34px;height:34px;border-radius:10px;background:${bg};color:${c};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${iconHtml}
          </div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;padding-top:2px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;flex-direction:column;gap:2px;">
                <strong style="color:var(--db2-text-primary);font-size:12.5px;font-weight:600;">${item.categoria}</strong>
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end;">
                <strong style="color:var(--db2-text-primary);font-size:12px;font-weight:600;">${formatDashboardCurrencyValue(item.total)}</strong>
                <span style="color:${c};font-size:11px;font-weight:600;">${formatPercent(item.percentual)}%</span>
              </div>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:4px;width:100%;overflow:hidden;">
              <div style="height:100%;border-radius:4px;background:${c};width:${width}%;"></div>
            </div>
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
          body: `O ritmo medio esta em ${formatDashboardCurrencyValue(forecast.averageDailySpend)} por dia. O saldo atual dura cerca de ${formatDayEstimate(forecast.estimatedDaysWithBalance)} e deve ${forecast.projectedBalanceAtPayment >= 0 ? `sobrar ${formatDashboardCurrencyValue(forecast.projectedBalanceAtPayment)}` : `ficar apertado em ${formatDashboardCurrencyValue(Math.abs(forecast.projectedBalanceAtPayment))}`} ate o proximo pagamento.`,
        }
        : {
          label: "Previsao ate o pagamento",
          tone: "red",
          title: "No ritmo atual o saldo nao chega ao proximo pagamento",
          body: `Mantido o ritmo medio de ${formatDashboardCurrencyValue(forecast.averageDailySpend)} por dia, o saldo acaba cerca de ${formatDayEstimate(forecast.daysBeforeBalanceRunsOut)} antes do pagamento e pode faltar ${formatDashboardCurrencyValue(forecast.estimatedDeficit)}.`,
        };

  const categoryInsight = dominantCategory
    ? {
      label: "Categoria dominante",
      tone: dominantCategory.percentual >= 45 ? "yellow" : "blue",
      title: `${dominantCategory.categoria} lidera os gastos do periodo`,
      body: `${formatDashboardCurrencyValue(dominantCategory.total)} representam ${formatPercent(dominantCategory.percentual)}% do total em ${selectedSummary.label.toLowerCase()}.`,
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
          ? `Hoje soma ${formatDashboardCurrencyValue(expenseOverview.today.totalGasto)} e ainda nao existe historico semanal suficiente para comparar.`
          : "Registre alguns dias de gasto para destravar a comparacao com a media diaria recente.",
    };
  } else if (comparison.difference > 0) {
    comparisonInsight = {
      label: "Comparacao com media",
      tone: comparison.difference / comparison.recentAverageDailySpend > 0.35 ? "red" : "yellow",
      title: "Hoje esta acima da media diaria recente",
      body: `${formatDashboardCurrencyValue(expenseOverview.today.totalGasto)} hoje contra media de ${formatDashboardCurrencyValue(comparison.recentAverageDailySpend)}. Excesso atual: ${formatDashboardCurrencyValue(comparison.difference)}.`,
    };
  } else if (comparison.difference < 0) {
    comparisonInsight = {
      label: "Comparacao com media",
      tone: "green",
      title: "Hoje esta abaixo da media diaria recente",
      body: `${formatDashboardCurrencyValue(expenseOverview.today.totalGasto)} hoje contra media de ${formatDashboardCurrencyValue(comparison.recentAverageDailySpend)}. Folga atual: ${formatDashboardCurrencyValue(Math.abs(comparison.difference))}.`,
    };
  } else {
    comparisonInsight = {
      label: "Comparacao com media",
      tone: "blue",
      title: "Hoje esta alinhado com a media diaria recente",
      body: `${formatDashboardCurrencyValue(expenseOverview.today.totalGasto)} hoje, praticamente igual a media recente de ${formatDashboardCurrencyValue(comparison.recentAverageDailySpend)}.`,
    };
  }

  const weeklyTrendInsight = weeklyTrend
    ? {
      label: "Tendencia semanal",
      tone: weeklyTrend.percentual >= 45 ? "yellow" : "blue",
      title: `${weeklyTrend.weekday} concentra a maior parte do gasto semanal`,
      body: `${formatDashboardCurrencyValue(weeklyTrend.total)} sairam nesse dia, o que representa ${formatPercent(weeklyTrend.percentual)}% da semana atual.`,
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
      body: `${automaticSummaries.month?.body || "Adicione gastos para gerar um resumo automatico do mes."}${categoryAutomation?.rules?.length
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

function renderDailySummary(data, periodSummary) {
  if (!elements.dailySummaryList || !elements.dailySummaryChip) {
    return;
  }

  const selectedPeriod = dashboardState.selectedHistoryPeriod || "7d";
  const descriptor = getDashboardHistoryPeriodDescriptor(
    selectedPeriod,
    new Date(),
    dashboardState.historyCustomStart,
    dashboardState.historyCustomEnd
  );
  const visibleGroups = Math.max(1, Number(dashboardState.historyVisibleGroups) || 6);
  const historyEntries = buildDashboardHistoryGroups(getDashboardLedgerExpenseData(data));
  const filteredGroups = historyEntries.filter((group) => {
    const day = normalizeDashboardHistoryDate(group.date);
    if (!day) {
      return false;
    }
    return day >= descriptor.startDate && day <= descriptor.endDate;
  });
  const displayGroups = filteredGroups.slice(0, visibleGroups);
  const canLoadMore = filteredGroups.length > displayGroups.length;

  if (elements.historyPanelSubtitle) {
    elements.historyPanelSubtitle.textContent = `${descriptor.label} - ${periodSummary.quantidadeLancamentos || 0} lancamento(s), ${formatDashboardCurrencyValue(periodSummary.totalGasto || 0)} em saidas.`;
  }

  if (elements.dailySummaryChip) {
    elements.dailySummaryChip.textContent = descriptor.label;
  }

  elements.historyPeriodButtons.forEach((button) => {
    const isActive = button.dataset.historyPeriod === selectedPeriod;
    button.classList.toggle("active", isActive);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (!filteredGroups.length) {
    elements.dailySummaryList.innerHTML = renderDashboardHistoryEmptyState(
      "Sem lançamentos nesse período",
      "Não há despesas reais no intervalo selecionado."
    );
    if (elements.historyLoadMore) {
      elements.historyLoadMore.hidden = true;
    }
    return;
  }

  elements.dailySummaryList.innerHTML = `
    <div class="history-summary-band">
      <div class="history-summary-kpi">
        <span>Período</span>
        <strong>${descriptor.label}</strong>
      </div>
      <div class="history-summary-kpi">
        <span>Dias exibidos</span>
        <strong>${displayGroups.length}</strong>
      </div>
      <div class="history-summary-kpi">
        <span>Lançamentos</span>
        <strong>${periodSummary.quantidadeLancamentos || 0}</strong>
      </div>
      <div class="history-summary-kpi">
        <span>Total gasto</span>
        <strong>${formatDashboardCurrencyValue(periodSummary.totalGasto || 0)}</strong>
      </div>
    </div>
    <div class="history-group-list">
      ${renderDashboardHistoryGroups(displayGroups, displayGroups.length)}
    </div>
    ${canLoadMore ? '<div class="history-load-more-row"><button type="button" class="db2-see-more-btn dashboard-inline-link btn-secondary btn-sm" id="history-load-more">Carregar mais</button></div>' : ""}
  `;

  if (elements.historyLoadMore) {
    elements.historyLoadMore.hidden = !canLoadMore;
  }
}

function getDashboardHistoryDeleteSyncApi() {
  return window.MFinanceiroSupabaseSync || window.FinanceSync || window.FinanceStore || null;
}

function shouldBypassHistoryDeleteConfirmation() {
  return Date.now() <= Number(dashboardState.historyIndividualDeleteConfirmedUntil || 0);
}

function confirmDashboardHistoryDelete(message, { allowBypass = false } = {}) {
  if (allowBypass && shouldBypassHistoryDeleteConfirmation()) {
    return true;
  }

  const confirmed = window.confirm(message);

  if (confirmed && allowBypass) {
    dashboardState.historyIndividualDeleteConfirmedUntil = Date.now() + 15000;
  }

  return confirmed;
}

async function deleteDashboardHistoryEntry(entryId) {
  const targetId = String(entryId || "").trim();
  if (!targetId) {
    return false;
  }

  const syncApi = getDashboardHistoryDeleteSyncApi();
  if (typeof syncApi?.deleteExpense !== "function") {
    throw new Error("Funcao de exclusao nao disponivel.");
  }

  return syncApi.deleteExpense(targetId);
}

async function deleteDashboardHistoryGroup(dateKey) {
  const targetDate = String(dateKey || "").trim();
  if (!targetDate) {
    return false;
  }

  const data = window.FinanceStore?.loadAppData ? window.FinanceStore.loadAppData() : null;
  const entries = getDashboardLedgerExpenseData(data || {}).filter((entry) => {
    const entryDate = normalizeDashboardHistoryDate(entry.data || entry.dataHora);
    return entryDate && entryDate.toISOString().slice(0, 10) === targetDate;
  });

  if (!entries.length) {
    return false;
  }

  for (const entry of entries) {
    const entryId = entry.id || entry.external_id;
    if (entryId) {
      await deleteDashboardHistoryEntry(entryId);
    }
  }

  return true;
}

function renderAlerts(summary, alerts) {
  const healthStatus = buildFinancialHealthStatus(summary);

  // Filter cycle alerts: if health is not green, remove "completed" (tudo certo) entries
  // to avoid contradictory messages (saldo negativo + tudo certo at same time)
  const filteredCycleAlerts =
    healthStatus.color !== "green"
      ? alerts.filter((alert) => !alert.completed)
      : alerts;

  const combinedAlerts = [...healthStatus.alerts, ...filteredCycleAlerts].slice(0, 5);

  elements.alertChip.textContent = combinedAlerts[0]?.completed
    ? "Ciclo concluido"
    : `${combinedAlerts.length} alerta(s)`;
  setChipTone(elements.alertChip, healthStatus.color);
  elements.alertList.innerHTML = combinedAlerts
    .map((alert, index) => {
      const colorMap = ["#facc15", "#f43f5e", "#60a5fa"];
      // Pink for 1, Yellow for 2, etc, prioritizing based on alert tone.
      let numColor = alert.type === "danger" ? "#f43f5e" : (alert.type === "warning" ? "#facc15" : "#34d399");
      let numBg = alert.type === "danger" ? "rgba(244,63,94,0.15)" : (alert.type === "warning" ? "rgba(250,204,21,0.15)" : "rgba(52,211,153,0.15)");

      return `
        <li style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--db2-border);">
          <div style="width:28px;height:28px;border-radius:8px;background:${numBg};color:${numColor};font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${String(index + 1).padStart(2, "0")}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
            <strong style="color:var(--db2-text-primary);font-size:12px;line-height:1.3;font-weight:600;">${alert.title}</strong>
            <small style="color:var(--db2-text-sec);font-size:11px;line-height:1.4;">${alert.description}</small>
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
      value: formatDashboardCurrencyValue(summary.saldoDisponivel),
      statusClass: summary.saldoDisponivel >= 0 ? "status-positive" : "status-danger",
      note: summary.projectedBenefitsInSaldo > 0
        ? `Saldo inicial mais ${formatDashboardCurrencyValue(summary.projectedBenefitsInSaldo)} em beneficios contabilizados no saldo, menos o valor comprometido do ciclo.`
        : "Saldo inicial menos o valor comprometido ja registrado para o usuario autenticado.",
    },
    {
      label: "Saldo restante (alias)",
      value: formatDashboardCurrencyValue(summary.saldoRestante),
      statusClass: summary.saldoRestante >= 0 ? "status-positive" : "status-danger",
      note: "Mantido como alias de saldo disponivel para preservar compatibilidade com o restante do sistema.",
    },
    {
      label: "Proximo pagamento",
      value: formatDashboardCurrencyValue(summary.paymentInfo.value),
      statusClass: summary.paymentInfo.configured ? "status-positive" : "status-warning",
      note:
        summary.paymentInfo.configured && summary.paymentInfo.nextDate
          ? `${summary.paymentInfo.daysRemaining} dia(s) ate ${formatDashboardLongDate(summary.paymentInfo.nextDate)}.`
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
      value: formatDashboardCurrencyValue(summary.totalDespesas),
      statusClass: summary.totalDespesas > 0 ? "status-warning" : "status-positive",
      note: "Soma das despesas salvas no Supabase para o usuario autenticado.",
    },
    {
      label: "Gasto de hoje",
      value: formatDashboardCurrencyValue(expenseOverview.today.totalGasto),
      statusClass: expenseOverview.today.totalGasto > 0 ? "status-warning" : "status-positive",
      note: `${expenseOverview.today.quantidadeLancamentos} lancamento(s) registrados no dia atual.`,
    },
    {
      label: "Resumo de ontem",
      value: formatDashboardCurrencyValue(expenseOverview.yesterday.totalGasto),
      statusClass: expenseOverview.yesterday.totalGasto > 0 ? "status-warning" : "status-positive",
      note: `${expenseOverview.yesterday.quantidadeLancamentos} lancamento(s) do dia anterior.`,
    },
    {
      label: "Semana ate agora",
      value: formatDashboardCurrencyValue(expenseOverview.week.totalGasto),
      statusClass: expenseOverview.week.totalGasto > 0 ? "status-warning" : "status-positive",
      note: `${expenseOverview.week.quantidadeLancamentos} lancamento(s) de segunda-feira ate hoje.`,
    },
    {
      label: "Mes ate agora",
      value: formatDashboardCurrencyValue(expenseOverview.month.totalGasto),
      statusClass: expenseOverview.month.totalGasto > 0 ? "status-warning" : "status-positive",
      note: `${expenseOverview.month.quantidadeLancamentos} lancamento(s) do dia 1 ate hoje.`,
    },
    {
      label: "Contas fixas no ciclo",
      value: formatDashboardCurrencyValue(summary.accounts.total),
      statusClass: summary.accounts.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.accounts.items.length} conta(s) pendente(s) entre o ciclo atual e o proximo pagamento.`,
    },
    {
      label: "Fatura do cartao",
      value: formatDashboardCurrencyValue(summary.cards.total),
      statusClass: summary.cards.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.cards.items.length} cartao(es) afetam o ciclo atual.`,
    },
    {
      label: "Resumo de cartoes",
      value: formatDashboardCurrencyValue(summary.cards.cards.reduce((sum, card) => sum + Number(card.limite || 0), 0)),
      statusClass: summary.cards.total > 0 ? "status-warning" : "status-positive",
      note: `Utilizado ${formatDashboardCurrencyValue(summary.cards.total)} | Disponivel ${formatDashboardCurrencyValue(Math.max(summary.cards.cards.reduce((sum, card) => sum + Number(card.limite || 0), 0) - summary.cards.total, 0))} <button type="button" class="db2-see-more-btn dashboard-inline-link btn-secondary btn-sm" data-dashboard-tab-link="cartoes">Ver detalhes</button>`,
    },
    {
      label: "Parcelamentos no ciclo",
      value: formatDashboardCurrencyValue(summary.installments.total),
      statusClass: summary.installments.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.installments.items.length} parcela(s) entram no valor comprometido do ciclo atual.`,
    },
    {
      label: "Saidas variaveis no ledger",
      value: formatDashboardCurrencyValue(summary.dailyExpenses.total),
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
          .map((item) => `${item.categoria}: ${formatDashboardCurrencyValue(item.total)}`)
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
      value: formatDashboardCurrencyValue(projectedBenefits),
      statusClass: projectedBenefits > 0 ? "status-positive" : "status-warning",
      note: vrVaBenefit
        ? `VR/VA ${vrVaBenefit.status === "recebido" ? "recebido" : "pendente"} com previsao de ${formatDashboardCurrencyValue(vrVaBenefit.value)} em ${formatDashboardLongDate(vrVaBenefit.nextDate)}.${summary.projectedBenefitsInSaldo > 0 ? ` ${formatDashboardCurrencyValue(summary.projectedBenefitsInSaldo)} entram no saldo disponivel.` : ""}`
        : "Registre o VR/VA em Recebimentos quando esse beneficio fizer parte da sua leitura financeira.",
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
  overviewRenderer.bindExpensePeriodFilters({
    elements,
    state: dashboardState,
    onChange: atualizarDashboard,
  });
}

function bindSpendingRhythmPeriodFilters() {
  overviewRenderer.bindSpendingRhythmPeriodFilters({
    elements,
    state: dashboardState,
    onChange: atualizarDashboard,
  });
}

function bindHistoryFilters() {
  const handleHistoryChange = (nextPeriod, customStart, customEnd) => {
    dashboardState.selectedHistoryPeriod = nextPeriod;
    if (typeof customStart === "string") {
      dashboardState.historyCustomStart = customStart;
    }
    if (typeof customEnd === "string") {
      dashboardState.historyCustomEnd = customEnd;
    }
    dashboardState.historyVisibleGroups = 6;
    atualizarDashboard();
  };

  document.addEventListener("click", (event) => {
    const periodTrigger = event.target.closest("[data-history-period]");
    if (periodTrigger) {
      const nextPeriod = periodTrigger.dataset.historyPeriod || "7d";
      handleHistoryChange(nextPeriod, elements.historyCustomStart?.value || "", elements.historyCustomEnd?.value || "");
      return;
    }

    const loadMoreTrigger = event.target.closest("#history-load-more");
    if (loadMoreTrigger) {
      dashboardState.historyVisibleGroups += 4;
      atualizarDashboard();
      return;
    }

    const applyTrigger = event.target.closest("#history-custom-apply");
    if (applyTrigger) {
      handleHistoryChange(
        "custom",
        elements.historyCustomStart?.value || "",
        elements.historyCustomEnd?.value || ""
      );
      return;
    }

    const deleteAction = event.target.closest("[data-history-action]");
    if (!deleteAction) {
      return;
    }

    const action = deleteAction.dataset.historyAction;

    if (action === "delete-day") {
      const dateKey = deleteAction.dataset.historyDate || "";
      if (!dateKey) {
        return;
      }

      const confirmed = confirmDashboardHistoryDelete(
        "Apagar todos os lancamentos deste dia?",
        { allowBypass: false }
      );

      if (!confirmed) {
        return;
      }

      deleteDashboardHistoryGroup(dateKey)
        .then((deleted) => {
          if (deleted) {
            atualizarDashboard();
          }
        })
        .catch((error) => {
          console.error("[Dashboard History] Falha ao apagar grupo diario.", error);
        });
      return;
    }

    if (action === "delete-entry") {
      const entryId = deleteAction.dataset.historyEntryId || "";
      if (!entryId) {
        return;
      }

      const confirmed = confirmDashboardHistoryDelete(
        "Apagar este lancamento?",
        { allowBypass: true }
      );

      if (!confirmed) {
        return;
      }

      deleteDashboardHistoryEntry(entryId)
        .then((deleted) => {
          if (deleted) {
            atualizarDashboard();
          }
        })
        .catch((error) => {
          console.error("[Dashboard History] Falha ao apagar lancamento.", error);
        });
    }
  });

  if (elements.historyCustomStart) {
    elements.historyCustomStart.addEventListener("change", () => {
      dashboardState.historyCustomStart = elements.historyCustomStart.value;
    });
  }

  if (elements.historyCustomEnd) {
    elements.historyCustomEnd.addEventListener("change", () => {
      dashboardState.historyCustomEnd = elements.historyCustomEnd.value;
    });
  }
}

function bindDashboardTabs() {
  if (dashboardTabsBound) {
    console.log("[Dashboard Tabs] bindDashboardTabs ignorado: jÃ¡ vinculado");
    return;
  }

  console.log("[Dashboard Tabs] bindDashboardTabs executado", {
    buttons: elements.dashboardTabButtons.map((button) => button.dataset.dashboardTabLink || ""),
  });

  document.addEventListener("click", (event) => {
    const tabTrigger = event.target.closest("[data-dashboard-tab-link]");

    if (!tabTrigger) {
      return;
    }

    const nextTab = tabTrigger.dataset.dashboardTabLink || "overview";
    console.log("[Dashboard Tabs] clique detectado:", nextTab);
    console.log("[Dashboard Tabs] chamando switchDashboardTab");
    switchDashboardTab(nextTab);
  });

  dashboardTabsBound = true;
}

function logDashboardIntegrationDebug(data, summary, expenseOverview, selectedSummary, intelligence) {
  if (window.__MFINANCEIRO_DEBUG_INTEGRATION__ !== true) {
    return;
  }

  const rawLedger = Array.isArray(data?.ledgerMovimentacoes) ? data.ledgerMovimentacoes : [];
  const normalizedLedger = getDashboardLedgerMovementData(data);
  const normalizedExpenses = getDashboardLedgerExpenseData(data);
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

  if (window.__MFINANCEIRO_DEBUG_INTEGRATION__ === true) {
    console.groupCollapsed("[Dashboard] hydrateDashboardData");
    console.log("loaders", {
      banking: bankingData ? Object.keys(bankingData).length : 0,
      contasDiaADia: Array.isArray(variableAccounts) ? variableAccounts.length : 0,
      ledgerMovimentacoes: Array.isArray(ledgerMovements) ? ledgerMovements.length : 0,
      recebimentoPagamento: paymentReceipt ? Object.keys(paymentReceipt).length : 0,
      recebimentoVrVa: vrvaReceipt ? Object.keys(vrvaReceipt).length : 0,
    });
    console.log("hydratedData", {
      keys: Object.keys(data || {}),
      hasBanking: Boolean(data?.banking),
      hasRecebimentos: Boolean(data?.recebimentos),
      ledgerMovimentacoes: Array.isArray(data?.ledgerMovimentacoes)
        ? data.ledgerMovimentacoes.length
        : 0,
      contasDiaADia: Array.isArray(data?.contasDiaADia) ? data.contasDiaADia.length : 0,
      banking: data?.banking || null,
      recebimentos: data?.recebimentos || null,
    });
    console.groupEnd();
  }

  return data;
}

function atualizarDashboard() {
  const data = hydrateDashboardData();
  const summary = calculateDashboardFinancialSummary(data);
  const expenseOverview = getDashboardExpenseOverviewData(data);
  const selectedSummary = getDashboardExpensePeriodData(
    data,
    dashboardState.selectedExpensePeriod
  );
  const intelligence = computeDashboardFinancialInsights(
    data,
    dashboardState.selectedExpensePeriod
  );
  const spendingRhythm = buildDashboardSpendingRhythmDataset(
    data,
    dashboardState.selectedSpendingRhythmPeriod
  );
  const dailySeries = buildDashboardDailySeries(data);
  const projection = buildDashboardBalanceSeries(data);
  const alerts = buildDashboardAlerts(data);

  logDashboardIntegrationDebug(data, summary, expenseOverview, selectedSummary, intelligence);

  renderMetrics(summary, expenseOverview);
  renderExpensePeriodFilters();
  renderExpenseOverview(summary, expenseOverview, selectedSummary, intelligence);
  renderOverviewSpotlights(summary, selectedSummary, expenseOverview, intelligence);
  renderSpendingRhythm(spendingRhythm);
  renderInsights(summary, selectedSummary, expenseOverview, intelligence);
  renderExpenseEvolution(selectedSummary);
  renderExpenseCategories(selectedSummary);
  renderRecentTransactions(selectedSummary);

  // Update the subtitle of "Ultimos lancamentos" to reflect the selected period
  if (elements.recentTransactionsSubtitle) {
    elements.recentTransactionsSubtitle.textContent = selectedSummary.label || "Periodo atual";
  }
  atualizarGraficoDashboard(summary, projection, dailySeries);
  renderDailySummary(data, selectedSummary);
  renderAlerts(summary, alerts);
  renderSummaryTable(data, summary, alerts, expenseOverview, intelligence);
}

window.atualizarDashboard = atualizarDashboard;

function assignDashboardModules() {
  const financeStore = window.FinanceStore;
  const financeCalculations = window.FinanceCalculations;

  ({
    carregarCadastroBancario: loadDashboardBanking,
    carregarContasVariaveis: loadDashboardVariableAccounts,
    carregarLedgerMovimentacoes: loadDashboardLedger,
    carregarRegistroPagamento: loadDashboardPayment,
    carregarVRVA: loadDashboardVrVa,
    loadAppData: loadDashboardData,
  } = financeStore);

  ({
    buildSpendingRhythmDataset: buildDashboardSpendingRhythmDataset,
    calcularPrioridadesDoCiclo: calculateCyclePriorities,
    calculateFinancialIntelligence: computeDashboardFinancialInsights,
    calculateDashboardSummary: calculateDashboardFinancialSummary,
    formatCurrency: formatDashboardCurrencyValue,
    formatDateLong: formatDashboardLongDate,
    getExpenseOverviewSummary: getDashboardExpenseOverviewData,
    getExpensePeriodSummary: getDashboardExpensePeriodData,
    getLedgerExpenseEntries: getDashboardLedgerExpenseData,
    getLedgerMovements: getDashboardLedgerMovementData,
    montarProjecaoSaldoPorDia: buildDashboardBalanceSeries,
    montarSerieGraficoContasVariaveis: buildDashboardDailySeries,
    normalizeDate: normalizeDashboardBaseDate,
  } = financeCalculations);

  overviewRenderer = window.DashboardOverview;
}

function validateDashboardDependencies() {
  const dependencies = [
    ["FinanceStore", window.FinanceStore, [
      "loadAppData",
      "carregarCadastroBancario",
      "carregarContasVariaveis",
      "carregarLedgerMovimentacoes",
      "carregarRegistroPagamento",
      "carregarVRVA",
    ]],
    ["FinanceCalculations", window.FinanceCalculations, [
      "calculateDashboardSummary",
      "buildSpendingRhythmDataset",
      "calculateFinancialIntelligence",
      "getExpenseOverviewSummary",
      "getExpensePeriodSummary",
      "formatCurrency",
      "formatDateLong",
      "montarProjecaoSaldoPorDia",
      "montarSerieGraficoContasVariaveis",
      "normalizeDate",
    ]],
    ["AppShell", window.AppShell, ["initAppShell"]],
    ["DashboardOverview", window.DashboardOverview, [
      "renderMetrics",
      "renderExpenseOverview",
      "renderOverviewSpotlights",
      "renderRecentTransactions",
      "renderExpensePeriodFilters",
      "renderSpendingRhythm",
      "bindExpensePeriodFilters",
      "bindSpendingRhythmPeriodFilters",
    ]],
  ];

  const missingDependencies = [];

  dependencies.forEach(([name, value, requiredMethods]) => {
    if (!value) {
      missingDependencies.push(name);
      return;
    }

    requiredMethods.forEach((methodName) => {
      if (typeof value[methodName] !== "function") {
        missingDependencies.push(`${name}.${methodName}`);
      }
    });
  });

  if (!missingDependencies.length) {
    return true;
  }

  console.error("[Dashboard] Dependencias ausentes na inicializacao:", missingDependencies);
  return false;
}

function bindDashboardRefreshEvents() {
  window.addEventListener("finance-data-updated", atualizarDashboard);
  window.addEventListener("storage", atualizarDashboard);
  window.addEventListener("pageshow", atualizarDashboard);
  window.addEventListener("focus", atualizarDashboard);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      atualizarDashboard();
    }
  });
}

function initDashboardApp() {
  console.log("[Dashboard Init] initDashboardApp iniciou");

  if (dashboardAppInitialized) {
    console.log("[Dashboard Init] initDashboardApp ignorado: jÃ¡ inicializado");
    return;
  }

  const dependenciesAreValid = validateDashboardDependencies();
  console.log("[Dashboard Init] validateDashboardDependencies:", dependenciesAreValid);

  if (!dependenciesAreValid) {
    return;
  }

  assignDashboardModules();
  console.log("[Dashboard Init] assignDashboardModules executado");
  window.AppShell.initAppShell();
  bindExpensePeriodFilters();
  bindSpendingRhythmPeriodFilters();
  bindHistoryFilters();
  bindDashboardTabs();
  console.log("[Dashboard Init] bindDashboardTabs executado");
  bindDashboardRefreshEvents();
  switchDashboardTab("overview");
  console.log("[Dashboard Init] switchDashboardTab('overview') executado");
  showDashboardFeedback(window.AppShell.consumeDashboardNotice());
  dashboardAppInitialized = true;
  atualizarDashboard();
}

window.initDashboardApp = initDashboardApp;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboardApp, { once: true });
} else {
  initDashboardApp();
}

