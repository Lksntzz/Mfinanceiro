import { Lightbulb, Plus } from "lucide-react";

const BottomBar = () => {
  return (
    <div className="dashboard-card flex items-center justify-between py-2.5 px-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="w-4 h-4 text-warning" />
        <span>
          <strong className="text-foreground">Dica rápida:</strong> registre gastos pequenos na hora. Isso melhora seus limites diários e os insights.
        </span>
      </div>
      <button className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
        <Plus className="w-4 h-4" />
        Novo lançamento
      </button>
    </div>
  );
};

export default BottomBar;
