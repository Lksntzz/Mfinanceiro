---
name: mfinance-validacao-final-safe
description: Valida correções do MFinanceiro antes de concluir, exigir evidência real e evitar falso positivo de resolução.
---

# MFinanceiro Validação Final Safe

## Missão
Garantir que toda correção do MFinanceiro só seja concluída quando houver evidência real de que o problema foi corrigido sem regressão funcional.

## Processo obrigatório
1. confirmar a causa raiz encontrada
2. listar os arquivos alterados
3. validar sintaxe dos arquivos alterados
4. validar impacto no fluxo relacionado
5. confirmar o que foi preservado
6. registrar risco residual
7. não concluir como resolvido sem evidência

## Regras
- não quebrar ledger
- não quebrar Supabase
- não usar dados fake
- não alterar cálculos válidos
- não fazer gambiarra
- não declarar sucesso sem validação
- não esconder limitação ou pendência

## Foco
- evidência de correção
- arquivos alterados
- validação de sintaxe
- validação do fluxo afetado
- risco residual
- prevenção de falso positivo

## Entrega
- causa raiz confirmada
- correção aplicada
- arquivos afetados
- validação executada
- risco residual
- pendências reais, se existirem