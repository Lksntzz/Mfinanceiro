(() => {
  const {
    carregarBeneficios: loadReceiptsBenefits,
    carregarCadastroBancario: loadReceiptsBanking,
    carregarRegistroPagamento: loadReceiptsPayment,
    carregarVRVA: loadReceiptsVrVa,
    loadAppData: loadReceiptsData,
    replaceAppData: replaceReceiptsData,
    salvarBeneficios: saveReceiptsBenefits,
    salvarCadastroBancario: saveReceiptsBanking,
    salvarRegistroPagamento: saveReceiptsPayment,
    toNumber: toReceiptsNumber,
  } = window.FinanceStore;
  const {
    calcularProximoPagamento: calculateReceiptsNextPayment,
    formatCurrency: formatReceiptsCurrency,
    formatDateLong: formatReceiptsDateLong,
    getNextBenefitInfo: getReceiptsNextBenefitInfo,
  } = window.FinanceCalculations;

  const receiptMessage = document.getElementById("receipt-message");
  const receiptStatusChip = document.getElementById("receipt-status-chip");
  const pagamentoStatusChip = document.getElementById("pagamento-status-chip");
  const beneficiosStatusChip = document.getElementById("beneficios-status-chip");
  const incomesListElement = document.getElementById("recebimentos-list");
  const benefitsListElement = document.getElementById("beneficios-list");
  const paymentValueInput = document.getElementById("pagamentoValorPrevisto");
  const savePaymentButton = document.getElementById("save-pagamento-button");

  let paymentEditMode = false;

  window.AppShell.initAppShell();

  function getElement(id) {
    return document.getElementById(id);
  }

  function getSyncApi() {
    return window.MFinanceiroSupabaseSync || null;
  }

  function getIncomes(data = loadReceiptsData()) {
    return Array.isArray(data?.recebimentos?.lista) ? data.recebimentos.lista : [];
  }

  function getBenefits(data = loadReceiptsData()) {
    return Array.isArray(data?.recebimentos?.beneficios?.lista)
      ? data.recebimentos.beneficios.lista
      : [];
  }

  function findIncomeById(id) {
    return getIncomes().find((item) => String(item?.id || "") === String(id || ""));
  }

  function findBenefitById(id) {
    return getBenefits().find((item) => String(item?.id || "") === String(id || ""));
  }

  function showMessage(type, text) {
    receiptMessage.textContent = text;
    receiptMessage.className = `message-box ${type}`;
  }

  function formatInputDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }

  function getTodayInputValue() {
    return new Date().toISOString().slice(0, 10);
  }

  function getIncomeTypeLabel(type) {
    const labels = {
      pagamento: "Pagamento principal",
      adiantamento: "Adiantamento",
      bonus: "Bonus",
      extra: "Extra",
    };

    return labels[type] || type || "Recebimento";
  }

  function getBenefitTypeLabel(type) {
    const labels = {
      vrVa: "VR/VA",
      vr: "VR",
      va: "VA",
      outro: "Outro beneficio",
    };

    return labels[type] || type || "Beneficio";
  }

  function fillIncomeForm(receipt = {}) {
    getElement("pagamentoId").value = receipt.sourceId || receipt.id || "";
    getElement("pagamentoTipo").value = receipt.tipo || "pagamento";
    getElement("pagamentoDescricao").value = receipt.descricao || "";
    getElement("pagamentoDataPrevista").value = formatInputDate(receipt.dataPrevista);
    const fallbackValue =
      receipt.valorPrevisto !== undefined && receipt.valorPrevisto !== null
        ? receipt.valorPrevisto
        : receipt.valorRecebido;
    getElement("pagamentoValorPrevisto").value =
      fallbackValue !== undefined && fallbackValue !== null ? String(toReceiptsNumber(fallbackValue)) : "";
  }

  function fillBenefitForm(receipt = {}) {
    getElement("beneficioId").value = receipt.sourceId || receipt.id || "";
    getElement("beneficioTipo").value = receipt.tipo || "vrVa";
    getElement("vrvaDataPrevista").value = formatInputDate(
      receipt.dataRecebimento || receipt.dataPrevista
    );
    getElement("vrvaValorPrevisto").value =
      toReceiptsNumber(receipt.valor || receipt.valorPrevisto || receipt.valorRecebido) || "";
    getElement("beneficioAtivo").checked = receipt.ativo !== false;
    getElement("beneficioContabilizarSaldo").checked = Boolean(
      receipt.contabilizarNoSaldo
    );
    getElement("vrvaRecebido").checked = receipt.status === "recebido";
  }

  function renderIncomeList(data = loadReceiptsData()) {
    const incomes = [...getIncomes(data)].sort((left, right) =>
      String(right.dataPrevista || "").localeCompare(String(left.dataPrevista || ""))
    );

    if (!incomes.length) {
      incomesListElement.innerHTML =
        '<div class="list-row"><div class="list-row-content"><strong>Nenhum recebimento salvo</strong><span>Cadastre o pagamento principal, um adiantamento ou um bonus.</span></div></div>';
      return;
    }

    incomesListElement.innerHTML = incomes
      .map((income) => `
        <article class="list-row">
          <div class="list-row-content">
            <strong>${getIncomeTypeLabel(income.tipo)}${income.descricao ? ` · ${income.descricao}` : ""}</strong>
            <span>${formatReceiptsDateLong(income.dataPrevista)} · Previsto ${formatReceiptsCurrency(income.valorPrevisto || income.valorRecebido)}${income.status === "recebido" ? ` · Recebido ${formatReceiptsCurrency(income.valorRecebido || income.valorPrevisto)}` : ""}</span>
          </div>
          <div class="button-row">
            <button type="button" class="ghost-button" data-edit-income-id="${income.id}">Editar</button>
            <button type="button" class="secondary-button" data-delete-income-id="${income.id}">Remover</button>
          </div>
        </article>
      `)
      .join("");
  }

  function renderBenefitList(data = loadReceiptsData()) {
    const benefits = [...getBenefits(data)].sort((left, right) =>
      String(right.dataRecebimento || "").localeCompare(String(left.dataRecebimento || ""))
    );

    if (!benefits.length) {
      benefitsListElement.innerHTML =
        '<div class="list-row"><div class="list-row-content"><strong>Nenhum beneficio salvo</strong><span>Cadastre VR, VA ou outro beneficio que entre no saldo.</span></div></div>';
      return;
    }

    benefitsListElement.innerHTML = benefits
      .map((benefit) => `
        <article class="list-row">
          <div class="list-row-content">
            <strong>${getBenefitTypeLabel(benefit.tipo)}</strong>
            <span>${formatReceiptsDateLong(benefit.dataRecebimento)} · ${formatReceiptsCurrency(benefit.valor)} · ${benefit.contabilizarNoSaldo ? "Entra no saldo" : "Nao entra no saldo"} · ${benefit.ativo ? "Ativo" : "Inativo"}</span>
          </div>
          <div class="button-row">
            <button type="button" class="ghost-button" data-edit-benefit-id="${benefit.id}">Editar</button>
            <button type="button" class="secondary-button" data-delete-benefit-id="${benefit.id}">Remover</button>
          </div>
        </article>
      `)
      .join("");
  }

  function renderPaymentReceipt() {
    const data = loadReceiptsData();
    const paymentInfo = calculateReceiptsNextPayment(data);
    const receipt = data?.recebimentos?.pagamento || loadReceiptsPayment();

    getElement("pagamento-proxima-previsao").textContent = paymentInfo.nextDate
      ? `${formatReceiptsDateLong(paymentInfo.nextDate)} - ${formatReceiptsCurrency(paymentInfo.value)}`
      : "--";
    getElement("pagamento-dias-restantes").textContent = String(paymentInfo.daysRemaining);
    if (!paymentEditMode) {
      fillIncomeForm({
        ...receipt,
        dataPrevista: receipt.dataPrevista || paymentInfo.nextDate,
        valorPrevisto:
          receipt.valorPrevisto !== undefined && receipt.valorPrevisto !== null
            ? receipt.valorPrevisto
            : paymentInfo.value,
      });
      lockPaymentReceiptEditing();
    }
    pagamentoStatusChip.textContent = receipt.dataPrevista
      ? receipt.status === "recebido"
        ? "Recebido"
        : "Pendente"
      : "Sem previsao";
  }

  function renderBenefitReceipt() {
    const data = loadReceiptsData();
    const benefitInfo = getReceiptsNextBenefitInfo(data, "vrVa");
    const receipt = data?.recebimentos?.beneficios?.vrVa || loadReceiptsBenefits().vrVa || loadReceiptsVrVa();

    fillBenefitForm({
      ...receipt,
      dataPrevista: receipt.dataPrevista || benefitInfo.nextDate,
      valorPrevisto: receipt.valorPrevisto || benefitInfo.value,
      contabilizarNoSaldo:
        receipt.contabilizarNoSaldo !== undefined
          ? receipt.contabilizarNoSaldo
          : benefitInfo.contabilizarNoSaldo,
    });

    beneficiosStatusChip.textContent = receipt.dataPrevista || receipt.dataRecebimento
      ? receipt.status === "recebido"
        ? "Recebido"
        : receipt.ativo === false
          ? "Inativo"
          : "Pendente"
      : "Sem beneficio";
    getElement("vrvaHint").textContent = benefitInfo.nextDate
      ? `Proxima previsao em ${formatReceiptsDateLong(benefitInfo.nextDate)}.`
      : "Registre a data e o valor do beneficio para refletir essa entrada no dashboard.";
  }

  function renderReceiptArea() {
    const data = loadReceiptsData();
    const paymentInfo = calculateReceiptsNextPayment(data);
    const vrVaInfo = getReceiptsNextBenefitInfo(data, "vrVa");

    renderPaymentReceipt();
    renderBenefitReceipt();
    renderIncomeList(data);
    renderBenefitList(data);

    receiptStatusChip.textContent =
      paymentInfo.configured || vrVaInfo.configured || getIncomes(data).length || getBenefits(data).length
        ? "Pronto para registrar"
        : "Faltam configuracoes";
  }

  async function savePaymentReceipt() {
    const syncApi = getSyncApi();
    const currentIncome = findIncomeById(getElement("pagamentoId").value);
    const rawValue = String(getElement("pagamentoValorPrevisto").value || "").trim();
    const prevValue = toReceiptsNumber(rawValue);
    const payload = {
      id: getElement("pagamentoId").value || currentIncome?.id || "",
      tipo: getElement("pagamentoTipo").value || "pagamento",
      descricao: getElement("pagamentoDescricao").value.trim() || "Recebimento principal",
      dataPrevista: getElement("pagamentoDataPrevista").value,
      valorPrevisto: prevValue,
      valorRecebido: currentIncome?.valorRecebido || 0,
      status: currentIncome?.status || "pendente",
    };

    if (!payload.dataPrevista || rawValue === "" || Number.isNaN(payload.valorPrevisto) || payload.valorPrevisto < 0) {
      showMessage("error", "Preencha tipo, data prevista e valor do recebimento.");
      return;
    }

    if (syncApi?.addIncome) {
      await syncApi.addIncome(payload);
    } else {
      saveReceiptsPayment(payload);
    }

    paymentEditMode = false;
    lockPaymentReceiptEditing();
    renderReceiptArea();
    showMessage("success", "Recebimento salvo com sucesso.");
  }

  async function markPaymentAsReceived() {
    const syncApi = getSyncApi();
    const selectedIncome =
      findIncomeById(getElement("pagamentoId").value) ||
      findIncomeById(loadReceiptsData()?.recebimentos?.pagamento?.sourceId) ||
      loadReceiptsData()?.recebimentos?.pagamento ||
      {};
    const currentValue = toReceiptsNumber(getElement("pagamentoValorPrevisto").value);
    const actualValue = toReceiptsNumber(
      window.prompt("Informe o valor real recebido:", String(currentValue || ""))
    );

    if (!actualValue) {
      showMessage("error", "Informe um valor valido para confirmar o recebimento.");
      return;
    }

    const receiptDate = getElement("pagamentoDataPrevista").value || getTodayInputValue();
    const currentBanking = loadReceiptsBanking();
    const alreadyReceived = selectedIncome?.status === "recebido";
    const nextBalance =
      currentBanking.origemSaldo?.modo === "manual" && !alreadyReceived
        ? toReceiptsNumber(currentBanking.saldoAtual) + actualValue
        : toReceiptsNumber(currentBanking.saldoAtual);

    if (syncApi?.addIncome) {
      await syncApi.addIncome({
        ...selectedIncome,
        id: selectedIncome?.id || getElement("pagamentoId").value || "",
        tipo: selectedIncome?.tipo || getElement("pagamentoTipo").value || "pagamento",
        descricao:
          selectedIncome?.descricao ||
          getElement("pagamentoDescricao").value.trim() ||
          "Recebimento principal",
        dataPrevista: receiptDate,
        valorPrevisto: Number.isFinite(currentValue) ? currentValue : actualValue,
        valorRecebido: actualValue,
        status: "recebido",
      });
    } else {
      saveReceiptsPayment({
        dataPrevista: receiptDate,
        valorPrevisto: Number.isFinite(currentValue) ? currentValue : actualValue,
        valorRecebido: actualValue,
        status: "recebido",
      });
    }

    if (currentBanking.origemSaldo?.modo === "manual" && !alreadyReceived) {
      saveReceiptsBanking({
        ...currentBanking,
        saldoAtual: nextBalance,
      });
    }

    renderReceiptArea();
    showMessage(
      "success",
      `Recebimento confirmado em ${formatReceiptsCurrency(actualValue)}.`
    );
  }

  async function saveBenefitReceipt() {
    const syncApi = getSyncApi();
    const currentBenefit = findBenefitById(getElement("beneficioId").value);
    const payload = {
      id: getElement("beneficioId").value || currentBenefit?.id || "",
      tipo: getElement("beneficioTipo").value || "vrVa",
      descricao: getBenefitTypeLabel(getElement("beneficioTipo").value || "vrVa"),
      valor: toReceiptsNumber(getElement("vrvaValorPrevisto").value),
      dataRecebimento: getElement("vrvaDataPrevista").value,
      ativo: getElement("beneficioAtivo").checked,
      contabilizarNoSaldo: getElement("beneficioContabilizarSaldo").checked,
      status: getElement("vrvaRecebido").checked ? "recebido" : "pendente",
    };

    if (!payload.dataRecebimento || payload.valor <= 0) {
      showMessage("error", "Preencha a data e o valor do beneficio.");
      return;
    }

    if (syncApi?.addBenefit) {
      await syncApi.addBenefit(payload);
    } else {
      saveReceiptsBenefits({
        vrVa: {
          dataPrevista: payload.dataRecebimento,
          valorPrevisto: payload.valor,
          valorRecebido: payload.status === "recebido" ? payload.valor : 0,
          status: payload.status,
          contabilizarNoSaldo: payload.contabilizarNoSaldo,
          ativo: payload.ativo,
        },
      });
    }

    renderReceiptArea();
    showMessage("success", "Beneficio salvo com sucesso.");
  }

  function editPaymentReceipt() {
    paymentEditMode = true;
    unlockPaymentReceiptEditing();
    const receipt =
      findIncomeById(loadReceiptsData()?.recebimentos?.pagamento?.sourceId) ||
      loadReceiptsData()?.recebimentos?.pagamento ||
      loadReceiptsPayment();
    fillIncomeForm(receipt);
    showMessage("success", "Recebimento carregado para edicao.");
    paymentValueInput?.focus();
    paymentValueInput?.select?.();
  }

  function lockPaymentReceiptEditing() {
    if (paymentValueInput) {
      paymentValueInput.readOnly = true;
      paymentValueInput.setAttribute("aria-readonly", "true");
    }

    if (savePaymentButton) {
      savePaymentButton.textContent = "Salvar recebimento";
    }
  }

  function unlockPaymentReceiptEditing() {
    if (paymentValueInput) {
      paymentValueInput.readOnly = false;
      paymentValueInput.removeAttribute("aria-readonly");
    }

    if (savePaymentButton) {
      savePaymentButton.textContent = "Salvar";
    }
  }

  function editBenefitReceipt() {
    const receipt =
      findBenefitById(loadReceiptsData()?.recebimentos?.beneficios?.vrVa?.sourceId) ||
      loadReceiptsData()?.recebimentos?.beneficios?.vrVa ||
      loadReceiptsVrVa();
    fillBenefitForm(receipt);
    showMessage("success", "Beneficio carregado para edicao.");
  }

  async function handleIncomeListClick(event) {
    const editButton = event.target.closest("[data-edit-income-id]");
    const deleteButton = event.target.closest("[data-delete-income-id]");
    const syncApi = getSyncApi();

    if (editButton) {
      const income = findIncomeById(editButton.dataset.editIncomeId);

      if (income) {
        fillIncomeForm(income);
        showMessage("success", "Recebimento carregado para edicao.");
      }

      return;
    }

    if (!deleteButton) {
      return;
    }

    if (!syncApi?.deleteIncome) {
      showMessage("error", "A remocao remota do recebimento nao esta disponivel.");
      return;
    }

    await syncApi.deleteIncome(deleteButton.dataset.deleteIncomeId);
    renderReceiptArea();
    showMessage("success", "Recebimento removido.");
  }

  async function handleBenefitListClick(event) {
    const editButton = event.target.closest("[data-edit-benefit-id]");
    const deleteButton = event.target.closest("[data-delete-benefit-id]");
    const syncApi = getSyncApi();

    if (editButton) {
      const benefit = findBenefitById(editButton.dataset.editBenefitId);

      if (benefit) {
        fillBenefitForm(benefit);
        showMessage("success", "Beneficio carregado para edicao.");
      }

      return;
    }

    if (!deleteButton) {
      return;
    }

    if (!syncApi?.deleteBenefit) {
      showMessage("error", "A remocao remota do beneficio nao esta disponivel.");
      return;
    }

    await syncApi.deleteBenefit(deleteButton.dataset.deleteBenefitId);
    renderReceiptArea();
    showMessage("success", "Beneficio removido.");
  }

  async function initializeReceiptsPage() {
    if (window.__mfinanceiroSupabaseHydrationReady) {
      await window.__mfinanceiroSupabaseHydrationReady;
    }

    renderReceiptArea();
  }

  getElement("save-pagamento-button").addEventListener("click", () => {
    savePaymentReceipt().catch((error) => {
      console.error("[Recebimentos] Falha ao salvar recebimento.", error);
      showMessage("error", "Nao foi possivel salvar o recebimento.");
    });
  });
  getElement("mark-pagamento-recebido-button").addEventListener("click", () => {
    markPaymentAsReceived().catch((error) => {
      console.error("[Recebimentos] Falha ao confirmar recebimento.", error);
      showMessage("error", "Nao foi possivel confirmar o recebimento.");
    });
  });
  getElement("edit-pagamento-button").addEventListener("click", editPaymentReceipt);
  getElement("save-vrva-button").addEventListener("click", () => {
    saveBenefitReceipt().catch((error) => {
      console.error("[Recebimentos] Falha ao salvar beneficio.", error);
      showMessage("error", "Nao foi possivel salvar o beneficio.");
    });
  });
  getElement("edit-vrva-button").addEventListener("click", editBenefitReceipt);
  incomesListElement.addEventListener("click", (event) => {
    handleIncomeListClick(event).catch((error) => {
      console.error("[Recebimentos] Falha ao processar lista de recebimentos.", error);
      showMessage("error", "Nao foi possivel atualizar os recebimentos.");
    });
  });
  benefitsListElement.addEventListener("click", (event) => {
    handleBenefitListClick(event).catch((error) => {
      console.error("[Recebimentos] Falha ao processar lista de beneficios.", error);
      showMessage("error", "Nao foi possivel atualizar os beneficios.");
    });
  });
  window.addEventListener("finance-data-updated", renderReceiptArea);
  window.addEventListener("mfinanceiro-supabase-hydrated", renderReceiptArea);
  window.addEventListener("mfinanceiro-financial-recalculated", renderReceiptArea);
  window.addEventListener("storage", renderReceiptArea);

  initializeReceiptsPage().catch((error) => {
    console.error("[Recebimentos] Falha ao inicializar a pagina.", error);
    renderReceiptArea();
  });
})();
