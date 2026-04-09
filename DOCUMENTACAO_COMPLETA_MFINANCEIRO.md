# Documentacao Completa do MFinanceiro

## 1. Visao geral

O **MFinanceiro** e um aplicativo web de organizacao financeira pessoal com foco em:

- controle diario de gastos
- acompanhamento do ciclo ate o proximo pagamento
- consolidacao de movimentacoes em um **ledger central**
- sincronizacao com **Supabase**
- leitura de extrato bancario
- dashboard com graficos, alertas e insights financeiros

O projeto foi evoluido para usar o **ledger** como fonte principal das movimentacoes, enquanto a interface continua oferecendo visoes derivadas como contas do dia a dia, resumo do ciclo, categorias, prioridades e insights.

## 2. Stack e ferramentas

### Frontend

- HTML estatico por pagina
- CSS central em `public/styles.css`
- JavaScript puro em `public/src`
- Vite como bundler e servidor de desenvolvimento

### Persistencia e autenticacao

- Supabase Auth para login e cadastro
- Supabase Database para armazenamento remoto
- `localStorage` e `sessionStorage` para estado local e sessao do usuario

### Importacao de extrato

- `xlsx` para leitura de Excel
- `pdfjs-dist` para extracao de texto de PDF
- `tesseract.js` para OCR em imagens

### Build e deploy

- `vite build`
- `vercel.json` para deploy na Vercel

## 3. Scripts do projeto

Arquivo: [package.json](/e:/Mfinanceiro/package.json)

- `npm run dev`
  - sobe o Vite em ambiente de desenvolvimento
- `npm run build`
  - gera build de producao
- `npm run preview`
  - serve o build localmente
- `npm run verify:frontend`
  - valida bindings de UI e sintaxe JS

## 4. Configuracao de ambiente

Arquivo de exemplo: [.env.example](/e:/Mfinanceiro/.env.example)

Variaveis relevantes:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Tambem existem variaveis antigas de backend tradicional:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PORT`

Observacao importante:

- o arquivo [public/src/lib/config.js](/e:/Mfinanceiro/public/src/lib/config.js) atualmente expoe `window.SUPABASE_URL` e `window.SUPABASE_ANON_KEY` de forma direta no frontend
- isso funciona para o app atual, mas concentra configuracao sensivel do client em um arquivo estatico

## 5. Estrutura de pastas

### Raiz

- [index.html](/e:/Mfinanceiro/index.html)
- [login.html](/e:/Mfinanceiro/login.html)
- [register.html](/e:/Mfinanceiro/register.html)
- [package.json](/e:/Mfinanceiro/package.json)
- [vite.config.js](/e:/Mfinanceiro/vite.config.js)
- [vercel.json](/e:/Mfinanceiro/vercel.json)

### Publico

- [public/dashboard.html](/e:/Mfinanceiro/public/dashboard.html)
- [public/cadastro-bancario.html](/e:/Mfinanceiro/public/cadastro-bancario.html)
- [public/contas.html](/e:/Mfinanceiro/public/contas.html)
- [public/cartoes.html](/e:/Mfinanceiro/public/cartoes.html)
- [public/recebimentos.html](/e:/Mfinanceiro/public/recebimentos.html)
- [public/investimentos.html](/e:/Mfinanceiro/public/investimentos.html)
- [public/extrato.html](/e:/Mfinanceiro/public/extrato.html)
- [public/profile.html](/e:/Mfinanceiro/public/profile.html)
- [public/configuracoes.html](/e:/Mfinanceiro/public/configuracoes.html)
- [public/styles.css](/e:/Mfinanceiro/public/styles.css)

### Codigo fonte JS

- [public/src/lib](/e:/Mfinanceiro/public/src/lib)
- [public/src/services](/e:/Mfinanceiro/public/src/services)
- [public/src/utils](/e:/Mfinanceiro/public/src/utils)
- [public/src/pages](/e:/Mfinanceiro/public/src/pages)

### Infra e suporte

- [scripts/validate-ui-bindings.js](/e:/Mfinanceiro/scripts/validate-ui-bindings.js)
- [supabase/mfinanceiro_dashboard_schema.sql](/e:/Mfinanceiro/supabase/mfinanceiro_dashboard_schema.sql)

## 6. Mapa de navegacao do app

### Entrada

- [index.html](/e:/Mfinanceiro/index.html)
  - redireciona para o dashboard
- [login.html](/e:/Mfinanceiro/login.html)
  - tela de autenticacao
- [register.html](/e:/Mfinanceiro/register.html)
  - tela de cadastro

### Area autenticada

- [public/dashboard.html](/e:/Mfinanceiro/public/dashboard.html)
  - painel principal com metricas, grafico, categorias, lancamentos e insights
- [public/cadastro-bancario.html](/e:/Mfinanceiro/public/cadastro-bancario.html)
  - configuracao da base financeira do usuario
- [public/recebimentos.html](/e:/Mfinanceiro/public/recebimentos.html)
  - gestao de recebimentos e beneficios
- [public/contas.html](/e:/Mfinanceiro/public/contas.html)
  - contas fixas, contas variaveis, parcelamentos e cartoes
- [public/cartoes.html](/e:/Mfinanceiro/public/cartoes.html)
  - gestao dedicada de cartoes e gastos do cartao
- [public/investimentos.html](/e:/Mfinanceiro/public/investimentos.html)
  - registro e acompanhamento de investimentos
- [public/extrato.html](/e:/Mfinanceiro/public/extrato.html)
  - importacao de extrato e revisao das movimentacoes importadas
- [public/profile.html](/e:/Mfinanceiro/public/profile.html)
  - dados do perfil do usuario

## 7. Arquitetura funcional

O app segue a arquitetura:

**Pagina HTML -> Page Controller -> FinanceStore -> FinanceCalculations -> SupabaseSync -> Dashboard/UI**

### Camadas

#### 7.1 Interface

- HTML por pagina
- estilos globais em [public/styles.css](/e:/Mfinanceiro/public/styles.css)
- componentes visuais montados por JS de cada pagina

#### 7.2 Controladores de pagina

Arquivos em [public/src/pages](/e:/Mfinanceiro/public/src/pages)

Cada pagina:

- le o estado atual
- renderiza dados
- captura eventos do usuario
- salva ou sincroniza mudancas

#### 7.3 Store local

Arquivo: [public/src/services/finance-store.js](/e:/Mfinanceiro/public/src/services/finance-store.js)

Responsabilidades:

- gerenciar estado financeiro local
- padronizar estrutura de dados
- salvar em `localStorage` por escopo do usuario
- emitir atualizacao da aplicacao

#### 7.4 Calculos financeiros

Arquivo: [public/src/utils/finance-calculations.js](/e:/Mfinanceiro/public/src/utils/finance-calculations.js)

Responsabilidades:

- resumir ciclo financeiro
- calcular pagamentos, limite diario, saldo e prioridades
- preparar dados para graficos
- gerar inteligencia financeira e mensagens de insight

#### 7.5 Sincronizacao remota

Arquivo: [public/src/services/supabase-sync.js](/e:/Mfinanceiro/public/src/services/supabase-sync.js)

Responsabilidades:

- autenticar o usuario Supabase
- buscar e hidratar dados do banco
- salvar estado financeiro no banco
- sincronizar ledger, contas, cartoes, parcelamentos, recebimentos e beneficios

## 8. Sessao e autenticacao

### Modulo

Arquivo: [public/src/lib/auth-session.js](/e:/Mfinanceiro/public/src/lib/auth-session.js)

### Estrategia

- a sessao de frontend e guardada em `sessionStorage`
- chave usada: `mfinanceiro_auth`
- `window.AuthSession.requireAuth()` protege paginas autenticadas

### Funcoes principais

- `saveAuthSession(user)`
- `getAuthSession()`
- `clearAuthSession()`
- `isAuthenticated()`
- `requireAuth()`

### Bootstrap do Supabase

Arquivos:

- [public/src/lib/config.js](/e:/Mfinanceiro/public/src/lib/config.js)
- [public/src/lib/supabase-bootstrap.js](/e:/Mfinanceiro/public/src/lib/supabase-bootstrap.js)

Funcoes principais:

- `loadSupabaseScript()`
- `initializeSupabaseClient()`

Objetos globais expostos:

- `window.SupabaseClient`
- `window.__supabaseReady`

## 9. Shell da aplicacao

Arquivo: [public/src/services/app-shell.js](/e:/Mfinanceiro/public/src/services/app-shell.js)

### Responsabilidades

- renderizar sidebar
- exibir nome, email e avatar do usuario
- controlar logout
- fornecer acoes rapidas por pagina

### Navegacao principal configurada

- Visao geral -> Dashboard
- Operacao -> Base financeira, Recebimentos, Contas, Cartoes
- Planejamento -> Investimentos

### Funcoes principais

- `renderSidebarNavigation()`
- `getPageQuickActions()`
- `renderSidebarActions()`
- `renderSidebar()`
- `fillUserData()`
- `bindLogoutButtons()`
- `refreshAppShell()`
- `initAppShell()`

## 10. Store local e modelo de dados

Arquivo: [public/src/services/finance-store.js](/e:/Mfinanceiro/public/src/services/finance-store.js)

### Papel central

Esse modulo e o **nucleo local de dados** do app.

Ele:

- define o formato base do estado
- normaliza dados antigos e novos
- mantem compatibilidade entre dados locais, ledger e estruturas derivadas
- atualiza snapshots locais por secao

### Chaves de armazenamento

- `cadastroBancario`
- `perfilMFinanceiro`
- `registroPagamento`
- `beneficios`
- `ledgerMovimentacoes`
- `contasFixas`
- `contasVariaveis`
- `contasVariaveisManuais`
- `contasVariaveisImportadas`
- `cartoes`
- `gastosCartao`
- `investimentos`
- `parcelamentos`

### Conceitos importantes

#### Ledger

`ledgerMovimentacoes` e a estrutura central de movimentacoes do app. Cada item pode representar:

- entrada
- saida
- item manual
- item importado de extrato

#### Estruturas derivadas

Mesmo com o ledger, o app ainda mantem estruturas derivadas para compatibilidade, como:

- `contasDiaADia`
- listas de cartoes
- parcelamentos
- recebimentos

### Funcoes principais do store

#### Escopo e persistencia

- `getCurrentUserStorageScope()`
- `getScopedStorageKey()`
- `ensureScopedStorageMigration()`
- `readJsonStorage()`
- `writeJsonStorage()`
- `writeScopedJsonStorage()`

#### Normalizacao e utilitarios

- `createId()`
- `toNumber()`
- `roundCurrency()`
- `normalizeLegacyData()`
- `mergeData()`
- `normalizeLedgerItem()`
- `deriveDailyExpensesFromLedger()`
- `mergeLedgerMovementsWithManualExpenses()`

#### Estado base

- `getDefaultAppData()`
- `loadAppData()`
- `saveAppData()`
- `replaceAppData()`
- `updateAppData()`
- `dispatchFinanceUpdate()`

#### Cadastro bancario e ciclo

- `salvarCadastroBancario()`
- `carregarCadastroBancario()`
- `calcularDescontosManuais()`
- `calcularINSS()`
- `calcularIRPF()`
- `calcularSalarioLiquido()`
- `calcularSalarioLiquidoBanco()`

#### Recebimentos e beneficios

- `carregarRecebimento()`
- `salvarRecebimento()`
- `carregarRegistroPagamento()`
- `salvarRegistroPagamento()`
- `carregarVRVA()`
- `salvarVRVA()`
- `carregarBeneficios()`
- `salvarBeneficios()`

#### Contas e despesas

- `carregarContasFixas()`
- `carregarContasVariaveis()`
- `salvarContas()`
- `salvarContaFixa()`
- `salvarContaVariavel()`
- `salvarContasVariaveisImportadas()`

#### Cartoes e parcelamentos

- `carregarCartoes()`
- `salvarCartao()`
- `carregarLancamentosCartao()`
- `salvarLancamentoCartao()`
- `salvarParcelamento()`
- `carregarParcelamentos()`

#### Investimentos

- `carregarInvestimentos()`
- `salvarInvestimento()`

#### Eventos

- `subscribe(listener)`

### API global exposta

`window.FinanceStore`

## 11. Camada de calculos financeiros

Arquivo: [public/src/utils/finance-calculations.js](/e:/Mfinanceiro/public/src/utils/finance-calculations.js)

Esse modulo concentra:

- normalizacao de datas e valores
- resumo do ciclo
- previsoes
- projeções
- graficos
- prioridades
- inteligencia financeira

### Blocos funcionais

#### 11.1 Normalizacao e formatacao

- `normalizeDate()`
- `safeNormalizeDate()`
- `normalizeNumericValue()`
- `formatCurrency()`
- `formatDate()`
- `formatDateLong()`
- `formatTimeLabel()`
- `formatPercentLabel()`
- `normalizeMovementType()`

#### 11.2 Pagamento, beneficios e ciclo

- `getPaymentSchedule()`
- `getSortedPaymentDays()`
- `getPaymentPercentages()`
- `getTotalDiscounts()`
- `getNetSalary()`
- `calcularProximoPagamento()`
- `getNextBenefitInfo()`
- `getBenefitsSummary()`

#### 11.3 Contas, cartoes e prioridades

- `getAccountsInCycle()`
- `getCardsSummary()`
- `getInstallmentsSummary()`
- `calcularPrioridadesDoCiclo()`
- `classifyCyclePriority()`
- `ordenarPendenciasPorPrioridade()`
- `buildCyclePriorityMessage()`

#### 11.4 Leitura do ledger

- `getLedgerMovementItems()`
- `normalizeLedgerMovement()`
- `getLedgerMovements()`
- `getLedgerExpenseEntries()`
- `getLedgerIncomeEntries()`
- `getDailyExpensesSummary()`
- `getFinancialEntries()`

#### 11.5 Dados para dashboard e graficos

- `getExpensePeriodDescriptor()`
- `getEntriesWithinRange()`
- `getDashboardExpenseItems()`
- `normalizeDashboardExpenseItem()`
- `normalizeDashboardExpenses()`
- `getDespesasDoDia()`
- `getDespesasDaSemana()`
- `getDespesasDoMes()`
- `getDespesasPorPeriodo()`
- `prepareEvolutionChartData()`
- `prepareCategoryChartData()`
- `prepareSummaryData()`
- `prepareDashboardChartData()`
- `getExpensePeriodSummary()`
- `getExpenseOverviewSummary()`

#### 11.6 Classificacao e automacao

- `normalizeCategoryDescription()`
- `classifyCategoryFromDescription()`
- `resolveMovementClassification()`
- `getCategoryAutomationRules()`

#### 11.7 Inteligencia financeira

- `buildAutomaticPeriodSummary()`
- `buildDailySpendSeries()`
- `getRecentLedgerWindowSummary()`
- `buildWeekdaySpendPattern()`
- `buildBehaviorPatternSignals()`
- `buildComparisonSnapshot()`
- `buildCategoryAnalytics()`
- `buildRecurringDescriptionAnalytics()`
- `buildFinancialInsightMessages()`
- `calculateFinancialIntelligence()`

#### 11.8 Resumos e projecoes principais

- `calcularResumoFinanceiro()`
- `calculatePrimaryFinancialMetrics()`
- `calcularResumoDiario()`
- `calcularResumoDoDia()`
- `buildBalanceProjection()`
- `montarProjecaoSaldoPorDia()`
- `montarSerieGraficoContasVariaveis()`
- `montarSerieGrafico()`
- `agruparLancamentosPorData()`
- `agruparLancamentosPorDia()`

### API global exposta

`window.FinanceCalculations`

## 12. Sincronizacao com Supabase

Arquivo: [public/src/services/supabase-sync.js](/e:/Mfinanceiro/public/src/services/supabase-sync.js)

### Objetivo

Fazer o app funcionar com:

- dados locais
- hidratacao remota
- sync debounce
- ledger como fonte remota de verdade

### Tabelas utilizadas

- `mf_finance_profiles`
- `mf_finance_ledger_entries`
- `mf_finance_expenses`
- `mf_finance_fixed_bills`
- `mf_finance_cards`
- `mf_finance_card_expenses`
- `mf_finance_installments`
- `mf_finance_incomes`
- `mf_finance_benefits`

### Constantes importantes

- `REMOTE_SOURCE = "supabase-remote"`
- `SYNC_DEBOUNCE_MS = 400`

### Blocos funcionais

#### 12.1 Normalizacao de payload

- `normalizeNumber()`
- `normalizeDateForDatabase()`
- `normalizeText()`
- `normalizeBoolean()`
- `normalizeBenefitTypeKey()`
- `normalizeIncomeStatus()`

#### 12.2 Usuario e cliente

- `getSupabaseClient()`
- `getAuthenticatedUser()`
- `getAuthenticatedUserId()`

#### 12.3 Conversao local <-> remoto

- `buildProfilePayload()`
- `buildCalculatedAppData()`
- `mapLedgerRowToLocal()`
- `buildLedgerRow()`
- `buildLocalDataFromRemote()`
- `mapProfileRowToLocal()`
- `mapIncomeRowToLocal()`
- `buildIncomeRow()`
- `mapBenefitRowToLocal()`
- `buildBenefitRow()`
- `mapExpenseRowToLocal()`
- `buildExpenseRow()`
- `mapFixedBillRowToLocal()`
- `buildFixedBillRow()`
- `mapCardRowToLocal()`
- `buildCardRow()`
- `mapCardExpenseRowToLocal()`
- `buildCardExpenseRow()`
- `mapInstallmentRowToLocal()`
- `buildInstallmentRow()`

#### 12.4 Reconstrucao local

- `replaceLocalCards()`
- `replaceLocalCardExpenses()`
- `replaceLocalInstallments()`
- `replaceLocalFixedBills()`
- `replaceLocalExpenses()`
- `replaceLocalLedgerMovements()`
- `replaceLocalReceipts()`
- `mergeRemoteState()`

#### 12.5 Hydration e sync

- `fetchRemoteState()`
- `saveUserFinancialData()`
- `loadUserFinancialData()`
- `loadUserFinancialSnapshot()`
- `syncRemoteState()`
- `queueRemoteSync()`
- `hydrateFromSupabase()`
- `bindSyncEvents()`
- `bindAuthEvents()`
- `initializeSupabaseSync()`

#### 12.6 CRUD remoto

Recebimentos:

- `getIncomes()`
- `addIncome()`
- `deleteIncome()`
- `getBenefits()`
- `addBenefit()`
- `deleteBenefit()`

Parcelamentos:

- `getInstallments()`
- `addInstallment()`
- `deleteInstallment()`

Cartoes:

- `getCards()`
- `addCard()`
- `deleteCard()`
- `getCardExpenses()`
- `addCardExpense()`
- `deleteCardExpense()`

Contas:

- `getFixedBills()`
- `addFixedBill()`
- `deleteFixedBill()`
- `getExpenses()`
- `addExpense()`
- `deleteExpense()`

Importacao:

- `importStatementBatch()`
- `importExpensesBatch()`

Recalculo:

- `recalculateAndUpdate()`
- `recalculateFinancialProfile()`

### API global exposta

`window.MFinanceiroSupabaseSync`

## 13. Banco de dados Supabase

Arquivo: [supabase/mfinanceiro_dashboard_schema.sql](/e:/Mfinanceiro/supabase/mfinanceiro_dashboard_schema.sql)

### Tabelas criadas

- `mf_finance_profiles`
- `mf_finance_expenses`
- `mf_finance_ledger_entries`
- `mf_finance_fixed_bills`
- `mf_finance_cards`
- `mf_finance_card_expenses`
- `mf_finance_installments`
- `mf_finance_incomes`
- `mf_finance_benefits`

### Estrutura geral do ledger

A tabela `mf_finance_ledger_entries` foi desenhada para armazenar movimentacoes financeiras centralizadas.

Campos nucleares esperados:

- `id`
- `user_id`
- `valor`
- `tipo`
- `categoria`
- `descricao`
- `data`
- `external_id`
- `created_at`

### Seguranca

O schema ativa **RLS** nas tabelas.

Padrao das policies:

- somente o usuario autenticado gerencia os proprios dados
- regra baseada em `auth.uid() = user_id`

## 14. Importacao de extrato

Pagina: [public/extrato.html](/e:/Mfinanceiro/public/extrato.html)  
Controller: [public/src/pages/extrato.js](/e:/Mfinanceiro/public/src/pages/extrato.js)

### Objetivo

Receber arquivos de extrato e transforma-los em movimentacoes canonicamente padronizadas para o ledger.

### Formatos tratados

- Excel
- PDF
- imagem
- CSV

### Pipeline

1. Upload do arquivo
2. Deteccao do formato
3. Extracao de linhas cruas
4. Identificacao de data, descricao, valor, tipo, categoria e external_id
5. Normalizacao para item canonico
6. Marcacao como valida, rejeitada ou duplicada
7. Persistencia no Supabase
8. Atualizacao do dashboard

### Funcoes relevantes

#### Infra de importacao

- `createImportReport()`
- `finalizeImportReport()`
- `buildImportReportMessage()`
- `mergeImportReports()`
- `buildStatementLineError()`

#### Parser comum

- `createCanonicalImportedItem()`
- `normalizeStatementDate()`
- `inferMovementType()`
- `suggestImportCategory()`
- `extractImportDate()`
- `extractImportAmount()`

#### Texto livre

- `parseMovementFromTextLine()`
- `parseStructuredTextLine()`
- `extractRawMovementsFromTextLines()`
- `normalizeRawMovements()`

#### Excel

- `getExcelColumnMap()`
- `findExcelHeaderDefinition()`
- `normalizeExcelDateValue()`
- `resolveExcelMovement()`
- `buildExcelImportedItem()`
- `parseXLSX()`

#### CSV

- `parseCSV()`
- `parseMercadoPagoCSV()`
- `parseGenericCSV()`

#### PDF e imagem

- `extractPdfTextLines()`
- `parsePDFStatement()`
- `parseImageStatement()`
- `getPdfParserModule()`
- `getStatementOcrWorker()`

#### Fluxo da pagina

- `processStatementFile()`
- `renderStatementPreview()`
- `confirmImportedExpenses()`
- `acceptStatementBalance()`
- `switchToManualBalance()`

## 15. Dashboard

Pagina: [public/dashboard.html](/e:/Mfinanceiro/public/dashboard.html)  
Controller: [public/src/pages/dashboard.js](/e:/Mfinanceiro/public/src/pages/dashboard.js)

### Objetivo

Exibir rapidamente:

- saldo disponivel
- limite diario
- dias restantes
- gasto de hoje
- grafico do periodo
- resumo do periodo
- categorias
- ultimos lancamentos
- prioridades
- insights

### Estrutura funcional

- tabs internas: visao geral, detalhes, insights, historico
- cards de metricas
- linha de alerta + insight
- grafico principal
- resumo do periodo
- categorias que mais gastam
- ultimos lancamentos
- prioridades do ciclo

### Funcoes principais

#### UI e estado visual

- `switchDashboardTab()`
- `setTrendTone()`
- `setMetricFooter()`
- `setChipTone()`
- `setSurfaceTone()`
- `setDailyLimitHighlight()`
- `setDashboardCardSignal()`
- `setMessageBoxTone()`

#### Interpretacao de estado

- `getDailyLimitStatus()`
- `buildFinancialHealthStatus()`
- `buildDashboardAlerts()`

#### Renderizacao

- `renderMetrics()`
- `renderProjection()`
- `atualizarGraficoDashboard()`
- `renderExpenseOverview()`
- `renderOverviewSpotlights()`
- `renderRecentTransactions()`
- `renderExpensePeriodFilters()`
- `renderExpenseEvolution()`
- `renderExpenseCategories()`
- `renderInsights()`
- `renderDailySummary()`
- `renderAlerts()`
- `renderSummaryTable()`

#### Integracao

- `hydrateDashboardData()`
- `atualizarDashboard()`
- `logDashboardIntegrationDebug()`

### API global

- `window.atualizarDashboard`

## 16. Páginas funcionais

### 16.1 Base financeira

Arquivos:

- [public/cadastro-bancario.html](/e:/Mfinanceiro/public/cadastro-bancario.html)
- [public/src/pages/cadastro-bancario.js](/e:/Mfinanceiro/public/src/pages/cadastro-bancario.js)

Responsabilidades:

- cadastrar saldo atual
- salario bruto
- dependentes
- descontos
- ciclo de pagamento
- formas de recebimento
- revisar extrato em contexto bancario

Funcoes principais:

- `buildBankingPayload()`
- `renderBankingForm()`
- `updateSalaryPreview()`
- `updateCyclePreview()`
- `updateSummaryPreview()`
- `handleSaveBanking()`

### 16.2 Recebimentos

Arquivos:

- [public/recebimentos.html](/e:/Mfinanceiro/public/recebimentos.html)
- [public/src/pages/recebimentos.js](/e:/Mfinanceiro/public/src/pages/recebimentos.js)

Responsabilidades:

- registrar recebimentos
- marcar recebimento principal
- registrar beneficios
- atualizar recibos do ciclo

Funcoes principais:

- `renderIncomeList()`
- `renderBenefitList()`
- `renderReceiptArea()`
- `savePaymentReceipt()`
- `markPaymentAsReceived()`
- `saveBenefitReceipt()`
- `initializeReceiptsPage()`

### 16.3 Contas

Arquivos:

- [public/contas.html](/e:/Mfinanceiro/public/contas.html)
- [public/src/pages/contas.js](/e:/Mfinanceiro/public/src/pages/contas.js)

Responsabilidades:

- contas fixas
- contas variaveis
- parcelamentos
- cartoes
- importacao simples de contas

Funcoes principais:

- `renderFixedAccounts()`
- `renderDailyExpenses()`
- `renderInstallments()`
- `renderCards()`
- `handleFixedSubmit()`
- `handleDailySubmit()`
- `handleInstallmentSubmit()`
- `handleCardSubmit()`
- `handleLaunchSubmit()`

### 16.4 Cartoes

Arquivos:

- [public/cartoes.html](/e:/Mfinanceiro/public/cartoes.html)
- [public/src/pages/cartoes.js](/e:/Mfinanceiro/public/src/pages/cartoes.js)

Responsabilidades:

- cadastro de cartoes
- lancamentos de cartao
- visualizacao de uso por cartao

Funcoes principais:

- `renderCardsPage()`
- `handleCardSubmit()`
- `handleLaunchSubmit()`
- `handleCardsTableClick()`

### 16.5 Investimentos

Arquivos:

- [public/investimentos.html](/e:/Mfinanceiro/public/investimentos.html)
- [public/src/pages/investimentos.js](/e:/Mfinanceiro/public/src/pages/investimentos.js)

Responsabilidades:

- registrar investimentos
- mostrar sugestoes simples

Funcoes principais:

- `renderInvestmentPage()`
- `handleInvestmentSubmit()`
- `confirmSuggestion()`
- `ignoreSuggestion()`

### 16.6 Perfil

Arquivos:

- [public/profile.html](/e:/Mfinanceiro/public/profile.html)
- [public/src/pages/profile.js](/e:/Mfinanceiro/public/src/pages/profile.js)

Responsabilidades:

- nome, foto e dados basicos do usuario

Funcoes principais:

- `fillProfileForm()`
- `buildProfilePayload()`
- `persistProfile()`
- `renderPhoto()`
- `handleSaveProfile()`
- `handlePhotoChange()`

### 16.7 Login e cadastro

Arquivos:

- [login.html](/e:/Mfinanceiro/login.html)
- [public/src/pages/login.js](/e:/Mfinanceiro/public/src/pages/login.js)
- [register.html](/e:/Mfinanceiro/register.html)
- [public/src/pages/register.js](/e:/Mfinanceiro/public/src/pages/register.js)

Responsabilidades:

- autenticar usuario
- registrar nova conta
- criar sessao local

## 17. Fluxo de dados do app

### 17.1 Fluxo manual de despesa

1. usuario adiciona despesa em `contas` ou outra tela
2. pagina chama store ou sync remoto
3. dado e normalizado
4. movimentacao entra no ledger
5. dados derivados sao recalculados
6. dashboard e atualizado
7. sync debounce envia ao Supabase

### 17.2 Fluxo de importacao de extrato

1. usuario envia arquivo
2. parser detecta formato
3. linhas sao lidas
4. itens viram estrutura canonica
5. duplicadas e invalidas sao separadas
6. validas vao para `importStatementBatch()`
7. Supabase recebe o lote
8. store local e reidratado
9. dashboard reflete o novo estado

### 17.3 Fluxo de dashboard

1. dashboard hidrata dados com `hydrateDashboardData()`
2. consulta `FinanceStore`
3. usa `FinanceCalculations`
4. monta metricas, grafico, categorias e insights
5. reage a `window.atualizarDashboard()`

## 18. Regras e premissas de negocio presentes

### Folha e ciclo

- calculo de INSS por tabela
- calculo de IRPF com reducoes mensais
- desconto simplificado e dependentes
- pagamento principal e beneficios em datas diferentes

### Financeiro

- limite diario ate o proximo pagamento
- prioridades do ciclo
- risco de saldo acabar antes do pagamento
- categoria dominante
- media diaria
- comparacao com media recente
- leitura do comportamento por dia da semana

### Importacao

- entradas e saidas sao diferenciadas por `tipo`
- uso de `external_id` quando disponivel
- fallback de deduplicacao por combinacao segura de campos

## 19. Ferramentas internas de validacao

### Verificacao de bindings

Arquivo: [scripts/validate-ui-bindings.js](/e:/Mfinanceiro/scripts/validate-ui-bindings.js)

Objetivo:

- garantir que os elementos esperados pelos JS de pagina existam no HTML

### Build do frontend

- `npm run build`

### Verificacao combinada

- `npm run verify:frontend`

## 20. Deploy

Arquivo: [vercel.json](/e:/Mfinanceiro/vercel.json)

Configuracao atual:

- `buildCommand: npm run build`
- `outputDirectory: dist`

## 21. Pontos de atencao tecnicos

### 21.1 Configuracao Supabase no frontend

O app usa [public/src/lib/config.js](/e:/Mfinanceiro/public/src/lib/config.js) com as credenciais do client embutidas em JS.

### 21.2 Coexistencia entre ledger e estruturas derivadas

Embora o ledger seja a fonte principal de movimentacoes, o app ainda mantem estruturas derivadas como `contasDiaADia` para compatibilidade de UI e fluxo historico.

### 21.3 Forte dependencia de objetos globais

O projeto usa objetos globais como:

- `window.AuthSession`
- `window.FinanceStore`
- `window.FinanceCalculations`
- `window.MFinanceiroSupabaseSync`
- `window.atualizarDashboard`

Isso simplifica o frontend atual, mas exige cuidado com ordem de carregamento dos scripts.

### 21.4 Importacao multi-formato

O pipeline de extrato e flexivel, mas depende de heuristicas de parsing e OCR para alguns formatos, o que exige atencao em arquivos muito fora do padrao.

## 22. Ordem de carregamento principal do dashboard

Arquivo base: [public/dashboard.html](/e:/Mfinanceiro/public/dashboard.html)

Scripts carregados:

1. `auth-session.js`
2. `config.js`
3. `@supabase/supabase-js`
4. `supabase-bootstrap.js`
5. `finance-store.js`
6. `finance-calculations.js`
7. `app-shell.js`
8. `supabase-sync.js`
9. `dashboard.js`

Essa ordem e importante porque:

- autenticacao precisa existir antes da pagina
- Supabase precisa estar pronto antes do sync
- store e calculos precisam existir antes da renderizacao do dashboard

## 23. Resumo executivo

O MFinanceiro hoje e composto por:

- autenticacao com Supabase
- store local com escopo por usuario
- sincronizacao remota com tabelas financeiras dedicadas
- ledger central de movimentacoes
- pipeline de importacao de extrato
- motor de calculos financeiros e inteligencia
- dashboard analitico com dados reais

Os modulos mais importantes do sistema sao:

- [public/src/services/finance-store.js](/e:/Mfinanceiro/public/src/services/finance-store.js)
- [public/src/utils/finance-calculations.js](/e:/Mfinanceiro/public/src/utils/finance-calculations.js)
- [public/src/services/supabase-sync.js](/e:/Mfinanceiro/public/src/services/supabase-sync.js)
- [public/src/pages/dashboard.js](/e:/Mfinanceiro/public/src/pages/dashboard.js)
- [public/src/pages/extrato.js](/e:/Mfinanceiro/public/src/pages/extrato.js)

## 24. Documentos relacionados

- [ENV_SETUP.md](/e:/Mfinanceiro/ENV_SETUP.md)
- [DOCUMENTACAO_RECRIACAO_IA.md](/e:/Mfinanceiro/DOCUMENTACAO_RECRIACAO_IA.md)
- [supabase/mfinanceiro_dashboard_schema.sql](/e:/Mfinanceiro/supabase/mfinanceiro_dashboard_schema.sql)

