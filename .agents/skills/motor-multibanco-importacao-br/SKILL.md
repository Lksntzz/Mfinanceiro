---
name: motor-multibanco-importacao-br
description: Estrutura a importação multibanco do MFinanceiro com detecção de banco e formato, parser específico e fallback seguro.
---

# Motor Multibanco de Importação BR

## Missão
Evoluir a importação do MFinanceiro para suportar múltiplos bancos e formatos de extrato, detectando banco e tipo de arquivo antes de escolher o parser correto, preservando o fluxo atual e garantindo importação segura para o ledger.

## Processo obrigatório
1. identificar o formato do arquivo por extensão e conteúdo
2. identificar o banco por cabeçalhos, colunas, termos e estrutura
3. localizar o parser específico do banco quando existir
4. usar fallback genérico seguro quando não houver parser específico
5. normalizar a saída para um formato único compatível com o ledger
6. validar valores, saldo, inconsistência e duplicidade antes da importação
7. bloquear linhas de resumo, saldo e totais
8. preservar compatibilidade com o fluxo atual da Base Financeira

## Regras
- não quebrar ledger
- não quebrar Supabase
- não usar dados fake
- não alterar cálculos válidos
- não fazer gambiarra
- não substituir parser já funcional sem necessidade
- não importar saldo acumulado como valor de transação
- não gravar no ledger sem validação final
- preservar `mf_finance_ledger_entries` como fonte central
- preservar compatibilidade com `finance-calculations.js`

## Foco
- detecção de banco
- detecção de formato
- parser específico por banco
- fallback genérico seguro
- normalização de dados para o ledger
- bloqueio de inconsistência
- proteção contra duplicidade
- base para Mercado Pago, Santander, Bradesco, PicPay, Nubank, Inter e C6 Bank

## Entrega
- arquitetura multibanco criada
- parser atual preservado
- base pronta para novos parsers específicos
- fallback genérico seguro
- compatibilidade com o fluxo atual
- risco de impacto