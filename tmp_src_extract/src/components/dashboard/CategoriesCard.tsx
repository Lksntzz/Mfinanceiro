import { ShoppingBag, MessageCircle, Truck } from "lucide-react";

const categories = [
  { name: "Compras", value: "R$ 79,69", percent: 89, icon: ShoppingBag, color: "text-destructive", barColor: "bg-destructive" },
  { name: "Outros", value: "R$ 10,00", percent: 11, icon: MessageCircle, color: "text-primary", barColor: "bg-primary" },
  { name: "Transporte", value: "R$ 0,00", percent: 0, icon: Truck, color: "text-muted-foreground", barColor: "bg-muted" },
];

const CategoriesCard = () => {
  return (
    <div className="dashboard-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Categorias que mais gastam</h3>
          <p className="text-xs text-muted-foreground">Neste período</p>
        </div>
        <button className="text-xs font-medium bg-secondary text-foreground px-3 py-1.5 rounded-lg">
          Ver todas
        </button>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto min-h-0">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center ${cat.color} flex-shrink-0`}>
              <cat.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                <span className="text-sm font-semibold text-foreground">{cat.value}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${cat.barColor}`} style={{ width: `${cat.percent}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{cat.percent}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesCard;
