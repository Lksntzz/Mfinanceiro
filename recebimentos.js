(() => {
const {
  carregarBeneficios: loadReceiptsBenefits,
  carregarCadastroBancario: loadReceiptsBanking,
  carregarRegistroPagamento: loadReceiptsPayment,
  carregarVRVA: loadReceiptsVrVa,
  editarRegistroPagamento: editReceiptsPayment,
  editarVRVA: editReceiptsVrVa,
  loadAppData: loadReceiptsData,
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

window.AppShell.initAppShell();

function getElement(id) {
  return document.getElementById(id);
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

function renderPaymentReceipt() {
  const data = loadReceiptsData();
  const paymentInfo = calculateReceiptsNextPayment(data);
  const receipt = loadReceiptsPayment();

  getElement("pagamento-proxima-previsao").textContent = paymentInfo.nextDate
    ? `${formatReceiptsDateLong(paymentInfo.nextDate)} - ${formatReceiptsCurrency(paymentInfo.value)}`
    : "--";
  getElement("pagamento-dias-restantes").textContent = String(paymentInfo.daysRemaining);
  getElement("pagamentoDataPrevista").value = formatInputDate(
    receipt.dataPrevista || paymentInfo.nextDate
  );
  getElement("pagamentoValorPrevisto").value =
    toReceiptsNumber(receipt.valorPrevisto || paymentInfo.value) || "";
  pagamentoStatusChip.textContent = receipt.dataPrevista
    ? receipt.status === "recebido"
      ? "Recebido"
      : "Pendente"
    : "Pendente";
}

function renderBenefitReceipt() {
  const data = loadReceiptsData();
  const benefitInfo = getReceiptsNextBenefitInfo(data, "vrVa");
  const receipt = loadReceiptsBenefits().vrVa || loadReceiptsVrVa();

  getElement("vrvaDataPrevista").value = formatInputDate(
    receipt.dataPrevista || benefitInfo.nextDate
  );
  getElement("vrvaValorPrevisto").value =
    toReceiptsNumber(receipt.valorPrevisto || benefitInfo.value) || "";
  getElement("vrvaRecebido").checked = receipt.status === "recebido";

  beneficiosStatusChip.textContent = receipt.dataPrevista
    ? receipt.status === "recebido"
      ? "Recebido"
      : "Pendente"
    : "Sem beneficio";
  getElement("vrvaHint").textContent = benefitInfo.nextDate
    ? `Proxima previsao em ${formatReceiptsDateLong(benefitInfo.nextDate)}.`
    : "Registre a data e o valor do VR/VA para refletir esse beneficio no dashboard.";
}

function renderReceiptArea() {
  const data = loadReceiptsData();
  const paymentInfo = calculateReceiptsNextPayment(data);
  const vrVaInfo = getReceiptsNextBenefitInfo(data, "vrVa");

  renderPaymentReceipt();
  renderBenefitReceipt();

  receiptStatusChip.textContent =
    paymentInfo.configured || vrVaInfo.configured
      ? "Pronto para registrar"
      : "Faltam configuracoes";
}

function savePaymentReceipt() {
  const existingReceipt = loadReceiptsPayment();
  const payload = {
    dataPrevista: getElement("pagamentoDataPrevista").value,
    valorPrevisto: toReceiptsNumber(getElement("pagamentoValorPrevisto").value),
    valorRecebido: 0,
    status: existingReceipt.status || "pendente",
  };

  if (!payload.dataPrevista || payload.valorPrevisto <= 0) {
    showMessage("error", "Preencha data prevista e valor previsto do pagamento.");
    return;
  }

  console.log("Salvando registro de pagamento", payload);
  saveReceiptsPayment(payload);
  renderReceiptArea();

  if (typeof window.atualizarDashboard === "function") {
    window.atualizarDashboard();
  }

  showMessage("success", "Previsao do pagamento salva com sucesso.");
  window.AppShell.queueDashboardRedirect(
    "Previsao do pagamento salva. O dashboard foi atualizado."
  );
}

function markPaymentAsReceived() {
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
  const nextBalance =
    currentBanking.origemSaldo?.modo === "manual"
      ? toReceiptsNumber(currentBanking.saldoAtual) + actualValue
      : toReceiptsNumber(currentBanking.saldoAtual);

  saveReceiptsPayment({
    dataPrevista: receiptDate,
    valorPrevisto: currentValue || actualValue,
    valorRecebido: actualValue,
    status: "recebido",
  });

  if (currentBanking.origemSaldo?.modo === "manual") {
    saveReceiptsBanking({
      ...currentBanking,
      saldoAtual: nextBalance,
    });
  }

  renderReceiptArea();

  if (typeof window.atualizarDashboard === "function") {
    window.atualizarDashboard();
  }

  showMessage(
    "success",
    `Recebimento confirmado em ${formatReceiptsCurrency(actualValue)}. O ciclo foi avancado automaticamente.`
  );
  window.AppShell.queueDashboardRedirect(
    "Recebimento confirmado. O dashboard foi atualizado para o proximo ciclo."
  );
}

function saveVrVaReceipt() {
  const payload = {
    dataPrevista: getElement("vrvaDataPrevista").value,
    valorPrevisto: toReceiptsNumber(getElement("vrvaValorPrevisto").value),
    valorRecebido: 0,
    status: getElement("vrvaRecebido").checked ? "recebido" : "pendente",
  };

  if (!payload.dataPrevista || payload.valorPrevisto <= 0) {
    showMessage("error", "Preencha a data e o valor do VR/VA.");
    return;
  }

  console.log("Salvando VR/VA", payload);
  saveReceiptsBenefits({ vrVa: payload });
  renderReceiptArea();

  if (typeof window.atualizarDashboard === "function") {
    window.atualizarDashboard();
  }

  showMessage("success", "Registro de VR/VA salvo com sucesso.");
  window.AppShell.queueDashboardRedirect(
    "Registro de VR/VA salvo. O dashboard foi atualizado."
  );
}

function editPaymentReceipt() {
  const receipt = editReceiptsPayment();
  console.log("Editando registro de pagamento", receipt);
  renderPaymentReceipt();
  showMessage("success", "Registro de pagamento carregado para edicao.");
}

function editVrVaReceipt() {
  const receipt = editReceiptsVrVa();
  console.log("Editando VR/VA", receipt);
  renderBenefitReceipt();
  showMessage("success", "Registro de VR/VA carregado para edicao.");
}

getElement("save-pagamento-button").addEventListener("click", savePaymentReceipt);
getElement("mark-pagamento-recebido-button").addEventListener("click", markPaymentAsReceived);
getElement("edit-pagamento-button").addEventListener("click", editPaymentReceipt);
getElement("save-vrva-button").addEventListener("click", saveVrVaReceipt);
getElement("edit-vrva-button").addEventListener("click", editVrVaReceipt);
window.addEventListener("finance-data-updated", renderReceiptArea);
window.FinanceStore.subscribe(renderReceiptArea);
window.addEventListener("storage", renderReceiptArea);

renderReceiptArea();
})();
