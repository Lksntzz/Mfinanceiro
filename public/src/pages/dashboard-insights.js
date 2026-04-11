console.log("[Dashboard Scripts] carregado: /src/pages/dashboard-insights.js");

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

function renderAlerts(summary, alerts) {
  if (!elements.alertList || !elements.alertChip) {
    return;
  }

  const healthStatus = buildFinancialHealthStatus(summary);
  const filteredCycleAlerts = Array.isArray(alerts) ? alerts : [];
  const combinedAlerts = [...healthStatus.alerts, ...filteredCycleAlerts].slice(0, 5);

  elements.alertChip.textContent = `${combinedAlerts.length} alerta(s)`;
  elements.alertList.innerHTML = combinedAlerts
    .map(
      (alert, index) => `
        <li class="trend-item">
          <span class="trend-dot trend-${alert.type || "muted"}">${index + 1}</span>
          <div class="list-text">
            <strong>${alert.title}</strong>
            <small>${alert.description}</small>
          </div>
        </li>
      `
    )
    .join("");
}

function renderSummaryTable(data, summary, alerts, expenseOverview, intelligence) {
  if (!elements.summaryTableBody) {
    return;
  }

  const rows = [
    {
      label: "Saldo disponivel",
      value: formatDashboardCurrencyValue(summary.saldoDisponivel),
      statusClass: summary.saldoDisponivel >= 0 ? "status-positive" : "status-danger",
      note: "Saldo inicial menos o valor comprometido do ciclo.",
    },
    {
      label: "Limite diario",
      value: formatDashboardCurrencyValue(summary.limiteDiario),
      statusClass: summary.limiteDiario > 0 ? "status-positive" : "status-warning",
      note: "Saldo disponivel dividido pelos dias restantes ate o proximo pagamento.",
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
}

window.DashboardInsights = {
  renderInsights,
};
