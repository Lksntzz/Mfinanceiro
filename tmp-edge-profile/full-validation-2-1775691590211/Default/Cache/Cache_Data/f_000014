(() => {
const {
  carregarCadastroBancario: loadStatementBanking,
  createId,
  salvarCadastroBancario: saveStatementBanking,
  salvarContasVariaveisImportadas: saveImportedExpensesFromStatement,
  toNumber: toStatementNumber,
} = window.FinanceStore;
const {
  formatCurrency: formatStatementCurrency,
} = window.FinanceCalculations;

const statementMessage = document.getElementById("statement-message");
const statementPreviewList = document.getElementById("statement-preview-list");
const statementFileInput = document.getElementById("statementFile");

let statementDraftsState = [];
let statementImportRowsState = [];
let statementImportReportState = null;
let statementBalanceSuggestion = 0;
let currentStatementFileName = "";
let currentStatementFormat = "";
let pdfParserModulePromise = null;
let statementOcrWorkerPromise = null;

const IMPORT_ORIGIN = "extrato_importado";
const OCR_LANG_PATH = "https://tessdata.projectnaptha.com/4.0.0/";

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

const EXCEL_HEADER_ALIASES = {
  data: ["data", "date", "data_lancamento", "data_movimentacao", "release_date"],
  descricao: [
    "descricao",
    "description",
    "historico",
    "histórico",
    "detalhe",
    "detalhes",
    "transacao",
    "transação",
    "transaction_type",
    "movimentacao",
    "movimentação",
  ],
  valor: ["valor", "amount", "valor_rs", "transaction_net_amount", "valor_movimento"],
  debito: ["debito", "débito", "saida", "saída", "withdrawal", "debit"],
  credito: ["credito", "crédito", "entrada", "deposito", "depósito", "credit"],
  tipo: ["tipo", "tipo_movimentacao", "tipo_movimentação", "natureza"],
  categoria: ["categoria", "category"],
  externalId: ["external_id", "id_externo", "id", "referencia", "reference_id", "identificador"],
  saldo: ["saldo", "balance", "partial_balance"],
};

const TEXT_LINE_HEADER_ALIASES = {
  data: ["data", "date", "dt"],
  descricao: ["descricao", "description", "historico", "movimentacao", "transacao", "detalhe"],
  valor: ["valor", "amount", "movimento", "total"],
  debito: ["debito", "deb", "saida"],
  credito: ["credito", "cred", "entrada"],
  tipo: ["tipo", "natureza"],
  categoria: ["categoria", "category"],
  externalId: ["external_id", "id", "identificador", "referencia"],
  saldo: ["saldo", "balance"],
};

function getElement(id) {
  return document.getElementById(id);
}

function showMessage(type, text) {
  statementMessage.textContent = text;
  statementMessage.className = `message-box ${type}`;
}

function resetStatementImportState() {
  statementDraftsState = [];
  statementImportRowsState = [];
  statementImportReportState = null;
  statementBalanceSuggestion = 0;
  currentStatementFormat = "";
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeImportText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImportHeaderKey(value) {
  return normalizeImportText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildStatementLineError(line, reason) {
  return {
    linha: Number.isFinite(Number(line)) ? Number(line) : null,
    motivo: reason,
  };
}

function buildStatementImportRowKey(item, fallbackIndex = 0) {
  if (Number.isFinite(Number(item?.linha_origem))) {
    return `linha:${Number(item.linha_origem)}`;
  }

  const explicitKey = normalizeImportText(item?.external_id || item?.id || "");

  if (explicitKey) {
    return explicitKey;
  }

  return `fallback:${fallbackIndex}`;
}

function buildImportReportMessage(report) {
  if (!report) {
    return "";
  }

  return [
    `${report.totalLinhasProcessadas ?? report.totalLinhasLidas} linha(s) processada(s)`,
    `${report.totalValidas} valida(s)`,
    `${report.totalDuplicadas} duplicada(s)`,
    `${report.totalRejeitadas} rejeitada(s)`,
    `${report.totalEfetivamenteSalvo} salva(s)`,
  ].join(" | ");
}

function mergeImportReports(baseReport, processedRows) {
  const mergedRows = Array.isArray(processedRows) ? processedRows : [];
  const uniqueErrors = new Map();

  [...(baseReport?.errosPorLinha || []), ...mergedRows
    .filter((item) => item.status_importacao === "rejeitada" || item.status_importacao === "duplicada")
    .map((item) => buildStatementLineError(item.linha_origem, item.motivo_rejeicao || "Linha rejeitada."))]
    .forEach((errorItem, index) => {
      const key = `${errorItem?.linha ?? "sem-linha"}:${normalizeImportText(errorItem?.motivo || "")}`;
      uniqueErrors.set(key, {
        linha: Number.isFinite(Number(errorItem?.linha)) ? Number(errorItem.linha) : null,
        motivo: normalizeImportText(errorItem?.motivo || "Falha na importacao."),
      });
    });

  return {
    totalLinhasLidas: mergedRows.length || Number(baseReport?.totalLinhasLidas || 0),
    totalLinhasProcessadas:
      mergedRows.length || Number(baseReport?.totalLinhasProcessadas || baseReport?.totalLinhasLidas || 0),
    totalValidas: mergedRows.filter((item) => item.status_importacao === "valida").length,
    totalDuplicadas: mergedRows.filter((item) => item.status_importacao === "duplicada").length,
    totalRejeitadas: mergedRows.filter((item) => item.status_importacao === "rejeitada").length,
    totalEfetivamenteSalvo: Number(baseReport?.totalEfetivamenteSalvo || 0),
    errosPorLinha: [...uniqueErrors.values()],
  };
}

function createImportReport() {
  return {
    totalLinhasLidas: 0,
    totalLinhasProcessadas: 0,
    totalValidas: 0,
    totalDuplicadas: 0,
    totalRejeitadas: 0,
    totalEfetivamenteSalvo: 0,
    errosPorLinha: [],
  };
}

function finalizeImportReport(report) {
  return {
    ...createImportReport(),
    ...(report || {}),
    totalLinhasProcessadas: Number(
      report?.totalLinhasProcessadas ?? report?.totalLinhasLidas ?? 0
    ),
  };
}

async function getPdfParserModule() {
  if (!pdfParserModulePromise) {
    pdfParserModulePromise = import("/vendor/pdfjs/pdf.min.mjs").then((module) => {
      const pdfjsModule = module?.default || module;

      if (pdfjsModule?.GlobalWorkerOptions) {
        pdfjsModule.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      }

      return pdfjsModule;
    });
  }

  return pdfParserModulePromise;
}

async function getStatementOcrWorker() {
  if (!window.Tesseract?.createWorker) {
    throw new Error("Biblioteca de OCR nao ficou disponivel no navegador.");
  }

  if (!statementOcrWorkerPromise) {
    statementOcrWorkerPromise = window.Tesseract.createWorker("por+eng", 1, {
      workerPath: "/vendor/tesseract/worker.min.js",
      corePath: "/vendor/tesseract-core",
      langPath: OCR_LANG_PATH,
      logger: (message) => {
        if (message?.status) {
          console.log("[Extrato OCR]", message.status, message.progress ?? "");
        }
      },
    });
  }

  return statementOcrWorkerPromise;
}

function inferMovementType(value, fallback = "saida") {
  const normalizedValue = normalizeImportText(value).toLowerCase();

  if (
    ["entrada", "credito", "crédito", "credit", "recebimento", "deposito", "depósito"].includes(
      normalizedValue
    )
  ) {
    return "entrada";
  }

  if (
    ["saida", "saída", "debito", "débito", "debit", "despesa", "pagamento"].includes(
      normalizedValue
    )
  ) {
    return "saida";
  }

  return fallback;
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

  return "";
}

function extractImportAmount(text) {
  const matches = String(text || "").match(/\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2})?/g);

  if (!matches?.length) {
    return 0;
  }

  return toStatementNumber(matches[matches.length - 1]);
}

function normalizeImportDescription(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createCanonicalImportedItem(rawItem = {}, context = {}) {
  const normalizedDescription = normalizeImportText(rawItem.descricao);
  const normalizedDate = normalizeStatementDate(rawItem.data || rawItem.dataOriginal || "");
  const normalizedValue = Math.abs(Number(rawItem.valor || 0));
  const explicitType = inferMovementType(rawItem.tipo, "");
  const inferredType =
    explicitType ||
    (Number(rawItem.valor || 0) < 0 ? "saida" : "entrada") ||
    "saida";
  const lineNumber = Number(rawItem.linha_origem ?? context.lineNumber ?? 0);
  const rejectionReasons = [];

  if (!normalizedDate) {
    rejectionReasons.push("Data nao identificada.");
  }

  if (!normalizedDescription) {
    rejectionReasons.push("Descricao nao identificada.");
  }

  if (!normalizedValue) {
    rejectionReasons.push("Valor nao identificado.");
  }

  return {
    id: rawItem.id || createId(context.prefix || "extrato_importado"),
    user_id: rawItem.user_id || "",
    data: normalizedDate || "",
    descricao: normalizedDescription || "",
    valor: normalizedValue,
    categoria:
      normalizeImportText(rawItem.categoria) || suggestImportCategory(normalizedDescription),
    categoriaSugerida: suggestImportCategory(normalizedDescription),
    tipo: inferredType,
    origem: IMPORT_ORIGIN,
    external_id: normalizeImportText(rawItem.external_id || rawItem.externalId || "") || null,
    arquivo_origem: rawItem.arquivo_origem || context.fileName || null,
    linha_origem: Number.isFinite(lineNumber) && lineNumber > 0 ? lineNumber : null,
    saldo: Number.isFinite(Number(rawItem.saldo)) ? Number(rawItem.saldo) : 0,
    banco: rawItem.banco || context.bank || "",
    status_importacao: rejectionReasons.length ? "rejeitada" : "valida",
    motivo_rejeicao: rejectionReasons.join(" "),
    leituraAutomatica: rawItem.leituraAutomatica || null,
  };
}

function normalizeStatementDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalizedValue = normalizeImportText(value);

  if (!normalizedValue) {
    return "";
  }

  const isoMatch = normalizedValue.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = normalizedValue.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  const parsedDate = new Date(normalizedValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return "";
}

function getTextLineColumns(line) {
  return normalizeImportText(line)
    .split(/\t+|\s{2,}/)
    .map((cell) => normalizeImportText(cell))
    .filter(Boolean);
}

function getTextLineColumnMap(columns) {
  const headerKeys = (Array.isArray(columns) ? columns : []).map((cell) =>
    normalizeImportHeaderKey(cell)
  );

  return {
    data: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.data),
    descricao: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.descricao),
    valor: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.valor),
    debito: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.debito),
    credito: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.credito),
    tipo: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.tipo),
    categoria: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.categoria),
    externalId: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.externalId),
    saldo: findExcelColumnIndex(headerKeys, TEXT_LINE_HEADER_ALIASES.saldo),
  };
}

function isTextHeaderMapValid(columnMap) {
  return (
    columnMap.data >= 0 &&
    columnMap.descricao >= 0 &&
    (columnMap.valor >= 0 || columnMap.debito >= 0 || columnMap.credito >= 0)
  );
}

function findTextHeaderDefinition(lines) {
  let bestMatch = null;

  (Array.isArray(lines) ? lines : []).slice(0, 20).forEach((line, index) => {
    const columns = getTextLineColumns(line);
    const columnMap = getTextLineColumnMap(columns);
    const score = [
      columnMap.data >= 0,
      columnMap.descricao >= 0,
      columnMap.valor >= 0 || columnMap.debito >= 0 || columnMap.credito >= 0,
      columnMap.tipo >= 0,
      columnMap.categoria >= 0,
      columnMap.externalId >= 0,
      columnMap.saldo >= 0,
    ].filter(Boolean).length;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        headerIndex: index,
        columnMap,
        score,
      };
    }
  });

  if (!bestMatch || !isTextHeaderMapValid(bestMatch.columnMap)) {
    return null;
  }

  return bestMatch;
}

function isLikelyStatementNoiseLine(line) {
  const normalizedLine = normalizeImportText(line).toLowerCase();

  if (!normalizedLine || normalizedLine.length < 6) {
    return true;
  }

  if (
    /(pagina\s+\d+|page\s+\d+|saldo anterior|saldo final|resumo|movimentacoes?|movimenta[cç][aã]o|extrato bancario|statement)/.test(
      normalizedLine
    )
  ) {
    return true;
  }

  return false;
}

function getAmountMatchesFromLine(line) {
  return [...String(line || "").matchAll(/-?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\s*(?:R\$\s*)?\d+(?:[.,]\d{2})/g)];
}

function sanitizeDescriptionFromLine(line, dateMatch, amountMatch, explicitTypeMatch = "") {
  const segmentsToRemove = [dateMatch?.[0] || "", amountMatch?.[0] || "", explicitTypeMatch || ""]
    .filter(Boolean)
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  let description = String(line || "");

  segmentsToRemove.forEach((segmentPattern) => {
    description = description.replace(new RegExp(segmentPattern, "i"), " ");
  });

  return normalizeImportText(
    description
      .replace(/[|;]+/g, " ")
      .replace(/\s{2,}/g, " ")
  );
}

function extractPossibleExternalId(line) {
  const normalizedLine = normalizeImportText(line);
  const explicitMatch = normalizedLine.match(
    /\b(?:id|ref|referencia|identificador)[:\s#-]*([a-z0-9_-]{6,})\b/i
  );

  if (explicitMatch?.[1]) {
    return explicitMatch[1];
  }

  return null;
}

function parseMovementFromTextLine(line, context = {}) {
  const normalizedLine = normalizeImportText(line);

  if (isLikelyStatementNoiseLine(normalizedLine)) {
    return null;
  }

  const dateMatch = normalizedLine.match(/(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}(?:[-/]\d{2,4})?)/);
  const amountMatches = getAmountMatchesFromLine(normalizedLine);

  if (!dateMatch && !amountMatches.length) {
    return null;
  }

  const selectedAmountMatch = amountMatches.length > 1 ? amountMatches[0] : amountMatches[0];
  const explicitTypeMatch = normalizedLine.match(
    /\b(entrada|saida|credito|cr[eé]dito|debito|d[eé]bito|recebimento|pagamento|deposito|dep[oó]sito)\b/i
  );
  const amountValue = selectedAmountMatch ? parseBrazilianAmount(selectedAmountMatch[0]) : 0;
  const description = sanitizeDescriptionFromLine(
    normalizedLine,
    dateMatch,
    selectedAmountMatch,
    explicitTypeMatch?.[0] || ""
  );

  return {
    data: dateMatch?.[0] || "",
    descricao: description,
    valor: amountValue,
    tipo: inferMovementType(explicitTypeMatch?.[0] || "", amountValue < 0 ? "saida" : "entrada"),
    categoria: suggestImportCategory(description),
    external_id: extractPossibleExternalId(normalizedLine),
    saldo:
      amountMatches.length > 1
        ? parseBrazilianAmount(amountMatches[amountMatches.length - 1][0])
        : 0,
    linha_origem: context.lineNumber || null,
    arquivo_origem: context.fileName || null,
    leituraAutomatica: {
      estrategia: context.strategy || "texto_livre",
      formato: context.format || "texto",
      bruto: normalizedLine,
    },
  };
}

function parseStructuredTextLine(line, headerDefinition, context = {}) {
  const columns = getTextLineColumns(line);
  const { columnMap } = headerDefinition;
  const rawItem = {
    data: columns[columnMap.data] || "",
    descricao: columns[columnMap.descricao] || "",
    categoria: columnMap.categoria >= 0 ? columns[columnMap.categoria] : "",
    external_id: columnMap.externalId >= 0 ? columns[columnMap.externalId] : "",
    saldo: columnMap.saldo >= 0 ? parseBrazilianAmount(columns[columnMap.saldo]) : 0,
    linha_origem: context.lineNumber || null,
    arquivo_origem: context.fileName || null,
    leituraAutomatica: {
      estrategia: "texto_estruturado",
      formato: context.format || "texto",
      bruto: normalizeImportText(line),
    },
  };

  const movement = resolveExcelMovement(columns, columnMap);

  return {
    ...rawItem,
    valor: movement.valor,
    tipo: movement.tipo,
  };
}

function extractRawMovementsFromTextLines(lines, context = {}) {
  const filteredLines = (Array.isArray(lines) ? lines : [])
    .map((line) => normalizeImportText(line))
    .filter(Boolean);
  const headerDefinition = findTextHeaderDefinition(filteredLines);

  if (headerDefinition) {
    return filteredLines
      .slice(headerDefinition.headerIndex + 1)
      .map((line, index) =>
        parseStructuredTextLine(line, headerDefinition, {
          ...context,
          lineNumber: headerDefinition.headerIndex + index + 2,
        })
      )
      .filter(Boolean);
  }

  return filteredLines
    .map((line, index) =>
      parseMovementFromTextLine(line, {
        ...context,
        lineNumber: index + 1,
      })
    )
    .filter(Boolean);
}

function normalizeRawMovements(rawMovements, context = {}) {
  const report = createImportReport();
  const lancamentos = [];
  let suggestedBalance = 0;

  (Array.isArray(rawMovements) ? rawMovements : []).forEach((rawItem, index) => {
    const canonicalItem = createCanonicalImportedItem(rawItem, {
      ...context,
      lineNumber: rawItem?.linha_origem || index + 1,
    });

    report.totalLinhasLidas += 1;
    report.totalLinhasProcessadas += 1;

    if (canonicalItem.status_importacao === "rejeitada") {
      report.totalRejeitadas += 1;
      report.errosPorLinha.push(
        buildStatementLineError(canonicalItem.linha_origem, canonicalItem.motivo_rejeicao)
      );
    } else {
      report.totalValidas += 1;
      if (Number(canonicalItem.saldo || 0) !== 0) {
        suggestedBalance = Number(canonicalItem.saldo || 0);
      }
    }

    lancamentos.push(canonicalItem);
  });

  return {
    saldoSugerido: suggestedBalance,
    lancamentos,
    report: finalizeImportReport(report),
  };
}

function isEmptyExcelRow(row) {
  return !Array.isArray(row) || row.every((cell) => !normalizeImportText(cell));
}

function findExcelColumnIndex(headerKeys, aliases) {
  return headerKeys.findIndex((key) => aliases.includes(key));
}

function getExcelColumnMap(headerRow) {
  const headerKeys = (Array.isArray(headerRow) ? headerRow : []).map((cell) =>
    normalizeImportHeaderKey(cell)
  );

  return {
    data: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.data),
    descricao: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.descricao),
    valor: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.valor),
    debito: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.debito),
    credito: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.credito),
    tipo: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.tipo),
    categoria: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.categoria),
    externalId: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.externalId),
    saldo: findExcelColumnIndex(headerKeys, EXCEL_HEADER_ALIASES.saldo),
  };
}

function isExcelColumnMapValid(columnMap) {
  return (
    columnMap.data >= 0 &&
    columnMap.descricao >= 0 &&
    (columnMap.valor >= 0 || columnMap.debito >= 0 || columnMap.credito >= 0)
  );
}

function findExcelHeaderDefinition(rows) {
  let bestMatch = null;

  (Array.isArray(rows) ? rows : []).slice(0, 15).forEach((row, index) => {
    const columnMap = getExcelColumnMap(row);
    const score = [
      columnMap.data >= 0,
      columnMap.descricao >= 0,
      columnMap.valor >= 0 || columnMap.debito >= 0 || columnMap.credito >= 0,
      columnMap.tipo >= 0,
      columnMap.categoria >= 0,
      columnMap.externalId >= 0,
    ].filter(Boolean).length;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        headerIndex: index,
        columnMap,
        score,
      };
    }
  });

  if (!bestMatch || !isExcelColumnMapValid(bestMatch.columnMap)) {
    return null;
  }

  return bestMatch;
}

function normalizeExcelDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value) && window.XLSX?.SSF?.parse_date_code) {
    const parsed = window.XLSX.SSF.parse_date_code(value);

    if (parsed?.y && parsed?.m && parsed?.d) {
      return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const normalizedText = normalizeImportText(value);

  if (!normalizedText) {
    return "";
  }

  const isoMatch = normalizedText.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = normalizedText.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  const parsedDate = new Date(normalizedText);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return "";
}

function getExcelCellValue(row, columnIndex) {
  if (!Array.isArray(row) || columnIndex < 0) {
    return "";
  }

  return row[columnIndex];
}

function resolveExcelMovement(row, columnMap) {
  const rawValue = parseBrazilianAmount(getExcelCellValue(row, columnMap.valor));
  const debitValue = parseBrazilianAmount(getExcelCellValue(row, columnMap.debito));
  const creditValue = parseBrazilianAmount(getExcelCellValue(row, columnMap.credito));
  const explicitType = inferMovementType(getExcelCellValue(row, columnMap.tipo), "");

  if (debitValue > 0 || creditValue > 0) {
    if (debitValue > 0 && creditValue === 0) {
      return { valor: debitValue, tipo: "saida" };
    }

    if (creditValue > 0 && debitValue === 0) {
      return { valor: creditValue, tipo: "entrada" };
    }

    if (debitValue > 0 && creditValue > 0) {
      return explicitType
        ? {
            valor: explicitType === "entrada" ? creditValue : debitValue,
            tipo: explicitType,
          }
        : { valor: 0, tipo: "saida" };
    }
  }

  if (!rawValue) {
    return { valor: 0, tipo: explicitType || "saida" };
  }

  if (explicitType) {
    return { valor: Math.abs(rawValue), tipo: explicitType };
  }

  return {
    valor: Math.abs(rawValue),
    tipo: rawValue < 0 ? "saida" : "entrada",
  };
}

function buildExcelImportedItem(row, context) {
  const {
    fileName,
    lineNumber,
    bank,
    columnMap,
  } = context;
  const description = normalizeImportText(getExcelCellValue(row, columnMap.descricao));
  const normalizedDate = normalizeExcelDateValue(getExcelCellValue(row, columnMap.data));
  const movement = resolveExcelMovement(row, columnMap);
  const categoryValue = normalizeImportText(getExcelCellValue(row, columnMap.categoria));
  const externalIdValue = normalizeImportText(getExcelCellValue(row, columnMap.externalId)) || null;
  const balanceValue = parseBrazilianAmount(getExcelCellValue(row, columnMap.saldo));
  const rejectionReasons = [];

  if (!normalizedDate) {
    rejectionReasons.push("Data nao identificada.");
  }

  if (!description) {
    rejectionReasons.push("Descricao nao identificada.");
  }

  if (!movement.valor) {
    rejectionReasons.push("Valor nao identificado.");
  }

  return {
    id: createId("extrato_excel"),
    user_id: "",
    data: normalizedDate || "",
    descricao: description || "",
    valor: Number(movement.valor || 0),
    categoria: categoryValue || suggestImportCategory(description),
    categoriaSugerida: suggestImportCategory(description),
    tipo: movement.tipo || "saida",
    origem: IMPORT_ORIGIN,
    external_id: externalIdValue,
    arquivo_origem: fileName || null,
    linha_origem: lineNumber,
    saldo: Number.isFinite(balanceValue) ? balanceValue : 0,
    banco: bank,
    status_importacao: rejectionReasons.length ? "rejeitada" : "valida",
    motivo_rejeicao: rejectionReasons.join(" "),
    leituraAutomatica: {
      estrategia: "excel_estruturado",
      formato: "xlsx",
    },
  };
}

function parseXLSX(arrayBuffer, bank, fileName) {
  if (!window.XLSX?.read || !window.XLSX?.utils?.sheet_to_json) {
    throw new Error("Biblioteca de leitura de Excel nao ficou disponivel no navegador.");
  }

  const workbook = window.XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    raw: true,
  });
  const lancamentos = [];
  const report = createImportReport();
  let suggestedBalance = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = window.XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: false,
    });

    if (!rows.length) {
      return;
    }

    const headerDefinition = findExcelHeaderDefinition(rows);

    if (!headerDefinition) {
      report.errosPorLinha.push(
        buildStatementLineError(null, `Planilha "${sheetName}" sem cabecalho reconhecivel.`)
      );
      return;
    }

    rows.slice(headerDefinition.headerIndex + 1).forEach((row, rowOffset) => {
      if (isEmptyExcelRow(row)) {
        return;
      }

      const lineNumber = headerDefinition.headerIndex + rowOffset + 2;
      const importedItem = buildExcelImportedItem(row, {
        fileName,
        lineNumber,
        bank,
        columnMap: headerDefinition.columnMap,
      });

      report.totalLinhasLidas += 1;
      report.totalLinhasProcessadas += 1;

      if (importedItem.status_importacao === "rejeitada") {
        report.totalRejeitadas += 1;
        report.errosPorLinha.push(
          buildStatementLineError(importedItem.linha_origem, importedItem.motivo_rejeicao)
        );
      } else {
        report.totalValidas += 1;
        if (Number(importedItem.saldo || 0) !== 0) {
          suggestedBalance = Number(importedItem.saldo || 0);
        }
      }

      lancamentos.push(importedItem);
    });
  });

  if (!report.totalLinhasLidas) {
    throw new Error("Nenhuma linha valida foi encontrada nas planilhas do Excel.");
  }

  return {
    saldoSugerido: suggestedBalance,
    lancamentos,
    validation: null,
    parserMode: "Excel / parser estruturado",
    report: finalizeImportReport(report),
  };
}

async function lerArquivoImportado(file) {
  const format = detectStatementFormat(file);

  if (format === "xlsx" || format === "pdf") {
    return file.arrayBuffer();
  }

  if (format === "image") {
    return file;
  }

  try {
    return await file.text();
  } catch (error) {
    return file.name || "";
  }
}

function parseBrazilianAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

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

  if (extension === "xlsx") {
    return "xlsx";
  }

  if (extension === "xls") {
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

function buildImportedStatementItem({
  prefix,
  date,
  description,
  value,
  balance,
  bank,
  type,
  category,
  externalId,
  fileName,
  lineNumber,
  strategy,
}) {
  return createCanonicalImportedItem(
    {
      id: createId(prefix),
      data: date,
      descricao: String(description || "").trim() || "Movimentacao importada",
      valor: Number(value || 0),
      saldo: Number.isFinite(Number(balance)) ? Number(balance) : 0,
      tipo: type || (Number(value || 0) < 0 ? "saida" : "entrada"),
      categoria: category || suggestImportCategory(description),
      external_id: externalId || null,
      arquivo_origem: fileName || null,
      linha_origem: lineNumber || null,
      banco: bank,
      leituraAutomatica: {
        estrategia: strategy || "estrutura_padrao",
        formato: prefix,
      },
    },
    {
      prefix,
      fileName,
      bank,
      lineNumber,
    }
  );
}

function validateStatementBalance(lancamentos) {
  if (!lancamentos.length) {
    return null;
  }

  const primeiroSaldo = Number(lancamentos[0].saldo || 0);
  const primeiroValor = Number(lancamentos[0].valor || 0);
  const saldoInicialEstimado = primeiroSaldo - primeiroValor;
  const saldoFinalCalculado = saldoInicialEstimado
    + lancamentos.reduce((total, item) => total + Number(item.valor || 0), 0);
  const saldoFinalArquivo = Number(lancamentos[lancamentos.length - 1].saldo || 0);
  const diferenca = Math.abs(saldoFinalCalculado - saldoFinalArquivo);

  return {
    saldoInicialEstimado,
    saldoFinalCalculado,
    saldoFinalArquivo,
    consistente: diferenca < 0.01,
    diferenca,
  };
}

function parseCSV(textContent, bank, fileName) {
  if (bank === "mercado-pago") {
    return parseMercadoPagoCSV(textContent, fileName);
  }

  return parseGenericCSV(textContent, bank, fileName);
}

function parseMercadoPagoCSV(textContent, fileName) {
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

    lancamentos.push(
      buildImportedStatementItem({
        prefix: "extrato_mp_csv",
        date: row[0],
        description: row[1],
        value: parseBrazilianAmount(row[3]),
        balance: parseBrazilianAmount(row[4]),
        bank: "mercado-pago",
        externalId: row[2] || null,
        fileName,
        lineNumber: index + 1,
        strategy: "csv_mercado_pago",
      })
    );
  }

  const validation = validateStatementBalance(lancamentos);
  console.log("Validacao saldo CSV Mercado Pago", validation);

  return {
    saldoSugerido: lancamentos.length
      ? Number(lancamentos[lancamentos.length - 1].saldo || 0)
      : 0,
    lancamentos,
    validation,
    parserMode: "CSV Mercado Pago / parser estruturado",
    report: finalizeImportReport({
      totalLinhasLidas: lancamentos.length,
      totalLinhasProcessadas: lancamentos.length,
      totalValidas: lancamentos.filter((item) => item.status_importacao === "valida").length,
      totalDuplicadas: 0,
      totalRejeitadas: lancamentos.filter((item) => item.status_importacao === "rejeitada").length,
      totalEfetivamenteSalvo: 0,
      errosPorLinha: lancamentos
        .filter((item) => item.status_importacao === "rejeitada")
        .map((item) => buildStatementLineError(item.linha_origem, item.motivo_rejeicao)),
    }),
  };
}

function detectGenericDelimiter(lines) {
  const sampleLine = lines.find((line) => line.includes(";") || line.includes(","));
  return sampleLine?.includes(";") ? ";" : ",";
}

function parseGenericCSV(textContent, bank, fileName) {
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
        ["DESCRICAO", "DESCRIPTION", "TRANSACTION_TYPE", "HISTORICO"].includes(cell)
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
      ["DESCRICAO", "DESCRIPTION", "TRANSACTION_TYPE", "HISTORICO"].includes(cell)
    ),
    valor: header.findIndex((cell) =>
      ["VALOR", "AMOUNT", "TRANSACTION_NET_AMOUNT"].includes(cell)
    ),
    saldo: header.findIndex((cell) =>
      ["SALDO", "BALANCE", "PARTIAL_BALANCE"].includes(cell)
    ),
  };

  const lancamentos = [];

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const row = splitDelimitedLine(lines[index], delimiter);

    if (row.length <= Math.max(indexes.data, indexes.descricao, indexes.valor)) {
      continue;
    }

    const description = row[indexes.descricao];
    const value = parseBrazilianAmount(row[indexes.valor]);

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
        bank,
        fileName,
        lineNumber: index + 1,
        strategy: "csv_generico",
      })
    );
  }

  return {
    saldoSugerido: lancamentos.length
      ? Number(lancamentos[lancamentos.length - 1].saldo || 0)
      : 0,
    lancamentos,
    validation: validateStatementBalance(lancamentos),
    parserMode: "CSV / parser generico",
    report: finalizeImportReport({
      totalLinhasLidas: lancamentos.length,
      totalLinhasProcessadas: lancamentos.length,
      totalValidas: lancamentos.filter((item) => item.status_importacao === "valida").length,
      totalDuplicadas: 0,
      totalRejeitadas: lancamentos.filter((item) => item.status_importacao === "rejeitada").length,
      totalEfetivamenteSalvo: 0,
      errosPorLinha: lancamentos
        .filter((item) => item.status_importacao === "rejeitada")
        .map((item) => buildStatementLineError(item.linha_origem, item.motivo_rejeicao)),
    }),
  };
}

async function extractPdfTextLines(arrayBuffer) {
  const pdfjsModule = await getPdfParserModule();
  const document = await pdfjsModule.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const lines = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const groupedRows = new Map();

      (Array.isArray(textContent?.items) ? textContent.items : []).forEach((item) => {
        const yPosition = Number(item?.transform?.[5] || 0);
        const xPosition = Number(item?.transform?.[4] || 0);
        const key = yPosition.toFixed(1);

        if (!groupedRows.has(key)) {
          groupedRows.set(key, []);
        }

        groupedRows.get(key).push({
          text: normalizeImportText(item?.str || ""),
          x: xPosition,
        });
      });

      [...groupedRows.entries()]
        .sort((left, right) => Number(right[0]) - Number(left[0]))
        .forEach(([, rowItems]) => {
          const line = rowItems
            .sort((left, right) => left.x - right.x)
            .map((item) => item.text)
            .filter(Boolean)
            .join(" ");

          if (line) {
            lines.push(line);
          }
        });
    }
  } finally {
    await document.destroy();
  }

  return lines;
}

async function parsePDFStatement(arrayBuffer, bank, fileName) {
  const rawMovements = extractRawMovementsFromTextLines(
    await extractPdfTextLines(arrayBuffer),
    {
      bank,
      fileName,
      format: "pdf",
      strategy: "pdf_texto",
    }
  );

  if (!rawMovements.length) {
    throw new Error("Nao foi possivel identificar movimentacoes no PDF enviado.");
  }

  const normalizedResult = normalizeRawMovements(rawMovements, {
    bank,
    fileName,
    prefix: "extrato_pdf",
  });

  return {
    ...normalizedResult,
    validation: null,
    parserMode: "PDF / extracao de texto",
  };
}

async function parseImageStatement(file, bank, fileName) {
  const ocrWorker = await getStatementOcrWorker();
  const recognitionResult = await ocrWorker.recognize(file);
  const recognizedText = String(recognitionResult?.data?.text || "");
  const rawMovements = extractRawMovementsFromTextLines(
    recognizedText
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => normalizeImportText(line))
      .filter(Boolean),
    {
      bank,
      fileName,
      format: "image",
      strategy: "ocr_imagem",
    }
  );

  if (!rawMovements.length) {
    throw new Error("Nao foi possivel identificar movimentacoes na imagem enviada.");
  }

  const normalizedResult = normalizeRawMovements(rawMovements, {
    bank,
    fileName,
    prefix: "extrato_img",
  });

  return {
    ...normalizedResult,
    validation: null,
    parserMode: "Imagem / OCR",
  };
}

function parseGenerico(fileName, fileContent, bank) {
  const source = `${fileName} ${String(fileContent || "")}`;
  const value = extractImportAmount(source);
  const fallbackItem = buildImportedStatementItem({
    prefix: "extrato_generico",
    date: extractImportDate(source),
    description: normalizeImportDescription(fileName) || "Lancamento importado",
    value,
    balance: value,
    bank,
    fileName,
    lineNumber: 1,
    strategy: "fallback_generico",
  });

  return {
    saldoSugerido: value,
    lancamentos: [fallbackItem],
    validation: null,
    parserMode: "Fallback generico",
    report: finalizeImportReport({
      totalLinhasLidas: 1,
      totalLinhasProcessadas: 1,
      totalValidas: fallbackItem.status_importacao === "valida" ? 1 : 0,
      totalDuplicadas: 0,
      totalRejeitadas: fallbackItem.status_importacao === "rejeitada" ? 1 : 0,
      totalEfetivamenteSalvo: 0,
      errosPorLinha:
        fallbackItem.status_importacao === "rejeitada"
          ? [buildStatementLineError(1, fallbackItem.motivo_rejeicao || "Nao foi possivel interpretar o arquivo.")]
          : [],
    }),
  };
}

function renderStatementPreview() {
  const reportSummaryHtml = statementImportReportState
    ? `
      <div class="subtle-panel">
        <strong>Resumo da leitura</strong>
        <span class="section-note">${buildImportReportMessage(statementImportReportState)}</span>
        ${
          statementImportReportState.errosPorLinha?.length
            ? `<div class="list-stack">
                ${statementImportReportState.errosPorLinha
                  .slice(0, 12)
                  .map(
                    (errorItem) => `
                      <div class="detail-row">
                        <span>Linha ${errorItem.linha ?? "--"}</span>
                        <strong>${errorItem.motivo}</strong>
                      </div>
                    `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
    `
    : "";

  if (!statementDraftsState.length) {
    statementPreviewList.innerHTML = `
      ${reportSummaryHtml}
      <div class="subtle-panel">
        <strong>Nenhum lancamento em revisao</strong>
        <span class="section-note">
          O parser usa leitura estruturada para CSV e Excel, fallback generico para outros formatos e exige revisao antes de salvar.
        </span>
      </div>
    `;
    getElement("statement-status-chip").textContent = statementImportReportState
      ? "Leitura concluida"
      : "Aguardando arquivo";
    getElement("statement-balance-preview").textContent = formatStatementCurrency(
      statementBalanceSuggestion || 0
    );
    return;
  }

  getElement("statement-status-chip").textContent = `${statementDraftsState.length} movimentacao(oes) em revisao`;
  getElement("statement-balance-preview").textContent = formatStatementCurrency(
    statementBalanceSuggestion
  );

  statementPreviewList.innerHTML = `
    ${reportSummaryHtml}
    ${statementDraftsState
      .map(
        (item) => `
        <div class="subtle-panel" data-statement-id="${item.id}">
          <strong>${item.descricao}</strong>
          <span class="section-note">
            ${item.tipo === "saida" ? "Saida" : "Entrada"} | Status: ${item.status_importacao || "valida"} | Saldo do arquivo: ${formatStatementCurrency(
              item.saldo || 0
            )}
          </span>
          ${
            item.motivo_rejeicao
              ? `<span class="section-note">${item.motivo_rejeicao}</span>`
              : ""
          }
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
              <span>Tipo</span>
              <select class="app-select" data-statement-field="tipo">
                <option value="saida" ${item.tipo === "saida" ? "selected" : ""}>saida</option>
                <option value="entrada" ${item.tipo === "entrada" ? "selected" : ""}>entrada</option>
              </select>
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
      .join("")}
  `;
}

function renderStatementForm() {
  const banking = loadStatementBanking();
  getElement("statementBank").value = banking.origemSaldo?.banco || "mercado-pago";
  getElement("statementPeriodStart").value = banking.origemSaldo?.periodoInicio || "";
  getElement("statementPeriodEnd").value = banking.origemSaldo?.periodoFim || "";
  getElement("statement-parser-mode").textContent = "CSV / Excel recomendado";
  renderStatementPreview();
}

async function processStatementFile() {
  const file = statementFileInput?.files?.[0];
  const bank = getElement("statementBank").value;

  if (!file) {
    showMessage("error", "Selecione um arquivo para iniciar a leitura do extrato.");
    return;
  }

  try {
    const format = detectStatementFormat(file);
    showMessage("success", "Lendo arquivo e preparando a revisao do extrato...");
    const fileContent = await lerArquivoImportado(file);
    let parserResult;

    currentStatementFileName = file.name;
    currentStatementFormat = format;

    if (format === "csv") {
      parserResult = parseCSV(fileContent, bank, file.name);
    } else if (format === "xlsx") {
      parserResult = parseXLSX(fileContent, bank, file.name);
    } else if (format === "pdf") {
      parserResult = await parsePDFStatement(fileContent, bank, file.name);
    } else if (format === "image") {
      parserResult = await parseImageStatement(fileContent, bank, file.name);
    } else {
      parserResult = parseGenerico(file.name, fileContent, bank);
    }

    statementImportRowsState = parserResult.lancamentos.map((item) => ({
      ...item,
      categoria: item.categoria || item.categoriaSugerida || "outros",
      data: item.data || (item.status_importacao === "rejeitada" ? "" : getTodayInputValue()),
      arquivo_origem: item.arquivo_origem || file.name,
    }));
    statementDraftsState = [...statementImportRowsState];
    statementImportReportState = finalizeImportReport(parserResult.report || createImportReport());
    statementBalanceSuggestion = parserResult.saldoSugerido || 0;

    console.log("Lendo extrato importado", {
      banco: bank,
      arquivo: file.name,
      formato: format,
      parser: parserResult.parserMode,
      resultado: statementImportRowsState,
      saldo: statementBalanceSuggestion,
      relatorio: statementImportReportState,
      validacao: parserResult.validation || null,
    });

    getElement("statement-parser-mode").textContent =
      parserResult.parserMode || "Fallback generico";
    renderStatementPreview();

    if (parserResult.validation && !parserResult.validation.consistente) {
      showMessage(
        "error",
        `Arquivo lido, mas a validacao do saldo encontrou diferenca de ${formatStatementCurrency(
          parserResult.validation.diferenca
        )}. Revise antes de confirmar.`
      );
      return;
    }

    showMessage(
      "success",
      statementImportReportState
        ? `Arquivo lido. ${buildImportReportMessage(statementImportReportState)}. Revise os lancamentos validos e confirme a importacao.`
        : "Arquivo lido. Revise os lancamentos e confirme a importacao antes de salvar."
    );
  } catch (error) {
    resetStatementImportState();
    renderStatementPreview();
    showMessage(
      "error",
      error.message || "Nao foi possivel ler o arquivo selecionado."
    );
  }
}

function updateStatementDraft(event) {
  const field = event.target?.dataset?.statementField;
  const root = event.target?.closest?.("[data-statement-id]");

  if (!field || !root) {
    return;
  }

  const updateItem = (item) => {
    if (item.id !== root.dataset.statementId) {
      return item;
    }

    const nextValue =
      field === "valor" ? toStatementNumber(event.target.value) : event.target.value;
    const nextDescription =
      field === "descricao" ? event.target.value : item.descricao;
    const resolvedValue = field === "valor" ? nextValue : item.valor;
    const resolvedType =
      field === "tipo"
        ? event.target.value
        : item.tipo || (Number(resolvedValue) < 0 ? "saida" : "entrada");

    return {
      ...item,
      [field]: nextValue,
      tipo: resolvedType,
      categoriaSugerida: suggestImportCategory(nextDescription),
      status_importacao: "valida",
      motivo_rejeicao: "",
    };
  };

  statementDraftsState = statementDraftsState.map(updateItem);
  statementImportRowsState = statementImportRowsState.map(updateItem);

  if (event.type === "change") {
    renderStatementPreview();
  }
}

function handleStatementPreviewClick(event) {
  const button = event.target.closest("[data-action='remove-statement-item']");

  if (!button) {
    return;
  }

  statementDraftsState = statementDraftsState.filter((item) => item.id !== button.dataset.id);
  statementImportRowsState = statementImportRowsState.filter((item) => item.id !== button.dataset.id);
  renderStatementPreview();
}

async function confirmImportedExpenses() {
  if (!statementImportRowsState.length) {
    showMessage("error", "Nao ha lancamentos revisados para importar.");
    return;
  }

  const normalizedStatementDrafts = statementImportRowsState.map((item) => ({
    ...item,
    valor: Math.abs(Number(item.valor || 0)),
    categoria: item.categoria || item.categoriaSugerida || "outros",
    tipo: item.tipo === "entrada" ? "entrada" : "saida",
    origem: IMPORT_ORIGIN,
  }));

  const hasAtLeastOneSavableItem = normalizedStatementDrafts.some(
    (item) =>
      item.status_importacao !== "rejeitada" &&
      item.descricao &&
      item.data &&
      Math.abs(Number(item.valor || 0)) > 0
  );

  if (!hasAtLeastOneSavableItem) {
    showMessage(
      "error",
      "Nenhuma movimentacao valida ficou pronta para importacao. Revise descricao, valor, data e tipo."
    );
    return;
  }

  if (window.MFinanceiroSupabaseSync?.importStatementBatch) {
    try {
      const importResult = await window.MFinanceiroSupabaseSync.importStatementBatch(
        normalizedStatementDrafts,
        {
          fileName: currentStatementFileName,
          sourceFormat: currentStatementFormat,
        }
      );
      const processedMap = new Map(
        (Array.isArray(importResult.processedItems) ? importResult.processedItems : []).map((item, index) => [
          buildStatementImportRowKey(item, index),
          item,
        ])
      );
      const mergedRows = statementImportRowsState.map((item, index) => {
        const lookupKey = buildStatementImportRowKey(item, index);
        const processedItem = processedMap.get(lookupKey);

        if (!processedItem) {
          return {
            ...item,
            status_importacao: item.status_importacao || "valida",
            motivo_rejeicao: item.motivo_rejeicao || "",
          };
        }

        return {
          ...item,
          ...processedItem,
          valor: Math.abs(Number(processedItem.valor || item.valor || 0)),
          categoria: processedItem.categoria || item.categoria || item.categoriaSugerida || "outros",
          external_id: processedItem.external_id || item.external_id || null,
        };
      });

      statementImportRowsState = mergedRows;
      statementDraftsState = [...mergedRows];
      statementImportReportState = mergeImportReports(importResult.report, mergedRows);
      renderStatementPreview();

      if (typeof window.atualizarDashboard === "function") {
        window.atualizarDashboard();
      }

      showMessage(
        statementImportReportState.totalEfetivamenteSalvo > 0 ? "success" : "warning",
        `Importacao do extrato concluida. ${buildImportReportMessage(statementImportReportState)}.`
      );
      return;
    } catch (error) {
      showMessage(
        "error",
        error.message || "Nao foi possivel salvar as movimentacoes importadas do Excel."
      );
      return;
    }
  }

  const localExpenseFallback = normalizedStatementDrafts
    .filter((item) => item.tipo === "saida" && item.descricao && item.data && item.valor > 0)
    .map((item) => ({
      ...item,
      origem: IMPORT_ORIGIN,
    }));

  saveImportedExpensesFromStatement(localExpenseFallback);

  if (typeof window.atualizarDashboard === "function") {
    window.atualizarDashboard();
  }

  showMessage(
    "success",
    `${localExpenseFallback.length} movimentacao(oes) de saida importada(s) com sucesso no modo local.`
  );
}

function acceptStatementBalance() {
  const currentBanking = loadStatementBanking();

  saveStatementBanking({
    ...currentBanking,
    saldoAtual: statementBalanceSuggestion,
    origemSaldo: {
      ...currentBanking.origemSaldo,
      modo: "extrato",
      banco: getElement("statementBank").value,
      periodoInicio: getElement("statementPeriodStart").value,
      periodoFim: getElement("statementPeriodEnd").value,
      ultimoArquivo: currentStatementFileName,
      ultimoSaldoImportado: statementBalanceSuggestion,
    },
  });

  if (typeof window.atualizarDashboard === "function") {
    window.atualizarDashboard();
  }

  showMessage(
    "success",
    `Saldo calculado confirmado em ${formatStatementCurrency(statementBalanceSuggestion)}.`
  );
  window.AppShell.queueDashboardRedirect(
    `Saldo importado do extrato confirmado em ${formatStatementCurrency(statementBalanceSuggestion)}.`
  );
}

function switchToManualBalance() {
  const currentBanking = loadStatementBanking();

  saveStatementBanking({
    ...currentBanking,
    origemSaldo: {
      ...currentBanking.origemSaldo,
      modo: "manual",
    },
  });

  showMessage(
    "success",
    "Modo manual ativado. Ajuste o saldo atual na Base financeira quando quiser."
  );

  window.setTimeout(() => {
    window.location.assign("/cadastro-bancario.html");
  }, 900);
}

getElement("read-statement-button").addEventListener("click", processStatementFile);
getElement("confirm-imported-expenses-button").addEventListener("click", confirmImportedExpenses);
getElement("accept-statement-balance-button").addEventListener("click", acceptStatementBalance);
getElement("adjust-balance-manually-button").addEventListener("click", switchToManualBalance);
statementPreviewList.addEventListener("input", updateStatementDraft);
statementPreviewList.addEventListener("change", updateStatementDraft);
statementPreviewList.addEventListener("click", handleStatementPreviewClick);

renderStatementForm();
})();
