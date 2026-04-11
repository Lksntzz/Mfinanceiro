---
name: mfinance-financial-core
description: Especialista no núcleo financeiro do MFinanceiro. Use para cálculos, saldo disponível, limite diário, previsão até o próximo pagamento, ledger e insights financeiros.
---

# MFinanceiro Financial Core

Esta skill atua no núcleo financeiro do app.

## Arquivo central
- finance-calculations.js

## Responsabilidades
- saldo disponível
- saldo restante
- limite diário
- dias restantes
- cálculo até o próximo pagamento
- resumo financeiro
- leitura do ledger
- agrupamento de despesas
- classificação de lançamentos
- insights financeiros

## Regras obrigatórias
- NÃO quebrar cálculos existentes
- NÃO criar cálculos paralelos duplicados
- NÃO mudar contratos usados pelo dashboard.js sem necessidade real
- NÃO misturar regra de negócio com ajuste visual
- NÃO inventar dados fake
- preservar compatibilidade com o restante do sistema

## Critério de alteração
Só alterar quando:
- houver bug confirmado
- houver inconsistência real de cálculo
- houver duplicidade clara
- o ajuste for compatível com dashboard.js e com a estrutura atual

## Antes de alterar
Sempre verificar impacto em:
- saldo disponível
- limite diário
- dias restantes
- previsão do ciclo
- pagamento
- despesas do período
- insights

## Forma de trabalho
- localizar a função exata impactada
- alterar o mínimo possível
- preservar nomes e saídas usadas pela interface
- não refatorar o núcleo inteiro sem necessidade

## Entrega esperada
- dizer qual cálculo foi alterado
- dizer por que foi alterado
- dizer quais arquivos foram alterados
- dizer impacto esperado na interface
- apontar risco residual, se houver