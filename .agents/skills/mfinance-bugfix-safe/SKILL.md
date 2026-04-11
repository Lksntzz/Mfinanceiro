---
name: mfinance-bugfix-safe
description: Corrige bugs do MFinanceiro com escopo mínimo e sem refatoração desnecessária.
---

# MFinanceiro Bugfix Safe

## Missão
Corrigir bugs de forma cirúrgica.

## Processo obrigatório
1. localizar a causa raiz
2. identificar o menor conjunto de arquivos impactados
3. corrigir a causa, não só o sintoma
4. evitar refatoração paralela
5. preservar comportamento já funcional

## Regras
- não reescrever módulos inteiros
- não mudar arquitetura durante correção
- não mexer em arquivos não relacionados
- não renomear funções amplamente usadas
- não introduzir complexidade para corrigir problema simples

## Foco
- erro de sintaxe
- função duplicada
- tabs quebradas
- seletor inexistente
- inicialização quebrada
- evento duplicado
- renderização não acionada

## Entrega
- causa raiz
- correção aplicada
- arquivos afetados
- risco de impacto