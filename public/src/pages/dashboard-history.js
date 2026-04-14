function renderDailySummary(data, periodSummary) {
  if (!elements.dailySummaryList || !elements.dailySummaryChip) {
    return;
  }

  const selectedPeriod = dashboardState.selectedHistoryPeriod || "7d";
  const historySourceEntries = typeof getDashboardFinancialEntries === "function"
    ? getDashboardFinancialEntries(data)
    : getDashboardLedgerExpenseData(data);
  const latestEntryDate = historySourceEntries.reduce((latest, entry) => {
    const candidate = normalizeDashboardHistoryDate(entry.dataNormalizada || entry.data || entry.dataHora);
    if (!candidate) {
      return latest;
    }
    return !latest || candidate.getTime() > latest.getTime() ? candidate : latest;
  }, null);
  const today = normalizeDashboardHistoryDate(new Date()) || new Date();
  const historyReferenceDate = latestEntryDate && latestEntryDate.getTime() > today.getTime()
    ? latestEntryDate
    : today;
  const descriptor = getDashboardHistoryPeriodDescriptor(
    selectedPeriod,
    historyReferenceDate,
    dashboardState.historyCustomStart,
    dashboardState.historyCustomEnd
  );
  const visibleGroups = Math.max(1, Number(dashboardState.historyVisibleGroups) || 6);
  const historyEntries =
    selectedPeriod === "month"
      ? buildDashboardHistoryMonthGroups(historySourceEntries)
      : buildDashboardHistoryGroups(historySourceEntries);
  const filteredGroups = historyEntries.filter((group) => {
    const dayKey = normalizeDashboardHistoryDateKey(group.date || group.dateKey);
    if (!dayKey) {
      return false;
    }
    const startKey = normalizeDashboardHistoryDateKey(descriptor.startDate);
    const endKey = normalizeDashboardHistoryDateKey(descriptor.endDate);
    if (selectedPeriod === "month") {
      return true;
    }
    return dayKey >= startKey && dayKey <= endKey;
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
      "Sem lancamentos nesse periodo",
      "Nao ha despesas reais no intervalo selecionado."
    );
    if (elements.historyLoadMore) {
      elements.historyLoadMore.hidden = true;
    }
    return;
  }

  elements.dailySummaryList.innerHTML = `
    <div class="history-summary-band">
      <div class="history-summary-kpi">
        <span>Periodo</span>
        <strong>${descriptor.label}</strong>
      </div>
      <div class="history-summary-kpi">
        <span>Dias exibidos</span>
        <strong>${displayGroups.length}</strong>
      </div>
      <div class="history-summary-kpi">
        <span>Lancamentos</span>
        <strong>${periodSummary.quantidadeLancamentos || 0}</strong>
      </div>
      <div class="history-summary-kpi">
        <span>Total gasto</span>
        <strong>${formatDashboardCurrencyValue(periodSummary.totalGasto || 0)}</strong>
      </div>
    </div>
    <div class="history-period-actions">
      <button type="button" class="db2-see-more-btn dashboard-inline-link btn-secondary btn-sm" id="history-delete-period">Apagar período</button>
    </div>
    <div class="history-group-list">
      ${selectedPeriod === "month"
        ? renderDashboardHistoryMonthGroups(displayGroups, displayGroups.length)
        : renderDashboardHistoryGroups(displayGroups, displayGroups.length)}
    </div>
    ${canLoadMore ? '<div class="history-load-more-row"><button type="button" class="db2-see-more-btn dashboard-inline-link btn-secondary btn-sm" id="history-load-more">Carregar mais</button></div>' : ""}
  `;

  if (elements.historyLoadMore) {
    elements.historyLoadMore.hidden = !canLoadMore;
  }
}

function getCurrentHistoryContext() {
  const data = window.__DATA__ || (window.FinanceStore?.loadAppData ? window.FinanceStore.loadAppData() : null);
  const selectedPeriod = dashboardState.selectedHistoryPeriod || "7d";
  const historySourceEntries = typeof getDashboardFinancialEntries === "function"
    ? getDashboardFinancialEntries(data || {})
    : getDashboardLedgerExpenseData(data || {});
  const latestEntryDate = historySourceEntries.reduce((latest, entry) => {
    const candidate = normalizeDashboardHistoryDate(entry.dataNormalizada || entry.data || entry.dataHora);
    if (!candidate) {
      return latest;
    }
    return !latest || candidate.getTime() > latest.getTime() ? candidate : latest;
  }, null);
  const today = normalizeDashboardHistoryDate(new Date()) || new Date();
  const historyReferenceDate = latestEntryDate && latestEntryDate.getTime() > today.getTime()
    ? latestEntryDate
    : today;
  const descriptor = getDashboardHistoryPeriodDescriptor(
    selectedPeriod,
    historyReferenceDate,
    dashboardState.historyCustomStart,
    dashboardState.historyCustomEnd
  );

  return { selectedPeriod, historySourceEntries, descriptor };
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

    const deletePeriodTrigger = event.target.closest("#history-delete-period");
    if (deletePeriodTrigger) {
      const { selectedPeriod, historySourceEntries, descriptor } = getCurrentHistoryContext();
      const isMonth = selectedPeriod === "month";
      const confirmed = confirmDashboardHistoryDelete(
        isMonth
          ? `Apagar todos os lançamentos de ${descriptor.label}?`
          : `Apagar todos os lançamentos do período ${descriptor.label}?`,
        { allowBypass: false }
      );
      if (!confirmed) {
        return;
      }

      const actionPromise = isMonth
        ? deleteDashboardHistoryEntriesByMonth(
            `${descriptor.startDate.getFullYear()}-${String(descriptor.startDate.getMonth() + 1).padStart(2, "0")}`
          )
        : deleteDashboardHistoryEntriesByRange(descriptor.startDate, descriptor.endDate);

      actionPromise
        .then((deleted) => {
          if (deleted || (isMonth && Array.isArray(historySourceEntries) && historySourceEntries.length)) {
            atualizarDashboard();
          }
        })
        .catch((error) => {
          console.error("[Dashboard History] Falha ao apagar periodo.", error);
        });
      return;
    }

    const deleteMonthTrigger = event.target.closest("[data-history-action='delete-month']");
    if (deleteMonthTrigger) {
      const monthKey = deleteMonthTrigger.dataset.historyMonth || "";
      if (!monthKey) {
        return;
      }

      const confirmed = confirmDashboardHistoryDelete(
        `Apagar todos os lançamentos de ${deleteMonthTrigger.dataset.historyLabel || "este mês"}?`,
        { allowBypass: false }
      );
      if (!confirmed) {
        return;
      }

      deleteDashboardHistoryEntriesByMonth(monthKey)
        .then((deleted) => {
          if (deleted) {
            atualizarDashboard();
          }
        })
        .catch((error) => {
          console.error("[Dashboard History] Falha ao apagar mes.", error);
        });
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

      const confirmed = confirmDashboardHistoryDelete("Apagar todos os lancamentos deste dia?", { allowBypass: false });

      if (!confirmed) {
        return;
      }

      deleteDashboardHistoryEntriesByRange(dateKey, dateKey)
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

window.DashboardHistory = {
  renderDailySummary,
  bindHistoryFilters,
};
