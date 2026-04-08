(function () {
  const PROFILES_TABLE = "mf_finance_profiles";
  const EXPENSES_TABLE = "mf_finance_expenses";
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
      saldo_restante: normalizeNumber(summary.saldo_restante),
      dias_restantes: normalizeNumber(summary.dias_restantes),
      limite_diario: normalizeNumber(summary.limite_diario),
      updated_at: new Date().toISOString(),
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
        ...receiptsData,
        pagamento: {
          ...(receiptsData.pagamento || {}),
          dataPrevista:
            receiptsData.pagamento?.dataPrevista ||
            normalizeDateForDatabase(profileRow.proximo_pagamento_data) ||
            "",
          valorPrevisto:
            receiptsData.pagamento?.valorPrevisto !== undefined
              ? receiptsData.pagamento.valorPrevisto
              : normalizeNumber(profileRow.proximo_pagamento_valor),
        },
      },
      investimentos: investmentsData,
      resumoFinanceiro: {
        saldo_restante: normalizeNumber(profileRow.saldo_restante),
        dias_restantes: normalizeNumber(profileRow.dias_restantes),
        limite_diario: normalizeNumber(profileRow.limite_diario),
      },
      rawProfileRow: profileRow,
    };
  }

  function buildExpenseRows(userId, appData) {
    return (Array.isArray(appData.contasDiaADia) ? appData.contasDiaADia : [])
      .map((item) => ({
        user_id: userId,
        external_id: String(item.id || ""),
        descricao: item.descricao || "Lancamento",
        categoria: item.categoria || "outros",
        valor: normalizeNumber(item.valor),
        data: normalizeDateForDatabase(item.data || item.dataNormalizada),
        tipo: item.tipo || "saida",
        origem: item.origem || "manual",
        metadata: item,
        updated_at: new Date().toISOString(),
      }))
      .filter((item) => item.external_id && item.data);
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

  function mergeRemoteState(localData, profileRow, expenseRows) {
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
        ...(localData.recebimentos || {}),
        ...receiptsData,
      },
      investimentos: {
        ...(localData.investimentos || {}),
        ...investmentsData,
      },
      contasDiaADia: Array.isArray(expenseRows)
        ? expenseRows.map(mapExpenseRowToLocal)
        : localData.contasDiaADia || [],
    };
  }

  function isMissingTableError(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("does not exist") || message.includes("relation");
  }

  async function fetchRemoteState(userId) {
    const supabase = await getSupabaseClient();
    const profileRequest = supabase
      .from(PROFILES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const expensesRequest = supabase
      .from(EXPENSES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("data", { ascending: false });

    const [{ data: profile, error: profileError }, { data: expenses, error: expensesError }] =
      await Promise.all([profileRequest, expensesRequest]);

    if (profileError) {
      throw profileError;
    }

    if (expensesError) {
      throw expensesError;
    }

    return {
      profile: profile || null,
      expenses: expenses || [],
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
      expenses: Array.isArray(remoteState.expenses)
        ? remoteState.expenses.map(mapExpenseRowToLocal)
        : [],
      rawProfile: remoteState.profile,
      rawExpenses: remoteState.expenses || [],
    };
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

  async function syncRemoteState(reason = "manual") {
    if (isApplyingRemoteState) {
      return;
    }

    if (syncPromise) {
      return syncPromise;
    }

    syncPromise = (async () => {
      const user = await getAuthenticatedUser();

      if (!user) {
        return;
      }

      const appData = window.FinanceStore.loadAppData();
      const expenseRows = buildExpenseRows(user.id, appData);
      await saveUserFinancialData(appData);

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

      window.dispatchEvent(
        new CustomEvent("mfinanceiro-supabase-synced", {
          detail: {
            reason,
          },
        })
      );
    })()
      .catch((error) => {
        if (isMissingTableError(error)) {
          console.warn(
            "[MFinanceiro Sync] Tabelas do Supabase ainda nao existem. Execute o SQL da pasta supabase para ativar a persistencia remota.",
            error
          );
          return;
        }

        console.error("[MFinanceiro Sync] Falha ao sincronizar dados com o Supabase.", error);
      })
      .finally(() => {
        syncPromise = null;
      });

    return syncPromise;
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
        const hasRemoteExpenses =
          Array.isArray(remoteData.rawExpenses) && remoteData.rawExpenses.length > 0;

        if (!hasRemoteProfile && !hasRemoteExpenses) {
          hasHydratedRemoteState = true;
          await syncRemoteState("initial-seed");
          return {
            userId: user.id,
            data: localData,
            source: "local-cache-seeded-to-supabase",
          };
        }

        const mergedData = mergeRemoteState(localData, remoteData.rawProfile, remoteData.rawExpenses);
        isApplyingRemoteState = true;
        window.FinanceStore.replaceAppData(mergedData, REMOTE_SOURCE);
        isApplyingRemoteState = false;
        hasHydratedRemoteState = true;

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
    getAuthenticatedUser,
    getAuthenticatedUserId,
    hydrateFromSupabase,
    initializeSupabaseSync,
    loadUserFinancialData,
    queueRemoteSync,
    saveUserFinancialData,
    syncRemoteState,
  };

  initializeSupabaseSync().catch((error) => {
    console.error("[MFinanceiro Sync] Falha ao inicializar a sincronizacao.", error);
  });
})();
