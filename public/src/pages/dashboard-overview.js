console.log("[Dashboard Scripts] carregado: /src/pages/dashboard-overview.js");

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

function buildSummaryNote(summary, fallbackText) {
  if (!summary.quantidadeLancamentos) {
    return fallbackText;
  }

  return `${summary.quantidadeLancamentos} lancamento(s) | Categoria lider: ${summary.categoriaDominante}`;
}

function extractDashboardTimeLabel(value) {
  if (typeof value !== "string") {
    return "";
  }

  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function renderExpensePeriodFilters({ elements, state }) {
  elements.expensePeriodButtons.forEach((button) => {
    const isActive = button.dataset.expensePeriod === state.selectedExpensePeriod;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderSpendingRhythmPeriodButtons({ elements, state }) {
  elements.spendingRhythmPeriodButtons.forEach((button) => {
    const isActive =
      button.dataset.spendingRhythmPeriod === state.selectedSpendingRhythmPeriod;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function formatRhythmValueLabel(value, formatCurrency) {
  if (value >= 1000) {
    return formatCurrency(value)
      .replace("R$", "")
      .trim();
  }

  return formatCurrency(value);
}

function renderMetrics({
  elements,
  summary,
  expenseOverview,
  helpers,
}) {
  const projectedBenefits = getProjectedBenefitsTotal(summary);
  const healthStatus = helpers.buildFinancialHealthStatus(summary);
  const todayExpenseTotal = expenseOverview.today.totalGasto;
  const todayExpenseCount = expenseOverview.today.quantidadeLancamentos;
  const dailyLimitStatus = helpers.getDailyLimitStatus(summary, expenseOverview);

  elements.cardSaldoAtual.textContent = helpers.formatCurrency(summary.saldoDisponivel);
  elements.cardSaldoAtualSubtitle.textContent =
    summary.saldoInicial > 0 || summary.totalDespesas > 0
      ? summary.projectedBenefitsInSaldo > 0
        ? `${helpers.formatCurrency(summary.projectedBenefitsInSaldo)} em beneficios entram no ciclo.`
        : "Saldo livre para atravessar o ciclo atual."
      : "Informe seu saldo inicial para comecar o calculo real.";
  helpers.setMetricFooter(
    elements.cardSaldoAtualTrend,
    summary.saldoDisponivel >= 0 ? "trend-up" : "trend-down",
    summary.saldoDisponivel >= 0 ? "Seguro" : "Risco",
    summary.saldoDisponivel >= 0 ? "Saldo positivo" : "Saldo comprometido"
  );

  if (summary.paymentInfo.configured && summary.paymentInfo.nextDate) {
    elements.cardDiasRestantes.textContent = `${summary.paymentInfo.daysRemaining} dia(s)`;
    elements.cardDiasRestantesSubtitle.textContent = `Proximo pagamento em ${helpers.formatDateLong(summary.paymentInfo.nextDate)}.`;
    helpers.setMetricFooter(
      elements.cardDiasRestantesTrend,
      summary.paymentInfo.daysRemaining === 0 ? "trend-warn" : "trend-up",
      `ate ${summary.paymentInfo.nextDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
      helpers.getWeekdayLabel(summary.paymentInfo.nextDate)
    );
    elements.nextPaymentChip.textContent = "Proximo pagamento";
    elements.committedChip.textContent = helpers.formatDateLong(summary.paymentInfo.nextDate);
  } else {
    elements.cardDiasRestantes.textContent = "0 dia(s)";
    elements.cardDiasRestantesSubtitle.textContent = "Configure salario e dias de pagamento.";
    helpers.setMetricFooter(
      elements.cardDiasRestantesTrend,
      "trend-warn",
      "sem data",
      "Pagamento pendente"
    );
    elements.nextPaymentChip.textContent = "Pagamento pendente";
    elements.committedChip.textContent = "Sem data definida";
  }

  elements.cardLimiteDiario.textContent = helpers.formatCurrency(summary.limiteDiario);
  elements.cardLimiteDiarioSubtitle.textContent =
    summary.diasRestantes > 0
      ? `${helpers.formatCurrency(summary.saldoDisponivel)} divididos por ${summary.diasRestantes} dia(s) restantes ate o proximo pagamento. ${dailyLimitStatus.detail}`
      : "Sem dias restantes validos para dividir o saldo disponivel.";
  helpers.setMetricFooter(
    elements.cardLimiteDiarioTrend,
    summary.limiteDiario > 0 ? dailyLimitStatus.trendClass : "trend-warn",
    summary.limiteDiario > 0 ? "Por dia" : "Sem base",
    summary.limiteDiario > 0 ? "Ate o proximo pagamento" : "Configure o ciclo"
  );
  helpers.setDailyLimitHighlight(dailyLimitStatus.color);
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

  elements.cardGastoDia.textContent = helpers.formatCurrency(todayExpenseTotal);
  elements.cardGastoDiaSubtitle.textContent =
    todayExpenseCount > 0
      ? `${todayExpenseCount} lancamento(s) registrado(s) hoje. ${dailyLimitStatus.detail}`
      : summary.limiteDiario > 0
        ? dailyLimitStatus.detail
        : "Nenhum gasto registrado na data atual.";
  helpers.setMetricFooter(
    elements.cardGastoDiaTrend,
    summary.limiteDiario > 0
      ? dailyLimitStatus.trendClass
      : todayExpenseTotal > 0
        ? "trend-warn"
        : "trend-up",
    todayExpenseTotal > 0 ? "Consumo" : "Sem gastos",
    summary.limiteDiario > 0
      ? todayExpenseTotal > 0
        ? dailyLimitStatus.message
        : "Voce está no controle"
      : todayExpenseTotal > 0
        ? "Consumo em andamento"
        : "Voce está no controle"
  );
  helpers.setDashboardCardSignal(elements.cardGastoDiaPanel, dailyLimitStatus.color);

  helpers.setChipTone(elements.nextPaymentChip, summary.paymentInfo.configured ? "blue" : "yellow");
  helpers.setChipTone(elements.committedChip, "muted");

  elements.miniStatDias.textContent = `${summary.diasRestantes} dia(s)`;
  elements.miniStatVr.textContent = helpers.formatCurrency(projectedBenefits);
  elements.miniStatInvestimento.textContent = helpers.formatCurrency(
    summary.investimento.suggestedValue
  );
  elements.cycleStatusChip.textContent =
    summary.limiteDiario > 0 ? dailyLimitStatus.message : healthStatus.shortLabel;
  elements.projectionChip.textContent = healthStatus.projectionLabel;
  helpers.setChipTone(
    elements.cycleStatusChip,
    summary.limiteDiario > 0 ? dailyLimitStatus.color : healthStatus.color
  );
  helpers.setChipTone(elements.projectionChip, healthStatus.color);

  if (elements.feedback) {
    elements.feedback.textContent =
      summary.limiteDiario > 0
        ? `${dailyLimitStatus.message}. ${dailyLimitStatus.detail}`
        : healthStatus.message;
    elements.feedback.className = "message-box";
    helpers.setMessageBoxTone(
      elements.feedback,
      summary.limiteDiario > 0 ? dailyLimitStatus.color : healthStatus.color
    );
  }
}

function renderExpenseOverview({
  elements,
  summary,
  overview,
  selectedSummary,
  intelligence,
  helpers,
}) {
  const averageDailySpend = Number(intelligence?.forecast?.averageDailySpend || 0);
  const dominantCategory = intelligence?.dominantCategory || null;
  const budgetBase = Math.max(
    Number(summary?.saldoInicial || 0) + Number(summary?.projectedBenefitsInSaldo || 0),
    Number(selectedSummary.totalGasto || 0),
    1
  );
  const committedBase = Math.max(Number(selectedSummary.totalGasto || 0), 0);
  const budgetProgress = Math.min((committedBase / budgetBase) * 100 || 0, 100);

  if (elements.expenseTotalDay) {
    elements.expenseTotalDay.textContent = helpers.formatCurrency(overview.today.totalGasto);
  }
  if (elements.expenseTotalDayNote) {
    elements.expenseTotalDayNote.textContent =
      intelligence?.automaticSummaries?.day?.body ||
      buildSummaryNote(overview.today, "Sem gastos hoje.");
  }
  if (elements.detailsExpenseTotalDay) {
    elements.detailsExpenseTotalDay.textContent = helpers.formatCurrency(
      overview.today.totalGasto
    );
  }
  if (elements.detailsExpenseTotalDayNote) {
    elements.detailsExpenseTotalDayNote.textContent = buildSummaryNote(
      overview.today,
      "Sem gastos hoje."
    );
  }
  if (elements.expenseTotalYesterday) {
    elements.expenseTotalYesterday.textContent = helpers.formatCurrency(
      overview.yesterday.totalGasto
    );
  }
  if (elements.expenseTotalYesterdayNote) {
    elements.expenseTotalYesterdayNote.textContent = buildSummaryNote(
      overview.yesterday,
      "Sem gastos ontem."
    );
  }
  if (elements.expenseTotalWeek) {
    elements.expenseTotalWeek.textContent = helpers.formatCurrency(overview.week.totalGasto);
  }
  if (elements.expenseTotalWeekNote) {
    elements.expenseTotalWeekNote.textContent =
      intelligence?.automaticSummaries?.week?.body ||
      buildSummaryNote(overview.week, "Sem gastos nesta semana.");
  }
  if (elements.detailsExpenseTotalWeek) {
    elements.detailsExpenseTotalWeek.textContent = helpers.formatCurrency(
      overview.week.totalGasto
    );
  }
  if (elements.detailsExpenseTotalWeekNote) {
    elements.detailsExpenseTotalWeekNote.textContent = buildSummaryNote(
      overview.week,
      "Sem gastos nesta semana."
    );
  }
  if (elements.expenseTotalMonth) {
    elements.expenseTotalMonth.textContent = helpers.formatCurrency(overview.month.totalGasto);
  }
  if (elements.expenseTotalMonthNote) {
    elements.expenseTotalMonthNote.textContent =
      intelligence?.automaticSummaries?.month?.body ||
      buildSummaryNote(overview.month, "Sem gastos neste mes.");
  }
  if (elements.detailsExpenseTotalMonth) {
    elements.detailsExpenseTotalMonth.textContent = helpers.formatCurrency(
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
  elements.expensePeriodTotal.textContent = helpers.formatCurrency(selectedSummary.totalGasto);
  elements.expensePeriodCount.textContent = `${selectedSummary.quantidadeLancamentos} lancamento(s)`;
  elements.expensePeriodTopCategory.textContent = intelligence?.dominantCategory
    ? `${intelligence.dominantCategory.categoria} (${helpers.formatPercent(intelligence.dominantCategory.percentual)}%)`
    : selectedSummary.categoriaDominante;

  if (elements.overviewAverageDaily) {
    elements.overviewAverageDaily.textContent = helpers.formatCurrency(averageDailySpend);
  }
  if (elements.overviewAverageNote) {
    elements.overviewAverageNote.textContent =
      averageDailySpend > 0
        ? `Ritmo medio em ${selectedSummary.label.toLowerCase()}.`
        : "Sem base recente";
  }
  if (elements.overviewTopCategoryNote) {
    elements.overviewTopCategoryNote.textContent = dominantCategory
      ? `${helpers.formatCurrency(dominantCategory.total)} no periodo atual.`
      : "Aguardando gastos";
  }
  if (elements.overviewBudgetProgressLabel) {
    elements.overviewBudgetProgressLabel.textContent = `${Math.round(budgetProgress)}%`;
  }
  if (elements.overviewBudgetProgressFill) {
    elements.overviewBudgetProgressFill.style.width = `${budgetProgress}%`;
  }
}

function renderOverviewSpotlights({
  elements,
  summary,
  selectedSummary,
  expenseOverview,
  intelligence,
  helpers,
}) {
  const healthStatus = helpers.buildFinancialHealthStatus(summary);
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

  helpers.setSurfaceTone(elements.overviewCycleAlertCard, overviewTone);
  helpers.setSurfaceTone(elements.overviewDailyInsightCard, insightTone);
  helpers.setChipTone(elements.cycleStatusChip, overviewTone);
  helpers.setChipTone(elements.overviewInsightChip, insightTone);

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
      `Hoje soma ${helpers.formatCurrency(expenseOverview.today.totalGasto)} em ${selectedSummary.label.toLowerCase()}.`;
  }
  if (elements.overviewQuickTipTitle) {
    elements.overviewQuickTipTitle.textContent =
      primaryInsight?.label || "O proximo melhor passo aparece aqui";
  }
  if (elements.overviewQuickTipBody) {
    elements.overviewQuickTipBody.textContent =
      primaryInsight?.body ||
      `Mantenha o foco no limite diario de ${helpers.formatCurrency(summary.limiteDiario)} e no gasto de hoje.`;
  }
}

function renderRecentTransactions({
  elements,
  selectedSummary,
  helpers,
}) {
  if (!elements.recentTransactionsList) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentItems = (selectedSummary.groups || [])
    .flatMap((group) => group.items || [])
    .slice()
    .sort((left, right) => {
      const leftTime = (left.dataHora || left.dataNormalizada)?.getTime?.() || 0;
      const rightTime = (right.dataHora || right.dataNormalizada)?.getTime?.() || 0;
      return rightTime - leftTime;
    })
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
    .map((entry) => {
      const entryDate = entry.dataNormalizada || entry.dataHora;
      const isToday = entryDate && entryDate.getTime() === today.getTime();
      const timeLabel = extractDashboardTimeLabel(entry.data || entry.dataHora);
      const sideDateLabel = isToday && timeLabel ? "Hoje" : helpers.formatDateLong(entryDate);

      let iconHtml = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
      let bgTint = "rgba(96,165,250,0.12)";
      let color = "#69acffff";

      if (entry.categoria?.toLowerCase() === "compras") {
        bgTint = "rgba(167,139,250,0.12)";
        color = "#a78bfa";
        iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="21" r="1" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="21" r="1" stroke="currentColor" stroke-width="2"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      } else if (entry.categoria?.toLowerCase() === "transporte") {
        iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2.5 2.5 0 1 1-5 0m5 0a2.5 2.5 0 1 0-5 0m-8 0a2.5 2.5 0 1 1-5 0m5 0a2.5 2.5 0 1 0-5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      }

      return `
        <article class="recent-transaction-item" style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;padding:12px 0;align-items:center;">
          <div style="width:34px;height:34px;border-radius:10px;background:${bgTint};color:${color};display:flex;align-items:center;justify-content:center;">
            ${iconHtml}
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <strong style="color:var(--db2-text-primary);font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry.descricao || "Lancamento"}</strong>
            <span style="color:var(--db2-text-sec);font-size:11px;">${entry.categoria || "Sem categoria"}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;">
            <strong style="color:var(--db2-text-primary);font-size:12.5px;font-weight:700;">${helpers.formatCurrency(entry.valor)}</strong>
            <span style="color:var(--db2-text-sec);font-size:11px;">${sideDateLabel}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSpendingRhythm({
  elements,
  state,
  dataset,
  helpers,
}) {
  if (!elements.spendingRhythmChart) {
    return;
  }

  renderSpendingRhythmPeriodButtons({ elements, state });

  if (elements.spendingRhythmSubtitle) {
    elements.spendingRhythmSubtitle.textContent = dataset.subtitle;
  }

  if (elements.spendingRhythmChip) {
    elements.spendingRhythmChip.textContent = dataset.windowLabel;
  }

  if (elements.spendingRhythmTotal) {
    elements.spendingRhythmTotal.textContent = helpers.formatCurrency(dataset.total);
  }

  if (elements.spendingRhythmAverage) {
    elements.spendingRhythmAverage.textContent = helpers.formatCurrency(dataset.average);
  }

  if (!dataset.points.length || dataset.maxTotal <= 0) {
    elements.spendingRhythmChart.innerHTML = `
      <div class="db2-rhythm-empty">
        <strong>Sem gastos nesse recorte</strong>
        <span>Os dados aparecem automaticamente a partir das saidas reais do ledger.</span>
      </div>
    `;
    return;
  }

  const riskBreakpoints = {
    safe: Math.max(dataset.maxTotal * 0.4, dataset.average * 0.85 || 0),
    warning: Math.max(dataset.maxTotal * 0.75, dataset.average * 1.1 || 0),
  };

  elements.spendingRhythmChart.innerHTML = `
    <div class="db2-rhythm-bars" role="img" aria-label="Grafico do ritmo de gastos">
      ${dataset.points
        .map((point) => {
          const height = Math.max((Number(point.total || 0) / dataset.maxTotal) * 100, 6);
          const tone =
            Number(point.total || 0) <= riskBreakpoints.safe
              ? "safe"
              : Number(point.total || 0) <= riskBreakpoints.warning
                ? "warning"
                : "danger";

          return `
            <div class="db2-rhythm-bar-group">
              <span class="db2-rhythm-bar-value">${formatRhythmValueLabel(point.total, helpers.formatCurrency)}</span>
              <div class="db2-rhythm-bar-track">
                <div class="db2-rhythm-bar-fill db2-rhythm-bar-fill-${tone}" style="height:${height}%"></div>
              </div>
              <span class="db2-rhythm-bar-label">${point.label}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function bindExpensePeriodFilters({ elements, state, onChange }) {
  elements.expensePeriodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextPeriod = button.dataset.expensePeriod;

      if (!nextPeriod || nextPeriod === state.selectedExpensePeriod) {
        return;
      }

      state.selectedExpensePeriod = nextPeriod;
      onChange();
    });
  });
}

function bindSpendingRhythmPeriodFilters({ elements, state, onChange }) {
  elements.spendingRhythmPeriodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextPeriod = button.dataset.spendingRhythmPeriod;

      if (!nextPeriod || nextPeriod === state.selectedSpendingRhythmPeriod) {
        return;
      }

      state.selectedSpendingRhythmPeriod = nextPeriod;
      onChange();
    });
  });
}

window.DashboardOverview = {
  bindExpensePeriodFilters,
  bindSpendingRhythmPeriodFilters,
  renderExpenseOverview,
  renderExpensePeriodFilters,
  renderMetrics,
  renderOverviewSpotlights,
  renderRecentTransactions,
  renderSpendingRhythm,
};
