Objetivo da skill:
Ler, validar, mapear e importar extratos bancários brasileiros para o ledger do MFinanceiro, com foco em CSV bancário com separador `;`, valores no padrão brasileiro e prevenção de leitura errada de saldo como transação.

A skill deve ser especializada em:
- detectar cabeçalho real do extrato
- ignorar blocos de resumo
- ler datas corretamente
- converter valores BR com vírgula decimal
- distinguir valor da transação vs saldo acumulado
- mapear descrição, tipo, id externo e valor
- validar consistência antes de gravar no ledger
- apoiar categorização inicial por descrição normalizada

Regras obrigatórias da skill:
- nunca quebrar ledger
- nunca quebrar Supabase
- nunca usar dados fake
- nunca alterar cálculos válidos
- sempre preservar mf_finance_ledger_entries como fonte central
- sempre validar o arquivo antes da importação final

A skill deve ser preparada para arquivos como:
- CSV com `;`
- colunas como RELEASE_DATE, TRANSACTION_TYPE, REFERENCE_ID, TRANSACTION_NET_AMOUNT, PARTIAL_BALANCE
- bloco inicial de resumo com INITIAL_BALANCE, CREDITS, DEBITS, FINAL_BALANCE