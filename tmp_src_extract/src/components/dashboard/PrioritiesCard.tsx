const priorities = [
  {
    number: "01",
    title: "Saldo disponível negativo",
    description: "O valor comprometido já consumiu todo o saldo inicial. Revise gastos e prioridades.",
    color: "bg-destructive",
  },
  {
    number: "02",
    title: "Tudo certo neste ciclo",
    description: "Você cobriu todas as contas entre 6 e 20 de abril. Agora é só aguardar o próximo pagamento.",
    color: "bg-success",
  },
];

const PrioritiesCard = () => {
  return (
    <div className="dashboard-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Prioridades do ciclo</h3>
        <span className="badge-danger">2 alertas</span>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto min-h-0">
        {priorities.map((p) => (
          <div key={p.number} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0`}>
              {p.number}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrioritiesCard;
