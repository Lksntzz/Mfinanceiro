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
let statementBalanceSuggestion = 0;
let currentStatementFileName = "";

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

function showMessage(type, text) {
  statementMessage.textContent = text;
  statementMessage.className = `message-box ${type}`;
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

  return toStatementNumber(matches[matches.length - 1]);
}

function normalizeImportDescription(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function lerArquivoImportado(file) {
  const format = detectStatementFormat(file);

  if (format === "xlsx") {
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

  if (extension === "xlsx") {
    return "xlsx";
  }

  if (extension === "pdf") {
    return "pdf";
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
}) {
  const normalizedValue = Number(value || 0);

  return {
    id: createId(prefix),
    data: normalizeStatementDate(date),
    descricao: String(description || "").trim() || "Movimentacao importada",
    valor: normalizedValue,
    saldo: Number.isFinite(Number(balance)) ? Number(balance) : 0,
    tipo: normalizedValue < 0 ? "saida" : "entrada",
    categoria: suggestImportCategory(description),
    categoriaSugerida: suggestImportCategory(description),
    origem: "importado",
    banco: bank,
  };
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

function parseCSV(textContent, bank) {
  if (bank === "mercado-pago") {
    return parseMercadoPagoCSV(textContent);
  }

  return parseGenericCSV(textContent, bank);
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

    lancamentos.push(
      buildImportedStatementItem({
        prefix: "extrato_mp_csv",
        date: row[0],
        description: row[1],
        value: parseBrazilianAmount(row[3]),
        balance: parseBrazilianAmount(row[4]),
        bank: "mercado-pago",
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
  };
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
  };
}

function parseXLSX() {
  throw new Error(
    "Leitura de Excel ainda nao esta disponivel nesta versao local. Use CSV para maior precisao."
  );
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
  const source = `${fileName} ${String(fileContent || "")}`;
  const value = extractImportAmount(source);

  return {
    saldoSugerido: value,
    lancamentos: [
      buildImportedStatementItem({
        prefix: "extrato_generico",
        date: extractImportDate(source),
        description: normalizeImportDescription(fileName) || "Lancamento importado",
        value,
        balance: value,
        bank,
      }),
    ],
    validation: null,
    parserMode: "Fallback generico",
  };
}

function renderStatementPreview() {
  if (!statementDraftsState.length) {
    statementPreviewList.innerHTML = `
      <div class="subtle-panel">
        <strong>Nenhum arquivo processado</strong>
        <span class="section-note">
          O parser usa leitura estruturada para CSV, fallback generico para outros formatos e exige revisao antes de salvar.
        </span>
      </div>
    `;
    getElement("statement-status-chip").textContent = "Aguardando arquivo";
    getElement("statement-balance-preview").textContent = formatStatementCurrency(0);
    return;
  }

  getElement("statement-status-chip").textContent = `${statementDraftsState.length} lancamento(s) em revisao`;
  getElement("statement-balance-preview").textContent = formatStatementCurrency(
    statementBalanceSuggestion
  );

  statementPreviewList.innerHTML = statementDraftsState
    .map(
      (item) => `
        <div class="subtle-panel" data-statement-id="${item.id}">
          <strong>${item.descricao}</strong>
          <span class="section-note">
            ${item.tipo === "saida" ? "Saida" : "Entrada"} | Saldo do arquivo: ${formatStatementCurrency(
              item.saldo || 0
            )}
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
    const fileContent = await lerArquivoImportado(file);
    let parserResult;

    currentStatementFileName = file.name;

    if (format === "csv") {
      parserResult = parseCSV(fileContent, bank);
    } else if (format === "xlsx") {
      parserResult = parseXLSX(fileContent, bank);
    } else if (format === "pdf" && bank === "mercado-pago") {
      parserResult = parsePDFMercadoPago(file.name, fileContent);
    } else {
      parserResult = parseGenerico(file.name, fileContent, bank);
    }

    statementDraftsState = parserResult.lancamentos.map((item) => ({
      ...item,
      categoria: item.categoria || item.categoriaSugerida || "outros",
      data: item.data || getTodayInputValue(),
    }));
    statementBalanceSuggestion = parserResult.saldoSugerido || 0;

    console.log("Lendo extrato importado", {
      banco: bank,
      arquivo: file.name,
      formato: format,
      parser: parserResult.parserMode,
      resultado: statementDraftsState,
      saldo: statementBalanceSuggestion,
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
      "Arquivo lido. Revise os lancamentos e confirme a importacao antes de salvar."
    );
  } catch (error) {
    statementDraftsState = [];
    statementBalanceSuggestion = 0;
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

  statementDraftsState = statementDraftsState.map((item) => {
    if (item.id !== root.dataset.statementId) {
      return item;
    }

    const nextValue =
      field === "valor" ? toStatementNumber(event.target.value) : event.target.value;
    const nextDescription =
      field === "descricao" ? event.target.value : item.descricao;
    const resolvedValue = field === "valor" ? nextValue : item.valor;

    return {
      ...item,
      [field]: nextValue,
      tipo: resolvedValue < 0 ? "saida" : "entrada",
      categoriaSugerida: suggestImportCategory(nextDescription),
    };
  });

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
  renderStatementPreview();
}

function confirmImportedExpenses() {
  if (!statementDraftsState.length) {
    showMessage("error", "Nao ha lancamentos revisados para importar.");
    return;
  }

  const expenseDrafts = statementDraftsState.filter(
    (item) => item.tipo === "saida" && Math.abs(Number(item.valor || 0)) > 0
  );

  if (!expenseDrafts.length) {
    showMessage(
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

  if (typeof window.atualizarDashboard === "function") {
    window.atualizarDashboard();
  }

  showMessage(
    "success",
    `${expenseDrafts.length} gasto(s) importado(s) com sucesso. Eles ja entram no dashboard como contas do dia a dia.`
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
