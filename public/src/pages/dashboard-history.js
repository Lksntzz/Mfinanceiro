console.log("[Dashboard Scripts] carregado: /src/pages/dashboard-history.js");

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
    <div class="history-group-list">
      ${renderDashboardHistoryGroups(displayGroups, displayGroups.length)}
    </div>
    ${canLoadMore ? '<div class="history-load-more-row"><button type="button" class="db2-see-more-btn dashboard-inline-link btn-secondary btn-sm" id="history-load-more">Carregar mais</button></div>' : ""}
  `;

  if (elements.historyLoadMore) {
    elements.historyLoadMore.hidden = !canLoadMore;
  }
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

window.DashboardHistory = {
  renderDailySummary,
  bindHistoryFilters,
};
