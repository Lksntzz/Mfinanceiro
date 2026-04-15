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

function isBalanceSummaryDescription(value) {
  const normalized = normalizeCategoryDescription(value);
  return (
    normalized.includes("initial_balance") ||
    normalized.includes("final_balance") ||
    normalized.includes("partial_balance") ||
    normalized === "saldo inicial" ||
    normalized === "saldo final" ||
    normalized === "saldo parcial"
  );
}

function isUnrealisticDate(value) {
  return Boolean(value && value.getFullYear() < 2000);
}

function safeNormalizeRealisticDate(value) {
  const normalizedDate = safeNormalizeDate(value);
  return normalizedDate && !isUnrealisticDate(normalizedDate) ? normalizedDate : null;
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

function parseDateTimeValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const clonedDate = new Date(value.getTime());
    return Number.isNaN(clonedDate.getTime()) ? null : clonedDate;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    const isoDateMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      return new Date(Number(isoDateMatch[1]), Number(isoDateMatch[2]) - 1, Number(isoDateMatch[3]));
    }

    const brDateMatch = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
    if (brDateMatch) {
      return new Date(
        Number(brDateMatch[3]),
        Number(brDateMatch[2]) - 1,
        Number(brDateMatch[1]),
        Number(brDateMatch[4] || 0),
        Number(brDateMatch[5] || 0)
      );
    }
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatTimeLabel(value) {
  const dateTime = parseDateTimeValue(value);

  if (!dateTime) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateTime);
}

function formatPercentLabel(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format((Number(value || 0)) / 100);
}

function normalizeMovementType(tipo, rawValue = 0) {
  const normalizedType = String(tipo || "")
    .trim()
    .toLowerCase();

  if (normalizedType === "entrada") {
    return "entrada";
  }

  if (normalizedType === "saida") {
    return "saida";
  }

  return normalizeNumericValue(rawValue) < 0 ? "saida" : "entrada";
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
      const normalizedDate = safeNormalizeRealisticDate(entry?.dataPrevista || entry?.data_prevista);
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
        dataPrevista: normalizedDate,
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
      const normalizedDate = safeNormalizeRealisticDate(entry?.dataRecebimento || entry?.data_recebimento || entry?.dataPrevista);
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
        dataRecebimento: normalizedDate,
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
  const overrideDate = safeNormalizeRealisticDate(currentReceipt.dataPrevista);
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
  const receiptDate = safeNormalizeRealisticDate(receipt.dataPrevista);
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
        conta.dueDate.getTime() <= cycleEnd.getTime() &&
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

  if (daysUntil < 0) {
    title = `${item.nome} venceu no dia ${dueDay}`;
  } else if (item.group === "moradia") {
    title = `Reserve ${item.nome} para o dia ${dueDay}`;
  } else if (item.group === "cartao") {
    title = `Separe o valor da fatura ${item.nome} para o dia ${dueDay}`;
  } else if (item.group === "parcelamento") {
    title = `Reserve a parcela de ${item.nome} para o dia ${dueDay}`;
  }

  return {
    type: daysUntil < 0 ? "danger" : daysUntil <= 1 ? "danger" : daysUntil <= 3 ? "warning" : "success",
    title,
    description:
      daysUntil < 0
        ? `${formatCurrency(item.valor)} segue pendente desde ${formatDateLong(dueDate)}. Confirme se a conta foi paga.`
        : `${formatCurrency(item.valor)} previsto para ${formatDateLong(dueDate)}.`,
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

function getLedgerMovementItems(source) {
  if (Array.isArray(source)) {
    return source;
  }

  return Array.isArray(source?.ledgerMovimentacoes) ? source.ledgerMovimentacoes : [];
}

function normalizeLedgerMovement(movement, index = 0) {
  const normalizedDate = safeNormalizeDate(
    movement?.data || movement?.dataNormalizada || movement?.dataHora
  );
  const dataHora =
    parseDateTimeValue(movement?.dataHora || movement?.data || movement?.dataNormalizada) ||
    normalizedDate;
  const rawValue = normalizeNumericValue(movement?.valor);
  const normalizedValue = Math.abs(rawValue);
  const tipo = normalizeMovementType(movement?.tipo, rawValue);
  const statusImportacao = String(movement?.status_importacao || movement?.statusImportacao || "valida")
    .trim()
    .toLowerCase();

  if (
    !normalizedDate ||
    normalizedValue <= 0 ||
    statusImportacao === "rejeitada" ||
    isBalanceSummaryDescription(movement?.descricao || movement?.nome || "")
  ) {
    return null;
  }

  const classification = resolveMovementClassification(movement);
  const movementDetails = inferMovementDetails(movement);

  return {
    ...movement,
    id:
      movement?.id ||
      movement?.external_id ||
      movement?.externalId ||
      `movimentacao_${index + 1}`,
    user_id: movement?.user_id || movement?.userId || "",
    external_id: movement?.external_id || movement?.externalId || movement?.id || "",
    data: movement?.data || movement?.dataNormalizada || "",
    dataNormalizada: normalizedDate,
    dataHora,
    descricao: movement?.descricao || movement?.nome || "Movimentacao",
    descricaoNormalizada: classification.descricaoNormalizada,
    categoria:
      movement?.categoria && movement.categoria !== "outros"
        ? movement.categoria
        : classification.categoriaPrincipal || movement?.categoria || "outros",
    categoriaPrincipal: classification.categoriaPrincipal || movement?.categoria || "outros",
    subcategoria: movement?.subcategoria || classification.subcategoria || "",
    valor: normalizedValue,
    valorOriginal: rawValue,
    tipo,
    origem: movement?.origem || "manual",
    status_importacao: statusImportacao,
    classificacaoAutomatica: classification.classificacaoAutomatica,
    detalhesLancamento: movementDetails,
  };
}

function getLedgerMovements(source, options = {}) {
  const includeEntradas = options.includeEntradas !== false;
  const includeSaidas = options.includeSaidas !== false;

  return getLedgerMovementItems(source)
    .map((movement, index) => normalizeLedgerMovement(movement, index))
    .filter(Boolean)
    .filter((movement) => {
      if (movement.tipo === "entrada") {
        return includeEntradas;
      }

      return includeSaidas;
    })
    .sort((left, right) => left.dataHora.getTime() - right.dataHora.getTime());
}

function getLedgerExpenseEntries(source) {
  return getLedgerMovements(source, {
    includeEntradas: false,
    includeSaidas: true,
  });
}

function getLedgerIncomeEntries(source) {
  return getLedgerMovements(source, {
    includeEntradas: true,
    includeSaidas: false,
  });
}

function getDailyExpensesSummary(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const paymentInfo = calcularProximoPagamento(data, today);
  const allItems = getLedgerMovements(data);
  const items = allItems.filter(
    (expense) =>
      expense.tipo === "saida" &&
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
  const ledgerEntries = getLedgerExpenseEntries(data);
  const dailyEntries = getLedgerExpenseEntries(Array.isArray(data?.contasDiaADia) ? data.contasDiaADia : []);
  const mergedEntries = [...ledgerEntries, ...dailyEntries].filter(Boolean);
  const seen = new Set();

  return mergedEntries
    .filter((entry) => {
      const externalId = String(entry.external_id || entry.externalId || "").trim();
      const isImported =
        entry.origem === "importado" ||
        entry.origem === "extrato_importado" ||
        entry.origem === "extrato_importado_excel";
      const dataKey = normalizeDashboardHistoryDateKey(entry.dataNormalizada || entry.data || entry.dataHora)
        || String(entry.dataNormalizada || entry.data || "").slice(0, 10);
      const descriptionKey = normalizeCategoryDescription(entry.descricao || entry.nome || "");
      const baseKey = externalId || [
        dataKey,
        Number(entry.valor || 0).toFixed(2),
        descriptionKey,
        String(entry.tipo || ""),
      ].join("|");
      const key = [
        isImported ? String(entry.arquivo_origem || "") : "",
        isImported ? String(entry.linha_origem ?? "") : "",
        baseKey,
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((entry) => ({
      ...entry,
      fonteLancamento:
        entry.origem === "importado" ||
          entry.origem === "extrato_importado" ||
          entry.origem === "extrato_importado_excel"
          ? "extrato"
          : "manual",
      tipo: "saida",
    }));
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

function getLatestAvailableEntryDate(entries) {
  return (Array.isArray(entries) ? entries : []).reduce((latest, entry) => {
    const candidate = safeNormalizeDate(entry?.dataNormalizada || entry?.data || entry?.dataHora);
    if (!candidate) {
      return latest;
    }

    return !latest || candidate.getTime() > latest.getTime() ? candidate : latest;
  }, null);
}

function getDashboardExpenseItems(source) {
  return getLedgerMovementItems(source);
}

function normalizeDashboardExpenseItem(expense, index = 0) {
  const normalizedDate = safeNormalizeDate(expense?.data || expense?.dataNormalizada);
  const dateTime = parseDateTimeValue(expense?.data || expense?.dataNormalizada);
  const rawValue = normalizeNumericValue(expense?.valor);
  const normalizedValue = Math.abs(rawValue);
  const normalizedType = normalizeMovementType(expense?.tipo, rawValue);

  if (
    !normalizedDate ||
    normalizedValue <= 0 ||
    normalizedType === "entrada" ||
    isBalanceSummaryDescription(expense?.descricao || expense?.nome || "")
  ) {
    return null;
  }

  const classification = resolveMovementClassification(expense);

  return {
    ...expense,
    id: expense?.id || `despesa_${index + 1}`,
    user_id: expense?.user_id || expense?.userId || "",
    valor: normalizedValue,
    descricao: expense?.descricao || "Lancamento",
    descricaoNormalizada: classification.descricaoNormalizada,
    categoria:
      expense?.categoria && expense.categoria !== "outros"
        ? expense.categoria
        : classification.categoriaPrincipal || expense?.categoria || "Sem categoria",
    categoriaPrincipal:
      classification.categoriaPrincipal || expense?.categoria || "Sem categoria",
    subcategoria: expense?.subcategoria || classification.subcategoria || "",
    data: expense?.data || expense?.dataNormalizada || "",
    dataNormalizada: normalizedDate,
    dataHora: dateTime || normalizedDate,
    tipo: normalizedType,
  };
}

function normalizeDashboardExpenses(source) {
  return getDashboardExpenseItems(source)
    .map((expense, index) => normalizeDashboardExpenseItem(expense, index))
    .filter(Boolean)
    .sort((left, right) => left.dataHora.getTime() - right.dataHora.getTime());
}

function getDespesasDoDia(despesas, dataAtual = new Date()) {
  const today = normalizeDate(dataAtual);

  return normalizeDashboardExpenses(despesas).filter((despesa) =>
    areSameDay(despesa.dataNormalizada, today)
  );
}

function getDespesasDaSemana(despesas, dataAtual = new Date()) {
  const today = normalizeDate(dataAtual);
  const startOfWeek = getStartOfWeek(today);

  return normalizeDashboardExpenses(despesas).filter((despesa) =>
    isWithinRange(despesa.dataNormalizada, startOfWeek, today)
  );
}

function getDespesasDoMes(despesas, dataAtual = new Date()) {
  const today = normalizeDate(dataAtual);
  const startOfMonth = getStartOfMonth(today);

  return normalizeDashboardExpenses(despesas).filter((despesa) =>
    isWithinRange(despesa.dataNormalizada, startOfMonth, today)
  );
}

function getDespesasPorPeriodo(despesas, periodo = "week", dataAtual = new Date()) {
  if (periodo === "day") {
    return getDespesasDoDia(despesas, dataAtual);
  }

  if (periodo === "month") {
    return getDespesasDoMes(despesas, dataAtual);
  }

  return getDespesasDaSemana(despesas, dataAtual);
}

function buildEvolutionChartDataForDay(periodExpenses) {
  return {
    labels: periodExpenses.map((expense, index) => formatTimeLabel(expense.data) || `Lanc. ${index + 1}`),
    values: periodExpenses.map((expense) => Number(expense.valor || 0)),
  };
}

function buildEvolutionChartDataForGroupedDays(periodExpenses, startDate, endDate) {
  const totalsByDay = periodExpenses.reduce((accumulator, expense) => {
    const key = expense.dataNormalizada.toISOString().slice(0, 10);
    accumulator.set(key, (accumulator.get(key) || 0) + Number(expense.valor || 0));
    return accumulator;
  }, new Map());
  const labels = [];
  const values = [];
  const cursor = normalizeDate(startDate);
  const finalDate = normalizeDate(endDate);

  while (cursor.getTime() <= finalDate.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    labels.push(formatDate(cursor));
    values.push(Number(totalsByDay.get(key) || 0));
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return { labels, values };
}

function prepareEvolutionChartData(despesas, periodo = "week", dataAtual = new Date()) {
  const descriptor = getExpensePeriodDescriptor(periodo, dataAtual);
  const periodExpenses = getDespesasPorPeriodo(despesas, periodo, dataAtual);

  if (periodo === "day") {
    return {
      period: descriptor.period,
      labels: buildEvolutionChartDataForDay(periodExpenses).labels,
      values: buildEvolutionChartDataForDay(periodExpenses).values,
      items: periodExpenses,
    };
  }

  const groupedData = buildEvolutionChartDataForGroupedDays(
    periodExpenses,
    descriptor.startDate,
    descriptor.endDate
  );

  return {
    period: descriptor.period,
    labels: groupedData.labels,
    values: groupedData.values,
    items: periodExpenses,
  };
}

function prepareCategoryChartData(despesas, periodo = "week", dataAtual = new Date()) {
  const periodExpenses = getDespesasPorPeriodo(despesas, periodo, dataAtual);
  const categorySeries = buildCategorySeries(periodExpenses);

  return {
    period: periodo,
    labels: categorySeries.map((item) => item.categoria),
    values: categorySeries.map((item) => Number(item.total || 0)),
    items: categorySeries,
  };
}

function prepareSummaryData(despesas, periodo = "week", dataAtual = new Date()) {
  const periodExpenses = getDespesasPorPeriodo(despesas, periodo, dataAtual);
  const totalGasto = periodExpenses.reduce((sum, expense) => sum + Number(expense.valor || 0), 0);
  const categorySeries = buildCategorySeries(periodExpenses);
  const categoriaMaiorGasto = categorySeries[0] || null;
  const percentualCategoriaMaiorGasto =
    categoriaMaiorGasto && totalGasto > 0
      ? (Number(categoriaMaiorGasto.total || 0) / totalGasto) * 100
      : 0;

  return {
    period: periodo,
    totalGasto,
    quantidadeLancamentos: periodExpenses.length,
    categoriaMaiorGasto: categoriaMaiorGasto
      ? {
        categoria: categoriaMaiorGasto.categoria,
        valor: Number(categoriaMaiorGasto.total || 0),
        percentual: percentualCategoriaMaiorGasto,
      }
      : null,
  };
}

function prepareDashboardChartData(despesas, periodo = "week", dataAtual = new Date()) {
  return {
    evolutionChartData: prepareEvolutionChartData(despesas, periodo, dataAtual),
    categoryChartData: prepareCategoryChartData(despesas, periodo, dataAtual),
    summaryData: prepareSummaryData(despesas, periodo, dataAtual),
  };
}

function buildCategorySeries(entries) {
  const categoryTotals = entries.reduce((accumulator, entry) => {
    const category = entry.categoriaPrincipal || entry.categoria || "outros";
    const currentTotal = accumulator.get(category) || 0;
    accumulator.set(category, currentTotal + Number(entry.valor || 0));
    return accumulator;
  }, new Map());

  const totalGeral = [...categoryTotals.values()].reduce((sum, val) => sum + val, 0);

  return [...categoryTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([categoria, total]) => ({
      categoria,
      total,
      percentual: totalGeral > 0 ? (total / totalGeral) * 100 : 0,
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

function getStartOfSundayWeek(referenceDate) {
  const date = normalizeDate(referenceDate);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function getEndOfSaturdayWeek(startDate) {
  const date = normalizeDate(startDate);
  date.setDate(date.getDate() + 6);
  return date;
}

function getStartOfMonthRange(referenceDate) {
  const date = normalizeDate(referenceDate);
  date.setDate(1);
  return date;
}

function getEndOfMonthRange(referenceDate) {
  const date = normalizeDate(referenceDate);
  date.setMonth(date.getMonth() + 1, 0);
  return date;
}

function addDays(referenceDate, amount) {
  const date = normalizeDate(referenceDate);
  date.setDate(date.getDate() + amount);
  return date;
}

function addMonths(referenceDate, amount) {
  const date = normalizeDate(referenceDate);
  date.setMonth(date.getMonth() + amount, 1);
  return date;
}

function buildSpendingRhythmPoint(entries, label, startDate, endDate) {
  const total = getEntriesWithinRange(entries, startDate, endDate).reduce(
    (sum, entry) => sum + Number(entry.valor || 0),
    0
  );

  return {
    label,
    startDate,
    endDate,
    total,
  };
}

function groupExpensesByDay(entries, referenceDate = new Date(), days = 7) {
  const today = normalizeDate(referenceDate);

  return Array.from({ length: days }, (_, index) => {
    const currentDate = addDays(today, index - (days - 1));
    return buildSpendingRhythmPoint(
      entries,
      formatDate(currentDate),
      currentDate,
      currentDate
    );
  });
}

function formatWeekRangeLabel(startDate, endDate) {
  return `${formatDate(startDate)} a ${formatDate(endDate)}`;
}

function groupExpensesByWeek(entries, referenceDate = new Date(), weeks = 6) {
  const latestEntryDate = getLatestAvailableEntryDate(entries) || normalizeDate(referenceDate);
  const endReference = latestEntryDate.getTime() < normalizeDate(referenceDate).getTime()
    ? latestEntryDate
    : normalizeDate(referenceDate);
  const currentWeekStart = getStartOfSundayWeek(endReference);

  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(currentWeekStart, (index - (weeks - 1)) * 7);
    const weekEnd = getEndOfSaturdayWeek(weekStart);

    return buildSpendingRhythmPoint(
      entries,
      formatWeekRangeLabel(weekStart, weekEnd),
      weekStart,
      weekEnd
    );
  });
}

function formatMonthShort(referenceDate) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
  })
    .format(normalizeDate(referenceDate))
    .replace(".", "");
}

function groupExpensesByMonth(entries, referenceDate = new Date(), months = 6) {
  const latestEntryDate = getLatestAvailableEntryDate(entries) || normalizeDate(referenceDate);
  const endReference = latestEntryDate.getTime() < normalizeDate(referenceDate).getTime()
    ? latestEntryDate
    : normalizeDate(referenceDate);
  const currentMonthStart = getStartOfMonthRange(endReference);

  return Array.from({ length: months }, (_, index) => {
    const monthStart = addMonths(currentMonthStart, index - (months - 1));
    const monthEnd = getEndOfMonthRange(monthStart);

    return buildSpendingRhythmPoint(
      entries,
      formatMonthShort(monthStart),
      monthStart,
      monthEnd
    );
  });
}

function buildSpendingRhythmDataset(data, period = "day", referenceDate = new Date()) {
  const entries = getFinancialEntries(data);
  const normalizedPeriod = String(period || "day").toLowerCase();
  const latestEntryDate = getLatestAvailableEntryDate(entries);
  const cappedReferenceDate =
    latestEntryDate && latestEntryDate.getTime() < normalizeDate(referenceDate).getTime()
      ? latestEntryDate
      : referenceDate;
  const points =
    normalizedPeriod === "week"
      ? groupExpensesByWeek(entries, cappedReferenceDate)
      : normalizedPeriod === "month"
        ? groupExpensesByMonth(entries, cappedReferenceDate)
        : groupExpensesByDay(entries, cappedReferenceDate);
  const total = points.reduce((sum, point) => sum + Number(point.total || 0), 0);
  const maxTotal = Math.max(...points.map((point) => Number(point.total || 0)), 0);
  const average = points.length ? total / points.length : 0;

  return {
    period: normalizedPeriod,
    points,
    total,
    average,
    maxTotal,
    subtitle:
      normalizedPeriod === "week"
        ? "Semanas de domingo a sabado, incluindo a semana atual mesmo incompleta."
        : normalizedPeriod === "month"
          ? "Meses calendario, incluindo o mes atual mesmo incompleto."
          : "Ultimos 7 dias corridos, incluindo hoje.",
    windowLabel:
      normalizedPeriod === "week"
        ? `${points.length} semana(s)`
        : normalizedPeriod === "month"
          ? `${points.length} mes(es)`
          : `${points.length} dia(s)`,
  };
}

const CATEGORY_AUTOMATION_RULES = [
  { categoria: "alimentacao", subcategoria: "mercado", keywords: ["mercado", "supermercado", "atacadao", "carrefour", "assai", "extra", "hortifruti", "oba hortifruti", "dia supermercado"] },
  { categoria: "alimentacao", subcategoria: "padaria", keywords: ["padaria", "pao", "confeitaria"] },
  { categoria: "alimentacao", subcategoria: "restaurante", keywords: ["restaurante", "almoco", "janta", "churrascaria", "lanchonete", "refeicao"] },
  { categoria: "alimentacao", subcategoria: "delivery", keywords: ["ifood", "delivery", "pizza", "burger", "lanche", "sushi", "cafeteria", "acai"] },
  { categoria: "transporte", subcategoria: "app", keywords: ["uber", "99", "indrive", "cabify", "taxi", "99app"] },
  { categoria: "transporte", subcategoria: "combustivel", keywords: ["combustivel", "gasolina", "etanol", "diesel", "posto", "shell box"] },
  { categoria: "transporte", subcategoria: "onibus", keywords: ["onibus", "metro", "trem", "bilhete unico", "transporte publico"] },
  { categoria: "transporte", subcategoria: "estacionamento", keywords: ["estacionamento", "zona azul", "parking", "pedagio", "sem parar"] },
  { categoria: "saude", subcategoria: "farmacia", keywords: ["farmacia", "droga", "medicamento", "remedio", "drogasil", "ultrafarma", "drogaria sao paulo"] },
  { categoria: "saude", subcategoria: "consulta", keywords: ["consulta", "medico", "clinica", "odonto", "terapia", "hospital", "consultorio", "psicologo", "fisioterapia"] },
  { categoria: "saude", subcategoria: "exame", keywords: ["exame", "laboratorio", "raio x", "ultrassom", "tomografia"] },
  { categoria: "saude", subcategoria: "farmacia", keywords: ["drogaria", "farmacia", "droga", "remedio", "medicamento"] },
  { categoria: "lazer", subcategoria: "bar", keywords: ["bar", "cervejaria", "happy hour", "pub"] },
  { categoria: "lazer", subcategoria: "viagem", keywords: ["viagem", "hotel", "airbnb", "pousada", "passagem"] },
  { categoria: "lazer", subcategoria: "evento", keywords: ["cinema", "show", "teatro", "evento", "ingresso"] },
  { categoria: "moradia", subcategoria: "aluguel", keywords: ["aluguel", "locacao", "imobiliaria"] },
  { categoria: "moradia", subcategoria: "condominio", keywords: ["condominio"] },
  { categoria: "moradia", subcategoria: "contas da casa", keywords: ["energia", "luz", "agua", "gas", "internet", "telefone", "saneamento", "sabesp", "enel", "cemig", "coelba", "cpfl"] },
  { categoria: "educacao", subcategoria: "curso", keywords: ["curso", "aula", "treinamento", "certificacao"] },
  { categoria: "educacao", subcategoria: "faculdade", keywords: ["faculdade", "universidade", "mensalidade", "colegio", "escola"] },
  { categoria: "educacao", subcategoria: "livros", keywords: ["livro", "apostila", "material escolar"] },
  { categoria: "assinaturas", subcategoria: "streaming", keywords: ["netflix", "spotify", "youtube premium", "disney", "max", "prime video"] },
  { categoria: "assinaturas", subcategoria: "software", keywords: ["adobe", "canva", "microsoft", "google one", "dropbox", "notion", "chatgpt"] },
  { categoria: "assinaturas", subcategoria: "servicos", keywords: ["assinatura", "mensalidade", "plano"] },
  { categoria: "compras", subcategoria: "vestuario", keywords: ["roupa", "vestuario", "calcado", "tenis", "camisa"] },
  { categoria: "compras", subcategoria: "casa", keywords: ["loja", "shopping", "casa", "decoracao", "utilidades"] },
  { categoria: "compras", subcategoria: "eletronicos", keywords: ["amazon", "mercado livre", "magalu", "eletronico", "celular", "notebook"] },
  { categoria: "pets", subcategoria: "racao", keywords: ["racao", "petshop", "pet shop", "areia", "pet"] },
  { categoria: "pets", subcategoria: "veterinario", keywords: ["veterinario", "vacina pet", "banho", "tosa"] },
  { categoria: "trabalho", subcategoria: "equipamentos", keywords: ["equipamento", "teclado", "mouse", "monitor", "escritorio"] },
  { categoria: "trabalho", subcategoria: "deslocamento", keywords: ["estacionamento trabalho", "combustivel trabalho", "deslocamento trabalho"] },
  { categoria: "imprevistos", subcategoria: "manutencao", keywords: ["manutencao", "reparo", "conserto", "quebra"] },
  { categoria: "imprevistos", subcategoria: "multa", keywords: ["multa", "juros mora", "encargo", "tarifa bancaria", "cesta de servicos", "iof"] },
  { categoria: "imprevistos", subcategoria: "emergencia", keywords: ["emergencia", "urgencia", "socorro"] },
  { categoria: "rendimento", subcategoria: "rendimento", keywords: ["rendimento", "juros", "invest", "aplicacao", "resgate"] },
  { categoria: "compras", subcategoria: "pagamentos", keywords: ["pagamento", "pag tit", "boleto", "qr pix", "pix qr", "maquininha", "boleto pago"] },
  { categoria: "outros", subcategoria: "transferencias", keywords: ["pix enviado", "pix transferido", "transferencia enviada", "ted enviada", "doc enviado", "pix para", "pix p/", "transferido para"] },
  { categoria: "entrada", subcategoria: "recebimento", keywords: ["pix recebido", "salario", "pagamento recebido", "deposito", "ted recebida", "transferencia recebida"] },
];

const CATEGORY_AUTOMATION_INDEX = CATEGORY_AUTOMATION_RULES.reduce(
  (accumulator, rule) => {
    const categoryKey = normalizeCategoryDescription(rule?.categoria);
    const subcategoryKey = normalizeCategoryDescription(rule?.subcategoria);

    if (categoryKey && !accumulator.byCategory.has(categoryKey)) {
      accumulator.byCategory.set(categoryKey, rule.categoria);
    }

    if (subcategoryKey && !accumulator.bySubcategory.has(subcategoryKey)) {
      accumulator.bySubcategory.set(subcategoryKey, {
        categoria: rule.categoria,
        subcategoria: rule.subcategoria,
      });
    }

    return accumulator;
  },
  {
    byCategory: new Map(),
    bySubcategory: new Map(),
  }
);

function normalizeCategoryDescription(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyCategoryFromDescription(description, rules = CATEGORY_AUTOMATION_RULES) {
  const normalizedDescription = normalizeCategoryDescription(description);

  if (!normalizedDescription) {
    return null;
  }

  for (const rule of Array.isArray(rules) ? rules : []) {
    const matchedKeyword = Array.isArray(rule?.keywords)
      ? rule.keywords.find((keyword) => normalizedDescription.includes(normalizeCategoryDescription(keyword)))
      : "";

    if (matchedKeyword) {
      return {
        categoria: rule.categoria || "outros",
        subcategoria: rule.subcategoria || "",
        matchedKeyword,
        confidence: "rule_match",
      };
    }
  }

  return null;
}

function resolveMovementClassification(movement) {
  const explicitCategoryRaw = String(
    movement?.categoriaPrincipal || movement?.categoria || ""
  ).trim();
  const explicitSubcategoryRaw = String(movement?.subcategoria || "").trim();
  const explicitCategoryKey = normalizeCategoryDescription(explicitCategoryRaw);
  const explicitSubcategoryKey = normalizeCategoryDescription(explicitSubcategoryRaw);
  const description = movement?.descricao || movement?.nome || "";
  const automaticClassification = classifyCategoryFromDescription(description);
  let categoriaPrincipal = "";
  let subcategoria = "";
  const isGenericCategory = (value) =>
    ["outros", "outro", "sem categoria", "sem_categoria", "geral"].includes(
      normalizeCategoryDescription(value)
    );

  if (explicitCategoryKey && !isGenericCategory(explicitCategoryRaw)) {
    if (CATEGORY_AUTOMATION_INDEX.byCategory.has(explicitCategoryKey)) {
      categoriaPrincipal = CATEGORY_AUTOMATION_INDEX.byCategory.get(explicitCategoryKey) || "";
    } else if (CATEGORY_AUTOMATION_INDEX.bySubcategory.has(explicitCategoryKey)) {
      const mappedRule = CATEGORY_AUTOMATION_INDEX.bySubcategory.get(explicitCategoryKey);
      categoriaPrincipal = mappedRule?.categoria || "";
      subcategoria = mappedRule?.subcategoria || "";
    } else {
      categoriaPrincipal = explicitCategoryRaw.toLowerCase();
    }
  }

  if (explicitSubcategoryKey && !isGenericCategory(explicitSubcategoryRaw)) {
    if (CATEGORY_AUTOMATION_INDEX.bySubcategory.has(explicitSubcategoryKey)) {
      const mappedRule = CATEGORY_AUTOMATION_INDEX.bySubcategory.get(explicitSubcategoryKey);
      categoriaPrincipal = categoriaPrincipal || mappedRule?.categoria || "";
      subcategoria = mappedRule?.subcategoria || "";
    } else {
      subcategoria = explicitSubcategoryRaw.toLowerCase();
    }
  }

  if (!categoriaPrincipal && automaticClassification?.categoria) {
    categoriaPrincipal = automaticClassification.categoria;
  }

  if (!subcategoria && automaticClassification?.subcategoria) {
    subcategoria = automaticClassification.subcategoria;
  }

  if (!categoriaPrincipal) {
    categoriaPrincipal = "outros";
  }

  return {
    categoriaPrincipal,
    subcategoria: subcategoria || "",
    descricaoNormalizada: normalizeCategoryDescription(description),
    classificacaoAutomatica: automaticClassification
      ? {
        categoria: automaticClassification.categoria,
        subcategoria: automaticClassification.subcategoria || "",
        matchedKeyword: automaticClassification.matchedKeyword || "",
        confidence: automaticClassification.confidence || "rule_match",
      }
      : null,
  };
}

function inferMovementDetails(movement) {
  const description = normalizeCategoryDescription(movement?.descricao || movement?.nome || "");
  const type = String(movement?.tipo || "").toLowerCase();
  const details = {
    tipoMovimento: type || (movement?.valor < 0 ? "saida" : "entrada"),
    meioPagamento: "",
    contraparte: "",
    instituicao: "",
  };

  if (description.includes("pix recebido") || description.includes("receb")) {
    details.meioPagamento = "Pix";
    details.tipoMovimento = "entrada";
  } else if (
    description.includes("pix enviado") ||
    description.includes("transferencia enviada") ||
    description.includes("ted enviada")
  ) {
    details.meioPagamento = "Pix";
    details.tipoMovimento = "saida";
  } else if (description.includes("boleto")) {
    details.meioPagamento = "Boleto";
  } else if (description.includes("cartao") || description.includes("debito")) {
    details.meioPagamento = "Cartão/Débito";
  }

  if (description.includes("ifood")) {
    details.contraparte = "iFood";
  } else if (description.includes("uber")) {
    details.contraparte = "Uber";
  } else if (description.includes("sabesp")) {
    details.contraparte = "Sabesp";
  } else if (description.includes("enel")) {
    details.contraparte = "Enel";
  }

  if (description.includes("nubank")) {
    details.instituicao = "Nubank";
  } else if (description.includes("inter")) {
    details.instituicao = "Banco Inter";
  } else if (description.includes("bradesco")) {
    details.instituicao = "Bradesco";
  }

  return details;
}

function getCategoryAutomationRules() {
  return CATEGORY_AUTOMATION_RULES.map((rule) => ({
    categoria: rule.categoria,
    subcategoria: rule.subcategoria || "",
    keywords: [...(Array.isArray(rule.keywords) ? rule.keywords : [])],
  }));
}

function getInclusiveDaySpanBetweenDates(startDate, endDate) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const differenceInMs = end.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.max(Math.floor(differenceInMs / oneDay) + 1, 1);
}

function buildAutomaticPeriodSummary(periodSummary, label, fallbackText) {
  if (!periodSummary?.quantidadeLancamentos) {
    return {
      label,
      tone: "muted",
      title: fallbackText,
      body: "Adicione ou importe lancamentos para destravar uma leitura mais util desse periodo.",
    };
  }

  const dominantCategoryText =
    periodSummary.categoriaDominante && periodSummary.categoriaDominante !== "Sem categoria"
      ? ` Categoria dominante: ${periodSummary.categoriaDominante}.`
      : "";

  return {
    label,
    tone: periodSummary.totalGasto > 0 ? "blue" : "muted",
    title: `${formatCurrency(periodSummary.totalGasto)} em ${periodSummary.quantidadeLancamentos} lancamento(s)`,
    body: `${label} ja soma ${formatCurrency(periodSummary.totalGasto)}.${dominantCategoryText}`,
  };
}

function buildDailySpendSeries(entries) {
  return agruparLancamentosPorData(entries).map((group) => ({
    date: group.date,
    label: group.label,
    total: Number(group.saidas || 0),
    count: Number(group.count || 0),
    topCategory: group.topCategory || "outros",
  }));
}

function getRecentLedgerWindowSummary(entries, referenceDate = new Date(), daysBack = 21) {
  const endDate = normalizeDate(referenceDate);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - Math.max(daysBack - 1, 0));
  startDate.setHours(0, 0, 0, 0);
  const dailySeries = buildDailySpendSeries(
    getEntriesWithinRange(Array.isArray(entries) ? entries : [], startDate, endDate)
  );
  const daySpan = getInclusiveDaySpanBetweenDates(startDate, endDate);
  const totalGasto = dailySeries.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const activeDays = dailySeries.filter((item) => Number(item.total || 0) > 0).length;
  const averageDailySpend = daySpan > 0 ? totalGasto / daySpan : 0;
  const averageActiveDaySpend = activeDays > 0 ? totalGasto / activeDays : 0;

  return {
    startDate,
    endDate,
    daySpan,
    activeDays,
    totalGasto,
    averageDailySpend,
    averageActiveDaySpend,
    dailySeries,
  };
}

function buildWeekdaySpendPattern(entries, referenceDate = new Date(), daysBack = 56) {
  const recentWindow = getRecentLedgerWindowSummary(entries, referenceDate, daysBack);
  const weekdayTotals = recentWindow.dailySeries.reduce((accumulator, item) => {
    const weekdayLabel = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
    }).format(item.date);
    const current = accumulator.get(weekdayLabel) || {
      weekday: weekdayLabel,
      total: 0,
      ocorrencias: 0,
    };
    current.total += Number(item.total || 0);
    current.ocorrencias += 1;
    accumulator.set(weekdayLabel, current);
    return accumulator;
  }, new Map());
  const rankedDays = [...weekdayTotals.values()]
    .sort((left, right) => right.total - left.total)
    .map((item) => ({
      ...item,
      mediaPorOcorrencia:
        item.ocorrencias > 0 ? Number(item.total || 0) / item.ocorrencias : 0,
      percentual:
        recentWindow.totalGasto > 0 ? (Number(item.total || 0) / recentWindow.totalGasto) * 100 : 0,
    }));

  return {
    ...recentWindow,
    rankedDays,
    dominantDay: rankedDays[0] || null,
  };
}

function buildBehaviorPatternSignals(selectedSummary, recentWindow, referenceDate = new Date()) {
  const activeSeries = (recentWindow?.dailySeries || []).filter((item) => Number(item.total || 0) > 0);
  const outlierBaseline = Math.max(
    Number(recentWindow?.averageDailySpend || 0),
    Number(recentWindow?.averageActiveDaySpend || 0) * 0.85
  );
  const outlierThreshold =
    outlierBaseline > 0 ? Math.max(outlierBaseline * 1.8, outlierBaseline + 40) : Number.POSITIVE_INFINITY;
  const outlierDays = activeSeries
    .filter((item) => Number(item.total || 0) >= outlierThreshold)
    .sort((left, right) => right.total - left.total)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      ratioToAverage: outlierBaseline > 0 ? Number(item.total || 0) / outlierBaseline : 0,
    }));
  const today = normalizeDate(referenceDate);
  const hasOutlierToday = outlierDays.some((item) => areSameDay(item.date, today));
  const periodDaySpan = getInclusiveDaySpanBetweenDates(
    selectedSummary?.startDate || today,
    selectedSummary?.endDate || today
  );
  const leadingDays = periodDaySpan >= 6 ? Math.max(Math.ceil(periodDaySpan / 3), 2) : 0;
  const leadingPeriodEnd = new Date(selectedSummary?.startDate || today);
  if (leadingDays > 0) {
    leadingPeriodEnd.setDate(leadingPeriodEnd.getDate() + leadingDays - 1);
    leadingPeriodEnd.setHours(0, 0, 0, 0);
  }
  const leadingSpend = leadingDays
    ? (selectedSummary?.groups || [])
      .filter((group) => group?.date && group.date.getTime() <= leadingPeriodEnd.getTime())
      .reduce((sum, group) => sum + Number(group.saidas || 0), 0)
    : 0;
  const leadingShare =
    selectedSummary?.totalGasto > 0 ? leadingSpend / Number(selectedSummary.totalGasto || 0) : 0;
  const expectedLeadingShare = leadingDays > 0 ? leadingDays / periodDaySpan : 0;
  const acceleratedAtStartOfPeriod =
    leadingDays > 0 &&
    selectedSummary?.totalGasto > 0 &&
    leadingShare >= Math.max(expectedLeadingShare + 0.2, 0.55);

  return {
    outlierBaseline,
    outlierThreshold,
    outlierDays,
    hasOutlierDay: outlierDays.length > 0,
    hasOutlierToday,
    acceleratedAtStartOfPeriod,
    leadingDays,
    leadingSpend,
    leadingShare,
    expectedLeadingShare,
  };
}

function buildComparisonSnapshot(currentValue, baselineValue) {
  const current = Number(currentValue || 0);
  const baseline = Number(baselineValue || 0);
  const delta = current - baseline;
  const percentChange =
    baseline > 0 ? (delta / baseline) * 100 : current > 0 ? 100 : 0;

  return {
    current,
    baseline,
    delta,
    percentChange,
    hasBaseline: baseline > 0,
    status: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

function getPreviousPeriodDescriptor(descriptor) {
  const daySpan = getInclusiveDaySpanBetweenDates(descriptor.startDate, descriptor.endDate);
  const previousEndDate = new Date(descriptor.startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  previousEndDate.setHours(0, 0, 0, 0);
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousEndDate.getDate() - daySpan + 1);
  previousStartDate.setHours(0, 0, 0, 0);

  return buildCustomRangeDescriptor(
    `${descriptor.period}_previous`,
    `${descriptor.label} anterior`,
    previousStartDate,
    previousEndDate
  );
}

function buildSpendAggregateMap(entries, keySelector, daySpan = 1) {
  const aggregateMap = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const aggregateKey = String(keySelector(entry) || "").trim() || "outros";
    const currentAggregate = aggregateMap.get(aggregateKey) || {
      key: aggregateKey,
      label: aggregateKey,
      total: 0,
      count: 0,
      sampleDescription: entry?.descricao || "Lancamento",
      categoriaPrincipal: entry?.categoriaPrincipal || entry?.categoria || "outros",
      subcategoria: entry?.subcategoria || "",
    };

    currentAggregate.total += Number(entry.valor || 0);
    currentAggregate.count += 1;
    currentAggregate.sampleDescription = currentAggregate.sampleDescription || entry?.descricao || "";
    aggregateMap.set(aggregateKey, currentAggregate);
  });

  return aggregateMap;
}

function mapAggregateMapToSeries(aggregateMap, daySpan = 1) {
  return [...(aggregateMap instanceof Map ? aggregateMap.values() : [])]
    .map((item) => ({
      ...item,
      ticketMedio: item.count > 0 ? Number(item.total || 0) / item.count : 0,
      frequenciaLancamentos: item.count,
      frequenciaPorDia: daySpan > 0 ? item.count / daySpan : item.count,
    }))
    .sort((left, right) => right.total - left.total);
}

function selectMeaningfulSubcategory(items) {
  const candidates = (Array.isArray(items) ? items : []).filter(
    (item) => item?.label && item.label !== "sem_subcategoria"
  );
  return candidates[0] || null;
}

function buildCategoryAnalytics(entries, selectedSummary, referenceDate = new Date()) {
  const currentDescriptor = buildCustomRangeDescriptor(
    selectedSummary?.period || "period",
    selectedSummary?.label || "Periodo atual",
    selectedSummary?.startDate || referenceDate,
    selectedSummary?.endDate || referenceDate
  );
  const previousDescriptor = getPreviousPeriodDescriptor(currentDescriptor);
  const recentWindow = getRecentLedgerWindowSummary(entries, referenceDate, 28);
  const currentDaySpan = getInclusiveDaySpanBetweenDates(
    currentDescriptor.startDate,
    currentDescriptor.endDate
  );
  const currentEntries = getEntriesWithinRange(entries, currentDescriptor.startDate, currentDescriptor.endDate);
  const previousEntries = getEntriesWithinRange(
    entries,
    previousDescriptor.startDate,
    previousDescriptor.endDate
  );
  const recentEntries = getEntriesWithinRange(entries, recentWindow.startDate, recentWindow.endDate);
  const currentCategoryMap = buildSpendAggregateMap(
    currentEntries,
    (entry) => entry.categoriaPrincipal || entry.categoria || "outros",
    currentDaySpan
  );
  const previousCategoryMap = buildSpendAggregateMap(
    previousEntries,
    (entry) => entry.categoriaPrincipal || entry.categoria || "outros",
    currentDaySpan
  );
  const recentCategoryMap = buildSpendAggregateMap(
    recentEntries,
    (entry) => entry.categoriaPrincipal || entry.categoria || "outros",
    recentWindow.daySpan
  );
  const categoryItems = mapAggregateMapToSeries(currentCategoryMap, currentDaySpan).map((categoryItem) => {
    const previousCategory = previousCategoryMap.get(categoryItem.key);
    const recentCategory = recentCategoryMap.get(categoryItem.key);
    const previousComparison = buildComparisonSnapshot(
      categoryItem.total,
      Number(previousCategory?.total || 0)
    );
    const recentEquivalent =
      recentWindow.daySpan > 0
        ? (Number(recentCategory?.total || 0) / recentWindow.daySpan) * currentDaySpan
        : 0;
    const recentComparison = buildComparisonSnapshot(categoryItem.total, recentEquivalent);
    const currentSubcategoryMap = buildSpendAggregateMap(
      currentEntries.filter(
        (entry) => (entry.categoriaPrincipal || entry.categoria || "outros") === categoryItem.key
      ),
      (entry) => entry.subcategoria || "sem_subcategoria",
      currentDaySpan
    );
    const previousSubcategoryMap = buildSpendAggregateMap(
      previousEntries.filter(
        (entry) => (entry.categoriaPrincipal || entry.categoria || "outros") === categoryItem.key
      ),
      (entry) => entry.subcategoria || "sem_subcategoria",
      currentDaySpan
    );
    const subcategories = mapAggregateMapToSeries(currentSubcategoryMap, currentDaySpan).map(
      (subcategoryItem) => ({
        ...subcategoryItem,
        variacaoPeriodoAnterior: buildComparisonSnapshot(
          subcategoryItem.total,
          Number(previousSubcategoryMap.get(subcategoryItem.key)?.total || 0)
        ),
      })
    );
    const topSubcategory = selectMeaningfulSubcategory(subcategories) || subcategories[0] || null;
    const topGrowingSubcategory = [...subcategories]
      .filter((item) => Number(item.variacaoPeriodoAnterior.delta || 0) > 0)
      .sort(
        (left, right) =>
          Number(right.variacaoPeriodoAnterior.delta || 0) -
          Number(left.variacaoPeriodoAnterior.delta || 0)
      )[0] || null;

    return {
      ...categoryItem,
      variacaoPeriodoAnterior: previousComparison,
      variacaoMediaRecente: recentComparison,
      subcategorias: subcategories,
      topSubcategory,
      topGrowingSubcategory,
    };
  });
  const topGrowingCategory = [...categoryItems]
    .filter(
      (item) =>
        item.variacaoPeriodoAnterior.hasBaseline &&
        Number(item.variacaoPeriodoAnterior.delta || 0) > 0
    )
    .sort(
      (left, right) =>
        Number(right.variacaoPeriodoAnterior.delta || 0) -
        Number(left.variacaoPeriodoAnterior.delta || 0)
    )[0] || null;
  const categoryAboveRecentAverage = [...categoryItems]
    .filter((item) => Number(item.variacaoMediaRecente.delta || 0) > 0)
    .sort(
      (left, right) =>
        Number(right.variacaoMediaRecente.percentChange || 0) -
        Number(left.variacaoMediaRecente.percentChange || 0)
    )[0] || null;
  const topSubcategoryDriver = categoryItems
    .map((item) =>
      item.topGrowingSubcategory
        && item.topGrowingSubcategory.variacaoPeriodoAnterior.hasBaseline
        ? {
          categoria: item.label,
          subcategoria: item.topGrowingSubcategory.label,
          total: item.topGrowingSubcategory.total,
          delta: Number(item.topGrowingSubcategory.variacaoPeriodoAnterior.delta || 0),
          percentChange: Number(
            item.topGrowingSubcategory.variacaoPeriodoAnterior.percentChange || 0
          ),
        }
        : null
    )
    .filter(Boolean)
    .sort((left, right) => Number(right.delta || 0) - Number(left.delta || 0))[0] || null;

  return {
    currentDescriptor,
    previousDescriptor,
    categories: categoryItems,
    dominantCategory: categoryItems[0] || null,
    topGrowingCategory,
    categoryAboveRecentAverage,
    topSubcategoryDriver,
  };
}

function buildRecurringDescriptionAnalytics(entries, selectedSummary) {
  const currentDescriptor = buildCustomRangeDescriptor(
    selectedSummary?.period || "period",
    selectedSummary?.label || "Periodo atual",
    selectedSummary?.startDate || new Date(),
    selectedSummary?.endDate || new Date()
  );
  const previousDescriptor = getPreviousPeriodDescriptor(currentDescriptor);
  const currentDaySpan = getInclusiveDaySpanBetweenDates(
    currentDescriptor.startDate,
    currentDescriptor.endDate
  );
  const currentEntries = getEntriesWithinRange(entries, currentDescriptor.startDate, currentDescriptor.endDate);
  const previousEntries = getEntriesWithinRange(
    entries,
    previousDescriptor.startDate,
    previousDescriptor.endDate
  );
  const currentDescriptionMap = buildSpendAggregateMap(
    currentEntries,
    (entry) => entry.descricaoNormalizada || entry.descricao || "",
    currentDaySpan
  );
  const previousDescriptionMap = buildSpendAggregateMap(
    previousEntries,
    (entry) => entry.descricaoNormalizada || entry.descricao || "",
    currentDaySpan
  );
  const recurringDescriptions = mapAggregateMapToSeries(currentDescriptionMap, currentDaySpan)
    .map((descriptionItem) => {
      const previousDescription = previousDescriptionMap.get(descriptionItem.key);
      const averageTicketComparison = buildComparisonSnapshot(
        descriptionItem.ticketMedio,
        Number(previousDescription?.count || 0) > 0
          ? Number(previousDescription.total || 0) / Number(previousDescription.count || 1)
          : 0
      );
      const totalComparison = buildComparisonSnapshot(
        descriptionItem.total,
        Number(previousDescription?.total || 0)
      );

      return {
        ...descriptionItem,
        descricao: descriptionItem.sampleDescription || descriptionItem.label,
        variacaoTicketMedio: averageTicketComparison,
        variacaoTotal: totalComparison,
      };
    })
    .filter(
      (item) =>
        item.frequenciaLancamentos >= 2 ||
        Number(previousDescriptionMap.get(item.key)?.count || 0) >= 2 ||
        Number(previousDescriptionMap.get(item.key)?.total || 0) > 0
    );
  const topAverageTicketIncrease = [...recurringDescriptions]
    .filter(
      (item) =>
        item.variacaoTicketMedio.hasBaseline &&
        Number(item.variacaoTicketMedio.delta || 0) > 0
    )
    .sort(
      (left, right) =>
        Number(right.variacaoTicketMedio.delta || 0) -
        Number(left.variacaoTicketMedio.delta || 0)
    )[0] || null;
  const topTotalIncrease = [...recurringDescriptions]
    .filter((item) => Number(item.variacaoTotal.delta || 0) > 0)
    .sort(
      (left, right) =>
        Number(right.variacaoTotal.delta || 0) -
        Number(left.variacaoTotal.delta || 0)
    )[0] || null;

  return {
    currentDescriptor,
    previousDescriptor,
    groups: recurringDescriptions,
    topAverageTicketIncrease,
    topTotalIncrease,
  };
}

function buildFinancialInsightMessages(intelligence) {
  const summary = intelligence?.summary || {};
  const selectedSummary = intelligence?.selectedSummary || {};
  const forecast = intelligence?.forecast || {};
  const dominantCategory = intelligence?.dominantCategory || null;
  const categoryAnalytics = intelligence?.categoryAnalytics || {};
  const comparison = intelligence?.comparison || {};
  const alerts = intelligence?.alerts || {};
  const weeklyTrend = intelligence?.weeklyTrend || null;
  const behavior = intelligence?.behavior || {};
  const recurringDescriptions = intelligence?.recurringDescriptions || {};
  const automaticSummaries = intelligence?.automaticSummaries || {};
  const categoryAutomation = intelligence?.categoryAutomation || {};

  const forecastInsight =
    forecast.averageDailySpend <= 0
      ? {
        label: "Previsao ate o pagamento",
        tone: "muted",
        title: "Ainda nao existe ritmo suficiente para prever o fim do ciclo",
        body: "O ledger ainda nao tem gasto recente suficiente para estimar quanto o saldo dura.",
      }
      : forecast.reachesNextPayment
        ? {
          label: "Previsao ate o pagamento",
          tone: forecast.marginDays <= 2 ? "yellow" : "green",
          title:
            forecast.projectedBalanceAtPayment >= 0
              ? "No ritmo atual o saldo chega ao proximo pagamento"
              : "Voce chega ao pagamento, mas com margem curta",
          body: `Media recente de ${formatCurrency(forecast.averageDailySpend)} por dia. O saldo deve durar ${forecast.estimatedDaysWithBalanceLabel} e ${forecast.projectedBalanceAtPayment >= 0 ? `sobrar ${formatCurrency(forecast.projectedBalanceAtPayment)}` : `ficar apertado em ${formatCurrency(Math.abs(forecast.projectedBalanceAtPayment))}`} ate o pagamento.`,
        }
        : {
          label: "Previsao ate o pagamento",
          tone: "red",
          title: "No ritmo atual o saldo nao chega ao proximo pagamento",
          body: `Mantido o ritmo recente de ${formatCurrency(forecast.averageDailySpend)} por dia, o saldo acaba ${forecast.daysBeforeBalanceRunsOutLabel} antes do pagamento e pode faltar ${formatCurrency(forecast.estimatedDeficit)}.`,
        };

  const categoryInsight = dominantCategory
    ? {
      label: "Categoria dominante",
      tone: dominantCategory.percentual >= 45 ? "yellow" : "blue",
      title: `${dominantCategory.categoria} lidera os gastos do periodo`,
      body: `${formatCurrency(dominantCategory.total)} representam ${formatPercentLabel(dominantCategory.percentual)} do total em ${selectedSummary.label?.toLowerCase?.() || "o periodo atual"}.`,
    }
    : {
      label: "Categoria dominante",
      tone: "muted",
      title: "Ainda nao existe categoria dominante",
      body: "Quando houver gastos suficientes no periodo, a categoria mais pesada aparece aqui.",
    };

  const categoryVariationInsight = categoryAnalytics.topGrowingCategory
    ? {
      label: "Variacao por categoria",
      tone:
        Number(categoryAnalytics.topGrowingCategory.variacaoPeriodoAnterior.percentChange || 0) >= 25
          ? "red"
          : "yellow",
      title: `Seus gastos com ${categoryAnalytics.topGrowingCategory.label} subiram`,
      body: `${formatCurrency(categoryAnalytics.topGrowingCategory.total)} no periodo atual, com alta de ${formatPercentLabel(categoryAnalytics.topGrowingCategory.variacaoPeriodoAnterior.percentChange)} frente ao periodo anterior.`,
    }
    : categoryAnalytics.categoryAboveRecentAverage
      ? {
        label: "Variacao por categoria",
        tone: "yellow",
        title: `${categoryAnalytics.categoryAboveRecentAverage.label} esta acima da media recente`,
        body: `${formatCurrency(categoryAnalytics.categoryAboveRecentAverage.total)} no periodo atual, cerca de ${formatPercentLabel(categoryAnalytics.categoryAboveRecentAverage.variacaoMediaRecente.percentChange)} acima da faixa recente equivalente.`,
      }
      : {
        label: "Variacao por categoria",
        tone: "muted",
        title: "Ainda nao apareceu variacao forte por categoria",
        body: "Com mais historico no ledger, o app destaca automaticamente as categorias que mais aceleram.",
      };

  const subcategoryInsight = categoryAnalytics.topSubcategoryDriver
    ? {
      label: "Subcategoria em destaque",
      tone: "yellow",
      title: `${categoryAnalytics.topSubcategoryDriver.subcategoria} puxa a alta de ${categoryAnalytics.topSubcategoryDriver.categoria}`,
      body: `${formatCurrency(categoryAnalytics.topSubcategoryDriver.total)} nessa subcategoria, com aumento de ${formatCurrency(categoryAnalytics.topSubcategoryDriver.delta)} frente ao periodo anterior.`,
    }
    : categoryAnalytics.dominantCategory?.topSubcategory
      ? {
        label: "Subcategoria em destaque",
        tone: "blue",
        title: `${categoryAnalytics.dominantCategory.topSubcategory.label} e a principal subcategoria de ${categoryAnalytics.dominantCategory.label}`,
        body: `${formatCurrency(categoryAnalytics.dominantCategory.topSubcategory.total)} concentrados nessa faixa no periodo atual.`,
      }
      : {
        label: "Subcategoria em destaque",
        tone: "muted",
        title: "As subcategorias ainda estao ganhando historico",
        body: "Quando as descricoes se repetirem mais, o app mostra qual subgrupo esta puxando a variacao.",
      };

  const recurringDescriptionInsight = recurringDescriptions.topAverageTicketIncrease
    ? {
      label: "Descricao recorrente",
      tone:
        Number(recurringDescriptions.topAverageTicketIncrease.variacaoTicketMedio.percentChange || 0) >= 25
          ? "red"
          : "yellow",
      title: `Seu ticket medio em ${recurringDescriptions.topAverageTicketIncrease.descricao} aumentou`,
      body: `${formatCurrency(recurringDescriptions.topAverageTicketIncrease.ticketMedio)} por lancamento agora, contra ${formatCurrency(recurringDescriptions.topAverageTicketIncrease.variacaoTicketMedio.baseline)} antes.`,
    }
    : recurringDescriptions.topTotalIncrease
      ? {
        label: "Descricao recorrente",
        tone: "yellow",
        title: `${recurringDescriptions.topTotalIncrease.descricao} ganhou peso no periodo`,
        body: `${formatCurrency(recurringDescriptions.topTotalIncrease.total)} no periodo atual, com alta de ${formatCurrency(recurringDescriptions.topTotalIncrease.variacaoTotal.delta)} frente ao anterior.`,
      }
      : {
        label: "Descricao recorrente",
        tone: "muted",
        title: "Ainda nao existe padrao forte por descricao recorrente",
        body: "Com mais repeticao no ledger, o app passa a medir aumento de ticket medio por descricao.",
      };

  const comparisonInsight =
    comparison.recentAverageDailySpend <= 0
      ? {
        label: "Comparacao com media",
        tone: comparison.todayTotal > 0 ? "yellow" : "muted",
        title:
          comparison.todayTotal > 0
            ? "Hoje abriu o historico recente"
            : "Sem base recente para comparar o gasto de hoje",
        body:
          comparison.todayTotal > 0
            ? `Hoje soma ${formatCurrency(comparison.todayTotal)} e o ledger ainda nao formou uma media diaria confiavel.`
            : "Registre mais movimentacoes para destravar essa comparacao.",
      }
      : comparison.status === "above"
        ? {
          label: "Comparacao com media",
          tone: comparison.intensity === "forte" ? "red" : "yellow",
          title: "Hoje esta acima da media diaria recente",
          body: `${formatCurrency(comparison.todayTotal)} hoje contra media de ${formatCurrency(comparison.recentAverageDailySpend)}. Excesso atual de ${formatCurrency(comparison.difference)}.`,
        }
        : comparison.status === "below"
          ? {
            label: "Comparacao com media",
            tone: "green",
            title: "Hoje esta abaixo da media diaria recente",
            body: `${formatCurrency(comparison.todayTotal)} hoje contra media de ${formatCurrency(comparison.recentAverageDailySpend)}. Folga atual de ${formatCurrency(Math.abs(comparison.difference))}.`,
          }
          : {
            label: "Comparacao com media",
            tone: "blue",
            title: "Hoje esta dentro do padrao recente",
            body: `${formatCurrency(comparison.todayTotal)} hoje, bem perto da media recente de ${formatCurrency(comparison.recentAverageDailySpend)}.`,
          };

  const preventiveInsight = !summary.paymentInfo?.configured || summary.diasRestantes <= 0
    ? {
      label: "Alertas preventivos",
      tone: "muted",
      title: "Configure o proximo pagamento para ativar os alertas preventivos",
      body: "Sem a data do proximo recebimento, o app ainda nao mede o risco real do ciclo.",
    }
    : alerts.riskBeforePayment
      ? {
        label: "Alertas preventivos",
        tone: "red",
        title: "Existe risco de faltar dinheiro antes do pagamento",
        body: `O ledger mostra desgaste acima do ideal. A projecao indica falta de ${formatCurrency(forecast.estimatedDeficit)} se o ritmo atual continuar.`,
      }
      : alerts.dailyLimitAndAboveAverage
        ? {
          label: "Alertas preventivos",
          tone: "red",
          title: "Hoje passou do limite diario e da media recente",
          body: "O dia saiu do padrao em duas frentes ao mesmo tempo. Vale reduzir o restante do consumo agora.",
        }
        : alerts.categoryPressure
          ? {
            label: "Alertas preventivos",
            tone: "yellow",
            title: "Uma categoria esta pesando demais no periodo",
            body: `${dominantCategory?.categoria || "A categoria dominante"} ja responde por ${formatPercentLabel(dominantCategory?.percentual || 0)} dos gastos do periodo atual.`,
          }
          : alerts.nearDailyLimit || alerts.aboveWeeklyAverage || alerts.outOfPattern
            ? {
              label: "Alertas preventivos",
              tone: alerts.aboveDailyLimit ? "red" : "yellow",
              title: "O momento pede mais atencao",
              body: [
                alerts.nearDailyLimit ? "o gasto de hoje esta perto do limite diario" : "",
                alerts.aboveWeeklyAverage ? "hoje passou da media recente" : "",
                alerts.outOfPattern ? "o comportamento saiu do padrao" : "",
              ]
                .filter(Boolean)
                .join(" e ")
                .replace(/^/, "Sinal preventivo: ")
                .concat("."),
            }
            : {
              label: "Alertas preventivos",
              tone: "green",
              title: "Sem alerta preventivo forte neste momento",
              body: "O gasto de hoje, o limite diario e o ritmo recente seguem em uma faixa mais controlada.",
            };

  const weeklyTrendInsight = weeklyTrend
    ? {
      label: "Padrao semanal",
      tone: weeklyTrend.percentual >= 35 ? "yellow" : "blue",
      title: `${weeklyTrend.weekday} costuma concentrar mais gasto`,
      body: `${formatCurrency(weeklyTrend.total)} sairam nesse dia da semana no historico recente, ou ${formatPercentLabel(weeklyTrend.percentual)} do total observado.`,
    }
    : {
      label: "Padrao semanal",
      tone: "muted",
      title: "Ainda nao existe um padrao semanal claro",
      body: "Com mais historico no ledger, o app passa a mostrar qual dia da semana pesa mais.",
    };

  const behaviorInsight = behavior.hasOutlierToday
    ? {
      label: "Fora do padrao",
      tone: "red",
      title: "Hoje ficou muito acima do comportamento normal",
      body: `${formatCurrency(comparison.todayTotal || 0)} hoje contra uma base recente de ${formatCurrency(behavior.outlierBaseline || 0)} por dia ativo.`,
    }
    : behavior.hasOutlierDay
      ? {
        label: "Fora do padrao",
        tone: "yellow",
        title: "Ja houve dia muito acima do normal no historico recente",
        body: `${formatDate(behavior.outlierDays[0]?.date)} puxou ${formatCurrency(behavior.outlierDays[0]?.total || 0)}, cerca de ${formatPercentLabel((behavior.outlierDays[0]?.ratioToAverage || 0) * 100)} da base esperada.`,
      }
      : behavior.acceleratedAtStartOfPeriod
        ? {
          label: "Fora do padrao",
          tone: "yellow",
          title: "Os gastos aceleraram logo no comeco do periodo",
          body: `Os primeiros ${behavior.leadingDays} dia(s) ja concentraram ${formatPercentLabel(behavior.leadingShare * 100)} do gasto do periodo, acima do esperado para esse ponto do ciclo.`,
        }
        : {
          label: "Fora do padrao",
          tone: "green",
          title: "O comportamento segue mais estavel no ledger",
          body: "Nao apareceu pico forte nem aceleracao anormal no periodo em foco.",
        };

  return [
    forecastInsight,
    categoryInsight,
    categoryVariationInsight,
    subcategoryInsight,
    recurringDescriptionInsight,
    comparisonInsight,
    preventiveInsight,
    weeklyTrendInsight,
    behaviorInsight,
    {
      label: automaticSummaries.day?.label || "Resumo do dia",
      tone: automaticSummaries.day?.tone || "muted",
      title: automaticSummaries.day?.title || "Sem resumo do dia",
      body: automaticSummaries.day?.body || "Adicione gastos para gerar um resumo automatico do dia.",
    },
    {
      label: automaticSummaries.week?.label || "Resumo da semana",
      tone: automaticSummaries.week?.tone || "muted",
      title: automaticSummaries.week?.title || "Sem resumo da semana",
      body: automaticSummaries.week?.body || "Adicione gastos para gerar um resumo automatico da semana.",
    },
    {
      label: automaticSummaries.month?.label || "Resumo do mes",
      tone: automaticSummaries.month?.tone || "muted",
      title: automaticSummaries.month?.title || "Sem resumo do mes",
      body: `${automaticSummaries.month?.body || "Adicione gastos para gerar um resumo automatico do mes."}${categoryAutomation?.rules?.length
          ? ` ${categoryAutomation.matchedEntries || 0} descricao(oes) ja combinam com ${categoryAutomation.rules.length} regra(s) de classificacao automatica.`
          : ""
        }`,
    },
  ];
}

function calculateFinancialIntelligence(data, period = "week", referenceDate = new Date()) {
  const summary = calcularResumoFinanceiro(data, referenceDate);
  const ledgerEntries = getLedgerExpenseEntries(data);
  const ledgerIncomes = getLedgerIncomeEntries(data);
  const ledgerSource = Array.isArray(data?.ledgerMovimentacoes) && data.ledgerMovimentacoes.length
    ? "ledger"
    : "contasDiaADia";
  const expenseOverview = getExpenseOverviewSummary(data, referenceDate);
  const selectedSummary = getExpensePeriodSummary(data, period, referenceDate);
  const recentWindow = getRecentLedgerWindowSummary(ledgerEntries, referenceDate, 21);
  const averageDailySpend = Number(recentWindow.averageDailySpend || 0);
  const estimatedDaysWithBalance =
    averageDailySpend > 0 ? summary.saldoDisponivel / averageDailySpend : Number.POSITIVE_INFINITY;
  const reachesNextPayment =
    summary.saldoDisponivel >= 0 &&
    (averageDailySpend <= 0 || estimatedDaysWithBalance >= summary.diasRestantes);
  const projectedBalanceAtPayment =
    averageDailySpend > 0
      ? summary.saldoDisponivel - averageDailySpend * Math.max(summary.diasRestantes, 0)
      : summary.saldoDisponivel;
  const estimatedDeficit = projectedBalanceAtPayment < 0 ? Math.abs(projectedBalanceAtPayment) : 0;
  const daysBeforeBalanceRunsOut =
    averageDailySpend > 0
      ? Math.max(summary.diasRestantes - estimatedDaysWithBalance, 0)
      : 0;
  const marginDays =
    averageDailySpend > 0 ? Math.max(estimatedDaysWithBalance - summary.diasRestantes, 0) : 0;
  const dominantCategory = selectedSummary.categorySeries[0] || null;
  const dominantCategoryPercent =
    dominantCategory && selectedSummary.totalGasto > 0
      ? (dominantCategory.total / selectedSummary.totalGasto) * 100
      : 0;
  const recentAverageDailySpend = Number(recentWindow.averageDailySpend || 0);
  const todayDifference = expenseOverview.today.totalGasto - recentAverageDailySpend;
  const comparisonThreshold =
    recentAverageDailySpend > 0 ? Math.max(recentAverageDailySpend * 0.1, 5) : 0;
  const comparisonStatus =
    recentAverageDailySpend <= 0
      ? "insufficient"
      : todayDifference > comparisonThreshold
        ? "above"
        : todayDifference < -comparisonThreshold
          ? "below"
          : "within";
  const comparisonIntensity =
    recentAverageDailySpend > 0 && todayDifference > recentAverageDailySpend * 0.35
      ? "forte"
      : "normal";
  const dailyLimitRatio =
    summary.limiteDiario > 0 ? expenseOverview.today.totalGasto / summary.limiteDiario : 0;
  const weeklyPattern = buildWeekdaySpendPattern(ledgerEntries, referenceDate, 56);
  const behavior = buildBehaviorPatternSignals(selectedSummary, recentWindow, referenceDate);
  const categoryAnalytics = buildCategoryAnalytics(ledgerEntries, selectedSummary, referenceDate);
  const recurringDescriptions = buildRecurringDescriptionAnalytics(ledgerEntries, selectedSummary);
  const classificationMatches = ledgerEntries.reduce(
    (accumulator, entry) => {
      const match = entry?.classificacaoAutomatica || classifyCategoryFromDescription(entry?.descricao);

      if (match) {
        accumulator.totalMatches += 1;
        accumulator.byCategory.set(
          match.categoria,
          (accumulator.byCategory.get(match.categoria) || 0) + 1
        );
        if (match.subcategoria) {
          const subcategoryKey = `${match.categoria}::${match.subcategoria}`;
          accumulator.bySubcategory.set(
            subcategoryKey,
            (accumulator.bySubcategory.get(subcategoryKey) || 0) + 1
          );
        }
      }

      return accumulator;
    },
    {
      totalMatches: 0,
      byCategory: new Map(),
      bySubcategory: new Map(),
    }
  );
  const alerts = {
    nearDailyLimit: dailyLimitRatio >= 0.7 && dailyLimitRatio <= 1,
    aboveDailyLimit: dailyLimitRatio > 1,
    aboveWeeklyAverage:
      recentAverageDailySpend > 0 &&
      expenseOverview.today.totalGasto > recentAverageDailySpend,
    riskBeforePayment:
      summary.paymentInfo.configured &&
      summary.diasRestantes > 0 &&
      averageDailySpend > 0 &&
      !reachesNextPayment,
    categoryPressure:
      dominantCategoryPercent >= 45 ||
      Number(categoryAnalytics?.categoryAboveRecentAverage?.variacaoMediaRecente?.percentChange || 0) >= 20,
    dailyLimitAndAboveAverage:
      dailyLimitRatio > 1 &&
      recentAverageDailySpend > 0 &&
      expenseOverview.today.totalGasto > recentAverageDailySpend,
    outOfPattern: behavior.hasOutlierDay || behavior.acceleratedAtStartOfPeriod,
    acceleratedStartOfPeriod: behavior.acceleratedAtStartOfPeriod,
  };

  const intelligence = {
    summary,
    expenseOverview,
    selectedSummary,
    ledger: {
      source: ledgerSource,
      totalMovements: ledgerEntries.length + ledgerIncomes.length,
      totalExpenses: ledgerEntries.length,
      totalIncomes: ledgerIncomes.length,
      recentWindow,
    },
    forecast: {
      averageDailySpend,
      estimatedDaysWithBalance,
      estimatedDaysWithBalanceLabel:
        estimatedDaysWithBalance === Number.POSITIVE_INFINITY
          ? "por tempo indeterminado"
          : `${Math.max(Math.round(estimatedDaysWithBalance), 1)} dia(s)`,
      reachesNextPayment,
      projectedBalanceAtPayment,
      estimatedDeficit,
      daysBeforeBalanceRunsOut,
      daysBeforeBalanceRunsOutLabel: `${Math.max(Math.ceil(daysBeforeBalanceRunsOut), 1)} dia(s)`,
      marginDays,
    },
    dominantCategory: dominantCategory
      ? {
        categoria: dominantCategory.categoria,
        total: dominantCategory.total,
        percentual: dominantCategoryPercent,
      }
      : null,
    comparison: {
      todayTotal: expenseOverview.today.totalGasto,
      recentAverageDailySpend,
      difference: todayDifference,
      status: comparisonStatus,
      intensity: comparisonIntensity,
      isAboveAverage: comparisonStatus === "above",
      isBelowAverage: comparisonStatus === "below",
      isWithinPattern: comparisonStatus === "within",
    },
    alerts,
    categoryAnalytics,
    recurringDescriptions,
    weeklyTrend: weeklyPattern.dominantDay
      ? {
        weekday: weeklyPattern.dominantDay.weekday,
        total: weeklyPattern.dominantDay.total,
        percentual: weeklyPattern.dominantDay.percentual,
        ocorrencias: weeklyPattern.dominantDay.ocorrencias,
        mediaPorOcorrencia: weeklyPattern.dominantDay.mediaPorOcorrencia,
      }
      : null,
    behavior,
    automaticSummaries: {
      day: buildAutomaticPeriodSummary(expenseOverview.today, "Resumo do dia", "Sem resumo do dia"),
      week: buildAutomaticPeriodSummary(expenseOverview.week, "Resumo da semana", "Sem resumo da semana"),
      month: buildAutomaticPeriodSummary(expenseOverview.month, "Resumo do mes", "Sem resumo do mes"),
    },
    categoryAutomation: {
      rules: getCategoryAutomationRules(),
      matchedEntries: classificationMatches.totalMatches,
      byCategory: [...classificationMatches.byCategory.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([categoria, total]) => ({
          categoria,
          total,
        })),
      bySubcategory: [...classificationMatches.bySubcategory.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([subcategoriaKey, total]) => {
          const [categoria, subcategoria] = subcategoriaKey.split("::");
          return {
            categoria,
            subcategoria,
            total,
          };
        }),
    },
  };

  return {
    ...intelligence,
    insightMessages: buildFinancialInsightMessages(intelligence),
  };
}

function agruparLancamentosPorData(lancamentos) {
  const grouped = new Map();

  const getSortStamp = (item) => {
    const normalizedDate =
      safeNormalizeDate(item?.dataHora || item?.dataNormalizada || item?.data) ||
      safeNormalizeDate(item?.dataNormalizada || item?.data);
    const time = normalizedDate?.getTime?.() || 0;
    const line = Number(item?.linha_origem || item?.line || item?.ordem || 0);
    return time * 1000 + line;
  };

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
    const tipo = normalizeMovementType(item.tipo, normalizedValue);

    if (tipo === "entrada") {
      currentGroup.entradas += rawValue;
      currentGroup.total += rawValue;
    } else {
      currentGroup.saidas += rawValue;
      currentGroup.total -= rawValue;
      const category = item.categoriaPrincipal || item.categoria || "outros";
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
        (left, right) => getSortStamp(left) - getSortStamp(right)
      ),
    };
  });
}

function agruparLancamentosPorDia(lancamentos) {
  return agruparLancamentosPorData(lancamentos);
}

function montarSerieGraficoContasVariaveis(data) {
  const lancamentos = getLedgerMovements(data);
  return agruparLancamentosPorData(lancamentos);
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
  const incomeEntries = getIncomeEntries(data);
  const expenses = getLedgerExpenseEntries(data);

  const totalDespesas = expenses.reduce((total, expense) => {
    const numericValue = Math.abs(normalizeNumericValue(expense?.valor));
    const normalizedDate = safeNormalizeDate(expense?.data || expense?.dataNormalizada);
    const hasValidDate = Boolean(normalizedDate);

    if (
      numericValue <= 0 ||
      !hasValidDate ||
      isBalanceSummaryDescription(expense?.descricao || expense?.nome || "")
    ) {
      return total;
    }

    if (paymentInfo?.cycleStart && paymentInfo?.cycleEnd) {
      if (!isWithinRange(normalizedDate, paymentInfo.cycleStart, paymentInfo.cycleEnd)) {
        return total;
      }
    }

    return total + numericValue;
  }, 0);

  const committedBreakdown = {
    despesasRegistradas: totalDespesas,
    contasFixas: 0,
    faturasCartao: 0,
    parcelamentos: 0,
  };
  const projectedBenefitsInSaldo = nextPaymentDate
    ? benefits.active.reduce((total, benefit) => {
      if (!benefit.contabilizarNoSaldo || !benefit.nextDate || benefit.status === "recebido") {
        return total;
      }

      if (benefit.nextDate.getTime() > nextPaymentDate.getTime()) {
        return total;
      }

      return total + Number(benefit.value || 0);
    }, 0)
    : 0;
  const projectedIncomeInSaldo = nextPaymentDate
    ? incomeEntries.reduce((total, income) => {
      if (!income?.dataPrevista || income.status === "recebido") {
        return total;
      }

      if (income.dataPrevista.getTime() > nextPaymentDate.getTime()) {
        return total;
      }

      return total + Number(income.valorPrevisto || income.valorRecebido || 0);
    }, 0)
    : incomeEntries.reduce(
      (total, income) =>
        income?.status === "recebido"
          ? total
          : total + Number(income.valorPrevisto || income.valorRecebido || 0),
      0
    );
  const valorComprometido =
    committedBreakdown.despesasRegistradas +
    committedBreakdown.contasFixas +
    committedBreakdown.faturasCartao +
    committedBreakdown.parcelamentos;
  const saldoDisponivel =
    saldoInicial + projectedBenefitsInSaldo + projectedIncomeInSaldo - valorComprometido;
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
    projectedIncomeInSaldo,
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
  const incomeEntries = getIncomeEntries(data);
  const benefitEntries = getBenefitEntries(data).filter((item) => item?.contabilizarNoSaldo !== false);

  const incomeByDate = new Map();
  incomeEntries.forEach((income) => {
    if (!income?.dataPrevista || income.status === "recebido") {
      return;
    }
    const key = safeNormalizeDate(income.dataPrevista)?.toISOString().slice(0, 10);
    if (!key) {
      return;
    }
    incomeByDate.set(key, (incomeByDate.get(key) || 0) + Number(income.valorPrevisto || income.valorRecebido || 0));
  });

  const benefitByDate = new Map();
  benefitEntries.forEach((benefit) => {
    if (!benefit?.nextDate || benefit.status === "recebido") {
      return;
    }
    const key = safeNormalizeDate(benefit.nextDate)?.toISOString().slice(0, 10);
    if (!key) {
      return;
    }
    benefitByDate.set(key, (benefitByDate.get(key) || 0) + Number(benefit.value || 0));
  });

  const horizon = Math.max(summary.diasRestantes, 30);
  for (let day = 0; day < horizon; day += 1) {
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
    const dailyIncome =
      incomeByDate.get(currentDate.toISOString().slice(0, 10)) || 0;
    const dailyBenefit =
      benefitByDate.get(currentDate.toISOString().slice(0, 10)) || 0;

    runningBalance += dailyIncome;
    runningBalance += dailyBenefit;
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
  return buildBalanceProjection(data, referenceDate);
}

function calcularValorPrevistoDoCiclo(data, referenceDate = new Date()) {
  return calcularProximoPagamento(data, referenceDate).value;
}

window.FinanceCalculations = {
  agruparLancamentosPorDia,
  agruparLancamentosPorData,
  buildBalanceProjection,
  buildSpendingRhythmDataset,
  getDashboardExpenseItems,
  getDespesasDoDia,
  getDespesasDaSemana,
  getDespesasDoMes,
  getDespesasPorPeriodo,
  montarProjecaoSaldoPorDia,
  calcularPrioridadesDoCiclo,
  calcularProximoPagamento,
  calcularResumoFinanceiro,
  calcularResumoDiario,
  calcularResumoDoDia,
  calcularValorPrevistoDoCiclo,
  calculateDashboardSummary: calcularResumoFinanceiro,
  calculateFinancialIntelligence,
  calculatePrimaryFinancialMetrics,
  buildCategoryAnalytics,
  buildFinancialInsightMessages,
  buildRecurringDescriptionAnalytics,
  classifyCategoryFromDescription,
  getExpenseOverviewSummary,
  getExpensePeriodSummary,
  getCategoryAutomationRules,
  getFinancialEntries,
  getLedgerExpenseEntries,
  getLedgerIncomeEntries,
  getLedgerMovements,
  getLedgerMovementItems,
  formatCurrency,
  formatDate,
  formatDateLong,
  formatTimeLabel,
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
  normalizeDashboardExpenseItem,
  normalizeDashboardExpenses,
  resolveMovementClassification,
  filtrarContasDoCicloAtual,
  montarSerieGrafico,
  montarSerieGraficoContasVariaveis,
  normalizeDate,
  prepareCategoryChartData,
  prepareDashboardChartData,
  prepareEvolutionChartData,
  prepareSummaryData,
  normalizeCategoryDescription,
  ordenarPendenciasPorPrioridade,
  groupExpensesByDay,
  groupExpensesByMonth,
  groupExpensesByWeek,
};
