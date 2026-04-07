const APP_STORAGE_KEY = "mfinanceiro_app_data";

function getDefaultAppData() {
  return {
    profile: {
      foto: "",
      nome: "",
      email: "",
    },
    banking: {
      saldoAtual: 0,
      salarioBruto: 0,
      descontos: {
        faltas: 0,
        medico: 0,
        vr: 0,
        va: 0,
        vt: 0,
        outros: 0,
      },
      tipoCiclo: "ciclo1",
      diasPagamento: [5, 20],
      recebeVr: false,
      valorVr: 0,
      dataVr: 10,
      usarVrComoSaldo: false,
    },
    recebimentos: {
      pagamentos: [],
      vr: [],
    },
    contasFixas: [],
    contasDiaADia: [],
    cartoes: [],
    lancamentosCartao: [],
    investimentos: {
      percentualSugerido: 10,
      ultimaAcao: "pendente",
      ultimoValorSugerido: 0,
    },
  };
}

function normalizeLegacyData(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const legacyProfile = data.profile || {};

  if (!data.banking) {
    data.banking = {
      saldoAtual: legacyProfile.saldoAtual || 0,
      salarioBruto: legacyProfile.salarioBruto || 0,
      descontos: {
        faltas: legacyProfile.descontos?.faltas || 0,
        medico: legacyProfile.descontos?.medico || 0,
        vr: legacyProfile.descontos?.vr || 0,
        va: legacyProfile.descontos?.va || 0,
        vt: legacyProfile.descontos?.vt || 0,
        outros: legacyProfile.descontos?.outros || 0,
      },
      tipoCiclo: legacyProfile.tipoRecebimento === "2x" ? "ciclo2" : "ciclo1",
      diasPagamento: Array.isArray(legacyProfile.diasPagamento)
        ? legacyProfile.diasPagamento
        : [5, 20],
      recebeVr: Boolean(legacyProfile.recebeVr),
      valorVr: legacyProfile.valorVr || 0,
      dataVr: legacyProfile.diaRecebimentoVr || 10,
      usarVrComoSaldo: Boolean(legacyProfile.usarVrComoSaldo),
    };
  }

  data.profile = {
    foto: legacyProfile.foto || "",
    nome: legacyProfile.nome || "",
    email: legacyProfile.email || "",
  };

  if (!Array.isArray(data.contasDiaADia)) {
    data.contasDiaADia = [];
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
      descontos: {
        ...base.banking.descontos,
        ...(normalizedIncoming?.banking?.descontos || {}),
      },
    },
    recebimentos: {
      ...base.recebimentos,
      ...(normalizedIncoming?.recebimentos || {}),
      pagamentos: Array.isArray(normalizedIncoming?.recebimentos?.pagamentos)
        ? normalizedIncoming.recebimentos.pagamentos
        : base.recebimentos.pagamentos,
      vr: Array.isArray(normalizedIncoming?.recebimentos?.vr)
        ? normalizedIncoming.recebimentos.vr
        : base.recebimentos.vr,
    },
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
  const rawData = localStorage.getItem(APP_STORAGE_KEY);

  if (!rawData) {
    return defaultData;
  }

  try {
    const parsedData = JSON.parse(rawData);
    return mergeData(defaultData, parsedData);
  } catch (error) {
    localStorage.removeItem(APP_STORAGE_KEY);
    return defaultData;
  }
}

function saveAppData(data) {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
  return data;
}

function updateAppData(updater) {
  const currentData = loadAppData();
  const nextData = updater(JSON.parse(JSON.stringify(currentData)));
  return saveAppData(nextData);
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

window.FinanceStore = {
  createId,
  getDefaultAppData,
  loadAppData,
  saveAppData,
  toNumber,
  updateAppData,
};
