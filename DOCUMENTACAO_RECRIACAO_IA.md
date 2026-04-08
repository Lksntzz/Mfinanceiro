# MFinanceiro - Documentacao de Produto e Base Tecnica para Recriacao por IA

## 1. Resumo executivo

O MFinanceiro e um aplicativo web de planejamento financeiro pessoal com foco em uma pergunta central:

"Quanto posso gastar por dia sem faltar dinheiro ate o proximo pagamento?"

O produto combina:

- autenticacao de usuario
- cadastro da base financeira
- controle de contas fixas
- controle de gastos do dia a dia
- controle de cartoes e parcelamentos
- previsao de recebimentos e beneficios
- sugestao simples de investimento
- dashboard com leitura consolidada do ciclo financeiro

O conceito principal nao e "controle financeiro completo por categorias contabeis", e sim "sobrevivencia e planejamento ate o proximo pagamento".

---

## 2. Objetivo de negocio

### 2.1 Problema que o produto resolve

O usuario normalmente sabe:

- quanto tem no banco hoje
- quando vai receber de novo
- quais contas vao vencer

Mas nao consegue responder com seguranca:

- quanto ainda sobra de verdade
- quanto do saldo ja esta comprometido
- quanto pode gastar por dia
- se o ciclo atual esta saudavel ou em risco

### 2.2 Objetivo principal do produto

Transformar saldo atual, contas, recebimentos e gastos em uma leitura objetiva do ciclo financeiro atual.

### 2.3 Resultado esperado para o usuario

Ao usar o app, o usuario deve conseguir:

- registrar a base financeira do mes
- cadastrar despesas vinculadas ao proprio usuario
- visualizar somente os dados dele
- entender o valor comprometido do ciclo
- entender o saldo restante real
- ver os dias restantes ate o proximo pagamento
- receber um limite diario sugerido

---

## 3. Publico-alvo

- trabalhadores CLT ou autonomos com um ou dois recebimentos por mes
- pessoas que controlam o dinheiro "ate o proximo pagamento"
- usuarios que precisam de uma leitura simples, pratica e operacional

---

## 4. Conceito central do produto

O app gira em torno de um **ciclo financeiro**.

Esse ciclo vai de:

- data atual ou ultimo pagamento relevante

ate:

- proximo pagamento previsto

Dentro desse ciclo, o sistema calcula:

- contas fixas que vencem no periodo
- faturas de cartao que vencem no periodo
- parcelamentos que entram no periodo
- gastos variaveis registrados no dia a dia
- beneficios previstos, como VR/VA

---

## 5. Stack e arquitetura atual

## 5.1 Frontend ativo

Fluxo atualmente ativo:

- HTML/CSS/JS estatico em `public/`
- build com Vite para `dist/`
- cliente Supabase carregado no navegador
- autenticacao feita no frontend com Supabase Auth
- estado financeiro salvo localmente e sincronizado com Supabase

Arquivos-base do frontend:

- `public/login.html`
- `public/register.html`
- `public/dashboard.html`
- `public/finance-store-v2.js`
- `public/finance-calculations-v2.js`
- `public/mfinanceiro-supabase-sync.js`
- `public/app-shell.js`

## 5.2 Backend atual

Existe um backend Node/Express com MariaDB:

- `server.js`
- `src/routes/authRoutes.js`
- `src/controllers/authController.js`
- `src/services/authService.js`
- `src/config/db.js`

Mas hoje ele e **legado / secundario** para autenticacao, porque o login e cadastro ativos usam Supabase no frontend.

O backend ainda serve:

- arquivos estaticos
- rotas REST antigas de autenticacao
- inicializacao de banco MariaDB legado

## 5.3 Persistencia atual

Persistencia atual e hibrida:

- `sessionStorage` para sessao visual do usuario autenticado
- `localStorage` para cache financeiro local por usuario
- Supabase para persistencia remota do estado financeiro

## 5.4 Deploy atual

- build: `npm run build`
- output publicado: `dist`
- configuracao Vercel em `vercel.json`

---

## 6. Modulos do produto

## 6.1 Autenticacao

### Objetivo

Permitir cadastro, login, sessao e logout.

### Fluxo ativo

- `public/register.html` + `public/register-static.js`
- `public/login.html` + `public/login-static.js`
- `public/supabase-bootstrap.js`
- `public/auth.js`

### Comportamento

- cadastro via `supabase.auth.signUp`
- login via `supabase.auth.signInWithPassword`
- sessao visual salva em `sessionStorage`
- logout chama `supabase.auth.signOut()`

### Observacao importante

Hoje a fonte principal de autenticacao do app e o **Supabase Auth**, nao o backend MariaDB.

---

## 6.2 Dashboard

### Objetivo

Dar a leitura consolidada do ciclo financeiro.

### Entrada de dados

- saldo atual
- salario liquido
- proximos pagamentos
- beneficios
- contas fixas
- gastos do dia a dia
- cartoes
- parcelamentos
- investimentos

### Saidas principais

- saldo atual
- proximo pagamento
- limite diario
- valor comprometido
- dias restantes
- alertas do ciclo
- resumo do ciclo
- distribuicao diaria dos gastos

### Regras visuais

O dashboard classifica o ciclo em:

- verde
- amarelo
- vermelho

Com base em saldo disponivel e limite diario.

---

## 6.3 Base financeira

### Objetivo

Cadastrar a base que alimenta todo o sistema.

### Dados cadastrados

- saldo atual
- origem do saldo: manual ou extrato
- banco de origem
- salario bruto
- descontos automaticos
- descontos manuais
- tipo de ciclo: 1 pagamento ou 2 pagamentos
- dias de pagamento
- percentuais por pagamento
- beneficio VR/VA

### Responsabilidade do modulo

Esse modulo nao controla despesas detalhadas; ele controla a fundacao financeira do ciclo.

---

## 6.4 Recebimentos

### Objetivo

Registrar previsao e confirmacao de recebimentos do usuario.

### Dados tratados

- data prevista do pagamento
- valor previsto do pagamento
- valor recebido
- status do pagamento
- previsao e status de VR/VA

### Efeito no sistema

Os recebimentos influenciam:

- proximo pagamento
- dias restantes
- previsao do ciclo
- leitura do dashboard

---

## 6.5 Contas

### Objetivo

Registrar compromissos e despesas do ciclo.

### Submodulos existentes

- contas fixas
- contas do dia a dia
- parcelamentos
- cartoes e gastos da fatura

### Contas fixas

Campos principais:

- nome
- valor
- vencimento
- categoria
- recorrente ou nao
- status de pagamento

### Contas do dia a dia

Campos principais:

- descricao
- valor
- data
- categoria
- tipo
- origem

Esses itens sao a base para:

- listar despesas do usuario
- recalcular saldo apos consumo
- montar resumo diario

### Parcelamentos

Campos principais:

- nome
- valor total
- quantidade de parcelas
- valor da parcela
- data de inicio
- vencimento
- status

O sistema so considera a parcela atual dentro do ciclo.

### Cartoes

Campos principais:

- nome do cartao
- tipo
- limite
- limite usado
- data de fechamento
- data de vencimento

Tambem existem lancamentos de fatura por cartao.

---

## 6.6 Extrato

### Objetivo

Importar extrato para:

- sugerir saldo atual
- criar gastos do dia a dia

### Capacidades atuais

- parser estruturado para CSV do Mercado Pago
- parser generico para CSV
- fallback heuristico para PDF e arquivos nao estruturados
- revisao manual antes de salvar

### Limitacoes atuais

- XLSX ainda nao esta implementado de forma real
- PDF usa heuristica simples
- depende de revisao do usuario

---

## 6.7 Investimentos

### Objetivo

Sugerir reserva de investimento sem comprometer o dinheiro do ciclo.

### Funcionalidade

- usuario define percentual
- sistema calcula valor sugerido
- usuario pode confirmar ou ignorar

### Logica

A sugestao usa o saldo disponivel do ciclo, nao o saldo bruto da conta.

---

## 6.8 Perfil

### Objetivo

Permitir personalizacao minima do usuario.

### Campos

- foto
- nome
- email

O perfil alimenta:

- sidebar
- avatar
- dados visuais da sessao

---

## 6.9 Configuracoes

### Papel atual

Pagina placeholder para preferencias futuras.

Hoje nao guarda regras complexas; funciona como area preparada para expansao.

---

## 7. Modelo de dados funcional

## 7.1 Estrutura principal do estado financeiro

O estado principal do frontend segue esta ideia:

```js
{
  profile: {
    foto: "",
    nome: "",
    email: ""
  },
  banking: {
    saldoAtual: 0,
    origemSaldo: {
      modo: "manual" | "extrato",
      banco: "",
      periodoInicio: "",
      periodoFim: "",
      ultimoArquivo: "",
      ultimoSaldoImportado: 0
    },
    salarioBruto: 0,
    salarioLiquido: 0,
    descontosAutomaticos: {
      inss: 0,
      irpf: 0
    },
    descontosDetalhados: {
      planoSaude: 0,
      planoOdontologico: 0,
      vt: 0,
      vrVa: 0,
      vrVaDescontadoEmFolha: false,
      outrosDescontos: []
    },
    tipoCiclo: "ciclo1" | "ciclo2",
    diasPagamento: [5, 20],
    percentuaisPagamento: [100, 0],
    beneficios: {
      vrVa: {
        ativo: false,
        valor: 0,
        dataRecebimento: 10,
        descontadoEmFolha: false,
        contabilizarNoSaldo: false
      }
    }
  },
  recebimentos: {
    pagamento: {},
    beneficios: {
      vrVa: {}
    },
    historico: {}
  },
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
    valorReservado: 0
  }
}
```

---

## 8. Regras de calculo do negocio

## 8.1 Salario liquido

O salario liquido e calculado a partir de:

- salario bruto
- INSS
- IRPF
- descontos manuais

Formula conceitual:

```text
salarioLiquido = salarioBruto - INSS - IRPF - descontosManuais
```

Os descontos manuais incluem:

- plano de saude
- plano odontologico
- VT
- VR/VA quando descontado em folha
- outros descontos adicionados manualmente

## 8.2 Proximo pagamento

O sistema suporta:

- `ciclo1`: um pagamento por mes
- `ciclo2`: dois pagamentos por mes com percentuais separados

Ele calcula:

- data do proximo pagamento
- valor previsto do proximo pagamento
- dias restantes ate essa data
- inicio e fim do ciclo

## 8.3 Beneficios

Atualmente o beneficio implementado e:

- VR/VA

O sistema calcula:

- proxima data prevista
- valor previsto
- se foi recebido ou nao

## 8.4 Contas fixas do ciclo

Entram no ciclo atual as contas com vencimento entre:

- inicio do ciclo
- fim do ciclo

Contas recorrentes usam vencimento recorrente no mes de referencia.

## 8.5 Cartoes do ciclo

O app considera:

- fatura atual do cartao
- vencimento do cartao
- se a fatura impacta o ciclo atual

## 8.6 Parcelamentos do ciclo

O sistema localiza a parcela que cai no ciclo atual e soma apenas essa parcela.

## 8.7 Gastos do dia a dia

Os gastos do dia a dia:

- sao registrados manualmente ou importados
- ficam associados ao usuario autenticado
- entram no resumo diario
- entram no calculo de saldo apos gastos variaveis

## 8.8 Valor comprometido

Formula atual:

```text
valorComprometido = totalContasFixasNoCiclo + totalFaturasDoCiclo + totalParcelasDoCiclo
```

## 8.9 Saldo disponivel

Formula atual:

```text
saldoDisponivel = saldoAtual - valorComprometido
```

## 8.10 Saldo restante

Hoje o projeto trata `saldoRestante` como alias operacional de `saldoDisponivel`.

Formula atual:

```text
saldoRestante = saldoDisponivel
```

Alias expostos:

- `saldoRestante`
- `saldo_restante`

## 8.11 Saldo apos gastos variaveis

Formula atual:

```text
saldoAposGastosVariaveis = saldoDisponivel - totalGastosDiaADia
```

## 8.12 Dias restantes

Formula atual:

```text
diasRestantes = diferencaEmDias(dataAtual, proximoPagamento)
```

Alias expostos:

- `diasRestantes`
- `dias_restantes`

## 8.13 Limite diario

Formula atual:

```text
limiteDiario = saldoDisponivel / diasRestantes
```

Importante:

- o limite diario atual usa `saldoDisponivel`
- ele nao desconta diretamente os gastos variaveis ja feitos
- o produto tambem mostra `saldoAposGastosVariaveis` separadamente

Alias expostos:

- `limiteDiario`
- `limite_diario`

## 8.14 Sugestao de investimento

Formula atual:

```text
valorSugerido = max(saldoDisponivel, 0) * (percentualSugerido / 100)
```

Se confirmado:

```text
valorReservado = valorSugerido
```

---

## 9. Requisitos funcionais para recriacao

Uma nova versao da aplicacao precisa obrigatoriamente permitir:

1. cadastrar usuario
2. autenticar usuario
3. manter sessao autenticada
4. salvar perfil do usuario
5. salvar saldo inicial do usuario
6. salvar configuracao de ciclo de pagamento
7. salvar data do proximo pagamento
8. salvar previsao de beneficios
9. cadastrar contas fixas
10. cadastrar despesas do dia a dia
11. importar gastos a partir de extrato
12. cadastrar cartoes
13. cadastrar gastos de fatura
14. cadastrar parcelamentos
15. listar apenas os dados do usuario logado
16. recalcular dashboard a cada alteracao
17. gerar `saldo_restante`
18. gerar `dias_restantes`
19. gerar `limite_diario`
20. funcionar em deploy web

---

## 10. Requisitos tecnicos para recriacao

## 10.1 Requisitos de frontend

- SPA ou aplicacao multipage web
- paginas protegidas por autenticacao
- carregamento rapido
- recalculo reativo do dashboard apos mudanca de dados
- compatibilidade com deploy estatico ou semiestatico

## 10.2 Requisitos de autenticacao

- usar Supabase Auth ou equivalente
- sessao por usuario
- logout real no provider de auth
- protecao de rotas privadas

## 10.3 Requisitos de persistencia

- cada usuario so pode acessar os proprios dados
- os dados financeiros precisam estar vinculados ao `user_id`
- a camada local deve ser isolada por usuario ou totalmente eliminada
- sincronizacao remota precisa evitar mistura de dados entre contas

## 10.4 Requisitos de modelagem de dados

Minimo necessario:

- tabela de perfil financeiro do usuario
- tabela de despesas do usuario
- opcionalmente tabelas separadas para contas, cartoes, parcelamentos e recebimentos

## 10.5 Requisitos de calculo

O motor financeiro precisa implementar:

- salario liquido
- proximo pagamento
- beneficios
- contas do ciclo
- faturas do ciclo
- parcelas do ciclo
- resumo diario de gastos
- valor comprometido
- saldo disponivel
- saldo restante
- dias restantes
- limite diario
- sugestao de investimento

## 10.6 Requisitos de seguranca

- RLS ou regra equivalente por usuario
- validacao de inputs numericos e datas
- validacao de email e senha
- protecao contra acesso cruzado entre usuarios

## 10.7 Requisitos de deploy

- compativel com Vercel
- build de frontend para pasta publica final
- variaveis de ambiente para Supabase

---

## 11. Persistencia remota atual no Supabase

O projeto atual usa duas tabelas principais:

- `mf_finance_profiles`
- `mf_finance_expenses`

### `mf_finance_profiles`

Guarda:

- `user_id`
- `profile_data`
- `banking_data`
- `recebimentos_data`
- `investimentos_data`
- `saldo_inicial`
- `proximo_pagamento_data`
- `proximo_pagamento_valor`
- `saldo_restante`
- `dias_restantes`
- `limite_diario`

### `mf_finance_expenses`

Guarda:

- `user_id`
- `external_id`
- `descricao`
- `categoria`
- `valor`
- `data`
- `tipo`
- `origem`
- `metadata`

### Regras de acesso

As duas tabelas usam RLS com a regra:

```text
auth.uid() = user_id
```

---

## 12. Navegacao funcional do app

Estrutura principal:

- Login
- Cadastro
- Dashboard
- Base financeira
- Recebimentos
- Contas
- Cartoes
- Investimentos
- Perfil
- Extrato
- Configuracoes

Agrupamento conceitual:

- Visao geral: Dashboard
- Operacao: Base financeira, Recebimentos, Contas, Cartoes
- Planejamento: Investimentos

---

## 13. Fluxos principais do usuario

## 13.1 Primeiro acesso

1. usuario cria conta
2. faz login
3. configura saldo atual
4. configura salario e ciclo
5. configura previsao de pagamento
6. adiciona contas fixas e gastos
7. abre dashboard

## 13.2 Uso recorrente

1. usuario entra no app
2. registra novos gastos
3. revisa contas e cartoes
4. acompanha limite diario
5. confirma recebimento quando salario cair

## 13.3 Importacao de extrato

1. usuario envia arquivo
2. parser extrai lancamentos
3. usuario revisa dados
4. app sugere saldo
5. usuario confirma saldo e importa despesas

---

## 14. Diferenca entre fluxo ativo e legado

## 14.1 Fluxo ativo recomendado para recriacao

Usar como referencia principal:

- `public/*.html`
- `public/*.js`
- `public/finance-store-v2.js`
- `public/finance-calculations-v2.js`
- `public/mfinanceiro-supabase-sync.js`
- `supabase/mfinanceiro_dashboard_schema.sql`

## 14.2 Legado presente no repositorio

Existem arquivos antigos ou paralelos que nao devem ser a base da recriacao:

- backend MariaDB de autenticacao
- duplicatas na raiz do projeto
- versoes antigas sem `-v2`
- arquivos em `src/` usados em fases anteriores

Para uma recriacao limpa, a IA deve considerar o fluxo ativo como referencia e tratar o restante como legado.

---

## 15. Limitacoes e lacunas atuais

1. O backend MariaDB convive com o Supabase, o que gera duplicidade de stack.
2. O parser de extrato ainda e parcial.
3. O estado remoto ainda esta resumido em profile + expenses; outras entidades ainda podem ser normalizadas.
4. O projeto e multipage em JS vanilla, sem framework de componentes.
5. Nao existe uma suite robusta de testes automatizados.

---

## 16. Recomendacao para uma recriacao por outra IA

Se outra IA for reconstruir o produto, a melhor estrategia e:

1. manter o conceito de ciclo financeiro
2. manter autenticacao por Supabase
3. modelar tudo por `user_id`
4. separar claramente:
   - base financeira
   - recebimentos
   - despesas
   - cartoes
   - parcelamentos
   - investimentos
5. implementar um motor de calculo centralizado
6. recalcular dashboard sempre que qualquer entidade mudar
7. expor explicitamente:
   - `saldo_restante`
   - `dias_restantes`
   - `limite_diario`

---

## 17. Prompt-base para outra IA

Use a seguinte base de entendimento:

> Crie um aplicativo web chamado MFinanceiro para planejamento financeiro pessoal com foco no ciclo ate o proximo pagamento. O sistema deve usar autenticacao por usuario, persistir todos os dados por `user_id`, permitir cadastrar saldo inicial, ciclo de pagamento, recebimentos, beneficios, contas fixas, gastos do dia a dia, cartoes, gastos de fatura, parcelamentos e sugestao de investimento. O dashboard deve calcular automaticamente valor comprometido, saldo disponivel, saldo restante, saldo apos gastos variaveis, dias restantes e limite diario. O sistema deve listar apenas os dados do usuario autenticado, ser compativel com Supabase e estar pronto para deploy na Vercel.

---

## 18. Arquivos de referencia mais importantes no projeto atual

- `public/finance-store-v2.js`
- `public/finance-calculations-v2.js`
- `public/mfinanceiro-supabase-sync.js`
- `public/dashboard.js`
- `public/cadastro-bancario.js`
- `public/contas-v2.js`
- `public/extrato.js`
- `public/investimentos.js`
- `public/profile.js`
- `public/app-shell.js`
- `public/auth.js`
- `public/login-static.js`
- `public/register-static.js`
- `supabase/mfinanceiro_dashboard_schema.sql`

