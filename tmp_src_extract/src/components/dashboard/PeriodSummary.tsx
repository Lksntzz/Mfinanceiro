const PeriodSummary = () => {
  return (
    <div className="dashboard-card flex flex-col">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">Resumo do período</h3>
        <p className="text-xs text-muted-foreground">06/04 até 20/04</p>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Gastos</p>
          <p className="text-lg font-bold text-foreground">R$ 1.010,21</p>
          <p className="text-xs text-muted-foreground">7 lançamentos</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Média diária</p>
          <p className="text-lg font-bold text-foreground">R$ 89,69</p>
          <p className="text-xs text-muted-foreground">Neste período</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Maior categoria</p>
          <p className="text-lg font-bold text-foreground">Compras</p>
          <p className="text-xs text-muted-foreground">89% do total</p>
        </div>
      </div>
      {/* Budget bar */}
      <div className="mt-auto">
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-success via-warning to-destructive" style={{ width: "89%" }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">89% do orçamento utilizado</p>
      </div>
    </div>
  );
};

export default PeriodSummary;
