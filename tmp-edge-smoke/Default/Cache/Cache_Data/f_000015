(function () {
  const PROFILES_TABLE = "mf_finance_profiles";
  const LEDGER_TABLE = "mf_finance_ledger_entries";
  const EXPENSES_TABLE = "mf_finance_expenses";
  const FIXED_BILLS_TABLE = "mf_finance_fixed_bills";
  const CARDS_TABLE = "mf_finance_cards";
  const CARD_EXPENSES_TABLE = "mf_finance_card_expenses";
  const INSTALLMENTS_TABLE = "mf_finance_installments";
  const INCOMES_TABLE = "mf_finance_incomes";
  const BENEFITS_TABLE = "mf_finance_benefits";
  const REMOTE_SOURCE = "supabase-remote";
  const SYNC_DEBOUNCE_MS = 400;

  let hasHydratedRemoteState = false;
  let isApplyingRemoteState = false;
  let hydrationPromise = null;
  let syncTimer = null;
  let syncPromise = null;

  function normalizeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeDateForDatabase(value) {
    if (!value) {
      return null;
    }

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().slice(0, 10);
  }

  function normalizeText(value, fallback = "") {
    return String(value ?? fallback).trim();
  }

  function normalizeBoolean(value, fallback = false) {
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

    return Boolean(value ?? fallback);
  }

  function normalizeBenefitTypeKey(value) {
    const normalizedType = normalizeText(value).toLowerCase();

    if (!normalizedType) {
      return "beneficio";
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

  function normalizeIncomeStatus(value) {
    const normalizedStatus = normalizeText(value, "pendente").toLowerCase();
    return normalizedStatus || "pendente";
  }

  function sortItemsByDate(items, getDateValue, ascending = true) {
    return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
      const leftDate = normalizeDateForDatabase(getDateValue(left)) || "";
      const rightDate = normalizeDateForDatabase(getDateValue(right)) || "";

      if (leftDate === rightDate) {
        return 0;
      }

      return ascending
        ? leftDate.localeCompare(rightDate)
        : rightDate.localeCompare(leftDate);
    });
  }

  function getIncomePriority(item) {
    const type = normalizeText(item?.tipo).toLowerCase();

    if (/(pagamento|salario|salário|principal)/.test(type)) {
      return 0;
    }

    if (/(adiantamento|vale)/.test(type)) {
      return 1;
    }

    return 2;
  }

  function buildReceiptCompatibilityState(baseReceipts = {}, incomeItems, benefitItems) {
    const incomeList = sortItemsByDate(
      Array.isArray(incomeItems)
        ? incomeItems
        : Array.isArray(baseReceipts.lista)
          ? baseReceipts.lista
          : [],
      (item) => item?.dataPrevista,
      true
    );
    const benefitList = sortItemsByDate(
      Array.isArray(benefitItems)
        ? benefitItems
        : Array.isArray(baseReceipts?.beneficios?.lista)
          ? baseReceipts.beneficios.lista
          : [],
      (item) => item?.dataRecebimento,
      true
    );
    const today = normalizeDateForDatabase(new Date());
    const principalIncomes = incomeList
      .filter((item) => item?.dataPrevista && normalizeNumber(item?.valorPrevisto || item?.valorRecebido) > 0)
      .sort((left, right) => {
        const dateCompare = normalizeDateForDatabase(left?.dataPrevista).localeCompare(
          normalizeDateForDatabase(right?.dataPrevista)
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return getIncomePriority(left) - getIncomePriority(right);
      });
    const nextIncome =
      principalIncomes.find((item) => {
        const incomeDate = normalizeDateForDatabase(item?.dataPrevista);
        return incomeDate && incomeDate >= today && normalizeIncomeStatus(item?.status) !== "recebido";
      }) ||
      principalIncomes.find((item) => normalizeIncomeStatus(item?.status) !== "recebido") ||
      [...principalIncomes].reverse().find(Boolean) ||
      null;
    const groupedBenefits = benefitList.reduce((accumulator, item) => {
      const benefitKey = normalizeBenefitTypeKey(item?.tipo);

      if (!accumulator[benefitKey]) {
        accumulator[benefitKey] = [];
      }

      accumulator[benefitKey].push(item);
      return accumulator;
    }, {});
    const nextBenefits = Object.entries(groupedBenefits).reduce((accumulator, [benefitKey, items]) => {
      const orderedItems = sortItemsByDate(items, (item) => item?.dataRecebimento, true);
      const nextItem =
        orderedItems.find((item) => {
          const itemDate = normalizeDateForDatabase(item?.dataRecebimento);
          return (
            normalizeBoolean(item?.ativo, true) &&
            itemDate &&
            itemDate >= today &&
            normalizeText(item?.status, "pendente").toLowerCase() !== "recebido"
          );
        }) ||
        orderedItems.find((item) => normalizeBoolean(item?.ativo, true)) ||
        [...orderedItems].reverse().find(Boolean) ||
        null;

      if (nextItem) {
        accumulator[benefitKey] = {
          sourceId: nextItem.id || "",
          tipo: nextItem.tipo || benefitKey,
          descricao: nextItem.descricao || "",
          dataPrevista: nextItem.dataRecebimento || "",
          valorPrevisto: normalizeNumber(nextItem.valor),
          valorRecebido:
            normalizeText(nextItem.status).toLowerCase() === "recebido"
              ? normalizeNumber(nextItem.valor)
              : 0,
          status: nextItem.status || (normalizeBoolean(nextItem.ativo, true) ? "pendente" : "inativo"),
          contabilizarNoSaldo: normalizeBoolean(nextItem.contabilizarNoSaldo, false),
          ativo: normalizeBoolean(nextItem.ativo, true),
          atualizadoEm: nextItem.updated_at || "",
        };
      }

      return accumulator;
    }, {});

    return {
      ...(baseReceipts || {}),
      lista: incomeList,
      pagamento: nextIncome
        ? {
            ...(baseReceipts?.pagamento || {}),
            sourceId: nextIncome.id || "",
            tipo: nextIncome.tipo || "pagamento",
            descricao: nextIncome.descricao || "",
            dataPrevista: nextIncome.dataPrevista || "",
            valorPrevisto: normalizeNumber(nextIncome.valorPrevisto),
            valorRecebido: normalizeNumber(nextIncome.valorRecebido),
            status: nextIncome.status || "pendente",
            atualizadoEm: nextIncome.updated_at || "",
          }
        : {
            ...(baseReceipts?.pagamento || {}),
          },
      beneficios: {
        ...(baseReceipts?.beneficios || {}),
        lista: benefitList,
        ...(baseReceipts?.beneficios || {}),
        ...nextBenefits,
      },
      historico: {
        ...(baseReceipts?.historico || {}),
        pagamentos: principalIncomes,
        beneficios: {
          ...(baseReceipts?.historico?.beneficios || {}),
          ...Object.entries(groupedBenefits).reduce((accumulator, [benefitKey, items]) => {
            accumulator[benefitKey] = sortItemsByDate(items, (item) => item?.dataRecebimento, false).map(
              (item) => ({
                sourceId: item.id || "",
                tipo: item.tipo || benefitKey,
                descricao: item.descricao || "",
                dataPrevista: item.dataRecebimento || "",
                valorPrevisto: normalizeNumber(item.valor),
                valorRecebido:
                  normalizeText(item.status).toLowerCase() === "recebido"
                    ? normalizeNumber(item.valor)
                    : 0,
                status: item.status || (normalizeBoolean(item.ativo, true) ? "pendente" : "inativo"),
                contabilizarNoSaldo: normalizeBoolean(item.contabilizarNoSaldo, false),
                ativo: normalizeBoolean(item.ativo, true),
                atualizadoEm: item.updated_at || "",
              })
            );
            return accumulator;
          }, {}),
        },
      },
    };
  }

  async function getSupabaseClient() {
    if (window.SupabaseClient) {
      return window.SupabaseClient;
    }

    if (window.__supabaseReady) {
      return window.__supabaseReady;
    }

    throw new Error("Cliente do Supabase nao foi inicializado.");
  }

  async function getAuthenticatedUser() {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return data?.user || null;
  }

  async function getAuthenticatedUserId() {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      throw new Error("Usuario autenticado nao encontrado no Supabase.");
    }

    return user.id;
  }

  function buildProfilePayload(userId, appData) {
    const summary = window.FinanceCalculations.calculateDashboardSummary(appData);
    const sessionUser = window.AuthSession?.getAuthSession?.()?.user || {};
    const profileData = {
      ...(appData.profile || {}),
      nome: appData.profile?.nome || sessionUser.nome || "",
      email: appData.profile?.email || sessionUser.email || "",
    };
    const nextPaymentDate =
      appData.recebimentos?.pagamento?.dataPrevista || summary.paymentInfo?.nextDate;
    const nextPaymentValue =
      appData.recebimentos?.pagamento?.valorPrevisto || summary.paymentInfo?.value;

    return {
      user_id: userId,
      profile_data: profileData,
      banking_data: appData.banking || {},
      recebimentos_data: appData.recebimentos || {},
      investimentos_data: appData.investimentos || {},
      saldo_inicial: normalizeNumber(appData.banking?.saldoAtual),
      proximo_pagamento_data: normalizeDateForDatabase(nextPaymentDate),
      proximo_pagamento_valor: normalizeNumber(nextPaymentValue),
      valor_comprometido: normalizeNumber(summary.valor_comprometido),
      saldo_disponivel: normalizeNumber(summary.saldo_disponivel),
      saldo_restante: normalizeNumber(summary.saldo_restante),
      dias_restantes: normalizeNumber(summary.dias_restantes),
      limite_diario: normalizeNumber(summary.limite_diario),
      updated_at: new Date().toISOString(),
    };
  }

  function buildCalculatedAppData(appData) {
    const summary = window.FinanceCalculations.calculateDashboardSummary(appData);

    return {
      ...appData,
      resumoFinanceiro: {
        ...(appData?.resumoFinanceiro || {}),
        valor_comprometido: normalizeNumber(summary.valor_comprometido),
        saldo_disponivel: normalizeNumber(summary.saldo_disponivel),
        saldo_restante: normalizeNumber(summary.saldo_restante),
        dias_restantes: normalizeNumber(summary.dias_restantes),
        limite_diario: normalizeNumber(summary.limite_diario),
        total_despesas: normalizeNumber(summary.totalDespesas),
        updated_at: new Date().toISOString(),
      },
    };
  }

  function isImportedLedgerOrigin(value) {
    return ["importado", "extrato_importado", "extrato_importado_excel"].includes(
      normalizeText(value).toLowerCase()
    );
  }

  function mapLedgerRowToLocal(row) {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

    return {
      ...metadata,
      id: row.external_id || metadata.id || row.id,
      user_id: row.user_id || metadata.user_id || "",
      data: row.data || metadata.data || "",
      descricao: row.descricao || metadata.descricao || "Movimentacao",
      valor: normalizeNumber(row.valor),
      categoria: row.categoria || metadata.categoria || "outros",
      tipo: row.tipo || metadata.tipo || "saida",
      origem: row.origem || metadata.origem || "extrato_importado",
      external_id: row.external_id || metadata.external_id || "",
      arquivo_origem: row.arquivo_origem || metadata.arquivo_origem || null,
      linha_origem:
        row.linha_origem !== null && row.linha_origem !== undefined
          ? Number(row.linha_origem)
          : metadata.linha_origem ?? null,
      status_importacao: row.status_importacao || metadata.status_importacao || "valida",
      motivo_rejeicao: row.motivo_rejeicao || metadata.motivo_rejeicao || "",
      updated_at: row.updated_at || metadata.updated_at || "",
    };
  }

  function deriveDailyExpensesFromLedgerItems(ledgerItems) {
    return (Array.isArray(ledgerItems) ? ledgerItems : [])
      .map((item) => mapLedgerRowToLocal(item))
      .filter(
        (item) =>
          item.status_importacao === "valida" &&
          item.tipo === "saida" &&
          normalizeNumber(item.valor) > 0 &&
          normalizeDateForDatabase(item.data)
      )
      .map((item) => ({
        ...item,
        id: item.external_id || item.id,
        valor: normalizeNumber(item.valor),
        tipo: "saida",
        origem: item.origem || "extrato_importado",
      }));
  }

  function buildLedgerRow(userId, movementData) {
    const externalId = resolveExpenseExternalId(userId, movementData);
    const normalizedDate = normalizeDateForDatabase(movementData?.data || movementData?.dataNormalizada);

    return {
      user_id: userId,
      external_id: externalId,
      descricao: normalizeText(movementData?.descricao, "Movimentacao") || "Movimentacao",
      categoria: normalizeText(movementData?.categoria, "outros") || "outros",
      valor: normalizeNumber(movementData?.valor),
      data: normalizedDate,
      tipo: normalizeExpenseType(movementData?.tipo, "saida"),
      origem: normalizeText(movementData?.origem, "extrato_importado") || "extrato_importado",
      arquivo_origem: normalizeText(movementData?.arquivo_origem || "") || null,
      linha_origem:
        movementData?.linha_origem !== null && movementData?.linha_origem !== undefined
          ? Number(movementData.linha_origem)
          : null,
      status_importacao: normalizeText(movementData?.status_importacao, "valida") || "valida",
      motivo_rejeicao: normalizeText(movementData?.motivo_rejeicao || "") || null,
      metadata: {
        ...movementData,
        id: externalId,
        external_id: externalId,
        data: normalizedDate,
        valor: normalizeNumber(movementData?.valor),
        categoria: normalizeText(movementData?.categoria, "outros") || "outros",
        tipo: normalizeExpenseType(movementData?.tipo, "saida"),
        origem: normalizeText(movementData?.origem, "extrato_importado") || "extrato_importado",
        arquivo_origem: normalizeText(movementData?.arquivo_origem || "") || null,
        linha_origem:
          movementData?.linha_origem !== null && movementData?.linha_origem !== undefined
            ? Number(movementData.linha_origem)
            : null,
        status_importacao: normalizeText(movementData?.status_importacao, "valida") || "valida",
      },
      updated_at: new Date().toISOString(),
    };
  }

  function buildLocalDataFromRemote(
    profileRow,
    ledgerRows,
    expenseRows,
    fixedBillRows,
    cardRows,
    cardExpenseRows,
    installmentRows,
    incomeRows,
    benefitRows
  ) {
    const profileData = mapProfileRowToLocal(profileRow);
    const receiptsData = buildReceiptCompatibilityState(
      profileData?.recebimentos || {},
      Array.isArray(incomeRows) ? incomeRows.map(mapIncomeRowToLocal) : null,
      Array.isArray(benefitRows) ? benefitRows.map(mapBenefitRowToLocal) : null
    );
    const { ledgerItems: localLedger } = resolveAuthoritativeLedgerLocalRows(
      ledgerRows,
      expenseRows,
      "buildLocalDataFromRemote"
    );
    const localExpenses = Array.isArray(expenseRows) ? expenseRows.map(mapExpenseRowToLocal) : [];
    const derivedLedgerExpenses = deriveDailyExpensesFromLedgerItems(localLedger);
    const nextDailyExpenses = localLedger.length ? derivedLedgerExpenses : localExpenses;

    return {
      ...window.FinanceStore.getDefaultAppData(),
      ...(profileData ? {
        profile: profileData.profile,
        banking: profileData.banking,
        investimentos: profileData.investimentos,
        resumoFinanceiro: profileData.resumoFinanceiro,
      } : {}),
      recebimentos: receiptsData,
      parcelamentos: Array.isArray(installmentRows)
        ? installmentRows.map(mapInstallmentRowToLocal)
        : [],
      cartoes: Array.isArray(cardRows) ? cardRows.map(mapCardRowToLocal) : [],
      lancamentosCartao: Array.isArray(cardExpenseRows)
        ? cardExpenseRows.map(mapCardExpenseRowToLocal)
        : [],
      contasFixas: Array.isArray(fixedBillRows) ? fixedBillRows.map(mapFixedBillRowToLocal) : [],
      ledgerMovimentacoes: localLedger,
      contasDiaADia: nextDailyExpenses,
    };
  }

  function mapProfileRowToLocal(profileRow) {
    if (!profileRow) {
      return null;
    }

    const profileData =
      profileRow.profile_data && typeof profileRow.profile_data === "object"
        ? profileRow.profile_data
        : {};
    const bankingData =
      profileRow.banking_data && typeof profileRow.banking_data === "object"
        ? profileRow.banking_data
        : {};
    const receiptsData =
      profileRow.recebimentos_data && typeof profileRow.recebimentos_data === "object"
        ? profileRow.recebimentos_data
        : {};
    const investmentsData =
      profileRow.investimentos_data && typeof profileRow.investimentos_data === "object"
        ? profileRow.investimentos_data
        : {};
    const normalizedReceipts = buildReceiptCompatibilityState(receiptsData);

    return {
      profile: profileData,
      banking: {
        ...bankingData,
        saldoAtual:
          bankingData.saldoAtual !== undefined
            ? bankingData.saldoAtual
            : normalizeNumber(profileRow.saldo_inicial),
      },
      recebimentos: {
        ...normalizedReceipts,
        pagamento: {
          ...(normalizedReceipts.pagamento || {}),
          dataPrevista:
            normalizedReceipts.pagamento?.dataPrevista ||
            normalizeDateForDatabase(profileRow.proximo_pagamento_data) ||
            "",
          valorPrevisto:
            normalizedReceipts.pagamento?.valorPrevisto !== undefined
              ? normalizedReceipts.pagamento.valorPrevisto
              : normalizeNumber(profileRow.proximo_pagamento_valor),
        },
      },
      investimentos: investmentsData,
      resumoFinanceiro: {
        valor_comprometido: normalizeNumber(profileRow.valor_comprometido),
        saldo_disponivel: normalizeNumber(profileRow.saldo_disponivel),
        saldo_restante: normalizeNumber(profileRow.saldo_restante),
        dias_restantes: normalizeNumber(profileRow.dias_restantes),
        limite_diario: normalizeNumber(profileRow.limite_diario),
      },
      rawProfileRow: profileRow,
    };
  }

  function mapIncomeRowToLocal(row) {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

    return {
      ...metadata,
      id: row.id || metadata.id,
      tipo: row.tipo || metadata.tipo || "pagamento",
      descricao: row.descricao || metadata.descricao || "Recebimento",
      valorPrevisto: normalizeNumber(row.valor_previsto ?? metadata.valorPrevisto),
      valorRecebido: normalizeNumber(row.valor_recebido ?? metadata.valorRecebido),
      dataPrevista: row.data_prevista || metadata.dataPrevista || "",
      status: row.status || metadata.status || "pendente",
      updated_at: row.updated_at || metadata.updated_at || "",
    };
  }

  function buildIncomeRow(userId, incomeData) {
    const incomeId = String(
      incomeData?.id || window.FinanceStore?.createId?.("recebimento") || ""
    ).trim();
    const normalizedDate = normalizeDateForDatabase(incomeData?.dataPrevista || incomeData?.data_prevista);
    const expectedValue = normalizeNumber(incomeData?.valorPrevisto || incomeData?.valor_previsto);
    const receivedValue = normalizeNumber(incomeData?.valorRecebido || incomeData?.valor_recebido);

    return {
      id: incomeId,
      user_id: userId,
      tipo: normalizeText(incomeData?.tipo, "pagamento") || "pagamento",
      descricao: normalizeText(incomeData?.descricao, "Recebimento") || "Recebimento",
      valor_previsto: expectedValue || receivedValue,
      valor_recebido: receivedValue,
      data_prevista: normalizedDate,
      status: normalizeIncomeStatus(incomeData?.status),
      metadata: {
        ...incomeData,
        id: incomeId,
        dataPrevista: normalizedDate,
        valorPrevisto: expectedValue || receivedValue,
        valorRecebido: receivedValue,
        status: normalizeIncomeStatus(incomeData?.status),
      },
      updated_at: new Date().toISOString(),
    };
  }

  function buildIncomeRows(userId, appData) {
    const incomeItems = Array.isArray(appData?.recebimentos?.lista)
      ? appData.recebimentos.lista
      : appData?.recebimentos?.pagamento?.dataPrevista
        ? [
            {
              id: appData.recebimentos.pagamento.sourceId || appData.recebimentos.pagamento.id || "legacy_pagamento",
              tipo: appData.recebimentos.pagamento.tipo || "pagamento",
              descricao: appData.recebimentos.pagamento.descricao || "Recebimento principal",
              valorPrevisto: appData.recebimentos.pagamento.valorPrevisto,
              valorRecebido: appData.recebimentos.pagamento.valorRecebido,
              dataPrevista: appData.recebimentos.pagamento.dataPrevista,
              status: appData.recebimentos.pagamento.status || "pendente",
            },
          ]
        : [];

    return incomeItems
      .map((item) => buildIncomeRow(userId, item))
      .filter(
        (item) =>
          item.id &&
          item.descricao &&
          Math.max(item.valor_previsto, item.valor_recebido) > 0 &&
          item.data_prevista
      );
  }

  function mapBenefitRowToLocal(row) {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

    return {
      ...metadata,
      id: row.id || metadata.id,
      tipo: row.tipo || metadata.tipo || "vrVa",
      descricao: metadata.descricao || row.tipo || "Beneficio",
      valor: normalizeNumber(row.valor ?? metadata.valor),
      dataRecebimento: row.data_recebimento || metadata.dataRecebimento || "",
      ativo:
        row.ativo !== null && row.ativo !== undefined
          ? Boolean(row.ativo)
          : normalizeBoolean(metadata.ativo, true),
      contabilizarNoSaldo:
        row.contabilizar_no_saldo !== null && row.contabilizar_no_saldo !== undefined
          ? Boolean(row.contabilizar_no_saldo)
          : normalizeBoolean(metadata.contabilizarNoSaldo, false),
      status: metadata.status || (Boolean(row.ativo) ? "pendente" : "inativo"),
      updated_at: row.updated_at || metadata.updated_at || "",
    };
  }

  function buildBenefitRow(userId, benefitData) {
    const benefitId = String(
      benefitData?.id || window.FinanceStore?.createId?.("beneficio") || ""
    ).trim();
    const normalizedDate = normalizeDateForDatabase(
      benefitData?.dataRecebimento || benefitData?.data_recebimento
    );

    return {
      id: benefitId,
      user_id: userId,
      tipo: normalizeText(benefitData?.tipo, "vrVa") || "vrVa",
      valor: normalizeNumber(benefitData?.valor),
      data_recebimento: normalizedDate,
      ativo: normalizeBoolean(benefitData?.ativo, true),
      contabilizar_no_saldo: normalizeBoolean(
        benefitData?.contabilizarNoSaldo ?? benefitData?.contabilizar_no_saldo,
        false
      ),
      metadata: {
        ...benefitData,
        id: benefitId,
        dataRecebimento: normalizedDate,
        valor: normalizeNumber(benefitData?.valor),
        ativo: normalizeBoolean(benefitData?.ativo, true),
        contabilizarNoSaldo: normalizeBoolean(
          benefitData?.contabilizarNoSaldo ?? benefitData?.contabilizar_no_saldo,
          false
        ),
        status: normalizeText(benefitData?.status, normalizeBoolean(benefitData?.ativo, true) ? "pendente" : "inativo"),
      },
      updated_at: new Date().toISOString(),
    };
  }

  function buildBenefitRows(userId, appData) {
    const benefitItems = Array.isArray(appData?.recebimentos?.beneficios?.lista)
      ? appData.recebimentos.beneficios.lista
      : appData?.recebimentos?.beneficios?.vrVa?.dataPrevista
        ? [
            {
              id:
                appData.recebimentos.beneficios.vrVa.sourceId ||
                appData.recebimentos.beneficios.vrVa.id ||
                "legacy_benefit_vrva",
              tipo: appData.recebimentos.beneficios.vrVa.tipo || "vrVa",
              descricao: appData.recebimentos.beneficios.vrVa.descricao || "VR/VA",
              valor:
                appData.recebimentos.beneficios.vrVa.valorPrevisto ||
                appData.recebimentos.beneficios.vrVa.valor ||
                0,
              dataRecebimento:
                appData.recebimentos.beneficios.vrVa.dataPrevista ||
                appData.recebimentos.beneficios.vrVa.dataRecebimento,
              ativo: appData.recebimentos.beneficios.vrVa.ativo !== false,
              contabilizarNoSaldo: Boolean(appData.recebimentos.beneficios.vrVa.contabilizarNoSaldo),
              status: appData.recebimentos.beneficios.vrVa.status || "pendente",
            },
          ]
        : [];

    return benefitItems
      .map((item) => buildBenefitRow(userId, item))
      .filter((item) => item.id && item.tipo && item.valor > 0 && item.data_recebimento);
  }

  function mapExpenseRowToLocal(row) {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

    return {
      ...metadata,
      id: row.external_id || metadata.id,
      descricao: row.descricao || metadata.descricao || "Lancamento",
      categoria: row.categoria || metadata.categoria || "outros",
      valor: normalizeNumber(row.valor),
      data: row.data || metadata.data || "",
      tipo: row.tipo || metadata.tipo || "saida",
      origem: row.origem || metadata.origem || "manual",
    };
  }

  function mapFixedBillRowToLocal(row) {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

    return {
      ...metadata,
      id: row.id || metadata.id,
      nome: row.nome || metadata.nome || "Conta fixa",
      valor: normalizeNumber(row.valor),
      dataVencimento: row.vencimento || metadata.dataVencimento || "",
      categoria: row.categoria || metadata.categoria || "",
      recorrente: Boolean(row.recorrente),
      status: row.status_pagamento || metadata.status || "pendente",
      pagaEm: metadata.pagaEm || null,
      ultimaQuitacao: metadata.ultimaQuitacao || null,
    };
  }

  function buildFixedBillRow(userId, fixedBillData) {
    const fixedBillId = String(
      fixedBillData?.id || window.FinanceStore?.createId?.("conta") || ""
    ).trim();
    const normalizedDueDate = normalizeDateForDatabase(
      fixedBillData?.vencimento || fixedBillData?.dataVencimento
    );

    return {
      id: fixedBillId,
      user_id: userId,
      nome: String(fixedBillData?.nome || "").trim(),
      valor: normalizeNumber(fixedBillData?.valor),
      vencimento: normalizedDueDate,
      categoria: String(fixedBillData?.categoria || "").trim() || null,
      recorrente: Boolean(fixedBillData?.recorrente),
      status_pagamento: fixedBillData?.status_pagamento || fixedBillData?.status || "pendente",
      metadata: {
        ...fixedBillData,
        id: fixedBillId,
        dataVencimento: normalizedDueDate,
        status: fixedBillData?.status_pagamento || fixedBillData?.status || "pendente",
        valor: normalizeNumber(fixedBillData?.valor),
        recorrente: Boolean(fixedBillData?.recorrente),
      },
      updated_at: new Date().toISOString(),
    };
  }

  function buildFixedBillRows(userId, appData) {
    return (Array.isArray(appData.contasFixas) ? appData.contasFixas : [])
      .map((item) => buildFixedBillRow(userId, item))
      .filter((item) => item.id && item.nome && item.valor > 0 && item.vencimento);
  }

  function mapCardRowToLocal(row) {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

    return {
      ...metadata,
      id: row.id || metadata.id,
      nome: row.nome || metadata.nome || "Cartao",
      tipo: metadata.tipo || "credito",
      limite: normalizeNumber(row.limite),
      limiteUsado: normalizeNumber(row.limite_usado),
      dataFechamento:
        row.data_fechamento !== null && row.data_fechamento !== undefined
          ? Number(row.data_fechamento)
          : Number(metadata.dataFechamento || 0),
      dataVencimento:
        row.data_vencimento !== null && row.data_vencimento !== undefined
          ? Number(row.data_vencimento)
          : Number(metadata.dataVencimento || 0),
    };
  }

  function buildCardRow(userId, cardData) {
    const cardId = String(cardData?.id || window.FinanceStore?.createId?.("cartao") || "").trim();

    return {
      id: cardId,
      user_id: userId,
      nome: String(cardData?.nome || "").trim(),
      limite: normalizeNumber(cardData?.limite),
      limite_usado: normalizeNumber(cardData?.limiteUsado),
      data_fechamento:
        cardData?.dataFechamento !== "" && cardData?.dataFechamento !== undefined
          ? Number(cardData.dataFechamento)
          : null,
      data_vencimento: Number(cardData?.dataVencimento || 0),
      metadata: {
        ...cardData,
        id: cardId,
        limite: normalizeNumber(cardData?.limite),
        limiteUsado: normalizeNumber(cardData?.limiteUsado),
      },
      updated_at: new Date().toISOString(),
    };
  }

  function buildCardRows(userId, appData) {
    return (Array.isArray(appData.cartoes) ? appData.cartoes : [])
      .map((item) => buildCardRow(userId, item))
      .filter((item) => item.id && item.nome && item.data_vencimento > 0);
  }

  function replaceLocalCards(cards, source = REMOTE_SOURCE) {
    const localData = window.FinanceStore.loadAppData();

    return window.FinanceStore.replaceAppData(
      {
        ...localData,
        cartoes: Array.isArray(cards) ? cards.map(mapCardRowToLocal) : [],
      },
      source
    );
  }

  function mapCardExpenseRowToLocal(row) {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

    return {
      ...metadata,
      id: row.id || metadata.id,
      cartaoId: row.cartao_id || metadata.cartaoId || "",
      descricao: row.descricao || metadata.descricao || "Lancamento da fatura",
      valor: normalizeNumber(row.valor),
      data: row.data || metadata.data || "",
      categoria: row.categoria || metadata.categoria || "",
      status: row.status_pagamento || metadata.status || "pendente",
    };
  }

  function buildCardExpenseRow(userId, cardExpenseData) {
    const expenseId = String(
      cardExpenseData?.id || window.FinanceStore?.createId?.("lancamento") || ""
    ).trim();
    const normalizedDate = normalizeDateForDatabase(cardExpenseData?.data);

    return {
      id: expenseId,
      user_id: userId,
      cartao_id: String(cardExpenseData?.cartaoId || cardExpenseData?.cartao_id || "").trim(),
      descricao: String(cardExpenseData?.descricao || "").trim(),
      valor: normalizeNumber(cardExpenseData?.valor),
      data: normalizedDate,
      categoria: String(cardExpenseData?.categoria || "").trim() || null,
      status_pagamento: cardExpenseData?.status_pagamento || cardExpenseData?.status || "pendente",
      metadata: {
        ...cardExpenseData,
        id: expenseId,
        cartaoId: String(cardExpenseData?.cartaoId || cardExpenseData?.cartao_id || "").trim(),
        data: normalizedDate,
        valor: normalizeNumber(cardExpenseData?.valor),
      },
      updated_at: new Date().toISOString(),
    };
  }

  function buildCardExpenseRows(userId, appData) {
    return (Array.isArray(appData.lancamentosCartao) ? appData.lancamentosCartao : [])
      .map((item) => buildCardExpenseRow(userId, item))
      .filter((item) => item.id && item.cartao_id && item.descricao && item.valor > 0 && item.data);
  }

  function replaceLocalCardExpenses(cardExpenses, source = REMOTE_SOURCE) {
    const localData = window.FinanceStore.loadAppData();

    return window.FinanceStore.replaceAppData(
      {
        ...localData,
        lancamentosCartao: Array.isArray(cardExpenses)
          ? cardExpenses.map(mapCardExpenseRowToLocal)
          : [],
      },
      source
    );
  }

  function mapInstallmentRowToLocal(row) {
    const metadata =
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

    return {
      ...metadata,
      id: row.id || metadata.id,
      nome: row.nome || metadata.nome || "Parcelamento",
      valorTotal: normalizeNumber(row.valor_total),
      parcelas:
        row.quantidade_parcelas !== null && row.quantidade_parcelas !== undefined
          ? Number(row.quantidade_parcelas)
          : Number(metadata.parcelas || 0),
      valorParcela: normalizeNumber(row.valor_parcela),
      dataInicio: row.data_inicio || metadata.dataInicio || "",
      vencimento:
        row.vencimento !== null && row.vencimento !== undefined
          ? Number(row.vencimento)
          : Number(metadata.vencimento || 0),
      status: row.status || metadata.status || "ativo",
      tipo: row.tipo || metadata.tipo || "cartao",
    };
  }

  function buildInstallmentRow(userId, installmentData) {
    const installmentId = String(
      installmentData?.id || window.FinanceStore?.createId?.("parcelamento") || ""
    ).trim();
    const normalizedStartDate = normalizeDateForDatabase(installmentData?.dataInicio || installmentData?.data_inicio);

    return {
      id: installmentId,
      user_id: userId,
      nome: String(installmentData?.nome || "").trim(),
      valor_total: normalizeNumber(installmentData?.valorTotal || installmentData?.valor_total),
      quantidade_parcelas: Number(installmentData?.parcelas || installmentData?.quantidade_parcelas || 0),
      valor_parcela: normalizeNumber(installmentData?.valorParcela || installmentData?.valor_parcela),
      data_inicio: normalizedStartDate,
      vencimento: Number(installmentData?.vencimento || 0),
      status: installmentData?.status || "ativo",
      tipo: installmentData?.tipo || null,
      metadata: {
        ...installmentData,
        id: installmentId,
        valorTotal: normalizeNumber(installmentData?.valorTotal || installmentData?.valor_total),
        parcelas: Number(installmentData?.parcelas || installmentData?.quantidade_parcelas || 0),
        valorParcela: normalizeNumber(installmentData?.valorParcela || installmentData?.valor_parcela),
        dataInicio: normalizedStartDate,
      },
      updated_at: new Date().toISOString(),
    };
  }

  function buildInstallmentRows(userId, appData) {
    return (Array.isArray(appData.parcelamentos) ? appData.parcelamentos : [])
      .map((item) => buildInstallmentRow(userId, item))
      .filter(
        (item) =>
          item.id &&
          item.nome &&
          item.valor_total > 0 &&
          item.quantidade_parcelas > 0 &&
          item.valor_parcela > 0 &&
          item.data_inicio &&
          item.vencimento > 0
      );
  }

  function replaceLocalInstallments(installments, source = REMOTE_SOURCE) {
    const localData = window.FinanceStore.loadAppData();

    return window.FinanceStore.replaceAppData(
      {
        ...localData,
        parcelamentos: Array.isArray(installments) ? installments.map(mapInstallmentRowToLocal) : [],
      },
      source
    );
  }

  function replaceLocalFixedBills(fixedBills, source = REMOTE_SOURCE) {
    const localData = window.FinanceStore.loadAppData();

    return window.FinanceStore.replaceAppData(
      {
        ...localData,
        contasFixas: Array.isArray(fixedBills) ? fixedBills.map(mapFixedBillRowToLocal) : [],
      },
      source
    );
  }

  function normalizeExpenseType(value, fallback = "saida") {
    const normalizedValue = normalizeText(value, fallback).toLowerCase();

    if (["entrada", "credito", "credit", "recebimento", "income"].includes(normalizedValue)) {
      return "entrada";
    }

    if (["saida", "debito", "debit", "despesa", "expense"].includes(normalizedValue)) {
      return "saida";
    }

    return fallback === "entrada" ? "entrada" : "saida";
  }

  function normalizeExpenseDescriptionForKey(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function buildExpenseFallbackKey(userId, expenseData) {
    const normalizedDate = normalizeDateForDatabase(expenseData?.data || expenseData?.dataNormalizada) || "";
    const normalizedDescription = normalizeExpenseDescriptionForKey(expenseData?.descricao);
    const normalizedValue = normalizeNumber(expenseData?.valor).toFixed(2);
    const normalizedType = normalizeExpenseType(
      expenseData?.tipo,
      normalizeNumber(expenseData?.valor) < 0 ? "entrada" : "saida"
    );

    return `expense:${userId}:${normalizedDate}:${normalizedDescription}:${normalizedValue}:${normalizedType}`;
  }

  function resolveExpenseExternalId(userId, expenseData) {
    const explicitExternalId = normalizeText(
      expenseData?.external_id || expenseData?.id || ""
    );

    return explicitExternalId || buildExpenseFallbackKey(userId, expenseData);
  }

  function buildExpenseRow(userId, expenseData) {
    const externalId = String(
      expenseData?.external_id || expenseData?.id || window.FinanceStore?.createId?.("gasto") || ""
    ).trim();
    const normalizedDate = normalizeDateForDatabase(expenseData?.data || expenseData?.dataNormalizada);

    return {
      user_id: userId,
      external_id: externalId,
      descricao: String(expenseData?.descricao || "Lancamento").trim(),
      categoria: String(expenseData?.categoria || "").trim() || null,
      valor: normalizeNumber(expenseData?.valor),
      data: normalizedDate,
      tipo: expenseData?.tipo || "saida",
      origem: expenseData?.origem || "manual",
      metadata: {
        ...expenseData,
        id: externalId,
        data: normalizedDate,
        categoria: String(expenseData?.categoria || "").trim() || "outros",
        tipo: expenseData?.tipo || "saida",
        origem: expenseData?.origem || "manual",
        valor: normalizeNumber(expenseData?.valor),
      },
      updated_at: new Date().toISOString(),
    };
  }

  function buildExpenseRows(userId, appData) {
    return (Array.isArray(appData.contasDiaADia) ? appData.contasDiaADia : [])
      .map((item) => buildExpenseRow(userId, item))
      .filter((item) => item.external_id && item.data);
  }

  function buildLedgerRows(userId, appData) {
    const ledgerSource = Array.isArray(appData?.ledgerMovimentacoes) ? appData.ledgerMovimentacoes : [];
    const manualExpenses = (Array.isArray(appData?.contasDiaADia) ? appData.contasDiaADia : []).filter(
      (item) => !isImportedLedgerOrigin(item?.origem)
    );
    const seenExternalIds = new Set();

    return [...ledgerSource, ...manualExpenses]
      .map((item) => buildLedgerRow(userId, item))
      .filter(
        (item) =>
          item.external_id &&
          item.data &&
          normalizeNumber(item.valor) > 0 &&
          !seenExternalIds.has(item.external_id)
      )
      .filter((item) => {
        seenExternalIds.add(item.external_id);
        return true;
      });
  }

  function replaceLocalExpenses(expenses, source = REMOTE_SOURCE) {
    const localData = window.FinanceStore.loadAppData();
    const mappedExpenses = Array.isArray(expenses) ? expenses.map(mapExpenseRowToLocal) : [];
    const manualExpenses = mappedExpenses.filter((item) => !isImportedLedgerOrigin(item?.origem));
    const nextLedgerMovements =
      typeof window.FinanceStore.mergeLedgerMovementsWithManualExpenses === "function"
        ? window.FinanceStore.mergeLedgerMovementsWithManualExpenses(
            localData.ledgerMovimentacoes,
            manualExpenses
          )
        : localData.ledgerMovimentacoes;
    const derivedImportedExpenses = deriveDailyExpensesFromLedgerItems(nextLedgerMovements);
    const nextDailyExpenses =
      Array.isArray(nextLedgerMovements) && nextLedgerMovements.length
        ? [...manualExpenses, ...derivedImportedExpenses]
        : mappedExpenses;

    return window.FinanceStore.replaceAppData(
      {
        ...localData,
        ledgerMovimentacoes: nextLedgerMovements,
        contasDiaADia: nextDailyExpenses,
      },
      source
    );
  }

  function replaceLocalLedgerMovements(ledgerRows, source = REMOTE_SOURCE) {
    const localData = window.FinanceStore.loadAppData();
    const mappedLedger = Array.isArray(ledgerRows) ? ledgerRows.map(mapLedgerRowToLocal) : [];
    const nextDailyExpenses = deriveDailyExpensesFromLedgerItems(mappedLedger);

    logLedgerSyncDebug("Ledger aplicado localmente", mappedLedger, {
      gastosDerivados: nextDailyExpenses.length,
      source,
    });

    return window.FinanceStore.replaceAppData(
      {
        ...localData,
        ledgerMovimentacoes: mappedLedger,
        contasDiaADia: nextDailyExpenses,
      },
      source
    );
  }

  function replaceLocalReceipts(incomes, benefits, source = REMOTE_SOURCE) {
    const localData = window.FinanceStore.loadAppData();
    const currentIncomeList = Array.isArray(localData?.recebimentos?.lista)
      ? localData.recebimentos.lista
      : [];
    const currentBenefitList = Array.isArray(localData?.recebimentos?.beneficios?.lista)
      ? localData.recebimentos.beneficios.lista
      : [];

    return window.FinanceStore.replaceAppData(
      {
        ...localData,
        recebimentos: buildReceiptCompatibilityState(
          localData.recebimentos || {},
          Array.isArray(incomes) ? incomes.map(mapIncomeRowToLocal) : currentIncomeList,
          Array.isArray(benefits) ? benefits.map(mapBenefitRowToLocal) : currentBenefitList
        ),
      },
      source
    );
  }

  function mergeRemoteState(
    localData,
    profileRow,
    ledgerRows,
    expenseRows,
    fixedBillRows,
    cardRows,
    cardExpenseRows,
    installmentRows,
    incomeRows,
    benefitRows
  ) {
    const mappedProfile = mapProfileRowToLocal(profileRow);
    const profileData =
      profileRow?.profile_data && typeof profileRow.profile_data === "object"
        ? profileRow.profile_data
        : {};
    const bankingData =
      profileRow?.banking_data && typeof profileRow.banking_data === "object"
        ? profileRow.banking_data
        : {};
    const receiptsData =
      profileRow?.recebimentos_data && typeof profileRow.recebimentos_data === "object"
        ? profileRow.recebimentos_data
        : {};
    const investmentsData =
      profileRow?.investimentos_data && typeof profileRow.investimentos_data === "object"
        ? profileRow.investimentos_data
        : {};
    const nextReceipts = buildReceiptCompatibilityState(
      {
        ...(localData.recebimentos || {}),
        ...receiptsData,
      },
      Array.isArray(incomeRows)
        ? incomeRows.map(mapIncomeRowToLocal)
        : Array.isArray(localData?.recebimentos?.lista)
          ? localData.recebimentos.lista
          : null,
      Array.isArray(benefitRows)
        ? benefitRows.map(mapBenefitRowToLocal)
        : Array.isArray(localData?.recebimentos?.beneficios?.lista)
          ? localData.recebimentos.beneficios.lista
          : null
    );
    const { ledgerItems: localLedger, migratedFromLegacyExpenses } = resolveAuthoritativeLedgerLocalRows(
      ledgerRows,
      expenseRows,
      "mergeRemoteState"
    );
    const localExpenses = Array.isArray(expenseRows)
      ? expenseRows.map(mapExpenseRowToLocal)
      : localData.contasDiaADia || [];
    const derivedLedgerExpenses = deriveDailyExpensesFromLedgerItems(localLedger);

    return {
      ...localData,
      profile: {
        ...(localData.profile || {}),
        ...profileData,
      },
      banking: {
        ...(localData.banking || {}),
        ...bankingData,
      },
      recebimentos: {
        ...nextReceipts,
      },
      investimentos: {
        ...(localData.investimentos || {}),
        ...investmentsData,
      },
      resumoFinanceiro: {
        ...(localData.resumoFinanceiro || {}),
        ...(mappedProfile?.resumoFinanceiro || {}),
      },
      parcelamentos: Array.isArray(installmentRows)
        ? installmentRows.map(mapInstallmentRowToLocal)
        : localData.parcelamentos || [],
      cartoes: Array.isArray(cardRows)
        ? cardRows.map(mapCardRowToLocal)
        : localData.cartoes || [],
      lancamentosCartao: Array.isArray(cardExpenseRows)
        ? cardExpenseRows.map(mapCardExpenseRowToLocal)
        : localData.lancamentosCartao || [],
      contasFixas: Array.isArray(fixedBillRows)
        ? fixedBillRows.map(mapFixedBillRowToLocal)
        : localData.contasFixas || [],
      ledgerMovimentacoes: localLedger,
      contasDiaADia:
        Array.isArray(ledgerRows) && ledgerRows.length
          ? derivedLedgerExpenses
          : migratedFromLegacyExpenses
            ? derivedLedgerExpenses
          : localExpenses,
    };
  }

  function isMissingTableError(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("does not exist") || message.includes("relation");
  }

  async function fetchOptionalUserRows(tableName, userId, options = {}) {
    const supabase = await getSupabaseClient();
    let query = supabase.from(tableName).select(options.select || "*").eq("user_id", userId);

    (Array.isArray(options.orders) ? options.orders : []).forEach((orderConfig) => {
      query = query.order(orderConfig.column, { ascending: orderConfig.ascending !== false });
    });

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(`[MFinanceiro Sync] Tabela opcional ausente: ${tableName}.`, error.message || error);
        return [];
      }

      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  function createLedgerMissingError(error) {
    const nextError = new Error(
      "A tabela central mf_finance_ledger_entries nao foi encontrada no Supabase. Aplique a migration do ledger antes de continuar."
    );
    nextError.cause = error;
    nextError.code = error?.code;
    nextError.details = error?.details;
    nextError.hint = error?.hint;
    nextError.__mfinanceiroLedgerMissing = true;
    return nextError;
  }

  function isLedgerMissingError(error) {
    return Boolean(error?.__mfinanceiroLedgerMissing) || isMissingTableError(error?.cause || error);
  }

  async function fetchRequiredUserRows(tableName, userId, options = {}) {
    const supabase = await getSupabaseClient();
    let query = supabase.from(tableName).select(options.select || "*").eq("user_id", userId);

    (Array.isArray(options.orders) ? options.orders : []).forEach((orderConfig) => {
      query = query.order(orderConfig.column, { ascending: orderConfig.ascending !== false });
    });

    const { data, error } = await query;

    if (error) {
      if (tableName === LEDGER_TABLE && isMissingTableError(error)) {
        throw createLedgerMissingError(error);
      }

      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  function mapLegacyExpenseRowsToLedgerLocal(expenseRows) {
    return (Array.isArray(expenseRows) ? expenseRows : [])
      .map((row, index) => {
        const localExpense = mapExpenseRowToLocal(row);
        const externalId = normalizeText(
          row?.external_id || localExpense.id || `legacy_expense_${index + 1}`
        );
        const normalizedDate = normalizeDateForDatabase(localExpense.data);
        const normalizedValue = normalizeNumber(localExpense.valor);

        if (!externalId || !normalizedDate || normalizedValue <= 0) {
          return null;
        }

        return {
          ...localExpense,
          id: externalId,
          user_id: row?.user_id || "",
          external_id: externalId,
          data: normalizedDate,
          categoria: localExpense.categoria || "outros",
          valor: normalizedValue,
          tipo: normalizeExpenseType(localExpense.tipo, "saida"),
          origem: localExpense.origem || "manual",
          arquivo_origem: null,
          linha_origem: null,
          status_importacao: "valida",
          motivo_rejeicao: "",
          updated_at: row?.updated_at || "",
        };
      })
      .filter(Boolean);
  }

  function resolveAuthoritativeLedgerLocalRows(ledgerRows, expenseRows, context = "remote-sync") {
    const localLedger = Array.isArray(ledgerRows) ? ledgerRows.map(mapLedgerRowToLocal) : [];

    if (localLedger.length) {
      return {
        ledgerItems: localLedger,
        migratedFromLegacyExpenses: false,
      };
    }

    const migratedLedger = mapLegacyExpenseRowsToLedgerLocal(expenseRows);

    if (migratedLedger.length) {
      console.warn(
        "[MFinanceiro Sync] Ledger vazio no Supabase. Despesas legadas foram carregadas apenas para migracao controlada ao ledger.",
        {
          contexto: context,
          totalLegado: migratedLedger.length,
        }
      );
    }

    return {
      ledgerItems: migratedLedger,
      migratedFromLegacyExpenses: migratedLedger.length > 0,
    };
  }

  function logLedgerSyncDebug(action, ledgerRows, extra = {}) {
    const rows = Array.isArray(ledgerRows) ? ledgerRows : [];
    console.log(`[MFinanceiro Sync] ${action}`, {
      ledgerRegistros: rows.length,
      amostra: rows.slice(0, 3),
      ...extra,
    });
  }

  async function fetchRemoteState(userId) {
    const supabase = await getSupabaseClient();
    const profileRequest = supabase
      .from(PROFILES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const ledgerRequest = fetchRequiredUserRows(LEDGER_TABLE, userId, {
      orders: [
        { column: "data", ascending: false },
        { column: "created_at", ascending: false },
      ],
    });
    const expensesRequest = fetchOptionalUserRows(EXPENSES_TABLE, userId, {
      orders: [
        { column: "data", ascending: false },
        { column: "created_at", ascending: false },
      ],
    });
    const fixedBillsRequest = supabase
      .from(FIXED_BILLS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("vencimento", { ascending: true });
    const cardsRequest = supabase
      .from(CARDS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const cardExpensesRequest = supabase
      .from(CARD_EXPENSES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    const installmentsRequest = supabase
      .from(INSTALLMENTS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data_inicio", { ascending: false })
      .order("created_at", { ascending: false });
    const incomesRequest = supabase
      .from(INCOMES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data_prevista", { ascending: true })
      .order("created_at", { ascending: false });
    const benefitsRequest = supabase
      .from(BENEFITS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data_recebimento", { ascending: true })
      .order("created_at", { ascending: false });

    const [
      { data: profile, error: profileError },
      ledger,
      expenses,
      { data: fixedBills, error: fixedBillsError },
      { data: cards, error: cardsError },
      { data: cardExpenses, error: cardExpensesError },
      { data: installments, error: installmentsError },
      { data: incomes, error: incomesError },
      { data: benefits, error: benefitsError },
    ] = await Promise.all([
      profileRequest,
      ledgerRequest,
      expensesRequest,
      fixedBillsRequest,
      cardsRequest,
      cardExpensesRequest,
      installmentsRequest,
      incomesRequest,
      benefitsRequest,
    ]);

    if (profileError) {
      throw profileError;
    }

    if (fixedBillsError) {
      throw fixedBillsError;
    }

    if (cardsError) {
      throw cardsError;
    }

    if (cardExpensesError) {
      throw cardExpensesError;
    }

    if (installmentsError) {
      throw installmentsError;
    }

    if (incomesError) {
      throw incomesError;
    }

    if (benefitsError) {
      throw benefitsError;
    }

    logLedgerSyncDebug("Dados recebidos do Supabase", ledger || [], {
      despesasLegadas: Array.isArray(expenses) ? expenses.length : 0,
    });

    return {
      profile: profile || null,
      ledger: ledger || [],
      expenses: expenses || [],
      fixedBills: fixedBills || [],
      cards: cards || [],
      cardExpenses: cardExpenses || [],
      installments: installments || [],
      incomes: incomes || [],
      benefits: benefits || [],
    };
  }

  async function saveUserFinancialData(data) {
    const userId = await getAuthenticatedUserId();
    const payload = buildProfilePayload(userId, data || window.FinanceStore.loadAppData());
    const supabase = await getSupabaseClient();
    const { data: savedRow, error } = await supabase
      .from(PROFILES_TABLE)
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapProfileRowToLocal(savedRow || payload);
  }

  async function loadUserFinancialData() {
    const userId = await getAuthenticatedUserId();
    const remoteState = await fetchRemoteState(userId);

    return {
      userId,
      profile: mapProfileRowToLocal(remoteState.profile),
      ledger: Array.isArray(remoteState.ledger)
        ? remoteState.ledger.map(mapLedgerRowToLocal)
        : [],
      expenses: Array.isArray(remoteState.expenses)
        ? remoteState.expenses.map(mapExpenseRowToLocal)
        : [],
      fixedBills: Array.isArray(remoteState.fixedBills)
        ? remoteState.fixedBills.map(mapFixedBillRowToLocal)
        : [],
      cards: Array.isArray(remoteState.cards)
        ? remoteState.cards.map(mapCardRowToLocal)
        : [],
      cardExpenses: Array.isArray(remoteState.cardExpenses)
        ? remoteState.cardExpenses.map(mapCardExpenseRowToLocal)
        : [],
      installments: Array.isArray(remoteState.installments)
        ? remoteState.installments.map(mapInstallmentRowToLocal)
        : [],
      incomes: Array.isArray(remoteState.incomes)
        ? remoteState.incomes.map(mapIncomeRowToLocal)
        : [],
      benefits: Array.isArray(remoteState.benefits)
        ? remoteState.benefits.map(mapBenefitRowToLocal)
        : [],
      rawProfile: remoteState.profile,
      rawLedger: remoteState.ledger || [],
      rawExpenses: remoteState.expenses || [],
      rawFixedBills: remoteState.fixedBills || [],
      rawCards: remoteState.cards || [],
      rawCardExpenses: remoteState.cardExpenses || [],
      rawInstallments: remoteState.installments || [],
      rawIncomes: remoteState.incomes || [],
      rawBenefits: remoteState.benefits || [],
    };
  }

  async function loadUserFinancialSnapshot() {
    const userId = await getAuthenticatedUserId();
    const remoteState = await fetchRemoteState(userId);

    return {
      userId,
      profile: remoteState.profile || null,
      ledger: Array.isArray(remoteState.ledger) ? remoteState.ledger : [],
      expenses: Array.isArray(remoteState.expenses) ? remoteState.expenses : [],
      fixedBills: Array.isArray(remoteState.fixedBills) ? remoteState.fixedBills : [],
      cards: Array.isArray(remoteState.cards) ? remoteState.cards : [],
      cardExpenses: Array.isArray(remoteState.cardExpenses) ? remoteState.cardExpenses : [],
      installments: Array.isArray(remoteState.installments) ? remoteState.installments : [],
      incomes: Array.isArray(remoteState.incomes) ? remoteState.incomes : [],
      benefits: Array.isArray(remoteState.benefits) ? remoteState.benefits : [],
      data: buildLocalDataFromRemote(
        remoteState.profile,
        remoteState.ledger,
        remoteState.expenses,
        remoteState.fixedBills,
        remoteState.cards,
        remoteState.cardExpenses,
        remoteState.installments,
        remoteState.incomes,
        remoteState.benefits
      ),
    };
  }

  async function getIncomes() {
    const userId = await getAuthenticatedUserId();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(INCOMES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data_prevista", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    replaceLocalReceipts(data || null, null);
    return Array.isArray(data) ? data.map(mapIncomeRowToLocal) : [];
  }

  async function addIncome(incomeData) {
    const userId = await getAuthenticatedUserId();
    const incomeRow = buildIncomeRow(userId, incomeData);

    if (!incomeRow.id || !incomeRow.descricao || incomeRow.valor_previsto <= 0 || !incomeRow.data_prevista) {
      throw new Error("Dados invalidos para salvar o recebimento.");
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(INCOMES_TABLE)
      .upsert(incomeRow, { onConflict: "user_id,id" })
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    await getIncomes();
    await recalculateAndUpdate("add-income", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
      persistInstallments: false,
      persistIncomes: false,
      persistBenefits: false,
    });

    return mapIncomeRowToLocal(data || incomeRow);
  }

  async function deleteIncome(id) {
    const userId = await getAuthenticatedUserId();
    const incomeId = String(id || "").trim();

    if (!incomeId) {
      throw new Error("Identificador do recebimento nao informado.");
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from(INCOMES_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", incomeId);

    if (error) {
      throw error;
    }

    const currentData = window.FinanceStore.loadAppData();
    const nextIncomes = (Array.isArray(currentData?.recebimentos?.lista) ? currentData.recebimentos.lista : []).filter(
      (item) => String(item?.id || "") !== incomeId
    );

    replaceLocalReceipts(nextIncomes, null);
    await recalculateAndUpdate("delete-income", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
      persistInstallments: false,
      persistIncomes: false,
      persistBenefits: false,
    });

    return true;
  }

  async function removeDeletedIncomes(userId, nextIncomeRows) {
    const supabase = await getSupabaseClient();
    const { data: currentRows, error } = await supabase
      .from(INCOMES_TABLE)
      .select("id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const nextIds = new Set(nextIncomeRows.map((item) => item.id));
    const idsToDelete = (currentRows || [])
      .map((item) => item.id)
      .filter((rowId) => !nextIds.has(rowId));

    if (!idsToDelete.length) {
      return;
    }

    const { error: deleteError } = await supabase
      .from(INCOMES_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  async function getBenefits() {
    const userId = await getAuthenticatedUserId();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(BENEFITS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data_recebimento", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    replaceLocalReceipts(null, data || []);
    return Array.isArray(data) ? data.map(mapBenefitRowToLocal) : [];
  }

  async function addBenefit(benefitData) {
    const userId = await getAuthenticatedUserId();
    const benefitRow = buildBenefitRow(userId, benefitData);

    if (!benefitRow.id || !benefitRow.tipo || benefitRow.valor <= 0 || !benefitRow.data_recebimento) {
      throw new Error("Dados invalidos para salvar o beneficio.");
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(BENEFITS_TABLE)
      .upsert(benefitRow, { onConflict: "user_id,id" })
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    await getBenefits();
    await recalculateAndUpdate("add-benefit", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
      persistInstallments: false,
      persistIncomes: false,
      persistBenefits: false,
    });

    return mapBenefitRowToLocal(data || benefitRow);
  }

  async function deleteBenefit(id) {
    const userId = await getAuthenticatedUserId();
    const benefitId = String(id || "").trim();

    if (!benefitId) {
      throw new Error("Identificador do beneficio nao informado.");
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from(BENEFITS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", benefitId);

    if (error) {
      throw error;
    }

    const currentData = window.FinanceStore.loadAppData();
    const nextBenefits = (
      Array.isArray(currentData?.recebimentos?.beneficios?.lista)
        ? currentData.recebimentos.beneficios.lista
        : []
    ).filter((item) => String(item?.id || "") !== benefitId);

    replaceLocalReceipts(null, nextBenefits);
    await recalculateAndUpdate("delete-benefit", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
      persistInstallments: false,
      persistIncomes: false,
      persistBenefits: false,
    });

    return true;
  }

  async function removeDeletedBenefits(userId, nextBenefitRows) {
    const supabase = await getSupabaseClient();
    const { data: currentRows, error } = await supabase
      .from(BENEFITS_TABLE)
      .select("id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const nextIds = new Set(nextBenefitRows.map((item) => item.id));
    const idsToDelete = (currentRows || [])
      .map((item) => item.id)
      .filter((rowId) => !nextIds.has(rowId));

    if (!idsToDelete.length) {
      return;
    }

    const { error: deleteError } = await supabase
      .from(BENEFITS_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  async function getInstallments() {
    const userId = await getAuthenticatedUserId();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(INSTALLMENTS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data_inicio", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    replaceLocalInstallments(data || []);
    return Array.isArray(data) ? data.map(mapInstallmentRowToLocal) : [];
  }

  async function addInstallment(installmentData) {
    const userId = await getAuthenticatedUserId();
    const installmentRow = buildInstallmentRow(userId, installmentData);

    if (
      !installmentRow.id ||
      !installmentRow.nome ||
      installmentRow.valor_total <= 0 ||
      installmentRow.quantidade_parcelas <= 0 ||
      installmentRow.valor_parcela <= 0 ||
      !installmentRow.data_inicio ||
      installmentRow.vencimento <= 0
    ) {
      throw new Error("Dados invalidos para salvar o parcelamento.");
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(INSTALLMENTS_TABLE)
      .upsert(installmentRow, { onConflict: "user_id,id" })
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    await getInstallments();
    await recalculateAndUpdate("add-installment", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
      persistInstallments: false,
    });

    return mapInstallmentRowToLocal(data || installmentRow);
  }

  async function deleteInstallment(id) {
    const userId = await getAuthenticatedUserId();
    const installmentId = String(id || "").trim();

    if (!installmentId) {
      throw new Error("Identificador do parcelamento nao informado.");
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from(INSTALLMENTS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", installmentId);

    if (error) {
      throw error;
    }

    const currentData = window.FinanceStore.loadAppData();
    window.FinanceStore.replaceAppData(
      {
        ...currentData,
        parcelamentos: (Array.isArray(currentData.parcelamentos) ? currentData.parcelamentos : []).filter(
          (item) => String(item.id || "") !== installmentId
        ),
      },
      REMOTE_SOURCE
    );

    await recalculateAndUpdate("delete-installment", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
      persistInstallments: false,
    });

    return true;
  }

  async function removeDeletedInstallments(userId, nextInstallmentRows) {
    const supabase = await getSupabaseClient();
    const { data: currentRows, error } = await supabase
      .from(INSTALLMENTS_TABLE)
      .select("id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const nextIds = new Set(nextInstallmentRows.map((item) => item.id));
    const idsToDelete = (currentRows || [])
      .map((item) => item.id)
      .filter((rowId) => !nextIds.has(rowId));

    if (!idsToDelete.length) {
      return;
    }

    const { error: deleteError } = await supabase
      .from(INSTALLMENTS_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  async function getCards() {
    const userId = await getAuthenticatedUserId();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(CARDS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    replaceLocalCards(data || []);
    return Array.isArray(data) ? data.map(mapCardRowToLocal) : [];
  }

  async function addCard(cardData) {
    const userId = await getAuthenticatedUserId();
    const cardRow = buildCardRow(userId, cardData);

    if (!cardRow.id || !cardRow.nome || cardRow.data_vencimento <= 0) {
      throw new Error("Dados invalidos para salvar o cartao.");
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(CARDS_TABLE)
      .upsert(cardRow, { onConflict: "user_id,id" })
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    await getCards();
    await recalculateAndUpdate("add-card", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
    });

    return mapCardRowToLocal(data || cardRow);
  }

  async function deleteCard(id) {
    const userId = await getAuthenticatedUserId();
    const cardId = String(id || "").trim();

    if (!cardId) {
      throw new Error("Identificador do cartao nao informado.");
    }

    const supabase = await getSupabaseClient();
    const { error: cardExpensesDeleteError } = await supabase
      .from(CARD_EXPENSES_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("cartao_id", cardId);

    if (cardExpensesDeleteError) {
      throw cardExpensesDeleteError;
    }

    const { error } = await supabase
      .from(CARDS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", cardId);

    if (error) {
      throw error;
    }

    const currentData = window.FinanceStore.loadAppData();
    window.FinanceStore.replaceAppData(
      {
        ...currentData,
        cartoes: (Array.isArray(currentData.cartoes) ? currentData.cartoes : []).filter(
          (item) => String(item.id || "") !== cardId
        ),
        lancamentosCartao: (Array.isArray(currentData.lancamentosCartao) ? currentData.lancamentosCartao : []).filter(
          (item) => String(item.cartaoId || "") !== cardId
        ),
      },
      REMOTE_SOURCE
    );

    await recalculateAndUpdate("delete-card", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
    });

    return true;
  }

  async function getCardExpenses(cardId) {
    const userId = await getAuthenticatedUserId();
    const supabase = await getSupabaseClient();
    let request = supabase
      .from(CARD_EXPENSES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });

    if (cardId) {
      request = request.eq("cartao_id", String(cardId).trim());
    }

    const { data, error } = await request;

    if (error) {
      throw error;
    }

    if (!cardId) {
      replaceLocalCardExpenses(data || []);
    }

    return Array.isArray(data) ? data.map(mapCardExpenseRowToLocal) : [];
  }

  async function addCardExpense(cardExpenseData) {
    const userId = await getAuthenticatedUserId();
    const cardExpenseRow = buildCardExpenseRow(userId, cardExpenseData);

    if (
      !cardExpenseRow.id ||
      !cardExpenseRow.cartao_id ||
      !cardExpenseRow.descricao ||
      cardExpenseRow.valor <= 0 ||
      !cardExpenseRow.data
    ) {
      throw new Error("Dados invalidos para salvar o gasto da fatura.");
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(CARD_EXPENSES_TABLE)
      .upsert(cardExpenseRow, { onConflict: "user_id,id" })
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    await getCardExpenses();
    await recalculateAndUpdate("add-card-expense", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
    });

    return mapCardExpenseRowToLocal(data || cardExpenseRow);
  }

  async function deleteCardExpense(id) {
    const userId = await getAuthenticatedUserId();
    const expenseId = String(id || "").trim();

    if (!expenseId) {
      throw new Error("Identificador do gasto da fatura nao informado.");
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from(CARD_EXPENSES_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", expenseId);

    if (error) {
      throw error;
    }

    const currentData = window.FinanceStore.loadAppData();
    window.FinanceStore.replaceAppData(
      {
        ...currentData,
        lancamentosCartao: (Array.isArray(currentData.lancamentosCartao) ? currentData.lancamentosCartao : []).filter(
          (item) => String(item.id || "") !== expenseId
        ),
      },
      REMOTE_SOURCE
    );

    await recalculateAndUpdate("delete-card-expense", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
      persistCards: false,
      persistCardExpenses: false,
    });

    return true;
  }

  async function removeDeletedCards(userId, nextCardRows) {
    const supabase = await getSupabaseClient();
    const { data: currentRows, error } = await supabase
      .from(CARDS_TABLE)
      .select("id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const nextIds = new Set(nextCardRows.map((item) => item.id));
    const idsToDelete = (currentRows || [])
      .map((item) => item.id)
      .filter((rowId) => !nextIds.has(rowId));

    if (!idsToDelete.length) {
      return;
    }

    const { error: cardExpensesDeleteError } = await supabase
      .from(CARD_EXPENSES_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("cartao_id", idsToDelete);

    if (cardExpensesDeleteError) {
      throw cardExpensesDeleteError;
    }

    const { error: deleteError } = await supabase
      .from(CARDS_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  async function removeDeletedCardExpenses(userId, nextCardExpenseRows) {
    const supabase = await getSupabaseClient();
    const { data: currentRows, error } = await supabase
      .from(CARD_EXPENSES_TABLE)
      .select("id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const nextIds = new Set(nextCardExpenseRows.map((item) => item.id));
    const idsToDelete = (currentRows || [])
      .map((item) => item.id)
      .filter((rowId) => !nextIds.has(rowId));

    if (!idsToDelete.length) {
      return;
    }

    const { error: deleteError } = await supabase
      .from(CARD_EXPENSES_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  async function getFixedBills() {
    const userId = await getAuthenticatedUserId();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(FIXED_BILLS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("vencimento", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    replaceLocalFixedBills(data || []);
    return Array.isArray(data) ? data.map(mapFixedBillRowToLocal) : [];
  }

  async function addFixedBill(fixedBillData) {
    const userId = await getAuthenticatedUserId();
    const fixedBillRow = buildFixedBillRow(userId, fixedBillData);

    if (!fixedBillRow.id || !fixedBillRow.nome || fixedBillRow.valor <= 0 || !fixedBillRow.vencimento) {
      throw new Error("Dados invalidos para salvar a conta fixa.");
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(FIXED_BILLS_TABLE)
      .upsert(fixedBillRow, { onConflict: "user_id,id" })
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    await getFixedBills();
    await recalculateAndUpdate("add-fixed-bill", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
    });

    return mapFixedBillRowToLocal(data || fixedBillRow);
  }

  async function deleteFixedBill(id) {
    const userId = await getAuthenticatedUserId();
    const fixedBillId = String(id || "").trim();

    if (!fixedBillId) {
      throw new Error("Identificador da conta fixa nao informado.");
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from(FIXED_BILLS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("id", fixedBillId);

    if (error) {
      throw error;
    }

    const currentData = window.FinanceStore.loadAppData();
    window.FinanceStore.replaceAppData(
      {
        ...currentData,
        contasFixas: (Array.isArray(currentData.contasFixas) ? currentData.contasFixas : []).filter(
          (item) => String(item.id || "") !== fixedBillId
        ),
      },
      REMOTE_SOURCE
    );

    await recalculateAndUpdate("delete-fixed-bill", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
      persistFixedBills: false,
    });

    return true;
  }

  async function removeDeletedFixedBills(userId, nextFixedBillRows) {
    const supabase = await getSupabaseClient();
    const { data: currentRows, error } = await supabase
      .from(FIXED_BILLS_TABLE)
      .select("id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const nextIds = new Set(nextFixedBillRows.map((item) => item.id));
    const idsToDelete = (currentRows || [])
      .map((item) => item.id)
      .filter((rowId) => !nextIds.has(rowId));

    if (!idsToDelete.length) {
      return;
    }

    const { error: deleteError } = await supabase
      .from(FIXED_BILLS_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  async function recalculateAndUpdate(reason = "manual", options = {}) {
    if (syncPromise) {
      return syncPromise;
    }

    syncPromise = (async () => {
      const user = await getAuthenticatedUser();

      if (!user) {
        return null;
      }

      let sourceData = options.data;

      if (!sourceData) {
        sourceData = window.FinanceStore.loadAppData();
      }

      const nextData = buildCalculatedAppData(sourceData);

      isApplyingRemoteState = true;
      window.FinanceStore.replaceAppData(nextData, REMOTE_SOURCE);
      isApplyingRemoteState = false;

      const profile = await saveUserFinancialData(nextData);

      if (options.persistLedger) {
        const ledgerRows = buildLedgerRows(user.id, nextData);
        const supabase = await getSupabaseClient();

        try {
          await removeDeletedLedgerEntries(user.id, ledgerRows);

          if (ledgerRows.length) {
            const { error: ledgerError } = await supabase
              .from(LEDGER_TABLE)
              .upsert(ledgerRows, { onConflict: "user_id,external_id" });

            if (ledgerError) {
              throw ledgerError;
            }
          }
        } catch (error) {
          if (isLedgerMissingError(error)) {
            throw createLedgerMissingError(error?.cause || error);
          }

          throw error;
        }
      }

      if (options.persistExpenses) {
        const expenseRows = buildExpenseRows(user.id, nextData);
        const supabase = await getSupabaseClient();

        await removeDeletedExpenses(user.id, expenseRows);

        if (expenseRows.length) {
          const { error: expensesError } = await supabase
            .from(EXPENSES_TABLE)
            .upsert(expenseRows, { onConflict: "user_id,external_id" });

          if (expensesError) {
            throw expensesError;
          }
        }
      }

      if (options.persistFixedBills) {
        const fixedBillRows = buildFixedBillRows(user.id, nextData);
        const supabase = await getSupabaseClient();

        await removeDeletedFixedBills(user.id, fixedBillRows);

        if (fixedBillRows.length) {
          const { error: fixedBillsError } = await supabase
            .from(FIXED_BILLS_TABLE)
            .upsert(fixedBillRows, { onConflict: "user_id,id" });

          if (fixedBillsError) {
            throw fixedBillsError;
          }
        }
      }

      if (options.persistCards) {
        const cardRows = buildCardRows(user.id, nextData);
        const supabase = await getSupabaseClient();

        await removeDeletedCards(user.id, cardRows);

        if (cardRows.length) {
          const { error: cardsError } = await supabase
            .from(CARDS_TABLE)
            .upsert(cardRows, { onConflict: "user_id,id" });

          if (cardsError) {
            throw cardsError;
          }
        }
      }

      if (options.persistCardExpenses) {
        const cardExpenseRows = buildCardExpenseRows(user.id, nextData);
        const supabase = await getSupabaseClient();

        await removeDeletedCardExpenses(user.id, cardExpenseRows);

        if (cardExpenseRows.length) {
          const { error: cardExpensesError } = await supabase
            .from(CARD_EXPENSES_TABLE)
            .upsert(cardExpenseRows, { onConflict: "user_id,id" });

          if (cardExpensesError) {
            throw cardExpensesError;
          }
        }
      }

      if (options.persistInstallments) {
        const installmentRows = buildInstallmentRows(user.id, nextData);
        const supabase = await getSupabaseClient();

        await removeDeletedInstallments(user.id, installmentRows);

        if (installmentRows.length) {
          const { error: installmentsError } = await supabase
            .from(INSTALLMENTS_TABLE)
            .upsert(installmentRows, { onConflict: "user_id,id" });

          if (installmentsError) {
            throw installmentsError;
          }
        }
      }

      if (options.persistIncomes) {
        const incomeRows = buildIncomeRows(user.id, nextData);
        const supabase = await getSupabaseClient();

        await removeDeletedIncomes(user.id, incomeRows);

        if (incomeRows.length) {
          const { error: incomesError } = await supabase
            .from(INCOMES_TABLE)
            .upsert(incomeRows, { onConflict: "user_id,id" });

          if (incomesError) {
            throw incomesError;
          }
        }
      }

      if (options.persistBenefits) {
        const benefitRows = buildBenefitRows(user.id, nextData);
        const supabase = await getSupabaseClient();

        await removeDeletedBenefits(user.id, benefitRows);

        if (benefitRows.length) {
          const { error: benefitsError } = await supabase
            .from(BENEFITS_TABLE)
            .upsert(benefitRows, { onConflict: "user_id,id" });

          if (benefitsError) {
            throw benefitsError;
          }
        }
      }

      window.dispatchEvent(
        new CustomEvent("mfinanceiro-financial-recalculated", {
          detail: {
            reason,
            resumoFinanceiro: nextData.resumoFinanceiro,
          },
        })
      );

      if (!options.skipSyncedEvent) {
        window.dispatchEvent(
          new CustomEvent("mfinanceiro-supabase-synced", {
            detail: {
              reason,
            },
          })
        );
      }

      return {
        userId: user.id,
        data: nextData,
        profile,
      };
    })()
      .catch((error) => {
        isApplyingRemoteState = false;

        if (isLedgerMissingError(error)) {
          console.warn(
            "[MFinanceiro Sync] O ledger central ainda nao existe no Supabase. Aplique a migration mf_finance_ledger_entries para ativar o app em modo ledger-first.",
            error
          );
          return null;
        }

        if (isMissingTableError(error)) {
          console.warn(
            "[MFinanceiro Sync] Tabelas do Supabase ainda nao existem. Execute o SQL da pasta supabase para ativar a persistencia remota.",
            error
          );
          return null;
        }

        console.error("[MFinanceiro Sync] Falha ao recalcular e sincronizar dados.", error);
        return null;
      })
      .finally(() => {
        isApplyingRemoteState = false;
        syncPromise = null;
      });

    return syncPromise;
  }

  async function recalculateFinancialProfile(data) {
    const result = await recalculateAndUpdate("recalculate-profile", {
      data,
      persistExpenses: false,
      skipSyncedEvent: true,
    });

    return result?.profile || null;
  }

  async function getExpenses() {
    const userId = await getAuthenticatedUserId();
    const ledgerRows = await fetchRequiredUserRows(LEDGER_TABLE, userId, {
      orders: [
        { column: "data", ascending: false },
        { column: "created_at", ascending: false },
      ],
    });
    const localLedger = Array.isArray(ledgerRows) ? ledgerRows.map(mapLedgerRowToLocal) : [];
    const dailyExpenses = deriveDailyExpensesFromLedgerItems(localLedger);

    replaceLocalLedgerMovements(ledgerRows || []);
    logLedgerSyncDebug("Gastos derivados diretamente do ledger", ledgerRows || [], {
      gastosSaida: dailyExpenses.length,
    });

    return dailyExpenses;
  }

  async function addExpense(expenseData) {
    const userId = await getAuthenticatedUserId();
    const ledgerRow = buildLedgerRow(userId, {
      ...expenseData,
      origem: expenseData?.origem || "manual",
      status_importacao: expenseData?.status_importacao || "valida",
    });

    if (!ledgerRow.external_id || !ledgerRow.descricao || ledgerRow.valor <= 0 || !ledgerRow.data) {
      throw new Error("Dados invalidos para salvar a despesa.");
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from(LEDGER_TABLE)
      .upsert(ledgerRow, { onConflict: "user_id,external_id" })
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    await getExpenses();
    await recalculateAndUpdate("add-expense", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
    });
    return mapLedgerRowToLocal(data || ledgerRow);
  }

  async function importStatementBatch(statementItems, options = {}) {
    const userId = await getAuthenticatedUserId();
    const supabase = await getSupabaseClient();
    const sourceItems = Array.isArray(statementItems) ? statementItems : [];
    const report = {
      totalLinhasLidas: sourceItems.length,
      totalLinhasProcessadas: sourceItems.length,
      totalValidas: 0,
      totalDuplicadas: 0,
      totalRejeitadas: 0,
      totalEfetivamenteSalvo: 0,
      errosPorLinha: [],
    };
    const existingKeys = new Set();
    const batchKeys = new Set();
    const processedItems = [];
    const existingLedgerRows = await fetchRequiredUserRows(LEDGER_TABLE, userId, {
      select: "external_id, descricao, valor, data, tipo",
    });

    [...(existingLedgerRows || [])].forEach((row) => {
      const externalId = normalizeText(row?.external_id);

      if (externalId) {
        existingKeys.add(externalId);
      }

      existingKeys.add(
        buildExpenseFallbackKey(userId, {
          data: row?.data,
          descricao: row?.descricao,
          valor: row?.valor,
          tipo: row?.tipo,
        })
      );
    });

    const validItems = sourceItems.reduce((accumulator, item, index) => {
      const lineNumber = Number(item?.linha_origem || index + 1);
      const rawValue = normalizeNumber(item?.valor);
      const normalizedValue = Math.abs(rawValue);
      const normalizedDate = normalizeDateForDatabase(item?.data || item?.dataNormalizada);
      const normalizedDescription = normalizeText(item?.descricao);
      const normalizedType = normalizeExpenseType(
        item?.tipo,
        rawValue < 0 ? "entrada" : "saida"
      );
      const canonicalItem = {
        ...item,
        user_id: userId,
        data: normalizedDate,
        descricao: normalizedDescription,
        valor: normalizedValue,
        categoria: normalizeText(item?.categoria || "outros") || "outros",
        tipo: normalizedType,
        origem: normalizeText(item?.origem, "extrato_importado") || "extrato_importado",
        arquivo_origem: normalizeText(item?.arquivo_origem || options.fileName || "") || null,
        linha_origem: Number.isFinite(lineNumber) ? lineNumber : null,
        external_id: normalizeText(item?.external_id || ""),
        status_importacao: item?.status_importacao || "valida",
      };

      if (canonicalItem.status_importacao === "rejeitada") {
        report.totalRejeitadas += 1;
        report.errosPorLinha.push({
          linha: canonicalItem.linha_origem,
          motivo: item?.motivo_rejeicao || "Linha rejeitada durante a leitura.",
        });
        processedItems.push({
          ...canonicalItem,
          status_importacao: "rejeitada",
          motivo_rejeicao: item?.motivo_rejeicao || "Linha rejeitada durante a leitura.",
        });
        return accumulator;
      }

      if (!canonicalItem.data) {
        report.totalRejeitadas += 1;
        report.errosPorLinha.push({
          linha: canonicalItem.linha_origem,
          motivo: "Data invalida ou ausente.",
        });
        processedItems.push({
          ...canonicalItem,
          status_importacao: "rejeitada",
          motivo_rejeicao: "Data invalida ou ausente.",
        });
        return accumulator;
      }

      if (!canonicalItem.descricao) {
        report.totalRejeitadas += 1;
        report.errosPorLinha.push({
          linha: canonicalItem.linha_origem,
          motivo: "Descricao ausente.",
        });
        processedItems.push({
          ...canonicalItem,
          status_importacao: "rejeitada",
          motivo_rejeicao: "Descricao ausente.",
        });
        return accumulator;
      }

      if (canonicalItem.valor <= 0) {
        report.totalRejeitadas += 1;
        report.errosPorLinha.push({
          linha: canonicalItem.linha_origem,
          motivo: "Valor invalido ou igual a zero.",
        });
        processedItems.push({
          ...canonicalItem,
          status_importacao: "rejeitada",
          motivo_rejeicao: "Valor invalido ou igual a zero.",
        });
        return accumulator;
      }

      const dedupeKey = canonicalItem.external_id
        ? canonicalItem.external_id
        : buildExpenseFallbackKey(userId, canonicalItem);

      if (existingKeys.has(dedupeKey) || batchKeys.has(dedupeKey)) {
        report.totalDuplicadas += 1;
        report.errosPorLinha.push({
          linha: canonicalItem.linha_origem,
          motivo: "Movimentacao duplicada.",
        });
        processedItems.push({
          ...canonicalItem,
          external_id: dedupeKey,
          id: dedupeKey,
          status_importacao: "duplicada",
          motivo_rejeicao: "Movimentacao duplicada.",
        });
        return accumulator;
      }

      batchKeys.add(dedupeKey);
      report.totalValidas += 1;
      const validItem = {
        ...canonicalItem,
        external_id: dedupeKey,
        id: dedupeKey,
        status_importacao: "valida",
        motivo_rejeicao: "",
      };
      processedItems.push(validItem);
      accumulator.push(validItem);
      return accumulator;
    }, []);

    let savedItems = [];

    if (validItems.length) {
      const ledgerRowsToSave = validItems
        .map((item) => buildLedgerRow(userId, item))
        .filter((item) => item.external_id && item.data && item.valor > 0);
      let savedLedgerRows = [];

      if (ledgerRowsToSave.length) {
        const { data: savedRows, error: saveError } = await supabase
          .from(LEDGER_TABLE)
          .upsert(ledgerRowsToSave, { onConflict: "user_id,external_id" })
          .select("*");

        if (saveError) {
          throw saveError;
        }

        savedLedgerRows = Array.isArray(savedRows) ? savedRows : ledgerRowsToSave;
      }

      savedItems = Array.isArray(savedLedgerRows) ? savedLedgerRows.map(mapLedgerRowToLocal) : validItems;
      report.totalEfetivamenteSalvo = Array.isArray(savedLedgerRows)
        ? savedLedgerRows.length
        : ledgerRowsToSave.length;
    }

    const snapshot = await loadUserFinancialSnapshot();
    isApplyingRemoteState = true;
    window.FinanceStore.replaceAppData(snapshot.data, REMOTE_SOURCE);
    isApplyingRemoteState = false;
    await recalculateAndUpdate("import-expenses-batch", {
      data: snapshot.data,
      persistExpenses: false,
      persistLedger: false,
    });

    return {
      userId,
      report,
      processedItems,
      savedItems,
    };
  }

  async function importExpensesBatch(expenseItems, options = {}) {
    return importStatementBatch(expenseItems, options);
  }

  async function deleteExpense(id) {
    const userId = await getAuthenticatedUserId();
    const externalId = String(id || "").trim();

    if (!externalId) {
      throw new Error("Identificador da despesa nao informado.");
    }

    const supabase = await getSupabaseClient();
    const { data: existingExpense, error: lookupError } = await supabase
      .from(LEDGER_TABLE)
      .select("id, external_id")
      .eq("user_id", userId)
      .eq("external_id", externalId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (!existingExpense) {
      return false;
    }

    const { error: deleteError } = await supabase
      .from(LEDGER_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("external_id", existingExpense.external_id);

    if (deleteError) {
      throw deleteError;
    }

    const currentData = window.FinanceStore.loadAppData();
    const nextLedger = (Array.isArray(currentData.ledgerMovimentacoes)
      ? currentData.ledgerMovimentacoes
      : []
    ).filter(
      (item) =>
        String(item.external_id || item.id || "") !== existingExpense.external_id
    );
    const nextExpenses = deriveDailyExpensesFromLedgerItems(nextLedger);

    window.FinanceStore.replaceAppData(
      {
        ...currentData,
        ledgerMovimentacoes: nextLedger,
        contasDiaADia: nextExpenses,
      },
      REMOTE_SOURCE
    );

    await recalculateAndUpdate("delete-expense", {
      data: window.FinanceStore.loadAppData(),
      persistExpenses: false,
    });

    return true;
  }

  async function removeDeletedExpenses(userId, nextExpenseRows) {
    const supabase = await getSupabaseClient();
    const { data: currentRows, error } = await supabase
      .from(EXPENSES_TABLE)
      .select("external_id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const nextIds = new Set(nextExpenseRows.map((item) => item.external_id));
    const idsToDelete = (currentRows || [])
      .map((item) => item.external_id)
      .filter((externalId) => !nextIds.has(externalId));

    if (!idsToDelete.length) {
      return;
    }

    const { error: deleteError } = await supabase
      .from(EXPENSES_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("external_id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  async function removeDeletedLedgerEntries(userId, nextLedgerRows) {
    const currentRows = await fetchOptionalUserRows(LEDGER_TABLE, userId, {
      select: "external_id",
    });
    const nextIds = new Set(nextLedgerRows.map((item) => item.external_id));
    const idsToDelete = (currentRows || [])
      .map((item) => item.external_id)
      .filter((externalId) => !nextIds.has(externalId));

    if (!idsToDelete.length) {
      return;
    }

    const supabase = await getSupabaseClient();
    const { error: deleteError } = await supabase
      .from(LEDGER_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("external_id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  async function syncRemoteState(reason = "manual") {
    if (isApplyingRemoteState) {
      return null;
    }

    return recalculateAndUpdate(reason, {
      data: window.FinanceStore.loadAppData(),
      persistLedger: true,
      persistExpenses: false,
      persistFixedBills: true,
      persistCards: true,
      persistCardExpenses: true,
      persistInstallments: true,
      persistIncomes: true,
      persistBenefits: true,
    });
  }

  function queueRemoteSync(reason = "update") {
    if (isApplyingRemoteState || !hasHydratedRemoteState) {
      return;
    }

    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncRemoteState(reason);
    }, SYNC_DEBOUNCE_MS);
  }

  async function hydrateFromSupabase() {
    if (isApplyingRemoteState) {
      return hydrationPromise;
    }

    if (hydrationPromise) {
      return hydrationPromise;
    }

    hydrationPromise = (async () => {
      try {
        const user = await getAuthenticatedUser();

        if (!user) {
          hasHydratedRemoteState = true;
          return null;
        }

        const localData = window.FinanceStore.loadAppData();
        const remoteData = await loadUserFinancialData();
        const hasRemoteProfile = Boolean(remoteData.rawProfile);
        const hasRemoteLedger =
          Array.isArray(remoteData.rawLedger) && remoteData.rawLedger.length > 0;
        const hasRemoteExpenses =
          Array.isArray(remoteData.rawExpenses) && remoteData.rawExpenses.length > 0;
        const hasRemoteFixedBills =
          Array.isArray(remoteData.rawFixedBills) && remoteData.rawFixedBills.length > 0;
        const hasRemoteCards =
          Array.isArray(remoteData.rawCards) && remoteData.rawCards.length > 0;
        const hasRemoteCardExpenses =
          Array.isArray(remoteData.rawCardExpenses) && remoteData.rawCardExpenses.length > 0;
        const hasRemoteInstallments =
          Array.isArray(remoteData.rawInstallments) && remoteData.rawInstallments.length > 0;
        const hasRemoteIncomes =
          Array.isArray(remoteData.rawIncomes) && remoteData.rawIncomes.length > 0;
        const hasRemoteBenefits =
          Array.isArray(remoteData.rawBenefits) && remoteData.rawBenefits.length > 0;

        if (
          !hasRemoteProfile &&
          !hasRemoteLedger &&
          !hasRemoteExpenses &&
          !hasRemoteFixedBills &&
          !hasRemoteCards &&
          !hasRemoteCardExpenses &&
          !hasRemoteInstallments &&
          !hasRemoteIncomes &&
          !hasRemoteBenefits
        ) {
          hasHydratedRemoteState = true;
          await syncRemoteState("initial-seed");
          return {
            userId: user.id,
            data: localData,
            source: "local-cache-seeded-to-supabase",
          };
        }

        const mergedData = mergeRemoteState(
          localData,
          remoteData.rawProfile,
          remoteData.rawLedger,
          remoteData.rawExpenses,
          remoteData.rawFixedBills,
          remoteData.rawCards,
          remoteData.rawCardExpenses,
          remoteData.rawInstallments,
          remoteData.rawIncomes,
          remoteData.rawBenefits
        );
        const ledgerMigrationPending = !hasRemoteLedger && hasRemoteExpenses;
        isApplyingRemoteState = true;
        window.FinanceStore.replaceAppData(mergedData, REMOTE_SOURCE);
        isApplyingRemoteState = false;
        hasHydratedRemoteState = true;
        await recalculateAndUpdate("hydrate-from-supabase", {
          data: mergedData,
          persistLedger: ledgerMigrationPending,
          persistExpenses: false,
          persistFixedBills: false,
          persistCards: false,
          persistCardExpenses: false,
          persistInstallments: false,
          persistIncomes: false,
          persistBenefits: false,
          skipSyncedEvent: true,
        });

        window.dispatchEvent(
          new CustomEvent("mfinanceiro-supabase-hydrated", {
            detail: {
              userId: user.id,
            },
          })
        );

        return {
          userId: user.id,
          data: mergedData,
          source: "supabase",
        };
      } catch (error) {
        isApplyingRemoteState = false;
        hasHydratedRemoteState = true;

        if (isLedgerMissingError(error)) {
          console.warn(
            "[MFinanceiro Sync] O ledger central ainda nao existe no Supabase. A migration precisa ser aplicada antes da hidratacao remota ledger-first.",
            error
          );
          return null;
        }

        if (isMissingTableError(error)) {
          console.warn(
            "[MFinanceiro Sync] Persistencia remota aguardando criacao das tabelas no Supabase.",
            error
          );
          return null;
        }

        console.error("[MFinanceiro Sync] Falha ao hidratar os dados do usuario.", error);
        return null;
      } finally {
        hydrationPromise = null;
      }
    })();

    return hydrationPromise;
  }

  function bindSyncEvents() {
    window.addEventListener("finance-data-updated", (event) => {
      const source = event.detail?.source;

      if (source === REMOTE_SOURCE) {
        return;
      }

      queueRemoteSync(source || "finance-data-updated");
    });
  }

  async function bindAuthEvents() {
    try {
      const supabase = await getSupabaseClient();
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          hasHydratedRemoteState = false;
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          hasHydratedRemoteState = false;
          hydrateFromSupabase();
        }
      });
    } catch (error) {
      console.error("[MFinanceiro Sync] Falha ao conectar eventos de autenticacao.", error);
    }
  }

  function isSyncDependenciesReady() {
    return Boolean(
      window.FinanceStore?.loadAppData &&
        window.FinanceStore?.replaceAppData &&
        window.FinanceCalculations?.calculateDashboardSummary
    );
  }

  function waitForDependencies(maxAttempts = 60) {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const intervalId = window.setInterval(() => {
        attempts += 1;

        if (isSyncDependenciesReady()) {
          window.clearInterval(intervalId);
          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          window.clearInterval(intervalId);
          reject(new Error("Dependencias de sincronizacao nao ficaram prontas a tempo."));
        }
      }, 100);
    });
  }

  async function initializeSupabaseSync() {
    await waitForDependencies();
    bindSyncEvents();
    await bindAuthEvents();
    window.__mfinanceiroSupabaseHydrationReady = hydrateFromSupabase();
    await window.__mfinanceiroSupabaseHydrationReady;
  }

  window.MFinanceiroSupabaseSync = {
    addBenefit,
    addCard,
    addCardExpense,
    addExpense,
    addFixedBill,
    addIncome,
    addInstallment,
    importStatementBatch,
    importExpensesBatch,
    deleteBenefit,
    deleteCard,
    deleteCardExpense,
    deleteExpense,
    deleteFixedBill,
    deleteIncome,
    deleteInstallment,
    getBenefits,
    getCardExpenses,
    getCards,
    getLedgerMovements: async () => {
      const userId = await getAuthenticatedUserId();
      const rows = await fetchRequiredUserRows(LEDGER_TABLE, userId, {
        orders: [
          { column: "data", ascending: false },
          { column: "created_at", ascending: false },
        ],
      });
      return Array.isArray(rows) ? rows.map(mapLedgerRowToLocal) : [];
    },
    getExpenses,
    getFixedBills,
    getIncomes,
    getInstallments,
    getAuthenticatedUser,
    getAuthenticatedUserId,
    hydrateFromSupabase,
    initializeSupabaseSync,
    loadUserFinancialData,
    loadUserFinancialSnapshot,
    queueRemoteSync,
    recalculateAndUpdate,
    recalculateFinancialProfile,
    saveUserFinancialData,
    syncRemoteState,
  };

  initializeSupabaseSync().catch((error) => {
    console.error("[MFinanceiro Sync] Falha ao inicializar a sincronizacao.", error);
  });
})();
