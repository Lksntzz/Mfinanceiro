---
name: mfinance-refactor-planner
description: Planeja reorganização gradual e segura do MFinanceiro sem quebrar ledger, Supabase e cálculos. Use para modularização, distribuição de responsabilidades por tela e refatoração de estrutura.
---

# MFinanceiro Refactor Planner

## Objetivo
Planejar reorganização gradual do app com segurança.

## Missão
Separar o que é:
- decisão
- análise
- histórico
- cadastro/configuração

Sem quebrar a base atual.

## Regras obrigatórias
- NÃO quebrar ledger
- NÃO quebrar Supabase
- NÃO quebrar cálculos
- NÃO criar dados fake
- NÃO sair movendo código sem diagnóstico claro
- NÃO propor refatoração total de uma vez
- preservar compatibilidade com dashboard.js e finance-calculations.js

## Pode planejar
- modularização por tela
- separação de responsabilidades
- reorganização de cards/blocos
- extração gradual de renderização
- limpeza de duplicidades entre abas

## Não deve propor agora
- criar novo ledger
- reescrever núcleo financeiro
- trocar arquitetura inteira
- dividir cálculo sensível em vários arquivos sem validação

## Forma de trabalho
1. mapear responsabilidade atual
2. mapear responsabilidade ideal
3. identificar duplicidades
4. definir estrutura alvo
5. sugerir ordem segura de migração
6. priorizar escopo mínimo e baixo risco

## Entrega esperada
- estrutura atual resumida
- problemas estruturais
- estrutura alvo
- ordem recomendada de execução
- riscos por etapa
- sugestão de modularização gradual