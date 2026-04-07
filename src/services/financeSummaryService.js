function normalizarData(data) {
  const dataNormalizada = new Date(data);

  if (Number.isNaN(dataNormalizada.getTime())) {
    throw new Error("Data invalida informada.");
  }

  dataNormalizada.setHours(0, 0, 0, 0);
  return dataNormalizada;
}

function calcularDiferencaEmDias(dataInicial, dataFinal) {
  const umDiaEmMs = 1000 * 60 * 60 * 24;
  const diferenca = dataFinal.getTime() - dataInicial.getTime();
  return Math.ceil(diferenca / umDiaEmMs);
}

function somarContasDentroDoCiclo(contasFixas, dataAtual, dataProximoPagamento) {
  return contasFixas.reduce((total, conta) => {
    const dataConta = normalizarData(conta.data);

    if (dataConta >= dataAtual && dataConta <= dataProximoPagamento) {
      return total + Number(conta.valor || 0);
    }

    return total;
  }, 0);
}

// Calcula um resumo financeiro simples para orientar o gasto diario ate o pagamento.
function calcularResumoFinanceiro({
  saldoAtual,
  dataAtual,
  dataProximoPagamento,
  contasFixas,
  faturaCartao,
}) {
  const saldo = Number(saldoAtual);
  const valorCartao = Number(faturaCartao);
  const hoje = normalizarData(dataAtual);
  const proximoPagamento = normalizarData(dataProximoPagamento);
  const listaContas = Array.isArray(contasFixas) ? contasFixas : [];

  if (Number.isNaN(saldo) || Number.isNaN(valorCartao)) {
    throw new Error("Saldo atual e fatura do cartao devem ser numeros validos.");
  }

  const diasRestantes = calcularDiferencaEmDias(hoje, proximoPagamento);

  if (diasRestantes <= 0) {
    throw new Error("A data do proximo pagamento deve ser maior que a data atual.");
  }

  const totalContas = somarContasDentroDoCiclo(
    listaContas,
    hoje,
    proximoPagamento
  );

  const saldoDisponivel = saldo - totalContas - valorCartao;
  const limiteDiario = saldoDisponivel / diasRestantes;

  return {
    saldoDisponivel,
    diasRestantes,
    limiteDiario,
    totalContas,
  };
}

module.exports = {
  calcularResumoFinanceiro,
};
