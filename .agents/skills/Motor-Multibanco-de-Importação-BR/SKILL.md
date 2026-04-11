Objetivo da skill:
Ler, detectar, validar, mapear e importar extratos bancários brasileiros de múltiplos bancos e carteiras digitais para o ledger do MFinanceiro, com suporte a formatos estruturados e fallback controlado para formatos menos confiáveis.

A skill deve ser especializada em:
- detectar automaticamente o banco de origem
- detectar automaticamente o formato do arquivo
- usar parser específico por banco quando existir
- usar parser genérico quando não existir parser específico
- importar CSV, OFX, XLS e XLSX
- suportar PDF textual
- preparar fallback para OCR quando o arquivo for imagem ou PDF sem texto
- mapear data, descrição, valor, tipo e id externo
- validar saldo inicial, transações e saldo final
- bloquear importação inconsistente
- evitar duplicidade no ledger
- normalizar descrição antes da categorização

Bancos alvo iniciais:
- Mercado Pago
- Santander
- Bradesco
- PicPay
- Nubank
- Inter
- C6 Bank

Regras obrigatórias da skill:
- não quebrar ledger
- não quebrar Supabase
- não usar dados fake
- não alterar cálculos válidos
- preservar mf_finance_ledger_entries como fonte central
- fazer correção estrutural, sem gambiarra
- não gravar nada no ledger sem validação final

Entrega esperada da skill:
- arquitetura de importação multibanco
- parsers específicos por banco
- fallback genérico seguro
- validação forte antes de importar
- compatibilidade com dashboard e cálculos atuais