(() => {
const {
  calcularINSS: calculateBankingInss,
  calcularIRPF: calculateBankingIrpf,
  calcularSalarioLiquido: calculateBankingNetSalary,
  calcularSalarioLiquidoBanco,
  carregarCadastroBancario,
  carregarBeneficios,
  carregarRegistroPagamento,
  carregarVRVA,
  createId,
  editarRegistroPagamento,
  editarVRVA,
  loadAppData: loadBankingData,
  salvarContasVariaveisImportadas: saveImportedExpensesFromStatement,
  salvarCadastroBancario,
  salvarBeneficios,
  salvarRegistroPagamento,
  salvarVRVA,
  toNumber: toBankingNumber,
  updateAppData: updateBankingData,
} = window.FinanceStore;
const {
  calcularProximoPagamento: calculateBankingNextPayment,
  calcularResumoFinanceiro: calculateBankingSummary,
  formatCurrency: formatBankingCurrency,
  formatDateLong: formatBankingDateLong,
  getNextBenefitInfo: getBankingNextBenefitInfo,
} = window.FinanceCalculations;

const bankingForm = document.getElementById("banking-form");
const bankingMessage = document.getElementById("banking-message");
const receiptMessage = document.getElementById("receipt-message");
const bankingStatusChip = document.getElementById("banking-status-chip");
const receiptStatusChip = document.getElementById("receipt-status-chip");
const beneficiosStatusChip = document.getElementById("beneficios-status-chip");
const outroDescontoNomeInput = document.getElementById("outroDescontoNome");
const outroDescontoValorInput = document.getElementById("outroDescontoValor");
const outrosDescontosList = document.getElementById("outros-descontos-list");
const tipoCicloInput = document.getElementById("tipoCiclo");
const diaPagamento2Wrapper = document.getElementById("diaPagamento2Wrapper");
const editBankingButton = document.getElementById("edit-banking-button");
const statementMessage = document.getElementById("statement-message");
const statementPreviewList = document.getElementById("statement-preview-list");
const statementFileInput = document.getElementById("statementFile");
const statementSelectedFileName = document.getElementById("statement-selected-file-name");
const statementTotalPreview = document.getElementById("statement-total-preview");
const statementEntriesPreview = document.getElementById("statement-entries-preview");
const statementExitsPreview = document.getElementById("statement-exits-preview");
const statementBalanceActions = document.getElementById("statement-balance-actions");
const saldoAtualField = document.getElementById("saldoAtualField");
const origemSaldoBancoWrapper = document.getElementById("origemSaldoBancoWrapper");
const extratoActionSection = document.getElementById("extratoActionSection");
const bankingSummarySaldo = document.getElementById("banking-summary-saldo");
const bankingSummaryPayment = document.getElementById("banking-summary-payment");
const bankingSummaryDays = document.getElementById("banking-summary-days");
const bankingSummaryDaily = document.getElementById("banking-summary-daily");
const salarioLiquidoManualField = document.getElementById("salarioLiquidoManualField");
const salarioLiquidoManualInput = document.getElementById("salarioLiquidoManual");
const salaryModeButtons = Array.from(document.querySelectorAll("[data-salary-liquido-mode]"));
const balanceAccordionSummary = document.getElementById("balance-accordion-summary");
const salaryAccordionSummary = document.getElementById("salary-accordion-summary");
const discountsAccordionSummary = document.getElementById("discounts-accordion-summary");
const cycleAccordionSummary = document.getElementById("cycle-accordion-summary");
const benefitsAccordionSummary = document.getElementById("benefits-accordion-summary");
const accordionSections = Array.from(
  document.querySelectorAll("[data-accordion-section]")
);

let outrosDescontosState = [];
let statementDraftsState = [];
let statementBalanceSuggestion = 0;
let statementValidationState = null;
let statementImportFlowState = "structured";
let statementUnstructuredState = null;
let salarioLiquidoModoState = "auto";
let salarioLiquidoManualState = 0;

window.AppShell.initAppShell();

const IMPORT_CATEGORIES = [
  "alimentacao",
  "entrada",
  "rendimento",
  "transporte",
  "mercado",
  "saude",
  "lazer",
  "compras",
  "outros",
];

function getElement(id) {
  return document.getElementById(id);
}

function showMessage(target, type, text) {
  target.textContent = text;
  target.className = `message-box ${type}`;
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

function suggestImportCategory(text) {
  const normalizedText = String(text || "").toLowerCase();

  if (normalizedText.includes("pix recebido")) {
    return "entrada";
  }

  if (normalizedText.includes("rendimento")) {
    return "rendimento";
  }

  if (normalizedText.includes("pagamento")) {
    return "compras";
  }

  if (normalizedText.includes("uber")) {
    return "transporte";
  }

  if (/(mercado|supermercado|atacadao)/.test(normalizedText)) {
    return "mercado";
  }

  if (/(uber|99|metro|onibus|transporte|combustivel|gasolina)/.test(normalizedText)) {
    return "transporte";
  }

  if (/(restaurante|ifood|lanche|almoco|janta|padaria)/.test(normalizedText)) {
    return "alimentacao";
  }

  if (/(farmacia|medico|hospital|saude)/.test(normalizedText)) {
    return "saude";
  }

  if (/(cinema|lazer|show|streaming)/.test(normalizedText)) {
    return "lazer";
  }

  if (/(loja|compra|shopping|mercado livre|amazon)/.test(normalizedText)) {
    return "compras";
  }

  return "outros";
}

function extractImportDate(text) {
  const normalizedText = String(text || "");
  const isoMatch = normalizedText.match(/(20\d{2})[-_./](\d{2})[-_./](\d{2})/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brazilianMatch = normalizedText.match(/(\d{2})[-_./](\d{2})[-_./](20\d{2})/);

  if (brazilianMatch) {
    return `${brazilianMatch[3]}-${brazilianMatch[2]}-${brazilianMatch[1]}`;
  }

  return getTodayInputValue();
}

function extractImportAmount(text) {
  const matches = String(text || "").match(/\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2})?/g);

  if (!matches?.length) {
    return 0;
  }

  return toBankingNumber(matches[matches.length - 1]);
}

function normalizeImportDescription(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatementDescription(value) {
  return String(value || "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeImportedBinaryContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (content instanceof ArrayBuffer) {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(content));
    } catch (error) {
      return "";
    }
  }

  return "";
}

async function lerArquivoImportado(file) {
  const extension = String(file?.name || "")
    .split(".")
    .pop()
    .toLowerCase();

  if (["xlsx", "xls", "jpg", "jpeg", "png", "webp"].includes(extension)) {
    return file.arrayBuffer();
  }

  try {
    return await file.text();
  } catch (error) {
    return file.name || "";
  }
}

function parseBrazilianAmount(value) {
  const normalizedValue = String(value || "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");

  const parsedValue = Number.parseFloat(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function detectStatementFormat(file) {
  const extension = String(file?.name || "")
    .split(".")
    .pop()
    .toLowerCase();

  if (extension === "csv") {
    return "csv";
  }

  if (extension === "ofx") {
    return "ofx";
  }

  if (extension === "xls") {
    return "xls";
  }

  if (extension === "xlsx") {
    return "xlsx";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return "image";
  }

  return "binary";
}

function detectStatementFormatByContent(file, fileContent) {
  const baseFormat = detectStatementFormat(file);
  const decodedContent = decodeImportedBinaryContent(fileContent);
  const normalizedContent = String(decodedContent || "").toUpperCase();

  if (baseFormat === "pdf") {
    if (
      /%PDF/i.test(normalizedContent) &&
      /(BT|ET|TJ|TJ|RELEASE_DATE|TRANSACTION_TYPE|FITID|TRNAMT)/.test(normalizedContent)
    ) {
      return "pdf-text";
    }

    return "pdf-image";
  }

  if (baseFormat === "binary") {
    if (/<OFX>|<BANKTRANLIST>|<STMTTRN>/i.test(normalizedContent)) {
      return "ofx";
    }
  }

  return baseFormat;
}

function isUnstructuredStatementFormat(format) {
  return format === "image" || format === "pdf-image";
}

function buildUnstructuredImportSession(file, bank, format) {
  return {
    bank,
    format,
    fileName: file?.name || "",
    blocked: true,
    reason:
      "Arquivo nao estruturado detectado. A camada OCR foi preparada, mas ainda nao extrai linhas automaticamente nesta versao.",
    reviewItems: [],
    lowConfidenceCount: 0,
    requiresManualReview: true,
  };
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      cells.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  cells.push(currentCell.trim());
  return cells;
}

function normalizeHeaderName(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uFEFF/g, "");
}

function normalizeStatementDate(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return getTodayInputValue();
  }

  const isoMatch = normalizedValue.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = normalizedValue.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  return extractImportDate(normalizedValue);
}

function buildImportedStatementItem({
  prefix,
  date,
  description,
  value,
  balance,
  bank,
  externalId,
}) {
  const normalizedValue = Number(value || 0);
  const normalizedDescription =
    normalizeStatementDescription(description) || "Movimentacao importada";

  return {
    id: createId(prefix),
    data: normalizeStatementDate(date),
    descricao: normalizedDescription,
    valor: normalizedValue,
    saldo:
      balance !== undefined &&
      balance !== null &&
      String(balance).trim() !== "" &&
      Number.isFinite(Number(balance))
        ? Number(balance)
        : null,
    tipo: normalizedValue < 0 ? "saida" : "entrada",
    categoria: suggestImportCategory(normalizedDescription),
    categoriaSugerida: suggestImportCategory(normalizedDescription),
    origem: "importado",
    banco: bank,
    externalId: String(externalId || "").trim(),
  };
}

function isStatementSummaryDescription(value) {
  const normalized = normalizeHeaderName(normalizeStatementDescription(value));
  const summaryTerms = [
    "SALDO INICIAL",
    "SALDO FINAL",
    "TOTAL",
    "TOTAIS",
    "RESUMO",
    "RESUMO DO PERIODO",
    "RESUMO PERIODO",
    "TOTAL DE ENTRADAS",
    "TOTAL DE SAIDAS",
    "BLOCO DE RESUMO",
  ];

  return summaryTerms.some(
    (term) => normalized === term || normalized.startsWith(`${term} `)
  );
}

function isValidTransactionDate(value) {
  const normalized = normalizeStatementDate(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized);
}

function validateStatementBalance(lancamentos) {
  if (!lancamentos.length) {
    return null;
  }

  const lancamentosComSaldo = lancamentos.filter((item) =>
    Number.isFinite(Number(item?.saldo))
  );

  if (!lancamentosComSaldo.length) {
    return null;
  }

  const primeiroSaldo = Number(lancamentosComSaldo[0].saldo || 0);
  const primeiroValor = Number(lancamentosComSaldo[0].valor || 0);
  const saldoInicialEstimado = primeiroSaldo - primeiroValor;
  const saldoFinalCalculado = saldoInicialEstimado
    + lancamentosComSaldo.reduce((total, item) => total + Number(item.valor || 0), 0);
  const saldoFinalArquivo = Number(
    lancamentosComSaldo[lancamentosComSaldo.length - 1].saldo || 0
  );
  const diferenca = Math.abs(saldoFinalCalculado - saldoFinalArquivo);

  return {
    saldoInicialEstimado,
    saldoFinalCalculado,
    saldoFinalArquivo,
    consistente: diferenca < 0.01,
    diferenca,
  };
}

function recalculateStatementValidation() {
  statementValidationState = validateStatementBalance(statementDraftsState);
}

function createStatementDuplicateKey(item) {
  const normalizedDescription = normalizeHeaderName(item?.descricao || "");
  const normalizedDate = normalizeStatementDate(item?.data || "");
  const normalizedValue = Number(item?.valor || 0).toFixed(2);
  const normalizedExternalId = String(item?.externalId || item?.external_id || "").trim();

  return normalizedExternalId
    ? `external:${normalizedExternalId}`
    : `${normalizedDate}|${normalizedDescription}|${normalizedValue}`;
}

function getExistingLedgerDuplicateKeys() {
  const data = loadBankingData();
  const ledgerItems = Array.isArray(data?.ledgerMovimentacoes) ? data.ledgerMovimentacoes : [];

  return new Set(
    ledgerItems
      .filter(Boolean)
      .map((item) =>
        createStatementDuplicateKey({
          data: item.data,
          descricao: item.descricao,
          valor: item.valor,
          externalId: item.external_id || item.externalId || item.id,
        })
      )
  );
}

function filterDuplicateStatementItems(lancamentos) {
  const existingKeys = getExistingLedgerDuplicateKeys();
  const batchKeys = new Set();
  const deduplicatedItems = [];
  let ignoredCount = 0;

  (Array.isArray(lancamentos) ? lancamentos : []).forEach((item) => {
    const key = createStatementDuplicateKey(item);

    if (existingKeys.has(key) || batchKeys.has(key)) {
      ignoredCount += 1;
      return;
    }

    batchKeys.add(key);
    deduplicatedItems.push(item);
  });

  return {
    lancamentos: deduplicatedItems,
    ignoredCount,
  };
}

function parseCSV(textContent, bank) {
  if (bank === "mercado-pago") {
    return parseMercadoPagoCSV(textContent);
  }

  return parseGenericCSV(textContent, bank);
}

function finalizeStructuredParserResult(result) {
  const deduplication = filterDuplicateStatementItems(result?.lancamentos || []);
  const lancamentos = deduplication.lancamentos;

  if (!lancamentos.length) {
    throw new Error("O arquivo nao trouxe movimentacoes novas e validas para importar.");
  }

  const saldoItems = lancamentos.filter((item) => Number.isFinite(Number(item?.saldo)));
  const saldoSugerido = saldoItems.length
    ? Number(saldoItems[saldoItems.length - 1].saldo || 0)
    : Number(result?.saldoSugerido || 0);

  return {
    ...result,
    lancamentos,
    saldoSugerido,
    validation: validateStatementBalance(lancamentos),
    duplicateCount: deduplication.ignoredCount,
  };
}

function detectStatementBankByContent({ selectedBank, fileName, contentText, headers = [] }) {
  if (selectedBank && selectedBank !== "outro") {
    return selectedBank;
  }

  const normalizedFileName = normalizeHeaderName(fileName || "");
  const normalizedContent = normalizeHeaderName(contentText || "");
  const normalizedHeaders = headers.map((item) => normalizeHeaderName(item));
  const joinedHeaders = normalizedHeaders.join(" ");

  const detectionRules = [
    {
      bank: "mercado-pago",
      match: () =>
        joinedHeaders.includes("RELEASE_DATE") &&
        joinedHeaders.includes("TRANSACTION_NET_AMOUNT") &&
        joinedHeaders.includes("PARTIAL_BALANCE"),
    },
    {
      bank: "nubank",
      match: () =>
        /NUBANK|NU PAGAMENTOS/.test(normalizedContent) ||
        /NUBANK|NU PAGAMENTOS/.test(normalizedFileName),
    },
    {
      bank: "inter",
      match: () => /BANCO INTER|INTERMEDIUM/.test(normalizedContent),
    },
    {
      bank: "c6",
      match: () => /C6 BANK|CARBON HOLDING/.test(normalizedContent),
    },
    {
      bank: "santander",
      match: () => /SANTANDER/.test(normalizedContent),
    },
    {
      bank: "bradesco",
      match: () => /BRADESCO/.test(normalizedContent),
    },
    {
      bank: "picpay",
      match: () => /PICPAY/.test(normalizedContent),
    },
  ];

  const detectedRule = detectionRules.find((rule) => rule.match());
  return detectedRule?.bank || selectedBank || "outro";
}

function parseMercadoPagoCSV(textContent) {
  const lines = String(textContent || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const targetHeader =
    "RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE";
  const headerIndex = lines.findIndex(
    (line) => normalizeHeaderName(line) === targetHeader
  );

  if (headerIndex === -1) {
    throw new Error(
      "Nao encontrei o bloco de movimentacoes do Mercado Pago no CSV enviado."
    );
  }

  const lancamentos = [];

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const row = splitDelimitedLine(lines[index], ";");

    if (row.length < 5) {
      continue;
    }

    if (!row[0] && !row[1] && !row[3] && !row[4]) {
      continue;
    }

    const releaseDate = row[0];
    const transactionType = normalizeStatementDescription(row[1]);
    const referenceId = String(row[2] || "").trim();
    const transactionNetAmount = parseBrazilianAmount(row[3]);
    const partialBalance = parseBrazilianAmount(row[4]);

    if (!isValidTransactionDate(releaseDate)) {
      continue;
    }

    if (isStatementSummaryDescription(transactionType)) {
      continue;
    }

    if (!referenceId) {
      continue;
    }

    if (!transactionType || Number.isNaN(transactionNetAmount)) {
      continue;
    }

    lancamentos.push(
      buildImportedStatementItem({
        prefix: "extrato_mp_csv",
        date: releaseDate,
        description: transactionType,
        externalId: referenceId,
        value: transactionNetAmount,
        balance: partialBalance,
        bank: "mercado-pago",
      })
    );
  }

  if (!lancamentos.length) {
    throw new Error(
      "O CSV nao trouxe movimentacoes reais validas para importar."
    );
  }

  return finalizeStructuredParserResult({
    saldoSugerido: lancamentos.length
      ? Number(lancamentos[lancamentos.length - 1].saldo || 0)
      : 0,
    lancamentos,
    parserMode: "CSV Mercado Pago / parser estruturado",
  });
}

function detectGenericDelimiter(lines) {
  const sampleLine = lines.find((line) => line.includes(";") || line.includes(","));
  return sampleLine?.includes(";") ? ";" : ",";
}

function parseGenericCSV(textContent, bank) {
  const lines = String(textContent || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const delimiter = detectGenericDelimiter(lines);
  const headerIndex = lines.findIndex((line) => {
    const cells = splitDelimitedLine(line, delimiter).map((cell) =>
      normalizeHeaderName(cell)
    );

    return (
      cells.some((cell) => ["DATA", "DATE", "RELEASE_DATE"].includes(cell)) &&
      cells.some((cell) =>
        ["DESCRICAO", "DESCRIPTION", "TRANSACTION_TYPE", "HISTORICO"].includes(
          cell
        )
      ) &&
      cells.some((cell) =>
        ["VALOR", "AMOUNT", "TRANSACTION_NET_AMOUNT"].includes(cell)
      )
    );
  });

  if (headerIndex === -1) {
    throw new Error("Nao encontrei cabecalho compativel no CSV enviado.");
  }

  const header = splitDelimitedLine(lines[headerIndex], delimiter).map((cell) =>
    normalizeHeaderName(cell)
  );
  const indexes = {
    data: header.findIndex((cell) => ["DATA", "DATE", "RELEASE_DATE"].includes(cell)),
    descricao: header.findIndex((cell) =>
      ["DESCRICAO", "DESCRIPTION", "TRANSACTION_TYPE", "HISTORICO"].includes(
        cell
      )
    ),
    valor: header.findIndex((cell) =>
      ["VALOR", "AMOUNT", "TRANSACTION_NET_AMOUNT"].includes(cell)
    ),
    saldo: header.findIndex((cell) =>
      ["SALDO", "BALANCE", "PARTIAL_BALANCE"].includes(cell)
    ),
    referencia: header.findIndex((cell) =>
      ["REFERENCE_ID", "ID_EXTERNO", "EXTERNAL_ID", "ID"].includes(cell)
    ),
  };

  const detectedBank = detectStatementBankByContent({
    selectedBank: bank,
    headers: lines[headerIndex] ? splitDelimitedLine(lines[headerIndex], delimiter) : [],
    contentText: lines.slice(0, Math.min(lines.length, 12)).join(" "),
  });
  const lancamentos = [];

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const row = splitDelimitedLine(lines[index], delimiter);

    if (row.length <= Math.max(indexes.data, indexes.descricao, indexes.valor)) {
      continue;
    }

    const description = normalizeStatementDescription(row[indexes.descricao]);
    const value = parseBrazilianAmount(row[indexes.valor]);
    const externalId = indexes.referencia >= 0 ? row[indexes.referencia] : "";

    if (!isValidTransactionDate(row[indexes.data])) {
      continue;
    }

    if (isStatementSummaryDescription(description)) {
      continue;
    }

    if (!description && !value) {
      continue;
    }

    lancamentos.push(
      buildImportedStatementItem({
        prefix: "extrato_csv",
        date: row[indexes.data],
        description,
        value,
        balance: indexes.saldo >= 0 ? parseBrazilianAmount(row[indexes.saldo]) : 0,
        externalId,
        bank: detectedBank,
      })
    );
  }

  if (!lancamentos.length) {
    throw new Error("O CSV nao trouxe movimentacoes reais validas para importar.");
  }

  return finalizeStructuredParserResult({
    saldoSugerido: lancamentos.length
      ? Number(lancamentos[lancamentos.length - 1].saldo || 0)
      : 0,
    lancamentos,
    parserMode: "CSV / parser generico",
  });
}

function normalizeSpreadsheetCellValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\uFEFF/g, "")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excelSerialToDate(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "";
  }

  const utcDays = Math.floor(numericValue - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  if (Number.isNaN(dateInfo.getTime())) {
    return "";
  }

  return dateInfo.toISOString().slice(0, 10);
}

function extractStructuredValueFromRow(row, indexes) {
  const directValue = indexes.valor >= 0 ? parseBrazilianAmount(row[indexes.valor]) : 0;
  const debitValue = indexes.debito >= 0 ? Math.abs(parseBrazilianAmount(row[indexes.debito])) : 0;
  const creditValue = indexes.credito >= 0 ? Math.abs(parseBrazilianAmount(row[indexes.credito])) : 0;

  if (indexes.valor >= 0) {
    return directValue;
  }

  if (creditValue > 0 && debitValue > 0) {
    return creditValue - debitValue;
  }

  if (creditValue > 0) {
    return creditValue;
  }

  if (debitValue > 0) {
    return -debitValue;
  }

  return 0;
}

function parseRowsAsStructuredTable(rows, bank, parserMode, prefix) {
  const normalizedRows = (Array.isArray(rows) ? rows : [])
    .map((row) => (Array.isArray(row) ? row.map((cell) => normalizeSpreadsheetCellValue(cell)) : []))
    .filter((row) => row.some((cell) => cell));

  const headerIndex = normalizedRows.findIndex((row) => {
    const cells = row.map((cell) => normalizeHeaderName(cell));

    return (
      cells.some((cell) => ["DATA", "DATE", "RELEASE_DATE", "DTPOSTED"].includes(cell)) &&
      cells.some((cell) =>
        ["DESCRICAO", "DESCRIPTION", "TRANSACTION_TYPE", "HISTORICO", "MEMO", "NAME"].includes(
          cell
        )
      ) &&
      cells.some((cell) =>
        ["VALOR", "AMOUNT", "TRANSACTION_NET_AMOUNT", "DEBITO", "CREDITO", "TRNAMT"].includes(cell)
      )
    );
  });

  if (headerIndex === -1) {
    throw new Error("Nao encontrei cabecalho compativel na planilha enviada.");
  }

  const header = normalizedRows[headerIndex].map((cell) => normalizeHeaderName(cell));
  const indexes = {
    data: header.findIndex((cell) => ["DATA", "DATE", "RELEASE_DATE", "DTPOSTED"].includes(cell)),
    descricao: header.findIndex((cell) =>
      ["DESCRICAO", "DESCRIPTION", "TRANSACTION_TYPE", "HISTORICO", "MEMO", "NAME"].includes(cell)
    ),
    valor: header.findIndex((cell) =>
      ["VALOR", "AMOUNT", "TRANSACTION_NET_AMOUNT", "TRNAMT"].includes(cell)
    ),
    saldo: header.findIndex((cell) =>
      ["SALDO", "BALANCE", "PARTIAL_BALANCE", "SALDO PARCIAL"].includes(cell)
    ),
    referencia: header.findIndex((cell) =>
      ["REFERENCE_ID", "ID_EXTERNO", "EXTERNAL_ID", "ID", "FITID"].includes(cell)
    ),
    debito: header.findIndex((cell) => ["DEBITO", "DEBIT"].includes(cell)),
    credito: header.findIndex((cell) => ["CREDITO", "CREDIT"].includes(cell)),
  };

  const detectedBank = detectStatementBankByContent({
    selectedBank: bank,
    headers: normalizedRows[headerIndex],
    contentText: normalizedRows.slice(0, Math.min(normalizedRows.length, 15)).flat().join(" "),
  });
  const lancamentos = [];

  for (let index = headerIndex + 1; index < normalizedRows.length; index += 1) {
    const row = normalizedRows[index];
    const rawDateValue = indexes.data >= 0 ? row[indexes.data] : "";
    const rawDate =
      /^\d{4,5}(\.\d+)?$/.test(String(rawDateValue || ""))
        ? excelSerialToDate(rawDateValue)
        : rawDateValue;
    const description = indexes.descricao >= 0 ? normalizeStatementDescription(row[indexes.descricao]) : "";
    const externalId = indexes.referencia >= 0 ? row[indexes.referencia] : "";
    const value = extractStructuredValueFromRow(row, indexes);
    const balance = indexes.saldo >= 0 ? parseBrazilianAmount(row[indexes.saldo]) : null;

    if (!isValidTransactionDate(rawDate)) {
      continue;
    }

    if (isStatementSummaryDescription(description)) {
      continue;
    }

    if (!description && !value) {
      continue;
    }

    lancamentos.push(
      buildImportedStatementItem({
        prefix,
        date: rawDate,
        description,
        externalId,
        value,
        balance,
        bank: detectedBank,
      })
    );
  }

  if (!lancamentos.length) {
    throw new Error("A planilha nao trouxe movimentacoes reais validas para importar.");
  }

  return finalizeStructuredParserResult({
    saldoSugerido: lancamentos.length
      ? Number(lancamentos[lancamentos.length - 1].saldo || 0)
      : 0,
    lancamentos,
    parserMode,
  });
}

async function unzipZipEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const entries = new Map();
  let eocdOffset = -1;

  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Nao foi possivel localizar a estrutura ZIP do arquivo XLSX.");
  }

  const centralDirectorySize = view.getUint32(eocdOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  let pointer = centralDirectoryOffset;
  const decoder = new TextDecoder("utf-8");

  async function inflateZipEntry(compressedBytes, method) {
    if (method === 0) {
      return compressedBytes;
    }

    if (method !== 8 || typeof DecompressionStream === "undefined") {
      throw new Error("Este navegador nao conseguiu descompactar a planilha XLSX com seguranca.");
    }

    const stream = new Blob([compressedBytes]).stream().pipeThrough(
      new DecompressionStream("deflate-raw")
    );
    const response = new Response(stream);
    return new Uint8Array(await response.arrayBuffer());
  }

  while (pointer < centralDirectoryOffset + centralDirectorySize) {
    if (view.getUint32(pointer, true) !== 0x02014b50) {
      break;
    }

    const compressionMethod = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const fileNameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localHeaderOffset = view.getUint32(pointer + 42, true);
    const fileNameBytes = bytes.slice(pointer + 46, pointer + 46 + fileNameLength);
    const fileName = decoder.decode(fileNameBytes);
    const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedBytes = bytes.slice(dataStart, dataStart + compressedSize);
    const inflatedBytes = await inflateZipEntry(compressedBytes, compressionMethod);

    entries.set(fileName, decoder.decode(inflatedBytes));
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function getXlsxCellColumn(ref) {
  const match = String(ref || "").match(/[A-Z]+/i);
  return match ? match[0].toUpperCase() : "";
}

function getXlsxCellRow(ref) {
  const match = String(ref || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseXlsxRows(entries) {
  const parser = new DOMParser();
  const sharedStringsXml = entries.get("xl/sharedStrings.xml");
  const workbookXml = entries.get("xl/workbook.xml");
  const workbookRelsXml = entries.get("xl/_rels/workbook.xml.rels");

  if (!workbookXml) {
    throw new Error("A planilha XLSX nao trouxe workbook valido.");
  }

  const sharedStrings = [];

  if (sharedStringsXml) {
    const sharedStringsDoc = parser.parseFromString(sharedStringsXml, "application/xml");
    sharedStringsDoc.querySelectorAll("si").forEach((node) => {
      const textValue = Array.from(node.querySelectorAll("t"))
        .map((item) => item.textContent || "")
        .join("");
      sharedStrings.push(textValue);
    });
  }

  const workbookDoc = parser.parseFromString(workbookXml, "application/xml");
  const workbookRelsDoc = workbookRelsXml
    ? parser.parseFromString(workbookRelsXml, "application/xml")
    : null;
  const firstSheet = workbookDoc.querySelector("sheet");

  if (!firstSheet) {
    throw new Error("A planilha XLSX nao trouxe abas com dados.");
  }

  const relationshipId =
    firstSheet.getAttribute("r:id") ||
    firstSheet.getAttribute("id") ||
    "";
  let targetPath = "xl/worksheets/sheet1.xml";

  if (workbookRelsDoc && relationshipId) {
    const relationshipNode = Array.from(workbookRelsDoc.querySelectorAll("Relationship")).find(
      (node) => node.getAttribute("Id") === relationshipId
    );

    if (relationshipNode?.getAttribute("Target")) {
      targetPath = `xl/${relationshipNode.getAttribute("Target").replace(/^\/+/, "")}`.replace(
        "xl/xl/",
        "xl/"
      );
    }
  }

  const sheetXml = entries.get(targetPath);

  if (!sheetXml) {
    throw new Error("Nao foi possivel localizar a primeira planilha XLSX com dados.");
  }

  const sheetDoc = parser.parseFromString(sheetXml, "application/xml");
  const rowsMap = new Map();

  sheetDoc.querySelectorAll("sheetData row").forEach((rowNode) => {
    rowNode.querySelectorAll("c").forEach((cellNode) => {
      const ref = cellNode.getAttribute("r") || "";
      const column = getXlsxCellColumn(ref);
      const rowNumber = getXlsxCellRow(ref);
      const type = cellNode.getAttribute("t") || "";
      const valueNode = cellNode.querySelector("v");
      const inlineTextNode = cellNode.querySelector("is t");
      let cellValue = "";

      if (type === "s" && valueNode) {
        cellValue = sharedStrings[Number(valueNode.textContent || 0)] || "";
      } else if (type === "inlineStr" && inlineTextNode) {
        cellValue = inlineTextNode.textContent || "";
      } else if (valueNode) {
        cellValue = valueNode.textContent || "";
      }

      if (!rowsMap.has(rowNumber)) {
        rowsMap.set(rowNumber, {});
      }

      rowsMap.get(rowNumber)[column] = cellValue;
    });
  });

  const orderedColumns = Array.from(
    new Set(Array.from(rowsMap.values()).flatMap((row) => Object.keys(row)))
  ).sort((left, right) => left.localeCompare(right));

  return Array.from(rowsMap.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([, row]) =>
      orderedColumns.map((column) => {
        const value = row[column] || "";
        const normalizedValue = normalizeSpreadsheetCellValue(value);

        if (/^\d{4,5}(\.\d+)?$/.test(normalizedValue) && ["A", "B"].includes(column)) {
          const excelDate = excelSerialToDate(normalizedValue);
          return excelDate || normalizedValue;
        }

        return normalizedValue;
      })
    );
}

function parseXlsRows(arrayBuffer) {
  const decodedText = decodeImportedBinaryContent(arrayBuffer);
  const normalizedText = String(decodedText || "").trim();

  if (!normalizedText) {
    throw new Error("O arquivo XLS nao trouxe conteudo legivel para importacao segura.");
  }

  if (/<WORKBOOK|<WORKSHEET|<TABLE|<ROW|<CELL/i.test(normalizedText)) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(normalizedText, "application/xml");
    return Array.from(doc.querySelectorAll("Worksheet Table Row")).map((rowNode) =>
      Array.from(rowNode.querySelectorAll("Cell")).map((cellNode) =>
        normalizeSpreadsheetCellValue(cellNode.textContent || "")
      )
    );
  }

  if (/<table|<tr|<td/i.test(normalizedText)) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(normalizedText, "text/html");
    return Array.from(doc.querySelectorAll("tr")).map((rowNode) =>
      Array.from(rowNode.querySelectorAll("th, td")).map((cellNode) =>
        normalizeSpreadsheetCellValue(cellNode.textContent || "")
      )
    );
  }

  if (/\t/.test(normalizedText)) {
    return normalizedText
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.split("\t").map((cell) => normalizeSpreadsheetCellValue(cell)))
      .filter((row) => row.some((cell) => cell));
  }

  throw new Error(
    "O arquivo XLS enviado nao trouxe estrutura tabular legivel com seguranca. Exporte como XLSX ou CSV."
  );
}

async function parseXLSX(fileContent, bank, format = "xlsx") {
  if (!(fileContent instanceof ArrayBuffer)) {
    throw new Error("A leitura da planilha exige o arquivo original em formato binario.");
  }

  if (format === "xls") {
    const rows = parseXlsRows(fileContent);
    return parseRowsAsStructuredTable(rows, bank, "XLS / parser estruturado", "extrato_xls");
  }

  const entries = await unzipZipEntries(fileContent);
  const rows = parseXlsxRows(entries);
  return parseRowsAsStructuredTable(rows, bank, "XLSX / parser estruturado", "extrato_xlsx");
}

function parseOFX(textContent, bank) {
  const normalizedContent = String(textContent || "");
  const detectedBank = detectStatementBankByContent({
    selectedBank: bank,
    contentText: normalizedContent,
  });
  const statementBlocks = normalizedContent.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  const ledgerBalanceMatch = normalizedContent.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\r\n]+)/i);
  const finalBalance = ledgerBalanceMatch ? Number(String(ledgerBalanceMatch[1]).replace(",", ".")) : null;
  const lancamentos = statementBlocks
    .map((block) => {
      const dateMatch = block.match(/<DTPOSTED>(\d{8})/i);
      const amountMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
      const fitIdMatch = block.match(/<FITID>([^<\r\n]+)/i);
      const memoMatch = block.match(/<MEMO>([^<]+)/i);
      const nameMatch = block.match(/<NAME>([^<]+)/i);
      const typeMatch = block.match(/<TRNTYPE>([^<]+)/i);
      const rawDate = dateMatch
        ? `${dateMatch[1].slice(0, 4)}-${dateMatch[1].slice(4, 6)}-${dateMatch[1].slice(6, 8)}`
        : "";
      const rawAmount = amountMatch ? Number(String(amountMatch[1]).replace(",", ".")) : NaN;
      const description = normalizeStatementDescription(
        memoMatch?.[1] || nameMatch?.[1] || typeMatch?.[1] || ""
      );

      if (!isValidTransactionDate(rawDate)) {
        return null;
      }

      if (!description || isStatementSummaryDescription(description) || !Number.isFinite(rawAmount)) {
        return null;
      }

      return buildImportedStatementItem({
        prefix: "extrato_ofx",
        date: rawDate,
        description,
        value: rawAmount,
        externalId: fitIdMatch?.[1] || "",
        balance: null,
        bank: detectedBank,
      });
    })
    .filter(Boolean);

  if (!lancamentos.length) {
    throw new Error("O OFX nao trouxe movimentacoes reais validas para importar.");
  }

  return finalizeStructuredParserResult({
    saldoSugerido: Number.isFinite(finalBalance) ? finalBalance : 0,
    lancamentos,
    parserMode: "OFX / parser estruturado",
  });
}

function parsePDFMercadoPago(fileName, fileContent) {
  const source = `${fileName} ${String(fileContent || "")}`;
  const value = extractImportAmount(source);

  return {
    saldoSugerido: value > 0 ? value : 0,
    lancamentos: [
      buildImportedStatementItem({
        prefix: "extrato_mp_pdf",
        date: extractImportDate(source),
        description:
          normalizeImportDescription(fileName) || "Lancamento Mercado Pago",
        value,
        balance: value > 0 ? value : 0,
        bank: "mercado-pago",
      }),
    ],
    validation: null,
    parserMode: "PDF Mercado Pago / parser heuristico",
  };
}

function parseGenerico(fileName, fileContent, bank) {
  const decodedContent = decodeImportedBinaryContent(fileContent);

  if (/<OFX>|<BANKTRANLIST>|<STMTTRN>/i.test(decodedContent)) {
    return parseOFX(decodedContent, bank);
  }

  if (/[;,]/.test(decodedContent) && /\n/.test(decodedContent)) {
    return parseGenericCSV(decodedContent, bank);
  }

  throw new Error(
    `O arquivo ${fileName || "selecionado"} nao trouxe estrutura suficiente para importacao segura nesta etapa.`
  );
}

function montarRevisaoImportacaoOcr(session) {
  if (!session) {
    return `
      <div class="subtle-panel">
        <strong>Nenhum arquivo nao estruturado preparado</strong>
        <span class="section-note">
          Selecione um print, screenshot ou PDF imagem para iniciar a camada OCR separada.
        </span>
      </div>
    `;
  }

  const reviewItems = Array.isArray(session.reviewItems) ? session.reviewItems : [];

  if (!reviewItems.length) {
    return `
      <div class="subtle-panel">
        <strong>Arquivo nao estruturado detectado</strong>
        <span class="section-note">
          ${session.fileName || "Arquivo sem nome"} | ${session.bank || "Banco nao identificado"} | ${
            session.format || "formato nao identificado"
          }
        </span>
        <span class="section-note">${session.reason}</span>
        <span class="section-note">
          Nenhuma linha sera gravada no ledger sem extracao OCR confiavel e revisao manual.
        </span>
      </div>
    `;
  }

  return reviewItems
    .map(
      (item) => `
        <div class="subtle-panel" data-statement-id="${item.id}">
          <strong>${item.descricao}</strong>
          <span class="section-note">
            ${item.data || ""} | Confianca: ${Math.round(Number(item.confidence || 0) * 100)}% | ${
              item.tipo === "saida" ? "Saida" : "Entrada"
            }
          </span>
          <div class="receipt-form-grid">
            <div class="field">
              <span>Descricao</span>
              <input type="text" data-statement-field="descricao" value="${item.descricao}" />
            </div>
            <div class="field">
              <span>Valor</span>
              <input type="text" inputmode="decimal" data-statement-field="valor" value="${item.valor || ""}" />
            </div>
            <div class="field">
              <span>Data</span>
              <input type="date" data-statement-field="data" value="${item.data || ""}" />
            </div>
            <div class="field">
              <span>Categoria</span>
              <select class="app-select" data-statement-field="categoria">
                ${IMPORT_CATEGORIES.map((category) => `
                  <option value="${category}" ${item.categoria === category ? "selected" : ""}>${category}</option>
                `).join("")}
              </select>
            </div>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <span>Score de confianca</span>
              <strong>${Math.round(Number(item.confidence || 0) * 100)}%</strong>
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderStatementPreview() {
  if (!statementPreviewList) {
    return;
  }

  const entryCount = statementDraftsState.filter((item) => item.tipo === "entrada").length;
  const exitCount = statementDraftsState.filter((item) => item.tipo === "saida").length;
  const unstructuredReviewItems = statementUnstructuredState?.reviewItems || [];

  if (statementTotalPreview) {
    statementTotalPreview.textContent = String(
      statementImportFlowState === "unstructured"
        ? unstructuredReviewItems.length
        : statementDraftsState.length
    );
  }

  if (statementEntriesPreview) {
    statementEntriesPreview.textContent = String(
      statementImportFlowState === "unstructured"
        ? unstructuredReviewItems.filter((item) => item.tipo === "entrada").length
        : entryCount
    );
  }

  if (statementExitsPreview) {
    statementExitsPreview.textContent = String(
      statementImportFlowState === "unstructured"
        ? unstructuredReviewItems.filter((item) => item.tipo === "saida").length
        : exitCount
    );
  }

  if (statementImportFlowState === "unstructured") {
    getElement("statement-status-chip").textContent = statementUnstructuredState?.blocked
      ? "OCR pendente"
      : "Revisao OCR pronta";
    getElement("statement-balance-preview").textContent = formatBankingCurrency(0);
    getElement("confirm-imported-expenses-button").classList.add("hidden");

    if (statementBalanceActions) {
      statementBalanceActions.classList.add("hidden");
    }

    statementPreviewList.innerHTML = montarRevisaoImportacaoOcr(statementUnstructuredState);
    return;
  }

  if (!statementDraftsState.length) {
    statementPreviewList.innerHTML = `
      <div class="subtle-panel">
        <strong>Nenhum arquivo processado</strong>
        <span class="section-note">
          Escolha um arquivo, leia os lancamentos e revise antes de confirmar a importacao.
        </span>
      </div>
    `;
    getElement("statement-status-chip").textContent = "Aguardando arquivo";
    getElement("statement-balance-preview").textContent = formatBankingCurrency(0);
    getElement("read-statement-button").classList.toggle(
      "hidden",
      !statementFileInput?.files?.[0]
    );
    getElement("confirm-imported-expenses-button").classList.add("hidden");

    if (statementBalanceActions) {
      statementBalanceActions.classList.add("hidden");
    }

    statementValidationState = null;

    return;
  }

  getElement("statement-status-chip").textContent = "Revisao pronta";
  getElement("statement-balance-preview").textContent = formatBankingCurrency(
    statementBalanceSuggestion
  );
  getElement("confirm-imported-expenses-button").classList.remove("hidden");

  if (statementValidationState && !statementValidationState.consistente) {
    getElement("statement-status-chip").textContent = "Revisao com divergencia";
    getElement("confirm-imported-expenses-button").classList.add("hidden");
  }

  statementPreviewList.innerHTML = montarRevisaoLancamentos(statementDraftsState);
}

function montarRevisaoLancamentos(lancamentos) {
  return lancamentos
    .map(
      (item) => `
        <div class="subtle-panel" data-statement-id="${item.id}">
          <strong>${item.descricao}</strong>
          <span class="section-note">
            ${item.data} | ${item.tipo === "saida" ? "Saida" : "Entrada"} | Categoria sugerida: ${
              item.categoria || item.categoriaSugerida || "outros"
            }
          </span>
          <div class="receipt-form-grid">
            <div class="field">
              <span>Descricao</span>
              <input type="text" data-statement-field="descricao" value="${item.descricao}" />
            </div>
            <div class="field">
              <span>Valor</span>
              <input type="text" inputmode="decimal" data-statement-field="valor" value="${item.valor || ""}" />
            </div>
            <div class="field">
              <span>Data</span>
              <input type="date" data-statement-field="data" value="${item.data}" />
            </div>
            <div class="field">
              <span>Categoria</span>
              <select class="app-select" data-statement-field="categoria">
                ${IMPORT_CATEGORIES.map((category) => `
                  <option value="${category}" ${item.categoria === category ? "selected" : ""}>${category}</option>
                `).join("")}
              </select>
            </div>
          </div>
          <div class="button-row align-start">
            <button type="button" class="ghost-button small-button" data-action="remove-statement-item" data-id="${item.id}">
              Remover item
            </button>
          </div>
        </div>
      `
    )
    .join("");
}

function syncCycleFields() {
  const isCycleTwo = tipoCicloInput.value === "ciclo2";
  getElement("diaPagamento2").disabled = !isCycleTwo;
  diaPagamento2Wrapper.style.display = isCycleTwo ? "grid" : "none";
  getElement("percentualPagamento1").parentElement.style.display = isCycleTwo ? "grid" : "none";
  getElement("percentualPagamento2").parentElement.style.display = isCycleTwo ? "grid" : "none";
  getElement("cycle-next-payment-value").parentElement.style.display = isCycleTwo ? "grid" : "none";
  getElement("cycle-next-payment-date").parentElement.style.display = "none";
  getElement("cycle-next-payment-days").parentElement.style.display = "none";
  getElement("cycle-percent-total").parentElement.style.display = "none";

  if (!isCycleTwo) {
    getElement("percentualPagamento1").value = 100;
    getElement("percentualPagamento2").value = 0;
  }
}

function syncBalanceMode() {
  const manualMode = getElement("origemSaldoModo").value === "manual";

  if (saldoAtualField) {
    saldoAtualField.classList.toggle("hidden", !manualMode);
  }

  if (extratoActionSection) {
    extratoActionSection.classList.toggle("hidden", manualMode);
  }

  if (origemSaldoBancoWrapper) {
    origemSaldoBancoWrapper.classList.add("hidden");
  }

  getElement("saldoAtual").disabled = !manualMode;
  getElement("saldoManualHint").classList.toggle("hidden", !manualMode);
  getElement("saldoManualHint").textContent = manualMode
    ? "Atualize seus gastos ao final do dia para manter o saldo correto."
    : "No modo por extrato, o saldo so muda depois da sua confirmacao manual.";
}

function resetStatementWorkflow() {
  statementDraftsState = [];
  statementBalanceSuggestion = 0;
  statementValidationState = null;
  statementImportFlowState = "structured";
  statementUnstructuredState = null;

  if (statementFileInput) {
    statementFileInput.value = "";
  }

  if (statementSelectedFileName) {
    statementSelectedFileName.textContent = "Nenhum arquivo escolhido";
  }

  getElement("statementPeriodStart").value = "";
  getElement("statementPeriodEnd").value = "";
  getElement("read-statement-button").classList.add("hidden");
  getElement("confirm-imported-expenses-button").classList.add("hidden");

  if (statementBalanceActions) {
    statementBalanceActions.classList.add("hidden");
  }

  showMessage(statementMessage, "hidden", "");
  renderStatementPreview();
}

function handleBalanceModeChange() {
  const manualMode = getElement("origemSaldoModo").value === "manual";

  if (manualMode) {
    resetStatementWorkflow();
    getElement("statementBank").value = "mercado-pago";
    getElement("origemSaldoBanco").value = "mercado-pago";
  } else {
    getElement("saldoAtual").value = "";
    resetStatementWorkflow();
  }

  syncBalanceMode();
  updateSalaryPreview();
  updateCyclePreview();
  updateSummaryPreview();
  updateBankingStatusChip();
}

function buildBankingPayload() {
  const diasPagamento = [toBankingNumber(getElement("diaPagamento1").value)];

  if (tipoCicloInput.value === "ciclo2") {
    diasPagamento.push(toBankingNumber(getElement("diaPagamento2").value));
  }

  const payload = {
    saldoAtual: toBankingNumber(getElement("saldoAtual").value),
    origemSaldo: {
      modo: getElement("origemSaldoModo").value,
      banco: getElement("origemSaldoBanco").value,
      periodoInicio: getElement("statementPeriodStart").value,
      periodoFim: getElement("statementPeriodEnd").value,
      ultimoArquivo: statementFileInput?.files?.[0]?.name || "",
      ultimoSaldoImportado: statementBalanceSuggestion,
    },
    salarioBruto: toBankingNumber(getElement("salarioBruto").value),
    salarioLiquidoModo: salarioLiquidoModoState,
    salarioLiquidoManual: salarioLiquidoModoState === "manual"
      ? toBankingNumber(salarioLiquidoManualInput?.value)
      : 0,
    descontosDetalhados: {
      planoSaude: toBankingNumber(getElement("planoSaude").value),
      planoOdontologico: toBankingNumber(getElement("planoOdontologico").value),
      vt: toBankingNumber(getElement("vt").value),
      vrVa: toBankingNumber(getElement("vrVa").value),
      vrVaDescontadoEmFolha: getElement("vrVaDescontadoEmFolha").checked,
      outrosDescontos: [...outrosDescontosState],
    },
    tipoCiclo: tipoCicloInput.value,
    diasPagamento: diasPagamento.filter((day) => day > 0),
    percentuaisPagamento: [
      toBankingNumber(getElement("percentualPagamento1").value),
      toBankingNumber(getElement("percentualPagamento2").value),
    ],
    beneficios: {
      vrVa: {
        ativo: toBankingNumber(getElement("vrVa").value) > 0,
        valor: toBankingNumber(getElement("vrVa").value),
        dataRecebimento: toBankingNumber(getElement("vrvaDataPrevista").value?.slice(8, 10)),
        descontadoEmFolha: getElement("vrVaDescontadoEmFolha").checked,
      },
    },
  };

  const salarySummary = calculateBankingNetSalary(payload);
  payload.descontosAutomaticos = {
    inss: salarySummary.inss,
    irpf: salarySummary.irpf,
  };
  const salarioLiquidoCalculado = calcularSalarioLiquidoBanco({
    ...payload,
    salarioLiquido: salarySummary.salarioLiquido,
  });
  payload.salarioLiquido = salarioLiquidoModoState === "manual"
    ? Math.max(toBankingNumber(salarioLiquidoManualInput?.value), 0)
    : salarioLiquidoCalculado;
  return payload;
}

function buildPreviewData() {
  const data = loadBankingData();
  return {
    ...data,
    banking: {
      ...data.banking,
      ...buildBankingPayload(),
    },
    recebimentos: {
      ...data.recebimentos,
      pagamento: {
        ...data.recebimentos.pagamento,
        dataPrevista: getElement("pagamentoDataPrevista").value,
        valorPrevisto: toBankingNumber(getElement("pagamentoValorPrevisto").value),
      },
    },
  };
}

function getAccordionSection(name) {
  return document.querySelector(`[data-accordion-section="${name}"]`);
}

function getAccordionToggle(name) {
  return document.querySelector(`[data-accordion-toggle="${name}"]`);
}

function setAccordionState(name, isOpen) {
  const section = getAccordionSection(name);
  const toggle = getAccordionToggle(name);

  if (!section || !toggle) {
    return;
  }

  section.classList.toggle("is-open", isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
}

function closeAllBankingAccordions() {
  accordionSections.forEach((section) => {
    setAccordionState(section.dataset.accordionSection, false);
  });
}

function toggleAccordion(name) {
  const section = getAccordionSection(name);

  if (!section) {
    return;
  }

  const nextState = !section.classList.contains("is-open");
  setAccordionState(name, nextState);
}

function updateAccordionSummaries() {
  const payload = buildBankingPayload();
  const paymentDays = payload.diasPagamento.filter((day) => day > 0);
  const paymentPercentages =
    payload.tipoCiclo === "ciclo2"
      ? payload.percentuaisPagamento.slice(0, 2)
      : [payload.percentuaisPagamento[0] || 100];
  const manualDiscountsTotal =
    Number(payload.descontosDetalhados?.planoSaude || 0)
    + Number(payload.descontosDetalhados?.planoOdontologico || 0)
    + Number(payload.descontosDetalhados?.vt || 0)
    + (payload.descontosDetalhados?.vrVaDescontadoEmFolha
      ? Number(payload.descontosDetalhados?.vrVa || 0)
      : 0)
    + outrosDescontosState.reduce(
      (total, item) => total + Number(item.valor || 0),
      0
    );
  const discountsTotal =
    Number(payload.descontosAutomaticos?.inss || 0)
    + Number(payload.descontosAutomaticos?.irpf || 0)
    + manualDiscountsTotal;
  const benefitValue = toBankingNumber(getElement("vrvaValorPrevisto")?.value)
    || Number(payload.beneficios?.vrVa?.valor || 0);
  const benefitReceived = Boolean(getElement("vrvaRecebido")?.checked);
  const balanceMode = payload.origemSaldo?.modo === "extrato" ? "Importar extrato" : "Manual";
  const balanceValue =
    payload.origemSaldo?.modo === "extrato" && statementBalanceSuggestion > 0
      ? statementBalanceSuggestion
      : Number(payload.saldoAtual || 0);

  if (balanceAccordionSummary) {
    balanceAccordionSummary.textContent = `Saldo: ${formatBankingCurrency(
      balanceValue
    )} | ${balanceMode}`;
  }

  if (salaryAccordionSummary) {
    salaryAccordionSummary.textContent = `Bruto: ${formatBankingCurrency(
      payload.salarioBruto
    )} | Líquido: ${formatBankingCurrency(payload.salarioLiquido)}`;
  }

  if (discountsAccordionSummary) {
    discountsAccordionSummary.textContent = `Total: ${formatBankingCurrency(
      discountsTotal
    )}`;
  }

  if (cycleAccordionSummary) {
    const daysLabel = paymentDays.length
      ? paymentDays.map((day) => `Dia ${day}`).join(" / ")
      : "Dias nao definidos";
    if (payload.tipoCiclo === "ciclo2") {
      const percentagesLabel = paymentPercentages
        .map((percentage) => `${Number(percentage || 0)}%`)
        .join(" / ");
      cycleAccordionSummary.textContent = `${daysLabel} | ${percentagesLabel}`;
    } else {
      cycleAccordionSummary.textContent = daysLabel;
    }
  }

  if (benefitsAccordionSummary) {
    benefitsAccordionSummary.textContent = benefitReceived
      ? `VR/VA: ${formatBankingCurrency(benefitValue)} | Recebido`
      : `VR/VA: ${formatBankingCurrency(benefitValue)}`;
  }
}

function setSalarioLiquidoMode(mode) {
  salarioLiquidoModoState = mode === "manual" ? "manual" : "auto";

  if (salarioLiquidoManualField) {
    salarioLiquidoManualField.classList.toggle("hidden", salarioLiquidoModoState !== "manual");
  }

  salaryModeButtons.forEach((button) => {
    const isActive = button.dataset.salaryLiquidoMode === salarioLiquidoModoState;
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("active", isActive);
  });
}

function syncSalarioLiquidoModeFromPayload(banking) {
  const mode = banking?.salarioLiquidoModo || banking?.salarioLiquidoModoOverride || "auto";
  salarioLiquidoManualState = toBankingNumber(
    banking?.salarioLiquidoManual ?? banking?.salarioLiquidoReal ?? 0
  );
  setSalarioLiquidoMode(mode);
  if (salarioLiquidoManualInput) {
    salarioLiquidoManualInput.value =
      salarioLiquidoManualState > 0 ? formatBankingCurrency(salarioLiquidoManualState) : "";
  }
}

function bindAccordionToggles() {
  accordionSections.forEach((section) => {
    const name = section.dataset.accordionSection;
    const toggle = getAccordionToggle(name);

    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", () => {
      toggleAccordion(name);
    });
  });
}

function updateSalaryPreview() {
  const payload = buildBankingPayload();
  const salarySummary = calculateBankingNetSalary(payload);
  const salarioLiquidoCalculado = salarySummary.salarioLiquido;
  const salarioLiquidoExibido =
    salarioLiquidoModoState === "manual"
      ? Math.max(toBankingNumber(salarioLiquidoManualInput?.value), 0)
      : salarioLiquidoCalculado;

  getElement("inssCalculado").value = formatBankingCurrency(
    payload.descontosAutomaticos?.inss ?? calculateBankingInss(payload.salarioBruto)
  );
  getElement("irpfCalculado").value = formatBankingCurrency(
    payload.descontosAutomaticos?.irpf ??
      calculateBankingIrpf(
        payload.salarioBruto,
        payload.descontosAutomaticos?.inss || 0
      )
  );
  getElement("salarioLiquido").value = formatBankingCurrency(salarioLiquidoExibido);
  if (salarioLiquidoModoState === "auto" && salarioLiquidoManualInput) {
    salarioLiquidoManualInput.value = formatBankingCurrency(salarioLiquidoManualState || salarioLiquidoCalculado);
  }
  updateAccordionSummaries();
}

function updateCyclePreview() {
  const paymentInfo = calculateBankingNextPayment(buildPreviewData());
  const totalPercentage =
    toBankingNumber(getElement("percentualPagamento1").value) +
    toBankingNumber(getElement("percentualPagamento2").value);

  getElement("cycle-next-payment-date").value = paymentInfo.nextDate
    ? formatBankingDateLong(paymentInfo.nextDate)
    : "--";
  getElement("cycle-next-payment-days").value = `${paymentInfo.daysRemaining} dia(s)`;
  getElement("cycle-next-payment-value").value = formatBankingCurrency(paymentInfo.value);
  getElement("cycle-percent-total").value = `${totalPercentage}%`;
  updateAccordionSummaries();
}

function updateSummaryPreview() {
  if (!bankingSummarySaldo) {
    return;
  }

  const summary = calculateBankingSummary(buildPreviewData());

  bankingSummarySaldo.textContent = formatBankingCurrency(summary.saldoAtual);
  bankingSummaryPayment.textContent = formatBankingCurrency(summary.paymentInfo.value);
  bankingSummaryDays.textContent = `${summary.diasRestantes} dia(s)`;
  bankingSummaryDaily.textContent = formatBankingCurrency(summary.limiteDiario);
}

function updateBankingStatusChip() {
  const payload = buildBankingPayload();
  bankingStatusChip.textContent =
    !payload.saldoAtual && !payload.salarioBruto
      ? "Aguardando configuracao"
      : "Cadastro pronto";
}

function renderOutrosDescontos() {
  if (!outrosDescontosState.length) {
    outrosDescontosList.innerHTML = `
      <div class="subtle-panel">
        <strong>Nenhum desconto extra adicionado</strong>
        <span class="section-note">Use essa lista apenas para descontos fora dos campos padrao da folha.</span>
      </div>
    `;
    return;
  }

  outrosDescontosList.innerHTML = outrosDescontosState
    .map(
      (item) => `
        <div class="list-row">
          <div class="list-row-content">
            <strong>${item.nome}</strong>
            <span>${formatBankingCurrency(item.valor)}</span>
          </div>
          <button type="button" class="ghost-button small-button" data-remove-other-discount="${item.id}">
            Remover
          </button>
        </div>
      `
    )
    .join("");
}

function renderBankingForm() {
  const banking = carregarCadastroBancario();

  getElement("saldoAtual").value = banking.saldoAtual || "";
  getElement("origemSaldoModo").value = banking.origemSaldo?.modo || "manual";
  getElement("origemSaldoBanco").value =
    banking.origemSaldo?.banco || "mercado-pago";
  getElement("statementBank").value = banking.origemSaldo?.banco || "mercado-pago";
  getElement("statementPeriodStart").value =
    banking.origemSaldo?.periodoInicio || "";
  getElement("statementPeriodEnd").value =
    banking.origemSaldo?.periodoFim || "";
  getElement("salarioBruto").value = banking.salarioBruto || "";
  getElement("inssCalculado").value = formatBankingCurrency(
    banking.descontosAutomaticos?.inss || 0
  );
  getElement("irpfCalculado").value = formatBankingCurrency(
    banking.descontosAutomaticos?.irpf || 0
  );
  getElement("planoSaude").value = banking.descontosDetalhados?.planoSaude || "";
  getElement("planoOdontologico").value = banking.descontosDetalhados?.planoOdontologico || "";
  getElement("vt").value = banking.descontosDetalhados?.vt || "";
  getElement("vrVa").value = banking.descontosDetalhados?.vrVa || "";
  getElement("vrVaDescontadoEmFolha").checked = Boolean(
    banking.descontosDetalhados?.vrVaDescontadoEmFolha
  );
  getElement("tipoCiclo").value = banking.tipoCiclo || "ciclo1";
  getElement("diaPagamento1").value = banking.diasPagamento?.[0] || 5;
  getElement("diaPagamento2").value = banking.diasPagamento?.[1] || 20;
  getElement("percentualPagamento1").value =
    banking.percentuaisPagamento?.[0] || 100;
  getElement("percentualPagamento2").value =
    banking.percentuaisPagamento?.[1] || 0;

  syncSalarioLiquidoModeFromPayload(banking);

  outrosDescontosState = Array.isArray(banking.descontosDetalhados?.outrosDescontos)
    ? [...banking.descontosDetalhados.outrosDescontos]
    : [];

  syncCycleFields();
  syncBalanceMode();
  renderOutrosDescontos();
  renderStatementPreview();
  updateSalaryPreview();
  updateCyclePreview();
  updateSummaryPreview();
  updateBankingStatusChip();
  updateAccordionSummaries();
}

function renderPaymentReceipt() {
  const data = loadBankingData();
  const paymentInfo = calculateBankingNextPayment(data);
  const receipt = carregarRegistroPagamento();

  getElement("pagamento-proxima-previsao").textContent = paymentInfo.nextDate
    ? `${formatBankingDateLong(paymentInfo.nextDate)} - ${formatBankingCurrency(paymentInfo.value)}`
    : "--";
  getElement("pagamento-dias-restantes").textContent = String(paymentInfo.daysRemaining);
  getElement("pagamentoDataPrevista").value = formatInputDate(
    receipt.dataPrevista || paymentInfo.nextDate
  );
  const paymentValue =
    receipt.valorPrevisto !== undefined && receipt.valorPrevisto !== null
      ? receipt.valorPrevisto
      : paymentInfo.value;
  getElement("pagamentoValorPrevisto").value =
    paymentValue !== undefined && paymentValue !== null ? toBankingNumber(paymentValue) : "";
  getElement("pagamento-status-chip").textContent = receipt.dataPrevista
    ? receipt.status === "recebido"
      ? "Recebido"
      : "Pendente"
    : "Pendente";
}

function renderBenefitReceipt() {
  const data = loadBankingData();
  const benefitInfo = getBankingNextBenefitInfo(data, "vrVa");
  const receipt = carregarBeneficios().vrVa || carregarVRVA();
  const active = true;

  getElement("vrvaDataPrevista").value = formatInputDate(
    receipt.dataPrevista || benefitInfo.nextDate
  );
  const benefitValue =
    receipt.valorPrevisto !== undefined && receipt.valorPrevisto !== null
      ? receipt.valorPrevisto
      : benefitInfo.value;
  getElement("vrvaValorPrevisto").value =
    benefitValue !== undefined && benefitValue !== null ? toBankingNumber(benefitValue) : "";
  getElement("vrvaRecebido").checked = receipt.status === "recebido";

  ["vrvaDataPrevista", "vrvaValorPrevisto", "vrvaRecebido"].forEach((id) => {
    getElement(id).disabled = !active;
  });

  getElement("save-vrva-button").disabled = !active;
  getElement("edit-vrva-button").disabled = !active;
  getElement("vrvaHint").textContent = active
    ? benefitInfo.nextDate
      ? `Proxima previsao em ${formatBankingDateLong(benefitInfo.nextDate)}.`
      : "Registro pronto para edicao."
    : "Informe um valor de VR/VA na base financeira para registrar esse beneficio.";
  updateAccordionSummaries();
}

function renderReceiptArea() {
  const summary = calculateBankingSummary(loadBankingData());
  renderPaymentReceipt();
  renderBenefitReceipt();
  updateSummaryPreview();

  beneficiosStatusChip.textContent = summary.benefits.active.length
    ? "VR/VA configurado"
    : "Sem beneficio";
  receiptStatusChip.textContent =
    summary.paymentInfo.configured || summary.benefits.active.length
      ? "Pronto para registrar"
      : "Faltam configuracoes";
}

function addOutroDesconto() {
  const nome = outroDescontoNomeInput.value.trim();
  const valor = toBankingNumber(outroDescontoValorInput.value);

  if (!nome || valor <= 0) {
    showMessage(bankingMessage, "error", "Informe nome e valor validos para adicionar outro desconto.");
    return;
  }

  outrosDescontosState.push({ id: createId("desconto"), nome, valor });
  outroDescontoNomeInput.value = "";
  outroDescontoValorInput.value = "";
  renderOutrosDescontos();
  updateSalaryPreview();
  updateSummaryPreview();
  updateAccordionSummaries();
}

function removeOutroDesconto(event) {
  const button = event.target.closest("[data-remove-other-discount]");

  if (!button) {
    return;
  }

  outrosDescontosState = outrosDescontosState.filter(
    (item) => item.id !== button.dataset.removeOtherDiscount
  );
  renderOutrosDescontos();
  updateSalaryPreview();
  updateSummaryPreview();
  updateAccordionSummaries();
}

function handleSaveBanking(event) {
  if (event) {
    event.preventDefault();
  }

  const payload = buildBankingPayload();

  if (payload.salarioBruto > 0 && payload.diasPagamento.length === 0) {
    showMessage(bankingMessage, "error", "Informe pelo menos um dia de pagamento.");
    return;
  }

  if (payload.tipoCiclo === "ciclo2" && payload.diasPagamento.length < 2) {
    showMessage(bankingMessage, "error", "Informe os dois dias para o ciclo 2.");
    return;
  }

  if (
    payload.tipoCiclo === "ciclo2" &&
    payload.percentuaisPagamento[0] + payload.percentuaisPagamento[1] !== 100
  ) {
    showMessage(
      bankingMessage,
      "error",
      "No ciclo com dois pagamentos, os percentuais precisam somar 100%."
    );
    return;
  }

  salvarCadastroBancario(payload);
  const savedBanking = carregarCadastroBancario();
  renderBankingForm();
  renderReceiptArea();
  closeAllBankingAccordions();
  updateAccordionSummaries();
  showMessage(
    bankingMessage,
    "success",
    `Base financeira salva com sucesso. Saldo atual salvo: ${formatBankingCurrency(
      savedBanking.saldoAtual
    )}.`
  );
}

function handleEditBanking() {
  renderBankingForm();
  renderReceiptArea();
  updateAccordionSummaries();
  showMessage(bankingMessage, "success", "Dados carregados para edicao.");
}

function savePaymentReceipt() {
  const existingReceipt = carregarRegistroPagamento();
  const payload = {
    dataPrevista: getElement("pagamentoDataPrevista").value,
    valorPrevisto: toBankingNumber(getElement("pagamentoValorPrevisto").value),
    valorRecebido: 0,
    status: existingReceipt.status || "pendente",
  };

  if (!payload.dataPrevista || payload.valorPrevisto <= 0) {
    showMessage(receiptMessage, "error", "Preencha data prevista e valor previsto do pagamento.");
    return;
  }

  salvarRegistroPagamento(payload);
  renderReceiptArea();
  updateCyclePreview();
  showMessage(receiptMessage, "success", "Previsao do pagamento salva com sucesso.");
}

function markPaymentAsReceived() {
  const currentValue = toBankingNumber(getElement("pagamentoValorPrevisto").value);
  const actualValue = toBankingNumber(
    window.prompt("Informe o valor real recebido:", String(currentValue || ""))
  );

  if (!actualValue) {
    showMessage(receiptMessage, "error", "Informe um valor valido para confirmar o recebimento.");
    return;
  }

  const receiptDate = getElement("pagamentoDataPrevista").value || getTodayInputValue();
  const currentBanking = carregarCadastroBancario();
  const nextBalance =
    currentBanking.origemSaldo?.modo === "manual"
      ? toBankingNumber(currentBanking.saldoAtual) + actualValue
      : toBankingNumber(currentBanking.saldoAtual);

  salvarRegistroPagamento({
    dataPrevista: receiptDate,
    valorPrevisto: currentValue || actualValue,
    valorRecebido: actualValue,
    status: "recebido",
  });

  if (currentBanking.origemSaldo?.modo === "manual") {
    salvarCadastroBancario({
      ...currentBanking,
      saldoAtual: nextBalance,
    });
  }

  renderBankingForm();
  renderReceiptArea();
  updateCyclePreview();

  updateAccordionSummaries();
  showMessage(
    receiptMessage,
    "success",
    `Recebimento confirmado em ${formatBankingCurrency(actualValue)}. O ciclo foi avancado automaticamente.`
  );
}

async function processStatementFile() {
  const file = statementFileInput?.files?.[0];
  const bank = getElement("statementBank").value;

  if (!file) {
    showMessage(statementMessage, "error", "Selecione um arquivo para iniciar a leitura do extrato.");
    return;
  }

  try {
    const fileContent = await lerArquivoImportado(file);
    const format = detectStatementFormatByContent(file, fileContent);
    let parserResult;

    if (isUnstructuredStatementFormat(format)) {
      statementImportFlowState = "unstructured";
      statementDraftsState = [];
      statementBalanceSuggestion = 0;
      statementValidationState = null;
      statementUnstructuredState = buildUnstructuredImportSession(file, bank, format);
      renderStatementPreview();
      showMessage(
        statementMessage,
        "error",
        "Arquivo nao estruturado detectado. A camada OCR ficou separada e bloqueada ate haver extracao confiavel e revisao manual."
      );
      return;
    }

    statementImportFlowState = "structured";
    statementUnstructuredState = null;

    if (format === "csv") {
      parserResult = parseCSV(fileContent, bank);
    } else if (format === "xls" || format === "xlsx") {
      parserResult = await parseXLSX(fileContent, bank, format);
    } else if (format === "ofx") {
      parserResult = parseOFX(decodeImportedBinaryContent(fileContent), bank);
    } else if (format === "pdf-text" && bank === "mercado-pago") {
      parserResult = parsePDFMercadoPago(file.name, decodeImportedBinaryContent(fileContent));
    } else {
      parserResult = parseGenerico(file.name, fileContent, bank);
    }

    statementDraftsState = parserResult.lancamentos.map((item) => ({
      ...item,
      categoria: item.categoria || item.categoriaSugerida || "outros",
      data: item.data || getTodayInputValue(),
    }));
    statementBalanceSuggestion = parserResult.saldoSugerido || 0;
    statementValidationState = parserResult.validation || null;

    renderStatementPreview();

    if (parserResult.validation && !parserResult.validation.consistente) {
      showMessage(
        statementMessage,
        "error",
        `Arquivo lido, mas o saldo final apresentou diferenca de ${formatBankingCurrency(
          parserResult.validation.diferenca
        )}. Revise antes de confirmar.`
      );
      return;
    }

    showMessage(
      statementMessage,
      "success",
      parserResult?.duplicateCount
        ? `Arquivo lido com sucesso. ${parserResult.duplicateCount} duplicidade(s) foram ignoradas antes da revisao.`
        : "Arquivo lido com sucesso. Revise os lancamentos e confirme a importacao."
    );
  } catch (error) {
    statementDraftsState = [];
    statementBalanceSuggestion = 0;
    statementValidationState = null;
    statementImportFlowState = "structured";
    statementUnstructuredState = null;
    renderStatementPreview();
    showMessage(
      statementMessage,
      "error",
      error.message || "Nao foi possivel ler o arquivo selecionado."
    );
  }
}

function updateStatementDraft(event) {
  if (statementImportFlowState === "unstructured") {
    return;
  }

  const field = event.target?.dataset?.statementField;
  const root = event.target?.closest?.("[data-statement-id]");

  if (!field || !root) {
    return;
  }

  statementDraftsState = statementDraftsState.map((item) => {
    if (item.id !== root.dataset.statementId) {
      return item;
    }

    const nextValue =
      field === "valor" ? toBankingNumber(event.target.value) : event.target.value;
    const nextDescription =
      field === "descricao" ? event.target.value : item.descricao;
    const resolvedValue = field === "valor" ? nextValue : item.valor;

    return {
      ...item,
      [field]: nextValue,
      tipo: resolvedValue < 0 ? "saida" : "entrada",
      descricao:
        field === "descricao" ? normalizeStatementDescription(event.target.value) : item.descricao,
      categoriaSugerida: suggestImportCategory(normalizeStatementDescription(nextDescription)),
    };
  });

  recalculateStatementValidation();

  if (event.type === "change") {
    renderStatementPreview();
  }
}

function handleStatementPreviewClick(event) {
  if (statementImportFlowState === "unstructured") {
    return;
  }

  const button = event.target.closest("[data-action='remove-statement-item']");

  if (!button) {
    return;
  }

  statementDraftsState = statementDraftsState.filter((item) => item.id !== button.dataset.id);
  recalculateStatementValidation();
  renderStatementPreview();
}

function confirmImportedExpenses() {
  if (statementImportFlowState === "unstructured") {
    showMessage(
      statementMessage,
      "error",
      "Importacao bloqueada: arquivos nao estruturados ainda exigem extracao OCR confiavel antes de qualquer gravacao no ledger."
    );
    return;
  }

  if (!statementDraftsState.length) {
    showMessage(statementMessage, "error", "Nao ha lancamentos revisados para importar.");
    return;
  }

  if (statementValidationState && !statementValidationState.consistente) {
    showMessage(
      statementMessage,
      "error",
      `Importacao bloqueada: saldo inconsistente com diferenca de ${formatBankingCurrency(
        statementValidationState.diferenca
      )}.`
    );
    return;
  }

  const expenseDrafts = statementDraftsState.filter(
    (item) => item.tipo === "saida" && Math.abs(Number(item.valor || 0)) > 0
  );

  if (!expenseDrafts.length) {
    showMessage(
      statementMessage,
      "error",
      "O arquivo nao trouxe saidas validas para importar como gastos do dia a dia."
    );
    return;
  }

  const invalidDraft = expenseDrafts.find(
    (item) => !item.descricao || !item.data || Math.abs(Number(item.valor || 0)) <= 0
  );

  if (invalidDraft) {
    showMessage(
      statementMessage,
      "error",
      "Revise os lancamentos importados e garanta que descricao, valor e data estejam preenchidos."
    );
    return;
  }

  saveImportedExpensesFromStatement(
    expenseDrafts.map((item) => ({
      ...item,
      valor: Math.abs(Number(item.valor || 0)),
      categoria: item.categoria || item.categoriaSugerida || "outros",
      tipo: "saida",
    }))
  );
  if (statementBalanceActions) {
    statementBalanceActions.classList.remove("hidden");
  }

  showMessage(
    statementMessage,
    "success",
    `${expenseDrafts.length} lancamento(s) salvo(s) em Contas do dia a dia.`
  );
}

function acceptStatementBalance() {
  getElement("origemSaldoModo").value = "extrato";
  getElement("origemSaldoBanco").value = getElement("statementBank").value;
  const payload = buildBankingPayload();
  payload.saldoAtual = statementBalanceSuggestion;

  salvarCadastroBancario(payload);
  renderBankingForm();
  renderReceiptArea();
  updateSalaryPreview();
  updateCyclePreview();
  updateSummaryPreview();
  updateAccordionSummaries();

  showMessage(
    statementMessage,
    "success",
    `Saldo calculado confirmado em ${formatBankingCurrency(statementBalanceSuggestion)}.`
  );

  if (statementBalanceActions) {
    statementBalanceActions.classList.add("hidden");
  }
}

function switchToManualBalance() {
  getElement("origemSaldoModo").value = "manual";
  getElement("saldoAtual").value = statementBalanceSuggestion || "";
  syncBalanceMode();
  showMessage(
    statementMessage,
    "success",
    "Modo manual ativado. Ajuste o saldo atual e salve a base financeira quando quiser."
  );

  if (statementBalanceActions) {
    statementBalanceActions.classList.add("hidden");
  }
}

function saveVrVaReceipt() {
  const payload = {
    dataPrevista: getElement("vrvaDataPrevista").value,
    valorPrevisto: toBankingNumber(getElement("vrvaValorPrevisto").value),
    valorRecebido: 0,
    status: getElement("vrvaRecebido").checked ? "recebido" : "pendente",
  };

  if (!payload.dataPrevista || payload.valorPrevisto <= 0) {
    showMessage(receiptMessage, "error", "Preencha a data e o valor do VR/VA.");
    return;
  }

  salvarBeneficios({ vrVa: payload });
  renderReceiptArea();
  updateAccordionSummaries();
  showMessage(receiptMessage, "success", "Registro de VR/VA salvo com sucesso.");
}

function editPaymentReceipt() {
  const receipt = editarRegistroPagamento();
  renderPaymentReceipt();
  showMessage(receiptMessage, "success", "Registro de pagamento carregado para edicao.");
}

function editVrVaReceipt() {
  const receipt = editarVRVA();
  renderBenefitReceipt();
  showMessage(receiptMessage, "success", "Registro de VR/VA carregado para edicao.");
}

function renderBankingPage() {
  renderBankingForm();
  renderReceiptArea();
  renderStatementPreview();
  updateAccordionSummaries();
}

function bindLiveUpdates() {
  ["saldoAtual", "salarioBruto", "planoSaude", "planoOdontologico", "vt", "vrVa", "diaPagamento1", "diaPagamento2", "percentualPagamento1", "percentualPagamento2", "pagamentoDataPrevista", "pagamentoValorPrevisto", "vrvaDataPrevista", "vrvaValorPrevisto"].forEach((id) => {
    getElement(id).addEventListener("input", () => {
      updateSalaryPreview();
      updateCyclePreview();
      updateSummaryPreview();
      updateBankingStatusChip();
    });
  });

  ["vrVaDescontadoEmFolha", "tipoCiclo", "origemSaldoBanco", "vrvaRecebido"].forEach((id) => {
    getElement(id).addEventListener("change", () => {
      syncCycleFields();
      syncBalanceMode();
      updateSalaryPreview();
      updateCyclePreview();
      updateSummaryPreview();
      updateBankingStatusChip();
    });
  });

  getElement("origemSaldoModo").addEventListener("change", handleBalanceModeChange);

  salaryModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setSalarioLiquidoMode(button.dataset.salaryLiquidoMode || "auto");
      if (salarioLiquidoModoState === "manual" && salarioLiquidoManualInput && !salarioLiquidoManualInput.value) {
        salarioLiquidoManualInput.value = formatBankingCurrency(buildBankingPayload().salarioLiquido);
      }
      updateSalaryPreview();
      updateSummaryPreview();
      updateBankingStatusChip();
    });
  });

  if (salarioLiquidoManualInput) {
    salarioLiquidoManualInput.addEventListener("input", () => {
      salarioLiquidoManualState = toBankingNumber(salarioLiquidoManualInput.value);
      if (salarioLiquidoModoState === "manual") {
        updateSalaryPreview();
        updateSummaryPreview();
        updateBankingStatusChip();
      }
    });
  }

  getElement("origemSaldoBanco").addEventListener("change", () => {
    getElement("statementBank").value = getElement("origemSaldoBanco").value;
  });

  getElement("statementBank").addEventListener("change", () => {
    getElement("origemSaldoBanco").value = getElement("statementBank").value;
  });

  if (statementFileInput) {
    statementFileInput.addEventListener("change", () => {
      const selectedFile = statementFileInput.files?.[0];

      if (statementSelectedFileName) {
        statementSelectedFileName.textContent = selectedFile
          ? selectedFile.name
          : "Nenhum arquivo escolhido";
      }

      getElement("read-statement-button").classList.toggle("hidden", !selectedFile);
      getElement("confirm-imported-expenses-button").classList.add("hidden");
      statementImportFlowState = "structured";
      statementUnstructuredState = null;

      if (statementBalanceActions) {
        statementBalanceActions.classList.add("hidden");
      }
    });
  }
}

if (bankingForm) {
  bankingForm.addEventListener("submit", handleSaveBanking);
}

if (editBankingButton) {
  editBankingButton.addEventListener("click", handleEditBanking);
}

getElement("add-outro-desconto-button").addEventListener("click", addOutroDesconto);
outrosDescontosList.addEventListener("click", removeOutroDesconto);
getElement("save-pagamento-button").addEventListener("click", savePaymentReceipt);
getElement("mark-pagamento-recebido-button").addEventListener("click", markPaymentAsReceived);
getElement("save-vrva-button").addEventListener("click", saveVrVaReceipt);
getElement("edit-vrva-button").addEventListener("click", editVrVaReceipt);
getElement("read-statement-button").addEventListener("click", processStatementFile);
getElement("confirm-imported-expenses-button").addEventListener("click", confirmImportedExpenses);
getElement("accept-statement-balance-button").addEventListener("click", acceptStatementBalance);
getElement("adjust-balance-manually-button").addEventListener("click", switchToManualBalance);
statementPreviewList.addEventListener("input", updateStatementDraft);
statementPreviewList.addEventListener("change", updateStatementDraft);
statementPreviewList.addEventListener("click", handleStatementPreviewClick);
window.addEventListener("app-shell-action", (event) => {
  const action = event.detail?.action;

  if (action === "save-banking") {
    handleSaveBanking();
  }

  if (action === "edit-banking") {
    handleEditBanking();
  }
});
window.addEventListener("finance-data-updated", () => {
  renderBankingPage();
});
window.addEventListener("storage", () => {
  renderBankingPage();
});

bindAccordionToggles();
bindLiveUpdates();
closeAllBankingAccordions();
renderBankingPage();
})();
