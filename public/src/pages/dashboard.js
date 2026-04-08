const {
  carregarCadastroBancario: loadDashboardBanking,
  carregarContasVariaveis: loadDashboardVariableAccounts,
  carregarRegistroPagamento: loadDashboardPayment,
  carregarVRVA: loadDashboardVrVa,
  loadAppData: loadDashboardData,
} = window.FinanceStore;
const {
  calcularPrioridadesDoCiclo: calculateCyclePriorities,
  calculateDashboardSummary,
  formatCurrency: formatDashboardCurrency,
  formatDateLong: formatDashboardDateLong,
  getExpenseOverviewSummary,
  getExpensePeriodSummary,
  montarProjecaoSaldoPorDia: buildDashboardBalanceSeries,
  montarSerieGraficoContasVariaveis: buildDashboardDailySeries,
} = window.FinanceCalculations;

const dashboardState = {
  selectedExpensePeriod: "week",
};

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
  expensePeriodChip: document.getElementById("expense-period-chip"),
  expenseTotalDay: document.getElementById("expense-total-day"),
  expenseTotalDayNote: document.getElementById("expense-total-day-note"),
  expenseTotalYesterday: document.getElementById("expense-total-yesterday"),
  expenseTotalYesterdayNote: document.getElementById("expense-total-yesterday-note"),
  expenseTotalWeek: document.getElementById("expense-total-week"),
  expenseTotalWeekNote: document.getElementById("expense-total-week-note"),
  expenseTotalMonth: document.getElementById("expense-total-month"),
  expenseTotalMonthNote: document.getElementById("expense-total-month-note"),
  expensePeriodTotal: document.getElementById("expense-period-total"),
  expensePeriodCount: document.getElementById("expense-period-count"),
  expensePeriodTopCategory: document.getElementById("expense-period-top-category"),
  expenseEvolutionBars: document.getElementById("expense-evolution-bars"),
  expenseEvolutionChip: document.getElementById("expense-evolution-chip"),
  expenseEvolutionCaption: document.getElementById("expense-evolution-caption"),
  expenseCategoryList: document.getElementById("expense-category-list"),
  expenseCategoryChip: document.getElementById("expense-category-chip"),
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

function setChipTone(element, tone) {
  if (!element) {
    return;
  }

  element.classList.remove(
    "status-chip-green",
    "status-chip-yellow",
    "status-chip-red",
    "status-chip-muted"
  );

  if (tone) {
    element.classList.add(`status-chip-${tone}`);
  }
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

function renderMetrics(summary) {
  const projectedBenefits = getProjectedBenefitsTotal(summary);
  const healthStatus = buildFinancialHealthStatus(summary);

  elements.cardSaldoAtual.textContent = formatDashboardCurrency(summary.saldoDisponivel);
  elements.cardSaldoAtualSubtitle.textContent =
    summary.saldoInicial > 0 || summary.totalDespesas > 0
      ? `${formatDashboardCurrency(summary.valorComprometido)} ja estao comprometidos.${summary.projectedBenefitsInSaldo > 0 ? ` ${formatDashboardCurrency(summary.projectedBenefitsInSaldo)} em beneficios previstos entram no saldo do ciclo.` : ""} Saldo restante segue como alias deste saldo disponivel.`
      : "Informe seu saldo inicial para comecar o calculo real.";
  setTrendTone(
    elements.cardSaldoAtualTrend,
    summary.saldoDisponivel >= 0 ? "trend-up" : "trend-down",
    summary.saldoDisponivel >= 0 ? "Saldo disponivel real" : "Saldo disponivel negativo"
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
      ? `${formatDashboardCurrency(summary.saldoDisponivel)} divididos por ${summary.diasRestantes} dia(s) restantes ate o proximo pagamento.`
      : "Sem dias restantes validos para dividir o saldo disponivel.";
  setTrendTone(
    elements.cardLimiteDiarioTrend,
    summary.limiteDiario > 0 ? "trend-up" : "trend-warn",
    summary.limiteDiario > 0 ? "Calculo ativo" : "Sem calculo"
  );

  elements.cardValorComprometido.textContent = formatDashboardCurrency(summary.valorComprometido);
  elements.cardValorComprometidoSubtitle.textContent =
    summary.valorComprometido > 0
      ? `${formatDashboardCurrency(summary.committedBreakdown.despesasRegistradas)} em despesas registradas, ${formatDashboardCurrency(summary.committedBreakdown.contasFixas)} em contas fixas, ${formatDashboardCurrency(summary.committedBreakdown.faturasCartao)} em faturas do ciclo e ${formatDashboardCurrency(summary.committedBreakdown.parcelamentos)} na parcela vigente ja comprometem o saldo.`
      : "As despesas registradas passarao a formar o valor comprometido do ciclo.";
  setTrendTone(
    elements.cardValorComprometidoTrend,
    summary.valorComprometido > 0 ? "trend-down" : "trend-up",
    summary.valorComprometido > 0 ? "Reservado" : "Sem compromissos"
  );

  elements.miniStatDias.textContent = `${summary.diasRestantes} dia(s)`;
  elements.miniStatVr.textContent = formatDashboardCurrency(projectedBenefits);
  elements.miniStatInvestimento.textContent = formatDashboardCurrency(summary.investimento.suggestedValue);
  elements.cycleStatusChip.textContent = healthStatus.shortLabel;
  elements.projectionChip.textContent = healthStatus.projectionLabel;
  setChipTone(elements.cycleStatusChip, healthStatus.color);
  setChipTone(elements.projectionChip, healthStatus.color);

  if (elements.feedback) {
    elements.feedback.textContent = healthStatus.message;
    elements.feedback.className = `message-box ${healthStatus.type}`;
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

function renderExpenseOverview(overview, selectedSummary) {
  elements.expenseTotalDay.textContent = formatDashboardCurrency(overview.today.totalGasto);
  elements.expenseTotalDayNote.textContent = buildSummaryNote(
    overview.today,
    "Sem gastos hoje."
  );
  elements.expenseTotalYesterday.textContent = formatDashboardCurrency(
    overview.yesterday.totalGasto
  );
  elements.expenseTotalYesterdayNote.textContent = buildSummaryNote(
    overview.yesterday,
    "Sem gastos ontem."
  );
  elements.expenseTotalWeek.textContent = formatDashboardCurrency(overview.week.totalGasto);
  elements.expenseTotalWeekNote.textContent = buildSummaryNote(
    overview.week,
    "Sem gastos nesta semana."
  );
  elements.expenseTotalMonth.textContent = formatDashboardCurrency(overview.month.totalGasto);
  elements.expenseTotalMonthNote.textContent = buildSummaryNote(
    overview.month,
    "Sem gastos neste mes."
  );
  elements.expensePeriodChip.textContent = `${selectedSummary.label} em foco`;
  elements.expensePeriodTotal.textContent = formatDashboardCurrency(selectedSummary.totalGasto);
  elements.expensePeriodCount.textContent = `${selectedSummary.quantidadeLancamentos} lancamento(s)`;
  elements.expensePeriodTopCategory.textContent = selectedSummary.categoriaDominante;
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
    .slice(0, 6)
    .map((item) => {
      const width = Math.max((item.total / referenceTotal) * 100, 10);

      return `
        <div class="category-bar-row">
          <div class="category-bar-meta">
            <strong>${item.categoria}</strong>
            <span>${formatDashboardCurrency(item.total)}</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    })
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
      (group) => `
        <details class="day-accordion">
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
  const combinedAlerts = [...healthStatus.alerts, ...alerts];

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

function renderSummaryTable(data, summary, alerts, expenseOverview) {
  const healthStatus = buildFinancialHealthStatus(summary);
  const projectedBenefits = getProjectedBenefitsTotal(summary);
  const vrVaBenefit = summary.benefits.active.find((benefit) => benefit.key === "vrVa");
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
      label: "Gastos do dia a dia",
      value: formatDashboardCurrency(summary.dailyExpenses.total),
      statusClass: summary.dailyExpenses.total > 0 ? "status-warning" : "status-positive",
      note: `${summary.dailyExpenses.items.length} lancamento(s) ja registrados afetam a leitura de consumo e a projecao do saldo.`,
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

function hydrateDashboardData() {
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

  return data;
}

function atualizarDashboard() {
  const data = hydrateDashboardData();
  const summary = calculateDashboardSummary(data);
  const expenseOverview = getExpenseOverviewSummary(data);
  const selectedSummary = getExpensePeriodSummary(
    data,
    dashboardState.selectedExpensePeriod
  );
  const dailySeries = buildDashboardDailySeries(data);
  const projection = buildDashboardBalanceSeries(data);
  const alerts = buildDashboardAlerts(data);

  renderMetrics(summary);
  renderExpensePeriodFilters();
  renderExpenseOverview(expenseOverview, selectedSummary);
  renderExpenseEvolution(selectedSummary);
  renderExpenseCategories(selectedSummary);
  atualizarGraficoDashboard(summary, projection, dailySeries);
  renderDailySummary(selectedSummary);
  renderAlerts(summary, alerts);
  renderSummaryTable(data, summary, alerts, expenseOverview);
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
showDashboardFeedback(window.AppShell.consumeDashboardNotice());
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", atualizarDashboard);
} else {
  atualizarDashboard();
}
