function normalizeDate(value) {
  const date = new Date(value);

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
    return null;
  }
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

function getSortedPaymentDays(profile) {
  const totalDays = profile.tipoCiclo === "ciclo2" ? 2 : 1;
  const sourceDays = Array.isArray(profile.diasPagamento)
    ? profile.diasPagamento
    : [];

  return sourceDays
    .slice(0, totalDays)
    .map((day) => Number(day))
    .filter((day) => Number.isFinite(day) && day > 0)
    .sort((left, right) => left - right);
}

function getTotalDiscounts(profile) {
  return Object.values(profile.descontos || {}).reduce(
    (total, value) => total + Number(value || 0),
    0
  );
}

function getNetSalary(profile) {
  return Math.max(Number(profile.salarioBruto || 0) - getTotalDiscounts(profile), 0);
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

function hasReceiptOnDate(receipts, targetDate) {
  return receipts.some((receipt) => {
    const receiptDate = safeNormalizeDate(receipt.data);
    return receiptDate && areSameDay(receiptDate, targetDate);
  });
}

function getNextPaymentInfo(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const profile = data.banking || {};
  const paymentDays = getSortedPaymentDays(profile);
  const receipts = data.recebimentos?.pagamentos || [];

  if (!paymentDays.length || !Number(profile.salarioBruto || 0)) {
    return {
      configured: false,
      value: 0,
      nextDate: null,
      daysRemaining: 0,
      status: "pendente",
      cycleStart: today,
      cycleEnd: today,
      netSalary: getNetSalary(profile),
    };
  }

  const scheduledDates = buildScheduledDates(paymentDays, today);
  const nextDate =
    scheduledDates.find((date) => {
      if (date.getTime() > today.getTime()) {
        return true;
      }

      return areSameDay(date, today) && !hasReceiptOnDate(receipts, date);
    }) || null;

  const cycleEnd = nextDate || today;
  const cycleStart = [...scheduledDates]
    .reverse()
    .find((date) => date.getTime() < cycleEnd.getTime()) || today;

  const parcelas = profile.tipoCiclo === "ciclo2" ? 2 : 1;
  const value = getNetSalary(profile) / parcelas;
  const daysRemaining = nextDate ? Math.max(getDaysDifference(today, nextDate), 0) : 0;
  const status =
    nextDate && areSameDay(nextDate, today) ? "pendente hoje" : "pendente";

  return {
    configured: true,
    value,
    nextDate,
    daysRemaining,
    status,
    cycleStart,
    cycleEnd,
    netSalary: getNetSalary(profile),
  };
}

function getNextVrInfo(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const profile = data.banking || {};
  const receipts = data.recebimentos?.vr || [];

  if (!profile.recebeVr || !Number(profile.valorVr || 0) || !profile.dataVr) {
    return {
      configured: false,
      value: 0,
      nextDate: null,
      daysRemaining: 0,
      status: "inativo",
    };
  }

  const scheduledDates = buildScheduledDates([Number(profile.dataVr)], today);
  const nextDate =
    scheduledDates.find((date) => {
      if (date.getTime() > today.getTime()) {
        return true;
      }

      return areSameDay(date, today) && !hasReceiptOnDate(receipts, date);
    }) || null;

  return {
    configured: true,
    value: Number(profile.valorVr || 0),
    nextDate,
    daysRemaining: nextDate ? Math.max(getDaysDifference(today, nextDate), 0) : 0,
    status: nextDate && areSameDay(nextDate, today) ? "pendente hoje" : "pendente",
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
  const paymentInfo = getNextPaymentInfo(data, referenceDate);
  const today = normalizeDate(referenceDate);
  const cycleStart = paymentInfo.cycleStart;
  const cycleEnd = paymentInfo.cycleEnd;
  const accounts = data.contasFixas || [];

  const accountsInCycle = accounts
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
    items: accountsInCycle,
    total: accountsInCycle.reduce(
      (sum, conta) => sum + Number(conta.valor || 0),
      0
    ),
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
  const paymentInfo = getNextPaymentInfo(data, referenceDate);
  const cycleStart = paymentInfo.cycleStart;
  const cycleEnd = paymentInfo.cycleEnd;
  const cards = data.cartoes || [];
  const launches = data.lancamentosCartao || [];

  const summaryByCard = cards.map((card) => {
    const dueDate = getCardDueDate(card, referenceDate);
    const launchBill = launches
      .filter(
        (launch) =>
          launch.cartaoId === card.id &&
          launch.status !== "pago"
      )
      .reduce((sum, launch) => sum + Number(launch.valor || 0), 0);
    const currentBill = launchBill > 0 ? launchBill : Number(card.limiteUsado || 0);

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

  const itemsInCycle = summaryByCard.filter((card) => card.impactsCycle);

  return {
    items: itemsInCycle,
    total: itemsInCycle.reduce((sum, card) => sum + card.currentBill, 0),
    cards: summaryByCard,
  };
}

function getDailyExpensesSummary(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const paymentInfo = getNextPaymentInfo(data, today);
  const expenses = data.contasDiaADia || [];
  const inCycle = expenses.filter((expense) => {
    const expenseDate = safeNormalizeDate(expense.data);
    return (
      expenseDate &&
      isWithinRange(expenseDate, paymentInfo.cycleStart, paymentInfo.cycleEnd)
    );
  });

  const todayTotal = inCycle
    .filter((expense) => {
      const expenseDate = safeNormalizeDate(expense.data);
      return expenseDate && areSameDay(expenseDate, today);
    })
    .reduce((sum, expense) => sum + Number(expense.valor || 0), 0);

  return {
    items: inCycle,
    total: inCycle.reduce((sum, expense) => sum + Number(expense.valor || 0), 0),
    todayTotal,
  };
}

function getInvestmentSuggestion(data, referenceDate = new Date()) {
  const summary = calculateDashboardSummary(data, referenceDate);
  const percentage = Number(data.investimentos?.percentualSugerido || 10);
  const baseAmount = Math.max(summary.saldoDisponivel, 0);

  return {
    percentage,
    suggestedValue: (baseAmount * percentage) / 100,
  };
}

function calculateDashboardSummary(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const paymentInfo = getNextPaymentInfo(data, today);
  const vrInfo = getNextVrInfo(data, today);
  const accounts = getAccountsInCycle(data, today);
  const cards = getCardsSummary(data, today);
  const profile = data.banking || {};
  const dailyExpenses = getDailyExpensesSummary(data, today);
  const saldoAtual = Number(profile.saldoAtual || 0);

  const projectedVrValue =
    profile.usarVrComoSaldo &&
    vrInfo.configured &&
    vrInfo.nextDate &&
    paymentInfo.nextDate &&
    vrInfo.nextDate.getTime() <= paymentInfo.nextDate.getTime()
      ? Number(vrInfo.value || 0)
      : 0;

  const valorComprometido = accounts.total + cards.total;
  const saldoDisponivel = saldoAtual + projectedVrValue - valorComprometido;
  const diasRestantes = paymentInfo.daysRemaining;
  const limiteDiario =
    diasRestantes > 0 ? saldoDisponivel / diasRestantes : 0;

  return {
    saldoAtual,
    paymentInfo,
    vrInfo,
    accounts,
    cards,
    dailyExpenses,
    valorComprometido,
    saldoDisponivel,
    diasRestantes,
    limiteDiario,
    projectedVrValue,
    investimento: getInvestmentSuggestionRaw(data, saldoDisponivel),
  };
}

function getInvestmentSuggestionRaw(data, saldoDisponivel) {
  const percentage = Number(data.investimentos?.percentualSugerido || 10);
  return {
    percentage,
    suggestedValue: Math.max(saldoDisponivel, 0) * (percentage / 100),
  };
}

function buildBalanceProjection(data, referenceDate = new Date()) {
  const today = normalizeDate(referenceDate);
  const summary = calculateDashboardSummary(data, today);
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

    const plannedDailyExpenses = summary.dailyExpenses.items
      .filter((expense) => {
        const expenseDate = safeNormalizeDate(expense.data);
        return expenseDate && areSameDay(expenseDate, currentDate);
      })
      .reduce((sum, expense) => sum + Number(expense.valor || 0), 0);

    const vrCredit =
      summary.projectedVrValue > 0 &&
      summary.vrInfo.nextDate &&
      areSameDay(summary.vrInfo.nextDate, currentDate)
        ? summary.vrInfo.value
        : 0;

    runningBalance -= dueAccounts;
    runningBalance -= dueCards;
    runningBalance -= plannedDailyExpenses;
    runningBalance += vrCredit;

    projection.push({
      date: currentDate,
      label: formatDate(currentDate),
      balance: runningBalance,
    });
  }

  return projection;
}

window.FinanceCalculations = {
  buildBalanceProjection,
  calculateDashboardSummary,
  formatCurrency,
  formatDate,
  formatDateLong,
  getAccountsInCycle,
  getCardsSummary,
  getDailyExpensesSummary,
  getInvestmentSuggestion,
  getNetSalary,
  getNextPaymentInfo,
  getNextVrInfo,
  getTotalDiscounts,
  normalizeDate,
};
