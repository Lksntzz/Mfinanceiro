const ChartSection = () => {
  return (
    <div className="dashboard-card flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Evolução do saldo no período</h3>
          <p className="text-xs text-muted-foreground">Visão geral de 06/04 até 20/04</p>
        </div>
        <button className="text-xs font-medium bg-secondary text-foreground px-3 py-1.5 rounded-lg">
          Projeção do ciclo
        </button>
      </div>
      {/* Chart placeholder - integrate your existing chart here */}
      <div className="flex-1 flex items-center justify-center min-h-[180px] rounded-lg bg-secondary/30 border border-border/50">
        <p className="text-xs text-muted-foreground">Área do gráfico — integrar Recharts aqui</p>
      </div>
    </div>
  );
};

export default ChartSection;
