import { Lightbulb, ChevronRight } from "lucide-react";

interface InsightCardProps {
  title?: string;
  message?: string;
}

const InsightCard = ({
  title = "Insight do dia",
  message = "No ritmo atual, seu saldo acaba 27 dia(s) antes do pagamento. Falta R$ 1.297,47 para chegar até lá.",
}: InsightCardProps) => {
  return (
    <div className="dashboard-card flex items-center gap-3 justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
      <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap bg-secondary px-3 py-2 rounded-lg">
        Ver todos insights <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default InsightCard;
