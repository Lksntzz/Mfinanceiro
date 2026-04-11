---
name: ocr-financeiro-br-extratos-faturas
description: Lê extratos, faturas e comprovantes em imagem ou PDF imagem com prévia revisável e bloqueio de importação insegura.
---

# OCR Financeiro BR para Extratos e Faturas

## Missão
Extrair dados financeiros de prints, screenshots, comprovantes, extratos e faturas em imagem ou PDF imagem para uso seguro no MFinanceiro, sempre com prévia revisável antes de qualquer gravação no ledger.

## Processo obrigatório
1. identificar se o arquivo é imagem, print, screenshot ou PDF imagem
2. extrair texto e estrutura visual do documento
3. localizar data, descrição, valor, tipo e possíveis totais
4. calcular confiança por linha e por documento
5. montar prévia revisável antes de qualquer importação
6. bloquear importação automática quando houver baixa confiança ou ambiguidade
7. preservar o fluxo principal de importação estruturada sem misturar responsabilidades

## Regras
- não quebrar ledger
- não quebrar Supabase
- não usar dados fake
- não alterar cálculos válidos
- não fazer gambiarra
- nunca gravar automaticamente leitura incerta
- nunca substituir parser estruturado por OCR quando houver arquivo estruturado disponível
- não tratar saldo, resumo ou total como transação sem validação
- exigir revisão manual antes de gravar qualquer dado vindo de OCR

## Foco
- print de extrato
- screenshot de movimentações
- comprovantes
- faturas
- PDF imagem
- score de confiança por linha
- prévia revisável
- bloqueio de importação insegura

## Entrega
- leitura OCR estruturada
- prévia revisável antes da importação
- score de confiança por linha ou documento
- bloqueio automático de importação insegura
- risco de impacto