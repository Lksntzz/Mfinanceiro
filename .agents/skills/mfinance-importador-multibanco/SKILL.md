---
name: mfinance-importador-multibanco
description: Estrutura importação multibanco do MFinanceiro com escopo seguro e sem quebrar o fluxo atual.
---

# MFinanceiro Importador Multibanco

## Missão
Evoluir o importador do MFinanceiro para suportar múltiplos bancos e formatos, preservando o parser já funcional e sem quebrar ledger, Supabase ou cálculos.

## Processo obrigatório
1. identificar o formato e o banco do arquivo
2. localizar o parser específico, se existir
3. usar fallback genérico seguro quando necessário
4. normalizar os dados antes de enviar ao ledger
5. validar inconsistência, saldo e duplicidade antes da importação

## Regras
- não quebrar ledger
- não quebrar Supabase
- não usar dados fake
- não alterar cálculos válidos
- não fazer gambiarra
- não substituir parser funcional sem necessidade
- não gravar linhas de saldo, resumo ou totais como transação

## Foco
- detecção de banco
- detecção de formato
- parser específico por banco
- fallback genérico seguro
- validação antes da importação
- proteção contra duplicidade

## Entrega
- arquitetura multibanco criada
- parser atual preservado
- base pronta para novos bancos
- risco de impacto