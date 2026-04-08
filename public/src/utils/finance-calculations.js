function normalizeDate(value) {
  let date;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data invalida.");
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function safeNormalizeDate(value) {
  try {
    return normalizeDate(value);
  } catch (error) {
    if (typeof value === "string") {
      const brMatch = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

      if (brMatch) {
        try {
          return normalizeDate(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
        } catch (nestedError) {
          return null;
        }
      }
    }

    return null;
  }
}

function normalizeNumericValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return 0;
  }

  const sanitizedValue = normalizedValue.replace(/[^\d,.-]/g, "");
  const lastComma = sanitizedValue.lastIndexOf(",");
  const lastDot = sanitizedValue.lastIndexOf(".");
  let numericString = sanitizedValue;

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

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(normalizeDate(value));
}

function formatDateLong(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(normalizeDate(value));
}

function areSameDay(leftDate, rightDate) {
  return leftDate.getTime() === rightDate.getTime();
}

function isWithinRange(date, startDate, endDate) {
  return (
    date.getTime() >= startDate.getTime() &&
    date.getTime() <= endDate.getTime()
  );
}

function getDaysDifference(startDate, endDate) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / oneDay);
}

function getMonthDate(year, monthIndex, preferredDay) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(preferredDay, lastDay));
}

function getPaymentSchedule(banking) {
  const totalSlots = banking.tipoCiclo === "ciclo2" ? 2 : 1;
  const sourceDays = Array.isArray(banking.diasPagamento) ? banking.diasPagamento : [];
  const sourcePercentages = Array.isArray(banking.percentuaisPagamento)
    ? banking.percentuaisPagamento
    : banking.tipoCiclo === "ciclo2"
      ? [50, 50]
      : [100, 0];

  return sourceDays
    .slice(0, totalSlots)
    .map((day, index) => ({
      day: Number(day),
      percentage:
        banking.tipoCiclo === "ciclo2"
          ? Number(sourcePercentages[index] || 0)
          : 100,
    }))
    .filter((item) => Number.isFinite(item.day) && item.day > 0)
    .sort((left, right) => left.day - right.day);
}

function getSortedPaymentDays(banking) {
  return getPaymentSchedule(banking).map((item) => item.day);
}

function getPaymentPercentages(banking) {
  const schedule = getPaymentSchedule(banking);

  if (banking.tipoCiclo === "ciclo2") {
    return [
      Number(schedule[0]?.percentage || 0),
      Number(schedule[1]?.percentage || 0),
    ];
  }

  return [100, 0];
}

function getTotalDiscounts(banking) {
  const baseDiscounts =
    Number(banking.descontosAutomaticos?.inss || 0) +
    Number(banking.descontosAutomaticos?.irpf || 0) +
    Number(banking.descontosDetalhados?.planoSaude || 0) +
    Number(banking.descontosDetalhados?.planoOdontologico || 0) +
    Number(banking.descontosDetalhados?.vt || 0) +
    (Boolean(banking.descontosDetalhados?.vrVaDescontadoEmFolha)
      ? Number(banking.descontosDetalhados?.vrVa || 0)
      : 0) +
    (Array.isArray(banking.descontosDetalhados?.outrosDescontos)
      ? banking.descontosDetalhados.outrosDescontos.reduce(
          (total, item) => total + Number(item.valor || 0),
          0
        )
      : 0);

  return baseDiscounts;
}

function getNetSalary(banking) {
  return Math.max(Number(banking.salarioLiquido || 0), 0);
}

function buildScheduledDates(days, referenceDate, monthsAround = 4) {
  const dates = [];
  const referenceMonth = referenceDate.getMonth();
  const referenceYear = referenceDate.getFullYear();

  for (let offset = -1; offset <= monthsAround; offset += 1) {
    const currentMonth = referenceMonth + offset;
    const monthDate = new Date(referenceYear, currentMonth, 1);

    days.forEach((day) => {
      const candidate = getMonthDate(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        day
      );
      candidate.setHours(0, 0, 0, 0);
      dates.push(candidate);
    });
  }

  return dates.sort((left, right) => left.getTime() - right.getTime());
}

function wasReceiptConfirmedOnDate(receipt, targetDate) {
  const receiptDate = safeNormalizeDate(receipt.dataPrevista);
  return Boolean(receipt?.status === "recebido" && receiptDate && areSameDay(receiptDate, targetDate));
}

function normalizeReceiptTypeKey(value) {
  const normalizedType = String(value || "").trim().toLowerCase();

  if (!normalizedType) {
    return "";
  }

  if (["vrva", "vr/va", "vr-va", "vale refeicao/alimentacao"].includes(normalizedType)) {
    return "vrVa";
  }

  if (normalizedType === "vr") {
    return "vr";
  }

  if (normalizedType === "va") {
    return "va";
  }

  return normalizedType.replace(/[^a-z0-9]+/g, "_");
}

function getIncomePriority(type) {
  const normalizedType = String(type || "").trim().toLowerCase();

  if (/(pagamento|salario|salário|principal)/.test(normalizedType)) {
    return 0;
  }

  if (/(adiantamento|vale)/.test(normalizedType)) {
    return 1;
  }

  return 2;
}

function isPrincipalIncome(entry) {
  return getIncomePriority(entry?.tipo) <= 1;
}

function getIncomeEntries(data) {
  const sourceItems = Array.isArray(data?.recebimentos?.lista)
    ? data.recebimentos.lista
    : data?.recebimentos?.pagamento?.dataPrevista
      ? [data.recebimentos.pagamento]
      : [];

  return sourceItems
    .map((entry, index) => {
      const normalizedDate = safeNormalizeDate(entry?.dataPrevista || entry?.data_prevista);
      const expectedValue = normalizeNumericValue(entry?.valorPrevisto || entry?.valor_previsto);
      const receivedValue = normalizeNumericValue(entry?.valorRecebido || entry?.valor_recebido);

      if (!normalizedDate || Math.max(expectedValue, receivedValue) <= 0) {
        return null;
      }

      return {
        ...entry,
        id: entry?.id || entry?.sourceId || `recebimento_${index + 1}`,
        tipo: entry?.tipo || "pagamento",
        descricao: entry?.descricao || "Recebimento",
        dataPrevista: normalizeDate(entry?.dataPrevista || entry?.data_prevista),
        valorPrevisto: expectedValue || receivedValue,
        valorRecebido: receivedValue,
        status: String(entry?.status || "pendente").trim().toLowerCase(),
        prioridade: getIncomePriority(entry?.tipo),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const timeDifference = left.dataPrevista.getTime() - right.dataPrevista.getTime();

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return left.prioridade - right.prioridade;
    });
}

function getBenefitEntries(data, benefitKey) {
  const sourceItems = Array.isArray(data?.recebimentos?.beneficios?.lista)
    ? data.recebimentos.beneficios.lista
    : Object.entries(data?.recebimentos?.beneficios || {})
        .filter(([key, value]) => key !== "lista" && value && typeof value === "object")
        .map(([key, value]) => ({
          ...value,
          tipo: value.tipo || key,
          dataRecebimento: value.dataRecebimento || value.dataPrevista,
          valor: value.valor || value.valorPrevisto || value.valorRecebido,
          ativo: value.ativo !== false,
          contabilizarNoSaldo: Boolean(value.contabilizarNoSaldo),
        }));

  return sourceItems
    .map((entry, index) => {
      const normalizedDate = safeNormalizeDate(entry?.dataRecebimento || entry?.data_recebimento || entry?.dataPrevista);
      const normalizedKey = normalizeReceiptTypeKey(entry?.tipo);
      const normalizedValue = normalizeNumericValue(entry?.valor);

      if (!normalizedDate || normalizedValue <= 0) {
        return null;
      }

      return {
        ...entry,
        id: entry?.id || entry?.sourceId || `beneficio_${index + 1}`,
        tipo: entry?.tipo || normalizedKey || "beneficio",
        benefitKey: normalizedKey,
        valor: normalizedValue,
        dataRecebimento: normalizeDate(entry?.dataRecebimento || entry?.data_recebimento || entry?.dataPrevista),
        ativo: normalizeBooleanValue(entry?.ativo, true),
        contabilizarNoSaldo: normalizeBooleanValue(entry?.contabilizarNoSaldo, false),
        status: String(entry?.status || (normalizeBooleanValue(entry?.ativo, true) ? "pendente" : "inativo"))
          .trim()
          .toLowerCase(),
      };
    })
    .filter((entry) => {
      if (!entry) {
        return false;
      }

      if (!benefitKey) {
        return true;
      }

      return entry.benefitKey === normalizeReceiptTypeKey(benefitKey);
    })
    .sort((left, right) => left.dataRecebimento.getTime() - right.dataRecebimento.getTime());
}

function normalizeBooleanValue(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "1", "sim", "yes", "ativo"].includes(normalizedValue)) {
      return true;
    }

    if (["false", "0", "nao", "não", "no", "inativo"].includes(normalizedValue)) {
      return false;
    }
  }

  return value === undefined ? fallback : Boolean(value);
}

function calcularProximoPagamento(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const incomeEntries = getIncomeEntries(data);
  const principalIncomeEntries = incomeEntries.filter(isPrincipalIncome);
  const nextIncome =
    principalIncomeEntries.find(
      (entry) => entry.dataPrevista.getTime() >= today.getTime() && entry.status !== "recebido"
    ) ||
    principalIncomeEntries.find((entry) => entry.status !== "recebido") ||
    null;

  if (nextIncome) {
    const previousIncome =
      [...principalIncomeEntries]
        .reverse()
        .find((entry) => entry.dataPrevista.getTime() < nextIncome.dataPrevista.getTime()) || today;

    return {
      configured: true,
      value: Number(nextIncome.valorPrevisto || nextIncome.valorRecebido || 0),
      nextDate: nextIncome.dataPrevista,
      daysRemaining: Math.max(getDaysDifference(today, nextIncome.dataPrevista), 0),
      status: nextIncome.status || "pendente",
      cycleStart: previousIncome?.dataPrevista || previousIncome,
      cycleEnd: nextIncome.dataPrevista,
      netSalary: getNetSalary(data.banking || {}),
      source: "incomes",
    };
  }

  const banking = data.banking || {};
  const paymentDays = getSortedPaymentDays(banking);
  const paymentPercentages = getPaymentPercentages(banking);
  const currentReceipt = data.recebimentos?.pagamento || {};
  const overrideDate = safeNormalizeDate(currentReceipt.dataPrevista);
  const overrideValue = Number(
    currentReceipt.valorRecebido || currentReceipt.valorPrevisto || 0
  );

  if ((!paymentDays.length || !Number(banking.salarioBruto || 0)) && overrideDate && overrideValue > 0) {
    return {
      configured: true,
      value: overrideValue,
      nextDate: overrideDate,
      daysRemaining: Math.max(getDaysDifference(today, overrideDate), 0),
      status: currentReceipt.status || "pendente",
      cycleStart: today,
      cycleEnd: overrideDate,
      netSalary: getNetSalary(banking),
    };
  }

  if (!paymentDays.length || !Number(banking.salarioBruto || 0)) {
    return {
      configured: false,
      value: 0,
      nextDate: null,
      daysRemaining: 0,
      status: "nao configurado",
      cycleStart: today,
      cycleEnd: today,
      netSalary: getNetSalary(banking),
    };
  }

  const scheduledDates = buildScheduledDates(paymentDays, today);
  const nextDate =
    scheduledDates.find((date) => {
      if (date.getTime() > today.getTime()) {
        return true;
      }

      return areSameDay(date, today) && !wasReceiptConfirmedOnDate(currentReceipt, date);
    }) || null;
  const overrideIsFuture =
    overrideDate &&
    overrideDate.getTime() >= today.getTime() &&
    currentReceipt.status !== "recebido";
  const finalNextDate = overrideIsFuture ? overrideDate : nextDate;
  const cycleEnd = finalNextDate || today;
  const cycleStart = [...scheduledDates]
    .reverse()
    .find((date) => date.getTime() < cycleEnd.getTime()) || today;
  const parcelas = banking.tipoCiclo === "ciclo2" ? 2 : 1;
  const nextDay = finalNextDate ? finalNextDate.getDate() : paymentDays[0];
  const percentageIndex =
    banking.tipoCiclo === "ciclo2" && nextDay === paymentDays[1] ? 1 : 0;
  const calculatedValue =
    parcelas === 2
      ? getNetSalary(banking) * ((paymentPercentages[percentageIndex] || 0) / 100)
      : getNetSalary(banking);
  const value = overrideIsFuture
    ? Number(currentReceipt.valorPrevisto || calculatedValue)
    : calculatedValue;
  const daysRemaining = finalNextDate
    ? Math.max(getDaysDifference(today, finalNextDate), 0)
    : 0;

  return {
    configured: true,
    value,
    nextDate: finalNextDate,
    daysRemaining,
    status: daysRemaining === 0 ? "pendente hoje" : "pendente",
    cycleStart,
    cycleEnd,
    netSalary: getNetSalary(banking),
  };
}

function getNextBenefitInfo(data, key, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const benefitEntries = getBenefitEntries(data, key);
  const nextBenefit =
    benefitEntries.find(
      (entry) =>
        entry.ativo &&
        entry.dataRecebimento.getTime() >= today.getTime() &&
        entry.status !== "recebido"
    ) ||
    benefitEntries.find((entry) => entry.ativo) ||
    null;

  if (nextBenefit) {
    return {
      configured: true,
      key: nextBenefit.benefitKey || normalizeReceiptTypeKey(key),
      value: Number(nextBenefit.valor || 0),
      nextDate: nextBenefit.dataRecebimento,
      daysRemaining: Math.max(getDaysDifference(today, nextBenefit.dataRecebimento), 0),
      status: nextBenefit.status || "pendente",
      descontadoEmFolha: false,
      contabilizarNoSaldo: Boolean(nextBenefit.contabilizarNoSaldo),
      ativo: Boolean(nextBenefit.ativo),
      source: "benefits",
    };
  }

  const benefit = data.banking?.beneficios?.[key];
  const receipt = data.recebimentos?.beneficios?.[key] || {};
  const receiptDate = safeNormalizeDate(receipt.dataPrevista);
  const receiptValue = Number(receipt.valorRecebido || receipt.valorPrevisto || 0);

  if (receiptDate && receiptValue > 0 && receipt.status) {
    return {
      configured: true,
      key,
      value: receiptValue,
      nextDate: receiptDate,
      daysRemaining: Math.max(getDaysDifference(today, receiptDate), 0),
      status: receipt.status,
      descontadoEmFolha: Boolean(benefit?.descontadoEmFolha),
      contabilizarNoSaldo: Boolean(benefit?.contabilizarNoSaldo),
    };
  }

  if ((!benefit?.ativo || !Number(benefit.valor || 0) || !benefit.dataRecebimento) && receiptDate && receiptValue > 0) {
    return {
      configured: true,
      key,
      value: receiptValue,
      nextDate: receiptDate,
      daysRemaining: Math.max(getDaysDifference(today, receiptDate), 0),
      status: receipt.status || "pendente",
      descontadoEmFolha: false,
      contabilizarNoSaldo: false,
    };
  }

  if (!benefit?.ativo || !Number(benefit.valor || 0) || !benefit.dataRecebimento) {
    return {
      configured: false,
      key,
      value: 0,
      nextDate: null,
      daysRemaining: 0,
      status: "inativo",
      contabilizarNoSaldo: false,
    };
  }

  const scheduledDates = buildScheduledDates([Number(benefit.dataRecebimento)], today);
  const nextDate =
    scheduledDates.find((date) => {
      if (date.getTime() > today.getTime()) {
        return true;
      }

      return areSameDay(date, today) && !wasReceiptConfirmedOnDate(receipt, date);
    }) || null;

  return {
    configured: true,
    key,
    value: Number(benefit.valor || 0),
    nextDate,
    daysRemaining: nextDate ? Math.max(getDaysDifference(today, nextDate), 0) : 0,
    status: nextDate && areSameDay(nextDate, today) ? "pendente hoje" : "pendente",
    descontadoEmFolha: Boolean(benefit.descontadoEmFolha),
    contabilizarNoSaldo: Boolean(benefit.contabilizarNoSaldo),
  };
}

function getBenefitsSummary(data, referenceDate = new Date()) {
  const listKeys = getBenefitEntries(data).map((item) => item.benefitKey).filter(Boolean);
  const keys = [...new Set(["vrVa", ...listKeys])];
  const items = keys.map((key) => getNextBenefitInfo(data, key, referenceDate));

  return {
    items,
    active: items.filter((item) => item.configured),
  };
}

function getRecurringDueDate(conta, referenceDate, cycleEnd) {
  const baseDate = safeNormalizeDate(conta.dataVencimento);

  if (!baseDate) {
    return null;
  }

  const candidates = [
    getMonthDate(referenceDate.getFullYear(), referenceDate.getMonth(), baseDate.getDate()),
    getMonthDate(cycleEnd.getFullYear(), cycleEnd.getMonth(), baseDate.getDate()),
  ]
    .map((candidate) => normalizeDate(candidate))
    .sort((left, right) => left.getTime() - right.getTime());

  return (
    candidates.find(
      (candidate) =>
        candidate.getTime() >= referenceDate.getTime() &&
        candidate.getTime() <= cycleEnd.getTime()
    ) || null
  );
}

function getAccountsInCycle(data, referenceDate = new Date()) {
  const paymentInfo = calcularProximoPagamento(data, referenceDate);
  const today = normalizeDate(referenceDate);
  const cycleStart = paymentInfo.cycleStart;
  const cycleEnd = paymentInfo.cycleEnd;
  const accounts = data.contasFixas || [];

  const items = accounts
    .map((conta) => {
      const dueDate = conta.recorrente
        ? getRecurringDueDate(conta, today, cycleEnd)
        : safeNormalizeDate(conta.dataVencimento);
      const paidDate = safeNormalizeDate(conta.pagaEm || conta.ultimaQuitacao);
      const isPaid = conta.recorrente
        ? Boolean(paidDate && isWithinRange(paidDate, cycleStart, cycleEnd))
        : conta.status === "paga";

      return {
        ...conta,
        dueDate,
        isPaid,
      };
    })
    .filter(
      (conta) =>
        conta.dueDate &&
        isWithinRange(conta.dueDate, cycleStart, cycleEnd) &&
        !conta.isPaid
    );

  return {
    items,
    total: items.reduce((sum, conta) => sum + Number(conta.valor || 0), 0),
  };
}

function getCardDueDate(card, referenceDate) {
  const today = normalizeDate(referenceDate);
  const dueDay = Number(card.dataVencimento || 0);

  if (!dueDay) {
    return null;
  }

  const currentMonthDue = normalizeDate(
    getMonthDate(today.getFullYear(), today.getMonth(), dueDay)
  );

  if (currentMonthDue.getTime() >= today.getTime()) {
    return currentMonthDue;
  }

  return normalizeDate(
    getMonthDate(today.getFullYear(), today.getMonth() + 1, dueDay)
  );
}

function getCardsSummary(data, referenceDate = new Date()) {
  const paymentInfo = calcularProximoPagamento(data, referenceDate);
  const cycleStart = paymentInfo.cycleStart;
  const cycleEnd = paymentInfo.cycleEnd;
  const cards = data.cartoes || [];
  const launches = data.lancamentosCartao || [];

  const allCards = cards.map((card) => {
    const dueDate = getCardDueDate(card, referenceDate);
    const launchesTotal = launches
      .filter((launch) => launch.cartaoId === card.id && launch.status !== "pago")
      .reduce((sum, launch) => sum + Number(launch.valor || 0), 0);
    const currentBill = launchesTotal > 0 ? launchesTotal : Number(card.limiteUsado || 0);

    return {
      ...card,
      dueDate,
      currentBill,
      impactsCycle:
        dueDate &&
        isWithinRange(dueDate, cycleStart, cycleEnd) &&
        currentBill > 0,
    };
  });

  const items = allCards.filter((card) => card.impactsCycle);

  return {
    cards: allCards,
    items,
    total: items.reduce((sum, item) => sum + Number(item.currentBill || 0), 0),
  };
}

function getCurrentInstallment(parcelamento, cycleStart, cycleEnd) {
  const startDate = safeNormalizeDate(parcelamento.dataInicio);

  if (!startDate) {
    return null;
  }

  const totalInstallments = Math.max(Number(parcelamento.parcelas || 0), 0);

  for (let index = 0; index < totalInstallments; index += 1) {
    const candidateDate = normalizeDate(
      getMonthDate(
        startDate.getFullYear(),
        startDate.getMonth() + index,
        Number(parcelamento.vencimento || startDate.getDate())
      )
    );

    if (!isWithinRange(candidateDate, cycleStart, cycleEnd)) {
      continue;
    }

    if (parcelamento.status === "finalizado") {
      return null;
    }

    return {
      ...parcelamento,
      installmentNumber: index + 1,
      dueDate: candidateDate,
      parcelaAtual: Number(parcelamento.valorParcela || 0),
    };
  }

  return null;
}

function getInstallmentsSummary(data, referenceDate = new Date()) {
  const paymentInfo = calcularProximoPagamento(data, referenceDate);
  const items = (data.parcelamentos || [])
    .map((item) =>
      getCurrentInstallment(item, paymentInfo.cycleStart, paymentInfo.cycleEnd)
    )
    .filter(Boolean);

  return {
    items,
    total: items.reduce((sum, item) => sum + Number(item.parcelaAtual || 0), 0),
  };
}

function classifyCyclePriority(item) {
  const sourceText = `${item.nome || ""} ${item.categoria || ""}`.toLowerCase();

  if (/(aluguel|moradia|condominio|casa|residencial|iptu)/.test(sourceText)) {
    return { rank: 1, group: "moradia" };
  }

  if (/(agua|luz|energia|gas)/.test(sourceText)) {
    return { rank: 2, group: "utilidades" };
  }

  if (/(internet|telefone|celular|fibra)/.test(sourceText)) {
    return { rank: 3, group: "internet" };
  }

  if (item.kind === "cartao" || /(cartao|fatura)/.test(sourceText)) {
    return { rank: 4, group: "cartao" };
  }

  if (item.kind === "parcelamento" || /(parcela|parcelamento)/.test(sourceText)) {
    return { rank: 5, group: "parcelamento" };
  }

  return { rank: 6, group: "outros" };
}

function filtrarContasDoCicloAtual(data, referenceDate = new Date()) {
  const accounts = getAccountsInCycle(data, referenceDate).items.map((item) => ({
    kind: "conta",
    nome: item.nome || "Conta",
    categoria: item.categoria || "outros",
    valor: Number(item.valor || 0),
    dueDate: item.dueDate,
  }));
  const cards = getCardsSummary(data, referenceDate).items.map((item) => ({
    kind: "cartao",
    nome: item.nome || "Cartao",
    categoria: "fatura",
    valor: Number(item.currentBill || 0),
    dueDate: item.dueDate,
  }));
  const installments = getInstallmentsSummary(data, referenceDate).items.map((item) => ({
    kind: "parcelamento",
    nome: item.nome || "Parcelamento",
    categoria: item.tipo || "parcelamento",
    valor: Number(item.parcelaAtual || 0),
    dueDate: item.dueDate,
  }));

  return [...accounts, ...cards, ...installments]
    .filter((item) => item.dueDate && Number(item.valor || 0) > 0)
    .map((item) => ({
      ...item,
      ...classifyCyclePriority(item),
    }));
}

function ordenarPendenciasPorPrioridade(items) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftTime = left.dueDate?.getTime?.() || 0;
    const rightTime = right.dueDate?.getTime?.() || 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    if ((left.rank || 99) !== (right.rank || 99)) {
      return (left.rank || 99) - (right.rank || 99);
    }

    return Number(right.valor || 0) - Number(left.valor || 0);
  });
}

function buildCyclePriorityMessage(item, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const dueDate = item.dueDate;
  const dueDay = dueDate ? dueDate.getDate() : "--";
  const daysUntil = dueDate ? getDaysDifference(today, dueDate) : Infinity;
  let title = `Pague ${item.nome} ate o dia ${dueDay}`;

  if (item.group === "moradia") {
    title = `Reserve ${item.nome} para o dia ${dueDay}`;
  } else if (item.group === "cartao") {
    title = `Separe o valor da fatura ${item.nome} para o dia ${dueDay}`;
  } else if (item.group === "parcelamento") {
    title = `Reserve a parcela de ${item.nome} para o dia ${dueDay}`;
  }

  return {
    type: daysUntil <= 1 ? "danger" : daysUntil <= 3 ? "warning" : "success",
    title,
    description: `${formatCurrency(item.valor)} previsto para ${formatDateLong(dueDate)}.`,
    kind: item.kind,
    dueDate,
    rank: item.rank,
    valor: item.valor,
    completed: false,
  };
}

function calcularPrioridadesDoCiclo(data, referenceDate = new Date()) {
  const paymentInfo = calcularProximoPagamento(data, referenceDate);
  const pendingItems = ordenarPendenciasPorPrioridade(
    filtrarContasDoCicloAtual(data, referenceDate)
  );

  if (!pendingItems.length) {
    return [
      {
        type: "success",
        title: "Tudo certo neste ciclo",
        description: `Voce ja cobriu todas as contas entre o dia ${paymentInfo.cycleStart.getDate()} e o dia ${paymentInfo.cycleEnd.getDate()}. Agora e so aguardar o proximo pagamento.`,
        completed: true,
      },
    ];
  }

  return pendingItems.slice(0, 6).map((item) => buildCyclePriorityMessage(item, referenceDate));
}

function getDailyExpensesSummary(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const paymentInfo = calcularProximoPagamento(data, today);
  const expenses = Array.isArray(data.contasDiaADia) ? data.contasDiaADia : [];
  const allItems = expenses
    .map((expense) => {
      const expenseDate = safeNormalizeDate(expense.data);

      if (!expenseDate) {
        return null;
      }

      const numericValue = Math.abs(normalizeNumericValue(expense.valor));
      const tipo =
        expense.tipo ||
        (normalizeNumericValue(expense.valor) < 0 ? "saida" : "entrada");

      return {
        ...expense,
        dataNormalizada: expenseDate,
        valor: numericValue,
        tipo,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.dataNormalizada.getTime() - right.dataNormalizada.getTime());
  const items = allItems.filter((expense) =>
    isWithinRange(expense.dataNormalizada, paymentInfo.cycleStart, paymentInfo.cycleEnd)
  );
  const categories = items.reduce((accumulator, item) => {
    const category = item.categoria || "outros";
    const current = accumulator.get(category) || 0;
    accumulator.set(category, current + Number(item.valor || 0));
    return accumulator;
  }, new Map());
  const topCategories = [...categories.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([categoria, total]) => ({
      categoria,
      total,
    }));

  return {
    allItems,
    items,
    total: items.reduce((sum, item) => sum + Number(item.valor || 0), 0),
    todayTotal: items
      .filter((item) => {
        return areSameDay(item.dataNormalizada, today);
      })
      .reduce((sum, item) => sum + Number(item.valor || 0), 0),
    topCategories,
  };
}

function getFinancialEntries(data) {
  const entries = Array.isArray(data?.contasDiaADia) ? data.contasDiaADia : [];

  return entries
    .map((entry) => {
      const entryDate = safeNormalizeDate(entry.data || entry.dataNormalizada);

      if (!entryDate) {
        return null;
      }

      const normalizedValue = Math.abs(normalizeNumericValue(entry.valor));
      const tipo =
        entry.tipo ||
        (normalizeNumericValue(entry.valor) < 0 ? "saida" : "entrada");

      if (tipo !== "saida" || normalizedValue <= 0) {
        return null;
      }

      return {
        ...entry,
        id: entry.id || `${entryDate.toISOString()}_${normalizedValue}`,
        dataNormalizada: entryDate,
        valor: normalizedValue,
        categoria: entry.categoria || "outros",
        origem: entry.origem || "manual",
        fonteLancamento: entry.origem === "importado" ? "extrato" : "manual",
        descricao: entry.descricao || "Lancamento",
        tipo: "saida",
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.dataNormalizada.getTime() - right.dataNormalizada.getTime());
}

function getStartOfWeek(referenceDate) {
  const date = normalizeDate(referenceDate);
  const currentDay = date.getDay();
  const offset = currentDay === 0 ? -6 : 1 - currentDay;
  date.setDate(date.getDate() + offset);
  return date;
}

function getStartOfMonth(referenceDate) {
  const date = normalizeDate(referenceDate);
  date.setDate(1);
  return date;
}

function buildCustomRangeDescriptor(period, label, startDate, endDate) {
  return {
    period,
    label,
    startDate: normalizeDate(startDate),
    endDate: normalizeDate(endDate),
  };
}

function getExpensePeriodDescriptor(period, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);

  if (period === "day") {
    return buildCustomRangeDescriptor("day", "Hoje", today, today);
  }

  if (period === "week") {
    return buildCustomRangeDescriptor("week", "Semana", getStartOfWeek(today), today);
  }

  return buildCustomRangeDescriptor("month", "Mes", getStartOfMonth(today), today);
}

function getEntriesWithinRange(entries, startDate, endDate) {
  return (Array.isArray(entries) ? entries : []).filter((entry) =>
    isWithinRange(entry.dataNormalizada, startDate, endDate)
  );
}

function buildCategorySeries(entries) {
  const categoryTotals = entries.reduce((accumulator, entry) => {
    const category = entry.categoria || "outros";
    const currentTotal = accumulator.get(category) || 0;
    accumulator.set(category, currentTotal + Number(entry.valor || 0));
    return accumulator;
  }, new Map());

  return [...categoryTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([categoria, total]) => ({
      categoria,
      total,
    }));
}

function buildExpensePeriodSummaryFromEntries(entries, descriptor) {
  const periodEntries = getEntriesWithinRange(entries, descriptor.startDate, descriptor.endDate);
  const groupedEntries = agruparLancamentosPorData(periodEntries);
  const categorySeries = buildCategorySeries(periodEntries);
  const totalGasto = periodEntries.reduce((sum, entry) => sum + Number(entry.valor || 0), 0);

  return {
    period: descriptor.period,
    label: descriptor.label,
    startDate: descriptor.startDate,
    endDate: descriptor.endDate,
    items: periodEntries,
    groups: groupedEntries,
    totalGasto,
    quantidadeLancamentos: periodEntries.length,
    categoriaDominante: categorySeries[0]?.categoria || "Sem categoria",
    categorySeries,
    evolutionSeries: groupedEntries.map((group) => ({
      label: group.label,
      total: Number(group.saidas || 0),
      count: Number(group.count || 0),
      categoriaDominante: group.topCategory || "outros",
      date: group.date,
    })),
  };
}

function getExpensePeriodSummary(data, period = "week", referenceDate = new Date()) {
  const entries = getFinancialEntries(data);
  const descriptor = getExpensePeriodDescriptor(period, referenceDate);
  return buildExpensePeriodSummaryFromEntries(entries, descriptor);
}

function getExpenseOverviewSummary(data, referenceDate = new Date()) {
  const entries = getFinancialEntries(data);
  const today = normalizeDate(referenceDate);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const todaySummary = buildExpensePeriodSummaryFromEntries(
    entries,
    getExpensePeriodDescriptor("day", today)
  );
  const weekSummary = buildExpensePeriodSummaryFromEntries(
    entries,
    getExpensePeriodDescriptor("week", today)
  );
  const monthSummary = buildExpensePeriodSummaryFromEntries(
    entries,
    getExpensePeriodDescriptor("month", today)
  );
  const yesterdaySummary = buildExpensePeriodSummaryFromEntries(
    entries,
    buildCustomRangeDescriptor("yesterday", "Ontem", yesterday, yesterday)
  );

  return {
    allEntries: entries,
    today: todaySummary,
    yesterday: yesterdaySummary,
    week: weekSummary,
    weekToDate: weekSummary,
    month: monthSummary,
    monthToDate: monthSummary,
  };
}

function agruparLancamentosPorData(lancamentos) {
  const grouped = new Map();

  (Array.isArray(lancamentos) ? lancamentos : []).forEach((item) => {
    const normalizedDate = safeNormalizeDate(item.data || item.dataNormalizada);

    if (!normalizedDate) {
      return;
    }

    const key = normalizedDate.toISOString().slice(0, 10);
    const currentGroup = grouped.get(key) || {
      date: normalizedDate,
      label: formatDate(normalizedDate),
      entradas: 0,
      saidas: 0,
      total: 0,
      count: 0,
      categories: new Map(),
      items: [],
    };
    const normalizedValue = normalizeNumericValue(item.valor);
    const rawValue = Math.abs(normalizedValue);
    const tipo =
      item.tipo ||
      (normalizedValue < 0 ? "saida" : "entrada");

    if (tipo === "entrada") {
      currentGroup.entradas += rawValue;
      currentGroup.total += rawValue;
    } else {
      currentGroup.saidas += rawValue;
      currentGroup.total -= rawValue;
      const category = item.categoria || "outros";
      currentGroup.categories.set(
        category,
        (currentGroup.categories.get(category) || 0) + rawValue
      );
    }

    currentGroup.count += 1;
    currentGroup.items.push({
      ...item,
      dataNormalizada: normalizedDate,
      valorNormalizado: rawValue,
      tipo,
    });
    grouped.set(key, currentGroup);
  });

  return [...grouped.values()]
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .map((group) => {
      const topCategory = [...group.categories.entries()].sort(
        (left, right) => right[1] - left[1]
      )[0];

      return {
        date: group.date,
        label: group.label,
        entradas: group.entradas,
        saidas: group.saidas,
        total: group.total,
        count: group.count,
        topCategory: topCategory ? topCategory[0] : "outros",
        items: group.items.sort(
          (left, right) =>
            safeNormalizeDate(left.data)?.getTime?.() - safeNormalizeDate(right.data)?.getTime?.()
        ),
      };
    });
}

function agruparLancamentosPorDia(lancamentos) {
  return agruparLancamentosPorData(lancamentos);
}

function montarSerieGraficoContasVariaveis(data) {
  const lancamentos =
    Array.isArray(data?.contasDiaADia) ? data.contasDiaADia : [];
  console.log("Lançamentos:", lancamentos);
  const agrupado = agruparLancamentosPorData(lancamentos);
  console.log("Agrupado:", agrupado);
  console.log("Serie:", {
    labels: agrupado.map((item) => item.label),
    data: agrupado.map((item) => item.saidas || item.entradas || Math.abs(item.total)),
  });
  return agrupado;
}

function montarSerieGrafico(data) {
  return montarSerieGraficoContasVariaveis(data);
}

function calcularResumoDiario(data) {
  return montarSerieGraficoContasVariaveis(data).map((item) => ({
    data: item.date,
    label: item.label,
    totalGasto: item.saidas,
    categoriaDominante: item.topCategory,
    quantidadeLancamentos: item.count,
    entradas: item.entradas,
    saidas: item.saidas,
    saldoDoDia: item.total,
    items: item.items || [],
  }));
}

function calcularResumoDoDia(group) {
  return {
    totalGasto: Number(group?.saidas || 0),
    categoriaDominante: group?.topCategory || "outros",
    quantidadeLancamentos: Number(group?.count || 0),
  };
}

function calculatePrimaryFinancialMetrics(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const saldoInicial = normalizeNumericValue(data?.banking?.saldoAtual);
  const paymentInfo = calcularProximoPagamento(data, referenceDate);
  const nextPaymentDate = safeNormalizeDate(paymentInfo?.nextDate);
  const benefits = getBenefitsSummary(data, referenceDate);
  const expenses = Array.isArray(data?.contasDiaADia) ? data.contasDiaADia : [];

  const totalDespesas = expenses.reduce((total, expense) => {
    const numericValue = Math.abs(normalizeNumericValue(expense?.valor));
    const tipo = expense?.tipo || "saida";
    const hasValidDate = Boolean(safeNormalizeDate(expense?.data || expense?.dataNormalizada));

    if (tipo === "entrada" || numericValue <= 0 || !hasValidDate) {
      return total;
    }

    return total + numericValue;
  }, 0);

  const committedBreakdown = {
    despesasRegistradas: totalDespesas,
    contasFixas: 0,
    faturasCartao: 0,
    parcelamentos: 0,
  };
  const projectedBenefitsInSaldo = benefits.active.reduce((total, benefit) => {
    if (!benefit.contabilizarNoSaldo || !benefit.nextDate || benefit.status === "recebido") {
      return total;
    }

    if (nextPaymentDate && benefit.nextDate.getTime() > nextPaymentDate.getTime()) {
      return total;
    }

    return total + Number(benefit.value || 0);
  }, 0);
  const valorComprometido =
    committedBreakdown.despesasRegistradas +
    committedBreakdown.contasFixas +
    committedBreakdown.faturasCartao +
    committedBreakdown.parcelamentos;
  const saldoDisponivel = saldoInicial + projectedBenefitsInSaldo - valorComprometido;
  const saldoRestante = saldoDisponivel;
  const diasRestantes = nextPaymentDate
    ? Math.max(getDaysDifference(today, nextPaymentDate), 0)
    : 0;
  const limiteDiario = diasRestantes > 0 ? saldoDisponivel / diasRestantes : 0;

  return {
    saldoInicial,
    totalDespesas,
    committedBreakdown,
    projectedBenefitsInSaldo,
    valorComprometido,
    valor_comprometido: valorComprometido,
    saldoDisponivel,
    saldo_disponivel: saldoDisponivel,
    saldoRestante,
    saldo_restante: saldoRestante,
    diasRestantes,
    dias_restantes: diasRestantes,
    limiteDiario,
    limite_diario: limiteDiario,
    nextPaymentDate,
    hasValidNextPaymentDate: Boolean(nextPaymentDate),
  };
}

function calcularResumoFinanceiro(data, referenceDate = new Date()) {
  const banking = data.banking || {};
  const primaryMetrics = calculatePrimaryFinancialMetrics(data, referenceDate);
  const paymentInfo = calcularProximoPagamento(data, referenceDate);
  const benefits = getBenefitsSummary(data, referenceDate);
  const accounts = getAccountsInCycle(data, referenceDate);
  const cards = getCardsSummary(data, referenceDate);
  const installments = getInstallmentsSummary(data, referenceDate);
  const dailyExpenses = getDailyExpensesSummary(data, referenceDate);
  const saldoAtual = Number(banking.saldoAtual || 0);
  const diasRestantes = primaryMetrics.diasRestantes;
  const committedBreakdown = {
    ...primaryMetrics.committedBreakdown,
    contasFixas: accounts.total,
    faturasCartao: cards.total,
    parcelamentos: installments.total,
  };
  const valorComprometido =
    committedBreakdown.despesasRegistradas +
    committedBreakdown.contasFixas +
    committedBreakdown.faturasCartao +
    committedBreakdown.parcelamentos;
  const saldoDisponivel =
    primaryMetrics.saldoInicial +
    primaryMetrics.projectedBenefitsInSaldo -
    valorComprometido;
  const saldoLivreNoCiclo = saldoDisponivel;
  const saldoAposGastosVariaveis = saldoDisponivel;
  const limiteDiario = diasRestantes > 0 ? saldoDisponivel / diasRestantes : 0;
  const saldoRestante = saldoDisponivel;
  const percentualSugerido = Number(data.investimentos?.percentualSugerido || 10);
  const percentualEscolhido = Number(
    data.investimentos?.percentualEscolhido ?? percentualSugerido
  );
  const valorSugerido =
    Math.max(saldoDisponivel, 0) * (percentualSugerido / 100);
  const valorReservado =
    data.investimentos?.ultimaAcao === "confirmado"
      ? Number(data.investimentos?.valorReservado || valorSugerido)
      : 0;

  return {
    saldoAtual,
    salarioLiquido: getNetSalary(banking),
    totalDescontos: getTotalDiscounts(banking),
    paymentInfo,
    benefits,
    accounts,
    cards,
    installments,
    dailyExpenses,
    totalDespesas: primaryMetrics.totalDespesas,
    totalContas: accounts.total,
    totalGastosDiaADia: dailyExpenses.total,
    committedBreakdown,
    projectedBenefitsInSaldo: primaryMetrics.projectedBenefitsInSaldo,
    valorComprometido,
    valor_comprometido: valorComprometido,
    saldoLivreNoCiclo,
    saldoInicial: primaryMetrics.saldoInicial,
    saldoDisponivel,
    saldo_disponivel: saldoDisponivel,
    saldoRestante,
    saldo_restante: saldoRestante,
    saldoAposGastosVariaveis,
    diasRestantes,
    dias_restantes: diasRestantes,
    limiteDiario,
    limite_diario: limiteDiario,
    investimento: {
      percentage: percentualSugerido,
      chosenPercentage: percentualEscolhido,
      status: data.investimentos?.ultimaAcao || "pendente",
      suggestedValue: valorSugerido,
      reservedValue: valorReservado,
      freeAfterSuggestion: Math.max(saldoDisponivel - valorReservado, 0),
    },
  };
}

function buildBalanceProjection(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const summary = calcularResumoFinanceiro(data, today);
  const projection = [];
  let runningBalance = summary.saldoAtual;

  for (let day = 0; day < summary.diasRestantes; day += 1) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + day + 1);
    currentDate.setHours(0, 0, 0, 0);

    const dueAccounts = summary.accounts.items
      .filter((conta) => conta.dueDate && areSameDay(conta.dueDate, currentDate))
      .reduce((sum, conta) => sum + Number(conta.valor || 0), 0);

    const dueCards = summary.cards.items
      .filter((card) => card.dueDate && areSameDay(card.dueDate, currentDate))
      .reduce((sum, card) => sum + Number(card.currentBill || 0), 0);
    const dueInstallments = summary.installments.items
      .filter((item) => item.dueDate && areSameDay(item.dueDate, currentDate))
      .reduce((sum, item) => sum + Number(item.parcelaAtual || 0), 0);

    const dailyExpenses = summary.dailyExpenses.items
      .filter((item) => {
        const expenseDate = safeNormalizeDate(item.data);
        return expenseDate && areSameDay(expenseDate, currentDate);
      })
      .reduce((sum, item) => sum + normalizeNumericValue(item.valor), 0);

    runningBalance -= dueAccounts;
    runningBalance -= dueCards;
    runningBalance -= dueInstallments;
    runningBalance -= dailyExpenses;

    projection.push({
      date: currentDate,
      label: formatDate(currentDate),
      balance: runningBalance,
    });
  }

  return projection;
}

function montarProjecaoSaldoPorDia(data, referenceDate = new Date()) {
  const lancamentos = Array.isArray(data?.contasDiaADia) ? data.contasDiaADia : [];
  console.log("Lançamentos do dia a dia:", lancamentos);
  const agrupado = agruparLancamentosPorDia(lancamentos);
  console.log("Agrupado por dia:", agrupado);
  const saldoBase = normalizeNumericValue(data?.banking?.saldoAtual || 0);
  console.log("Saldo base:", saldoBase);
  const serieGrafico = buildBalanceProjection(data, referenceDate);
  console.log("Série final do gráfico:", {
    labels: serieGrafico.map((item) => item.label),
    data: serieGrafico.map((item) => item.balance),
  });
  return serieGrafico;
}

function calcularValorPrevistoDoCiclo(data, referenceDate = new Date()) {
  return calcularProximoPagamento(data, referenceDate).value;
}

window.FinanceCalculations = {
  agruparLancamentosPorDia,
  agruparLancamentosPorData,
  buildBalanceProjection,
  montarProjecaoSaldoPorDia,
  calcularPrioridadesDoCiclo,
  calcularProximoPagamento,
  calcularResumoFinanceiro,
  calcularResumoDiario,
  calcularResumoDoDia,
  calcularValorPrevistoDoCiclo,
  calculateDashboardSummary: calcularResumoFinanceiro,
  calculatePrimaryFinancialMetrics,
  getExpenseOverviewSummary,
  getExpensePeriodSummary,
  getFinancialEntries,
  formatCurrency,
  formatDate,
  formatDateLong,
  getAccountsInCycle,
  getBenefitsSummary,
  getCardsSummary,
  getDailyExpensesSummary,
  getInstallmentsSummary,
  getNextBenefitInfo,
  getNextPaymentInfo: calcularProximoPagamento,
  getNextVrInfo: (data, referenceDate = new Date()) =>
    getNextBenefitInfo(data, "vrVa", referenceDate),
  getNetSalary,
  getTotalDiscounts,
  filtrarContasDoCicloAtual,
  montarSerieGrafico,
  montarSerieGraficoContasVariaveis,
  normalizeDate,
  ordenarPendenciasPorPrioridade,
};
