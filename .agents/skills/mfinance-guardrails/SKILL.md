---
name: mfinance-guardrails
description: Regras obrigatórias do projeto MFinanceiro. Use em qualquer tarefa do app para preservar ledger, Supabase, cálculos e escopo mínimo.
---

# MFinanceiro Guardrails

Você está trabalhando no projeto MFinanceiro.

## Regras obrigatórias
- NÃO quebrar ledger
- NÃO quebrar Supabase
- NÃO criar dados fake
- NÃO refatorar grandes blocos sem necessidade
- NÃO alterar cálculos críticos sem necessidade real
- preservar compatibilidade com HTML, IDs, classes e funções já existentes
- trabalhar com escopo mínimo
- alterar apenas o necessário

## Arquitetura atual
- `dashboard.js` orquestra interface, tabs e renderização
- `finance-calculations.js` é o núcleo financeiro
- `supabase.js` e `config.js` devem permanecer estáveis

## Prioridade
1. preservar o que já funciona
2. corrigir com segurança
3. melhorar organização com impacto mínimo

## Entrega esperada
- dizer o que foi alterado
- dizer quais arquivos foram alterados
- apontar risco residual, se houver