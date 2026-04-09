const APP_STORAGE_KEY_BASE = "mfinanceiro_app_data";
const STORAGE_SCOPE_SEPARATOR = "__";
const STORAGE_OWNER_KEY = "mfinanceiro_storage_owner";
const SCOPED_STORAGE_MIGRATION_PREFIX = "mfinanceiro_scoped_storage_migrated";
const INSS_TABLE_2026 = [
  { limit: 1621.0, rate: 0.075 },
  { limit: 2902.84, rate: 0.09 },
  { limit: 4354.27, rate: 0.12 },
  { limit: 8475.55, rate: 0.14 },
];
const IRPF_TABLE_2026 = [
  { limit: 2428.8, rate: 0, deduction: 0 },
  { limit: 2826.65, rate: 0.075, deduction: 182.16 },
  { limit: 3751.05, rate: 0.15, deduction: 394.16 },
  { limit: 4664.68, rate: 0.225, deduction: 675.49 },
  { limit: Infinity, rate: 0.275, deduction: 908.73 },
];
const IRPF_DEPENDENT_DEDUCTION_2026 = 189.59;
const IRPF_SIMPLIFIED_DISCOUNT_2026 = 607.2;
const IRPF_MONTHLY_REDUCTION_2026 = {
  fullExemptionIncome: 5000,
  upperIncome: 7350,
  fullReduction: 978.62,
  factor: 0.133145,
};
const SECTION_STORAGE_KEYS = {
  banking: "cadastroBancario",
  profile: "perfilMFinanceiro",
  pagamento: "registroPagamento",
  beneficios: "beneficios",
  ledgerMovimentacoes: "ledgerMovimentacoes",
  contasFixas: "contasFixas",
  contasDiaADia: "contasVariaveis",
  contasDiaADiaManuais: "contasVariaveisManuais",
  contasDiaADiaImportadas: "contasVariaveisImportadas",
  cartoes: "cartoes",
  lancamentosCartao: "gastosCartao",
  investimentos: "investimentos",
  parcelamentos: "parcelamentos",
};
const LEGACY_SECTION_STORAGE_KEYS = {
  banking: "mfinanceiro_banking_data",
  profile: "mfinanceiro_profile_data",
  recebimentos: "mfinanceiro_recebimentos_data",
  ledgerMovimentacoes: "mfinanceiro_ledger_movimentacoes_data",
  contasFixas: "mfinanceiro_contas_fixas_data",
  contasDiaADia: "mfinanceiro_contas_dia_a_dia_data",
  contasDiaADiaManuais: "mfinanceiro_contas_dia_a_dia_data",
  contasDiaADiaImportadas: "mfinanceiro_contas_dia_a_dia_data",
  cartoes: "mfinanceiro_cartoes_data",
  lancamentosCartao: "mfinanceiro_lancamentos_cartao_data",
  investimentos: "mfinanceiro_investimentos_data",
  parcelamentos: "parcelamentos",
};
const stateSubscribers = new Set();

function getCurrentUserStorageScope() {
  const userId = window.AuthSession?.getAuthSession?.()?.user?.id;

  if (typeof userId !== "string") {
    return "";
  }

  return userId.trim();
}

function getScopedStorageKey(baseKey, scope = getCurrentUserStorageScope()) {
  return scope ? `${baseKey}${STORAGE_SCOPE_SEPARATOR}${scope}` : baseKey;
}

function hasStorageValue(key) {
  return localStorage.getItem(key) !== null;
}

function shouldAllowLegacyFallback(scope = getCurrentUserStorageScope()) {
  if (!scope) {
    return true;
  }

  const owner = localStorage.getItem(STORAGE_OWNER_KEY);
  return !owner || owner === scope;
}

function ensureScopedStorageMigration() {
  const scope = getCurrentUserStorageScope();

  if (!scope) {
    return;
  }

  const migrationFlagKey = `${SCOPED_STORAGE_MIGRATION_PREFIX}${STORAGE_SCOPE_SEPARATOR}${scope}`;

  if (sessionStorage.getItem(migrationFlagKey) === "true") {
    return;
  }

  const scopedAppKey = getScopedStorageKey(APP_STORAGE_KEY_BASE, scope);

  if (hasStorageValue(scopedAppKey)) {
    sessionStorage.setItem(migrationFlagKey, "true");
    return;
  }

  if (!shouldAllowLegacyFallback(scope)) {
    sessionStorage.setItem(migrationFlagKey, "true");
    return;
  }

  const legacyKeys = [
    APP_STORAGE_KEY_BASE,
    ...Object.values(SECTION_STORAGE_KEYS),
    ...Object.values(LEGACY_SECTION_STORAGE_KEYS),
  ];
  const hasLegacyData = legacyKeys.some((key) => hasStorageValue(key));

  if (!hasLegacyData) {
    sessionStorage.setItem(migrationFlagKey, "true");
    return;
  }

  localStorage.setItem(STORAGE_OWNER_KEY, scope);

  if (hasStorageValue(APP_STORAGE_KEY_BASE)) {
    localStorage.setItem(scopedAppKey, localStorage.getItem(APP_STORAGE_KEY_BASE));
  }

  Object.values(SECTION_STORAGE_KEYS).forEach((baseKey) => {
    const scopedKey = getScopedStorageKey(baseKey, scope);

    if (!hasStorageValue(baseKey) || hasStorageValue(scopedKey)) {
      return;
    }

    localStorage.setItem(scopedKey, localStorage.getItem(baseKey));
  });

  sessionStorage.setItem(migrationFlagKey, "true");
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return 0;
  }

  const sanitizedValue = normalizedValue.replace(/[^\d,.-]/g, "");
  const lastComma = sanitizedValue.lastIndexOf(",");
  const lastDot = sanitizedValue.lastIndexOf(".");
  let numericString = sanitizedValue;

  // Aceita valores digitados no formato pt-BR, como 2.500,75.
  if (lastComma > lastDot) {
    numericString = sanitizedValue.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    numericString = sanitizedValue.replace(/,/g, "");
  } else if (lastComma !== -1 && lastDot === -1) {
    numericString = sanitizedValue.replace(",", ".");
  }

  const parsed = Number(numericString);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyBenefitConfig(defaults = {}) {
  return {
    ativo: false,
    valor: 0,
    dataRecebimento: 10,
    descontadoEmFolha: false,
    contabilizarNoSaldo: false,
    ...defaults,
  };
}

function createEmptyReceipt(defaults = {}) {
  return {
    dataPrevista: "",
    valorPrevisto: 0,
    valorRecebido: 0,
    status: "pendente",
    aplicadoNoSaldo: false,
    atualizadoEm: "",
    ...defaults,
  };
}

function isImportedLedgerOrigin(value) {
  return ["importado", "extrato_importado", "extrato_importado_excel"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function normalizeLedgerItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    ...item,
    id: item.id || item.external_id || createId("ledger"),
    user_id: item.user_id || "",
    data: item.data || "",
    descricao: item.descricao || "Movimentacao",
    valor: toNumber(item.valor),
    categoria: item.categoria || "outros",
    tipo: item.tipo || "saida",
    origem: item.origem || "manual",
    external_id: item.external_id || item.id || null,
    arquivo_origem: item.arquivo_origem || null,
    linha_origem:
      item.linha_origem !== null && item.linha_origem !== undefined
        ? Number(item.linha_origem)
        : null,
    status_importacao: item.status_importacao || "valida",
  };
}

function deriveDailyExpensesFromLedger(ledgerItems) {
  return (Array.isArray(ledgerItems) ? ledgerItems : [])
    .map((item) => normalizeLedgerItem(item))
    .filter(Boolean)
    .filter(
      (item) =>
        item.status_importacao === "valida" &&
        item.tipo === "saida" &&
        item.data &&
        toNumber(item.valor) > 0
    )
    .map((item) => ({
      id: item.external_id || item.id,
      user_id: item.user_id || "",
      descricao: item.descricao,
      categoria: item.categoria || "outros",
      valor: toNumber(item.valor),
      data: item.data,
      tipo: "saida",
      origem: item.origem || "extrato_importado",
      external_id: item.external_id || item.id || null,
      arquivo_origem: item.arquivo_origem || null,
      linha_origem: item.linha_origem ?? null,
      status_importacao: item.status_importacao || "valida",
    }));
}

function mergeLedgerMovementsWithManualExpenses(ledgerItems, dailyExpenses) {
  const normalizedLedgerItems = (Array.isArray(ledgerItems) ? ledgerItems : [])
    .map((item) => normalizeLedgerItem(item))
    .filter(Boolean);
  const manualItems = (Array.isArray(dailyExpenses) ? dailyExpenses : [])
    .filter((item) => !isImportedLedgerOrigin(item?.origem))
    .map((item) =>
      normalizeLedgerItem({
        ...item,
        origem: item?.origem || "manual",
        tipo: item?.tipo || "saida",
        status_importacao: item?.status_importacao || "valida",
      })
    )
    .filter(Boolean);
  const seenKeys = new Set();

  return [...normalizedLedgerItems, ...manualItems].filter((item) => {
    const dedupeKey = String(
      item?.external_id ||
      item?.id ||
      [item?.data, item?.descricao, item?.valor, item?.tipo, item?.origem].join("|")
    ).trim();

    if (!dedupeKey || seenKeys.has(dedupeKey)) {
      return false;
    }

    seenKeys.add(dedupeKey);
    return true;
  });
}

function getDefaultAppData() {
  return {
    profile: {
      foto: "",
      nome: "",
      email: "",
    },
    banking: {
      saldoAtual: 0,
      origemSaldo: {
        modo: "manual",
        banco: "mercado-pago",
        periodoInicio: "",
        periodoFim: "",
        ultimoArquivo: "",
        ultimoSaldoImportado: 0,
      },
      salarioBruto: 0,
      salarioLiquido: 0,
      descontosAutomaticos: {
        inss: 0,
        irpf: 0,
      },
      descontosDetalhados: {
        planoSaude: 0,
        planoOdontologico: 0,
        vt: 0,
        vrVa: 0,
        vrVaDescontadoEmFolha: false,
        outrosDescontos: [],
      },
      tipoCiclo: "ciclo1",
      diasPagamento: [5, 20],
      percentuaisPagamento: [100, 0],
      beneficios: {
        vrVa: createEmptyBenefitConfig(),
      },
    },
    recebimentos: {
      pagamento: createEmptyReceipt(),
      beneficios: {
        vrVa: createEmptyReceipt(),
      },
      historico: {
        pagamentos: [],
        beneficios: {
          vrVa: [],
        },
      },
    },
    ledgerMovimentacoes: [],
    contasFixas: [],
    contasDiaADia: [],
    cartoes: [],
    lancamentosCartao: [],
    parcelamentos: [],
    investimentos: {
      percentualSugerido: 10,
      percentualEscolhido: 10,
      ultimaAcao: "pendente",
      ultimoValorSugerido: 0,
      valorReservado: 0,
    },
  };
}

function readJsonStorage(key) {
  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    localStorage.removeItem(key);
    return null;
  }
}

function readSectionSnapshot(key, ...legacyKeys) {
  ensureScopedStorageMigration();

  const scopedSnapshot = readJsonStorage(getScopedStorageKey(key));

  if (scopedSnapshot !== null && scopedSnapshot !== undefined) {
    return scopedSnapshot;
  }

  if (!shouldAllowLegacyFallback()) {
    return null;
  }

  return [key, ...legacyKeys].reduce(
    (snapshot, currentKey) => {
      if (snapshot !== null && snapshot !== undefined) {
        return snapshot;
      }

      if (!currentKey) {
        return snapshot;
      }

      return readJsonStorage(currentKey);
    },
    null
  );
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function writeScopedJsonStorage(baseKey, value) {
  writeJsonStorage(getScopedStorageKey(baseKey), value);
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function calcularDescontosManuais(bankingPayload) {
  const planoSaude = toNumber(bankingPayload.descontosDetalhados?.planoSaude);
  const planoOdontologico = toNumber(
    bankingPayload.descontosDetalhados?.planoOdontologico
  );
  const vt = toNumber(bankingPayload.descontosDetalhados?.vt);
  const vrVa = toNumber(bankingPayload.descontosDetalhados?.vrVa);
  const vrVaDescontadoEmFolha = Boolean(
    bankingPayload.descontosDetalhados?.vrVaDescontadoEmFolha
  );
  const outrosDescontos = Array.isArray(
    bankingPayload.descontosDetalhados?.outrosDescontos
  )
    ? bankingPayload.descontosDetalhados.outrosDescontos.reduce(
        (total, item) => total + toNumber(item.valor),
        0
      )
    : 0;

  return roundCurrency(
    planoSaude +
      planoOdontologico +
      vt +
      outrosDescontos +
      (vrVaDescontadoEmFolha ? vrVa : 0)
  );
}

function calcularINSS(salarioBruto) {
  const grossSalary = Math.min(
    Math.max(toNumber(salarioBruto), 0),
    INSS_TABLE_2026[INSS_TABLE_2026.length - 1].limit
  );
  let previousLimit = 0;
  let total = 0;

  INSS_TABLE_2026.forEach((range) => {
    if (grossSalary <= previousLimit) {
      return;
    }

    const taxableSlice = Math.min(grossSalary, range.limit) - previousLimit;
    total += taxableSlice * range.rate;
    previousLimit = range.limit;
  });

  return roundCurrency(total);
}

function getMonthlyIrpfReduction(baseCalculo) {
  if (baseCalculo <= IRPF_MONTHLY_REDUCTION_2026.fullExemptionIncome) {
    return Number.POSITIVE_INFINITY;
  }

  if (baseCalculo <= IRPF_MONTHLY_REDUCTION_2026.upperIncome) {
    return roundCurrency(
      IRPF_MONTHLY_REDUCTION_2026.fullReduction -
        IRPF_MONTHLY_REDUCTION_2026.factor * baseCalculo
    );
  }

  return 0;
}

function calcularIRPF(salarioBruto, inss, dependentes = 0, outrosAjustes = 0) {
  const grossSalary = Math.max(toNumber(salarioBruto), 0);
  const dependentCount = Math.max(toNumber(dependentes), 0);
  const extraAdjustments = Math.max(toNumber(outrosAjustes), 0);
  const legalDeductions =
    Math.max(toNumber(inss), 0) +
    dependentCount * IRPF_DEPENDENT_DEDUCTION_2026 +
    extraAdjustments;
  const conventionalBase = Math.max(grossSalary - legalDeductions, 0);
  const simplifiedBase = Math.max(
    grossSalary - Math.max(toNumber(inss), 0) - IRPF_SIMPLIFIED_DISCOUNT_2026,
    0
  );
  const baseCalculo = Math.min(conventionalBase, simplifiedBase);
  const range =
    IRPF_TABLE_2026.find((currentRange) => baseCalculo <= currentRange.limit) ||
    IRPF_TABLE_2026[IRPF_TABLE_2026.length - 1];
  const rawTax = Math.max(baseCalculo * range.rate - range.deduction, 0);
  const reduction = getMonthlyIrpfReduction(baseCalculo);
  const irpf = Number.isFinite(reduction)
    ? Math.max(rawTax - reduction, 0)
    : 0;

  return roundCurrency(irpf);
}

function calcularSalarioLiquido(dadosCadastro) {
  const salarioBruto = toNumber(dadosCadastro.salarioBruto);
  const inss = calcularINSS(salarioBruto);
  const irpf = calcularIRPF(
    salarioBruto,
    inss,
    dadosCadastro.dependentes,
    dadosCadastro.outrosAjustesIRPF
  );
  const descontosManuais = calcularDescontosManuais(dadosCadastro);
  const salarioLiquido = Math.max(
    salarioBruto - inss - irpf - descontosManuais,
    0
  );

  return {
    salarioBruto: roundCurrency(salarioBruto),
    inss,
    irpf,
    descontosManuais,
    salarioLiquido: roundCurrency(salarioLiquido),
  };
}

function calcularSalarioLiquidoBanco(bankingPayload) {
  return calcularSalarioLiquido(bankingPayload).salarioLiquido;
}

function normalizeLegacyData(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const legacyProfile = data.profile || {};
  const banking = data.banking || {};
  const legacyDiscounts = legacyProfile.descontos || {};
  const legacyPayment = Array.isArray(data.recebimentos?.pagamentos)
    ? data.recebimentos.pagamentos[data.recebimentos.pagamentos.length - 1]
    : null;
  const legacyVr = Array.isArray(data.recebimentos?.vr)
    ? data.recebimentos.vr[data.recebimentos.vr.length - 1]
    : null;

  data.profile = {
    foto: legacyProfile.foto || "",
    nome: legacyProfile.nome || "",
    email: legacyProfile.email || "",
  };

  data.banking = {
    saldoAtual: banking.saldoAtual ?? legacyProfile.saldoAtual ?? 0,
    origemSaldo: {
      modo: banking.origemSaldo?.modo ?? "manual",
      banco: banking.origemSaldo?.banco ?? "mercado-pago",
      periodoInicio: banking.origemSaldo?.periodoInicio ?? "",
      periodoFim: banking.origemSaldo?.periodoFim ?? "",
      ultimoArquivo: banking.origemSaldo?.ultimoArquivo ?? "",
      ultimoSaldoImportado: banking.origemSaldo?.ultimoSaldoImportado ?? 0,
    },
    salarioBruto: banking.salarioBruto ?? legacyProfile.salarioBruto ?? 0,
    salarioLiquido: 0,
    descontosAutomaticos: {
      inss: banking.descontosAutomaticos?.inss ?? 0,
      irpf: banking.descontosAutomaticos?.irpf ?? 0,
    },
    descontosDetalhados: {
      planoSaude:
        banking.descontosDetalhados?.planoSaude ?? legacyDiscounts.medico ?? 0,
      planoOdontologico:
        banking.descontosDetalhados?.planoOdontologico ?? 0,
      vt: banking.descontosDetalhados?.vt ?? legacyDiscounts.vt ?? 0,
      vrVa:
        banking.descontosDetalhados?.vrVa ??
        (legacyDiscounts.vr ?? 0) + (legacyDiscounts.va ?? 0),
      vrVaDescontadoEmFolha:
        banking.descontosDetalhados?.vrVaDescontadoEmFolha ??
        Boolean(legacyDiscounts.vr || legacyDiscounts.va),
      outrosDescontos: Array.isArray(banking.descontosDetalhados?.outrosDescontos)
        ? banking.descontosDetalhados.outrosDescontos
        : [],
    },
    tipoCiclo:
      banking.tipoCiclo ??
      (legacyProfile.tipoRecebimento === "2x" ? "ciclo2" : "ciclo1"),
    diasPagamento: Array.isArray(banking.diasPagamento)
      ? banking.diasPagamento
      : Array.isArray(legacyProfile.diasPagamento)
        ? legacyProfile.diasPagamento
        : [5, 20],
    percentuaisPagamento: Array.isArray(banking.percentuaisPagamento)
      ? banking.percentuaisPagamento
      : banking.tipoCiclo === "ciclo2"
        ? [50, 50]
        : [100, 0],
    beneficios: {
      vrVa: createEmptyBenefitConfig({
        ...(banking.beneficios?.vrVa || banking.beneficios?.vr || {}),
        ativo:
          banking.beneficios?.vrVa?.ativo ??
          banking.beneficios?.vr?.ativo ??
          Boolean(legacyProfile.recebeVr),
        valor:
          banking.beneficios?.vrVa?.valor ??
          (banking.beneficios?.vr?.valor ?? 0) +
            (banking.beneficios?.va?.valor ?? 0) +
            (legacyProfile.valorVr ?? 0),
        dataRecebimento:
          banking.beneficios?.vrVa?.dataRecebimento ??
          banking.beneficios?.vr?.dataRecebimento ??
          legacyProfile.diaRecebimentoVr ??
          10,
        descontadoEmFolha:
          banking.beneficios?.vrVa?.descontadoEmFolha ??
          Boolean(legacyDiscounts.vr || legacyDiscounts.va),
      }),
    },
  };
  const salarioCalculado = calcularSalarioLiquido(data.banking);
  data.banking.salarioLiquido =
    banking.salarioLiquido ?? salarioCalculado.salarioLiquido;
  data.banking.descontosAutomaticos = {
    inss: banking.descontosAutomaticos?.inss ?? salarioCalculado.inss,
    irpf: banking.descontosAutomaticos?.irpf ?? salarioCalculado.irpf,
  };

  data.recebimentos = {
    pagamento: {
      ...createEmptyReceipt(),
      ...(data.recebimentos?.pagamento || {}),
      ...(legacyPayment
        ? {
            dataPrevista: legacyPayment.data || "",
            valorRecebido: legacyPayment.valor || 0,
            status: "recebido",
            aplicadoNoSaldo: true,
            atualizadoEm: legacyPayment.confirmadoEm || "",
          }
        : {}),
    },
    beneficios: {
      vrVa: {
        ...createEmptyReceipt(),
        ...(data.recebimentos?.beneficios?.vrVa ||
          data.recebimentos?.beneficios?.vr ||
          {}),
        ...(legacyVr
          ? {
              dataPrevista: legacyVr.data || "",
              valorPrevisto: legacyVr.valor || 0,
              status: "recebido",
              atualizadoEm: legacyVr.confirmadoEm || "",
            }
          : {}),
      },
    },
    historico: {
      pagamentos: Array.isArray(data.recebimentos?.historico?.pagamentos)
        ? data.recebimentos.historico.pagamentos
        : Array.isArray(data.recebimentos?.pagamentos)
          ? data.recebimentos.pagamentos
          : [],
      beneficios: {
        vrVa: Array.isArray(data.recebimentos?.historico?.beneficios?.vrVa)
          ? data.recebimentos.historico.beneficios.vrVa
          : Array.isArray(data.recebimentos?.historico?.beneficios?.vr)
            ? data.recebimentos.historico.beneficios.vr
            : Array.isArray(data.recebimentos?.vr)
              ? data.recebimentos.vr
              : [],
      },
    },
  };

  if (!Array.isArray(data.contasDiaADia)) {
    data.contasDiaADia = [];
  }

  if (!Array.isArray(data.ledgerMovimentacoes)) {
    data.ledgerMovimentacoes = [];
  }

  return data;
}

function mergeData(base, incoming) {
  const normalizedIncoming = normalizeLegacyData(incoming);

  return {
    ...base,
    ...normalizedIncoming,
    profile: {
      ...base.profile,
      ...(normalizedIncoming?.profile || {}),
    },
    banking: {
      ...base.banking,
      ...(normalizedIncoming?.banking || {}),
      origemSaldo: {
        ...base.banking.origemSaldo,
        ...(normalizedIncoming?.banking?.origemSaldo || {}),
      },
      descontosAutomaticos: {
        ...base.banking.descontosAutomaticos,
        ...(normalizedIncoming?.banking?.descontosAutomaticos || {}),
      },
      descontosDetalhados: {
        ...base.banking.descontosDetalhados,
        ...(normalizedIncoming?.banking?.descontosDetalhados || {}),
        outrosDescontos: Array.isArray(
          normalizedIncoming?.banking?.descontosDetalhados?.outrosDescontos
        )
          ? normalizedIncoming.banking.descontosDetalhados.outrosDescontos
          : base.banking.descontosDetalhados.outrosDescontos,
      },
      beneficios: {
        ...base.banking.beneficios,
        ...(normalizedIncoming?.banking?.beneficios || {}),
        vrVa: {
          ...base.banking.beneficios.vrVa,
          ...(normalizedIncoming?.banking?.beneficios?.vrVa ||
            normalizedIncoming?.banking?.beneficios?.vr ||
            {}),
        },
      },
    },
    recebimentos: {
      ...base.recebimentos,
      ...(normalizedIncoming?.recebimentos || {}),
      pagamento: {
        ...base.recebimentos.pagamento,
        ...(normalizedIncoming?.recebimentos?.pagamento || {}),
      },
      beneficios: {
        ...base.recebimentos.beneficios,
        ...(normalizedIncoming?.recebimentos?.beneficios || {}),
        vrVa: {
          ...base.recebimentos.beneficios.vrVa,
          ...(normalizedIncoming?.recebimentos?.beneficios?.vrVa ||
            normalizedIncoming?.recebimentos?.beneficios?.vr ||
            {}),
        },
      },
      historico: {
        ...base.recebimentos.historico,
        ...(normalizedIncoming?.recebimentos?.historico || {}),
        pagamentos: Array.isArray(
          normalizedIncoming?.recebimentos?.historico?.pagamentos
        )
          ? normalizedIncoming.recebimentos.historico.pagamentos
          : base.recebimentos.historico.pagamentos,
        beneficios: {
          ...base.recebimentos.historico.beneficios,
          ...(normalizedIncoming?.recebimentos?.historico?.beneficios || {}),
          vrVa: Array.isArray(
            normalizedIncoming?.recebimentos?.historico?.beneficios?.vrVa
          )
            ? normalizedIncoming.recebimentos.historico.beneficios.vrVa
            : Array.isArray(
                normalizedIncoming?.recebimentos?.historico?.beneficios?.vr
              )
              ? normalizedIncoming.recebimentos.historico.beneficios.vr
              : base.recebimentos.historico.beneficios.vrVa,
        },
      },
    },
    ledgerMovimentacoes: Array.isArray(normalizedIncoming?.ledgerMovimentacoes)
      ? normalizedIncoming.ledgerMovimentacoes
      : base.ledgerMovimentacoes,
    contasFixas: Array.isArray(normalizedIncoming?.contasFixas)
      ? normalizedIncoming.contasFixas
      : base.contasFixas,
    contasDiaADia: Array.isArray(normalizedIncoming?.contasDiaADia)
      ? normalizedIncoming.contasDiaADia
      : base.contasDiaADia,
    cartoes: Array.isArray(normalizedIncoming?.cartoes)
      ? normalizedIncoming.cartoes
      : base.cartoes,
    lancamentosCartao: Array.isArray(normalizedIncoming?.lancamentosCartao)
      ? normalizedIncoming.lancamentosCartao
      : base.lancamentosCartao,
    investimentos: {
      ...base.investimentos,
      ...(normalizedIncoming?.investimentos || {}),
    },
  };
}

function loadAppData() {
  const defaultData = getDefaultAppData();
  const rootData = readSectionSnapshot(APP_STORAGE_KEY_BASE);
  let hydratedData = rootData ? mergeData(defaultData, rootData) : defaultData;

  const sectionSnapshots = {
    profile: readSectionSnapshot(
      SECTION_STORAGE_KEYS.profile,
      LEGACY_SECTION_STORAGE_KEYS.profile
    ),
    banking: readSectionSnapshot(
      SECTION_STORAGE_KEYS.banking,
      LEGACY_SECTION_STORAGE_KEYS.banking
    ),
    pagamento: readSectionSnapshot(
      SECTION_STORAGE_KEYS.pagamento,
      LEGACY_SECTION_STORAGE_KEYS.recebimentos
    ),
    beneficios: readSectionSnapshot(
      SECTION_STORAGE_KEYS.beneficios,
      LEGACY_SECTION_STORAGE_KEYS.recebimentos
    ),
    ledgerMovimentacoes: readSectionSnapshot(
      SECTION_STORAGE_KEYS.ledgerMovimentacoes,
      LEGACY_SECTION_STORAGE_KEYS.ledgerMovimentacoes
    ),
    contasFixas: readSectionSnapshot(
      SECTION_STORAGE_KEYS.contasFixas,
      LEGACY_SECTION_STORAGE_KEYS.contasFixas
    ),
    contasDiaADia: readSectionSnapshot(
      SECTION_STORAGE_KEYS.contasDiaADia,
      LEGACY_SECTION_STORAGE_KEYS.contasDiaADia
    ),
    cartoes: readSectionSnapshot(
      SECTION_STORAGE_KEYS.cartoes,
      LEGACY_SECTION_STORAGE_KEYS.cartoes
    ),
    lancamentosCartao: readSectionSnapshot(
      SECTION_STORAGE_KEYS.lancamentosCartao,
      LEGACY_SECTION_STORAGE_KEYS.lancamentosCartao
    ),
    investimentos: readSectionSnapshot(
      SECTION_STORAGE_KEYS.investimentos,
      LEGACY_SECTION_STORAGE_KEYS.investimentos
    ),
    parcelamentos: readSectionSnapshot(
      SECTION_STORAGE_KEYS.parcelamentos,
      LEGACY_SECTION_STORAGE_KEYS.parcelamentos
    ),
  };
  const manualDailyExpensesSnapshot = readSectionSnapshot(
    SECTION_STORAGE_KEYS.contasDiaADiaManuais,
    LEGACY_SECTION_STORAGE_KEYS.contasDiaADiaManuais
  );
  const importedDailyExpensesSnapshot = readSectionSnapshot(
    SECTION_STORAGE_KEYS.contasDiaADiaImportadas,
    LEGACY_SECTION_STORAGE_KEYS.contasDiaADiaImportadas
  );

  Object.entries(sectionSnapshots).forEach(([key, snapshot]) => {
    if (snapshot === null || snapshot === undefined) {
      return;
    }

    if (key === "profile") {
      hydratedData = {
        ...hydratedData,
        profile: {
          ...hydratedData.profile,
          ...(snapshot || {}),
        },
      };
      return;
    }

    if (key === "banking") {
      hydratedData = {
        ...hydratedData,
        banking: {
          ...hydratedData.banking,
          ...(snapshot || {}),
          descontosDetalhados: {
            ...hydratedData.banking.descontosDetalhados,
            ...(snapshot?.descontosDetalhados || {}),
          },
          beneficios: {
            ...hydratedData.banking.beneficios,
            ...(snapshot?.beneficios || {}),
            vrVa: {
              ...hydratedData.banking.beneficios.vrVa,
              ...(snapshot?.beneficios?.vrVa || {}),
            },
          },
        },
      };
      return;
    }

    if (key === "pagamento") {
      hydratedData = {
        ...hydratedData,
        recebimentos: {
          ...hydratedData.recebimentos,
          pagamento: {
            ...hydratedData.recebimentos.pagamento,
            ...(snapshot?.pagamento || snapshot || {}),
          },
          historico: {
            ...hydratedData.recebimentos.historico,
            pagamentos: Array.isArray(snapshot?.historico?.pagamentos)
              ? snapshot.historico.pagamentos
              : hydratedData.recebimentos.historico.pagamentos,
          },
        },
      };
      return;
    }

    if (key === "beneficios") {
      hydratedData = {
        ...hydratedData,
        recebimentos: {
          ...hydratedData.recebimentos,
          beneficios: {
            ...hydratedData.recebimentos.beneficios,
            ...(snapshot?.beneficios || snapshot || {}),
            vrVa: {
              ...hydratedData.recebimentos.beneficios.vrVa,
              ...(snapshot?.vrVa || snapshot?.beneficios?.vrVa || snapshot || {}),
            },
          },
          historico: {
            ...hydratedData.recebimentos.historico,
            beneficios: {
              ...hydratedData.recebimentos.historico.beneficios,
              vrVa: Array.isArray(snapshot?.historico?.beneficios?.vrVa)
                ? snapshot.historico.beneficios.vrVa
                : Array.isArray(snapshot?.historico?.vrVa)
                  ? snapshot.historico.vrVa
                  : hydratedData.recebimentos.historico.beneficios.vrVa,
            },
          },
        },
      };
      return;
    }

    hydratedData = {
      ...hydratedData,
      [key]: snapshot,
    };
  });

  if (
    Array.isArray(manualDailyExpensesSnapshot) ||
    Array.isArray(importedDailyExpensesSnapshot)
  ) {
    const fallbackDailyExpenses = Array.isArray(hydratedData.contasDiaADia)
      ? hydratedData.contasDiaADia
      : [];
    const manualItems = Array.isArray(manualDailyExpensesSnapshot)
      ? manualDailyExpensesSnapshot.map((item) => ({
          ...item,
          origem: item.origem || "manual",
        }))
      : fallbackDailyExpenses.filter((item) => item.origem !== "importado");
    const importedItems = Array.isArray(importedDailyExpensesSnapshot)
      ? importedDailyExpensesSnapshot.map((item) => ({
          ...item,
          origem: "importado",
        }))
      : fallbackDailyExpenses.filter((item) => item.origem === "importado");

    hydratedData = {
      ...hydratedData,
      contasDiaADia: [...manualItems, ...importedItems],
    };
  }

  if (Array.isArray(hydratedData.ledgerMovimentacoes) && hydratedData.ledgerMovimentacoes.length) {
    const ledgerItems = mergeLedgerMovementsWithManualExpenses(
      hydratedData.ledgerMovimentacoes,
      hydratedData.contasDiaADia
    );
    const importedItemsFromLedger = deriveDailyExpensesFromLedger(ledgerItems);
    const manualItems = (Array.isArray(hydratedData.contasDiaADia) ? hydratedData.contasDiaADia : []).filter(
      (item) => !isImportedLedgerOrigin(item?.origem)
    );

    hydratedData = {
      ...hydratedData,
      ledgerMovimentacoes: ledgerItems,
      contasDiaADia: [...manualItems, ...importedItemsFromLedger],
    };
  }

  if (
    (!Array.isArray(hydratedData.ledgerMovimentacoes) || !hydratedData.ledgerMovimentacoes.length) &&
    Array.isArray(hydratedData.contasDiaADia) &&
    hydratedData.contasDiaADia.length
  ) {
    hydratedData = {
      ...hydratedData,
      ledgerMovimentacoes: mergeLedgerMovementsWithManualExpenses([], hydratedData.contasDiaADia),
    };
  }

  return hydratedData;
}

function dispatchFinanceUpdate(source) {
  const currentData = loadAppData();

  stateSubscribers.forEach((listener) => {
    try {
      listener(currentData, source);
    } catch (error) {
      console.error("Falha ao notificar assinante do estado financeiro:", error);
    }
  });

  window.dispatchEvent(
    new CustomEvent("finance-data-updated", {
      detail: {
        source,
        data: currentData,
      },
    })
  );
}

function persistSectionSnapshots(data) {
  writeScopedJsonStorage(SECTION_STORAGE_KEYS.profile, data.profile || {});
  writeScopedJsonStorage(SECTION_STORAGE_KEYS.banking, data.banking || {});
  writeScopedJsonStorage(
    SECTION_STORAGE_KEYS.pagamento,
    data.recebimentos?.pagamento || {}
  );
  writeScopedJsonStorage(
    SECTION_STORAGE_KEYS.beneficios,
    {
      ...(data.recebimentos?.beneficios || {}),
      historico: {
        ...(data.recebimentos?.historico?.beneficios || {}),
      },
    }
  );
  writeScopedJsonStorage(
    SECTION_STORAGE_KEYS.ledgerMovimentacoes,
    data.ledgerMovimentacoes || []
  );
  writeScopedJsonStorage(SECTION_STORAGE_KEYS.contasFixas, data.contasFixas || []);
  writeScopedJsonStorage(SECTION_STORAGE_KEYS.contasDiaADia, data.contasDiaADia || []);
  writeScopedJsonStorage(
    SECTION_STORAGE_KEYS.contasDiaADiaManuais,
    (data.contasDiaADia || []).filter((item) => !isImportedLedgerOrigin(item?.origem))
  );
  writeScopedJsonStorage(
    SECTION_STORAGE_KEYS.contasDiaADiaImportadas,
    (data.contasDiaADia || []).filter((item) => isImportedLedgerOrigin(item?.origem))
  );
  writeScopedJsonStorage(SECTION_STORAGE_KEYS.cartoes, data.cartoes || []);
  writeScopedJsonStorage(
    SECTION_STORAGE_KEYS.lancamentosCartao,
    data.lancamentosCartao || []
  );
  writeScopedJsonStorage(SECTION_STORAGE_KEYS.investimentos, data.investimentos || {});
  writeScopedJsonStorage(SECTION_STORAGE_KEYS.parcelamentos, data.parcelamentos || []);
}

function saveAppData(data) {
  return replaceAppData(data, "local-storage");
}

function replaceAppData(data, source = "local-storage") {
  const nextData = mergeData(getDefaultAppData(), data || {});
  writeScopedJsonStorage(APP_STORAGE_KEY_BASE, nextData);
  persistSectionSnapshots(nextData);
  dispatchFinanceUpdate(source);
  return nextData;
}

function updateAppData(updater, source = "local-storage") {
  const currentData = loadAppData();
  const nextData = updater(JSON.parse(JSON.stringify(currentData)));
  return replaceAppData(nextData, source);
}

function salvarCadastroBancario(payload) {
  console.log("Salvando cadastro bancário:", payload);

  return updateAppData((draft) => {
    const salarySummary = calcularSalarioLiquido({
      ...draft.banking,
      ...payload,
      descontosDetalhados: {
        ...draft.banking.descontosDetalhados,
        ...(payload.descontosDetalhados || {}),
        outrosDescontos: Array.isArray(payload.descontosDetalhados?.outrosDescontos)
          ? payload.descontosDetalhados.outrosDescontos
          : draft.banking.descontosDetalhados.outrosDescontos,
      },
    });

    draft.banking = {
      ...draft.banking,
      ...payload,
      salarioLiquido: salarySummary.salarioLiquido,
      descontosAutomaticos: {
        ...draft.banking.descontosAutomaticos,
        inss: salarySummary.inss,
        irpf: salarySummary.irpf,
      },
      descontosDetalhados: {
        ...draft.banking.descontosDetalhados,
        ...(payload.descontosDetalhados || {}),
        outrosDescontos: Array.isArray(payload.descontosDetalhados?.outrosDescontos)
          ? payload.descontosDetalhados.outrosDescontos
          : draft.banking.descontosDetalhados.outrosDescontos,
      },
      beneficios: {
        ...draft.banking.beneficios,
        ...(payload.beneficios || {}),
        vrVa: {
          ...draft.banking.beneficios.vrVa,
          ...(payload.beneficios?.vrVa || {}),
        },
      },
    };
    writeScopedJsonStorage(SECTION_STORAGE_KEYS.banking, draft.banking);
    return draft;
  });
}

function carregarCadastroBancario() {
  const bankingSnapshot = readSectionSnapshot(
    SECTION_STORAGE_KEYS.banking,
    LEGACY_SECTION_STORAGE_KEYS.banking
  );
  const bankingData = mergeData(getDefaultAppData(), {
    banking: bankingSnapshot || loadAppData().banking,
  }).banking;

  console.log("Carregando cadastro bancário:", bankingData);
  return bankingData;
}

function carregarContasFixas() {
  return readSectionSnapshot(
    SECTION_STORAGE_KEYS.contasFixas,
    LEGACY_SECTION_STORAGE_KEYS.contasFixas
  ) || loadAppData().contasFixas || [];
}

function carregarContasVariaveis() {
  const ledgerSnapshot = readSectionSnapshot(
    SECTION_STORAGE_KEYS.ledgerMovimentacoes,
    LEGACY_SECTION_STORAGE_KEYS.ledgerMovimentacoes
  );
  const manualItems = readSectionSnapshot(
    SECTION_STORAGE_KEYS.contasDiaADiaManuais,
    LEGACY_SECTION_STORAGE_KEYS.contasDiaADiaManuais
  );
  const importedItems = readSectionSnapshot(
    SECTION_STORAGE_KEYS.contasDiaADiaImportadas,
    LEGACY_SECTION_STORAGE_KEYS.contasDiaADiaImportadas
  );

  if (Array.isArray(ledgerSnapshot) && ledgerSnapshot.length) {
    return [
      ...(Array.isArray(manualItems)
        ? manualItems.map((item) => ({
            ...item,
            origem: item.origem || "manual",
            tipo: item.tipo || "saida",
          }))
        : []),
      ...deriveDailyExpensesFromLedger(ledgerSnapshot),
    ];
  }

  if (Array.isArray(manualItems) || Array.isArray(importedItems)) {
    return [
      ...(Array.isArray(manualItems)
        ? manualItems.map((item) => ({
            ...item,
            origem: item.origem || "manual",
            tipo: item.tipo || "saida",
          }))
        : []),
      ...(Array.isArray(importedItems)
        ? importedItems.map((item) => ({
            ...item,
            origem: "importado",
            tipo: item.tipo || "saida",
          }))
        : []),
    ];
  }

  return ((
    readSectionSnapshot(
      SECTION_STORAGE_KEYS.contasDiaADia,
      LEGACY_SECTION_STORAGE_KEYS.contasDiaADia
    ) ||
    loadAppData().contasDiaADia ||
    []
  )).map((item) => ({
    ...item,
    origem: item.origem || "manual",
    tipo: item.tipo || "saida",
  }));
}

function carregarCartoes() {
  return readSectionSnapshot(
    SECTION_STORAGE_KEYS.cartoes,
    LEGACY_SECTION_STORAGE_KEYS.cartoes
  ) || loadAppData().cartoes || [];
}

function carregarLancamentosCartao() {
  return readSectionSnapshot(
    SECTION_STORAGE_KEYS.lancamentosCartao,
    LEGACY_SECTION_STORAGE_KEYS.lancamentosCartao
  ) || loadAppData().lancamentosCartao || [];
}

function carregarInvestimentos() {
  return (
    readSectionSnapshot(
      SECTION_STORAGE_KEYS.investimentos,
      LEGACY_SECTION_STORAGE_KEYS.investimentos
    ) ||
    loadAppData().investimentos ||
    getDefaultAppData().investimentos
  );
}

function carregarParcelamentos() {
  return (
    readSectionSnapshot(
      SECTION_STORAGE_KEYS.parcelamentos,
      LEGACY_SECTION_STORAGE_KEYS.parcelamentos
    ) ||
    loadAppData().parcelamentos ||
    []
  );
}

function carregarRecebimento(tipo) {
  const data = loadAppData();

  if (tipo === "pagamento") {
    return (
      readSectionSnapshot(
        SECTION_STORAGE_KEYS.pagamento,
        LEGACY_SECTION_STORAGE_KEYS.recebimentos
      ) ||
      data.recebimentos.pagamento
    );
  }

  if (tipo === "vrva") {
    const beneficiosSnapshot = readSectionSnapshot(
      SECTION_STORAGE_KEYS.beneficios,
      LEGACY_SECTION_STORAGE_KEYS.recebimentos
    );

    return (
      beneficiosSnapshot?.vrVa ||
      beneficiosSnapshot?.beneficios?.vrVa ||
      data.recebimentos.beneficios?.vrVa ||
      createEmptyReceipt()
    );
  }

  return data.recebimentos.beneficios?.[tipo] || createEmptyReceipt();
}

function carregarRegistroPagamento() {
  return carregarRecebimento("pagamento");
}

function carregarVRVA() {
  return carregarRecebimento("vrva");
}

function salvarRecebimento(tipo, payload) {
  console.log(
    tipo === "pagamento"
      ? "Salvando registro de pagamento"
      : "Salvando VR/VA",
    payload
  );

  return updateAppData((draft) => {
    const now = new Date().toISOString();
    const target =
      tipo === "pagamento"
        ? draft.recebimentos.pagamento
        : draft.recebimentos.beneficios[tipo === "vrva" ? "vrVa" : tipo];

    const nextReceipt = {
      ...target,
      ...payload,
      valorPrevisto: toNumber(payload.valorPrevisto),
      valorRecebido: toNumber(payload.valorRecebido),
      aplicadoNoSaldo: false,
      atualizadoEm: now,
    };

    if (tipo === "pagamento") {
      draft.recebimentos.pagamento = nextReceipt;
      draft.recebimentos.historico.pagamentos.push({
        ...nextReceipt,
        id: createId("historico_pagamento"),
      });
    } else {
      const benefitKey = tipo === "vrva" ? "vrVa" : tipo;
      draft.recebimentos.beneficios[benefitKey] = nextReceipt;
      draft.recebimentos.historico.beneficios[benefitKey].push({
        ...nextReceipt,
        id: createId(`historico_${benefitKey}`),
      });
    }

    return draft;
  });
}

function salvarRegistroPagamento(payload) {
  return salvarRecebimento("pagamento", payload);
}

function salvarVRVA(payload) {
  return salvarRecebimento("vrva", payload);
}

function editarRegistroPagamento() {
  return carregarRegistroPagamento();
}

function editarVRVA() {
  return carregarVRVA();
}

function carregarBeneficios() {
  return {
    vrVa: carregarVRVA(),
  };
}

function salvarBeneficios(payload) {
  console.log("Salvando benefícios", payload);
  return salvarVRVA(payload?.vrVa || payload);
}

function editarBeneficios() {
  return carregarBeneficios();
}

function salvarContas(tipo, payload) {
  console.log(
    tipo === "fixa" ? "Salvando conta fixa" : "Salvando conta do dia a dia",
    payload
  );

  return updateAppData((draft) => {
    const targetKey = tipo === "fixa" ? "contasFixas" : "contasDiaADia";
    const collection = Array.isArray(draft[targetKey]) ? draft[targetKey] : [];
    const existingIndex = collection.findIndex((item) => item.id === payload.id);
    const normalizedPayload =
      tipo === "fixa"
        ? payload
        : {
            ...payload,
            origem: payload.origem || "manual",
            tipo: payload.tipo || "saida",
            valor: toNumber(payload.valor),
          };

    if (existingIndex >= 0) {
      collection[existingIndex] = {
        ...collection[existingIndex],
        ...normalizedPayload,
      };
    } else {
      collection.push(normalizedPayload);
    }

    draft[targetKey] = collection;

    if (tipo !== "fixa") {
      draft.ledgerMovimentacoes = mergeLedgerMovementsWithManualExpenses(
        draft.ledgerMovimentacoes,
        collection
      );
    }

    return draft;
  });
}

function salvarContaFixa(payload) {
  return salvarContas("fixa", payload);
}

function salvarContaVariavel(payload) {
  return salvarContas("dia-a-dia", payload);
}

function salvarContasVariaveisImportadas(payloads) {
  console.log("Salvando contas importadas", payloads);

  return updateAppData((draft) => {
    const nextLedgerItems = Array.isArray(payloads)
      ? payloads.map((item) =>
          normalizeLedgerItem({
            ...item,
            origem: item.origem || "extrato_importado",
            tipo: item.tipo || "saida",
            valor: toNumber(item.valor),
            status_importacao: item.status_importacao || "valida",
          })
        ).filter(Boolean)
      : [];
    const currentItems = Array.isArray(draft.contasDiaADia) ? draft.contasDiaADia : [];
    const manualItems = currentItems.filter((item) => !isImportedLedgerOrigin(item?.origem));

    draft.ledgerMovimentacoes = mergeLedgerMovementsWithManualExpenses(nextLedgerItems, manualItems);
    draft.contasDiaADia = [...manualItems, ...deriveDailyExpensesFromLedger(nextLedgerItems)];
    return draft;
  });
}

function editarContaFixa(id) {
  return carregarContasFixas().find((item) => item.id === id) || null;
}

function editarContaVariavel(id) {
  return carregarContasVariaveis().find((item) => item.id === id) || null;
}

function salvarCartoes(tipo, payload) {
  console.log(
    tipo === "cartao" ? "Salvando cartão" : "Salvando gasto do cartão",
    payload
  );

  return updateAppData((draft) => {
    const targetKey = tipo === "cartao" ? "cartoes" : "lancamentosCartao";
    const collection = Array.isArray(draft[targetKey]) ? draft[targetKey] : [];
    const existingIndex = collection.findIndex((item) => item.id === payload.id);

    if (existingIndex >= 0) {
      collection[existingIndex] = {
        ...collection[existingIndex],
        ...payload,
      };
    } else {
      collection.push(payload);
    }

    draft[targetKey] = collection;
    return draft;
  });
}

function salvarCartao(payload) {
  return salvarCartoes("cartao", payload);
}

function salvarLancamentoCartao(payload) {
  return salvarCartoes("lancamento", payload);
}

function carregarGastosCartao() {
  return carregarLancamentosCartao();
}

function editarCartao(id) {
  return carregarCartoes().find((item) => item.id === id) || null;
}

function editarGastoCartao(id) {
  return carregarLancamentosCartao().find((item) => item.id === id) || null;
}

function salvarInvestimento(payload) {
  console.log("Salvando investimento", payload);

  return updateAppData((draft) => {
    draft.investimentos = {
      ...draft.investimentos,
      ...payload,
    };
    return draft;
  });
}

function salvarParcelamento(payload) {
  console.log("Salvando parcelamento", payload);

  return updateAppData((draft) => {
    const collection = Array.isArray(draft.parcelamentos) ? draft.parcelamentos : [];
    const existingIndex = collection.findIndex((item) => item.id === payload.id);

    if (existingIndex >= 0) {
      collection[existingIndex] = {
        ...collection[existingIndex],
        ...payload,
      };
    } else {
      collection.push(payload);
    }

    draft.parcelamentos = collection;
    return draft;
  });
}

function editarParcelamento(id) {
  return carregarParcelamentos().find((item) => item.id === id) || null;
}

function subscribe(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  stateSubscribers.add(listener);

  return () => {
    stateSubscribers.delete(listener);
  };
}

window.FinanceStore = {
  carregarCartoes,
  carregarCadastroBancario,
  carregarBeneficios,
  carregarContasFixas,
  carregarContasVariaveis,
  carregarLedgerMovimentacoes: () =>
    mergeLedgerMovementsWithManualExpenses(
      readSectionSnapshot(
        SECTION_STORAGE_KEYS.ledgerMovimentacoes,
        LEGACY_SECTION_STORAGE_KEYS.ledgerMovimentacoes
      ) || loadAppData().ledgerMovimentacoes || [],
      loadAppData().contasDiaADia || []
    ),
  carregarGastosCartao,
  carregarInvestimentos,
  carregarLancamentosCartao,
  carregarParcelamentos,
  carregarRecebimento,
  carregarRegistroPagamento,
  carregarVRVA,
  calcularINSS,
  calcularIRPF,
  calcularSalarioLiquido,
  calcularSalarioLiquidoBanco,
  createId,
  dispatchFinanceUpdate,
  deriveDailyExpensesFromLedger,
  mergeLedgerMovementsWithManualExpenses,
  editarBeneficios,
  editarCartao,
  editarContaFixa,
  editarContaVariavel,
  editarGastoCartao,
  editarRegistroPagamento,
  editarVRVA,
  editarParcelamento,
  getDefaultAppData,
  loadAppData,
  replaceAppData,
  subscribe,
  salvarCadastroBancario,
  salvarBeneficios,
  salvarCartao,
  salvarCartoes,
  salvarContaFixa,
  salvarContas,
  salvarContaVariavel,
  salvarContasVariaveisImportadas,
  salvarInvestimento,
  salvarLancamentoCartao,
  salvarParcelamento,
  salvarRecebimento,
  salvarRegistroPagamento,
  salvarVRVA,
  saveAppData,
  toNumber,
  updateAppData,
};
