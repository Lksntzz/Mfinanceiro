import { Calendar, BarChart3, Lightbulb, Clock, LayoutDashboard } from "lucide-react";

const tabs = [
  { label: "Visão Geral", icon: LayoutDashboard, active: true },
  { label: "Detalhes", icon: BarChart3, active: false },
  { label: "Insights", icon: Lightbulb, active: false },
  { label: "Histórico", icon: Clock, active: false },
];

const DashboardNav = () => {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          <span className="text-primary">M</span> Financeiro
        </h1>
        <nav className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab.active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <div>
            <div className="text-foreground font-medium text-xs">Próximo pagamento</div>
            <div className="text-xs text-muted-foreground">20 de abril de 2026</div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
          JS
        </div>
      </div>
    </header>
  );
};

export default DashboardNav;
