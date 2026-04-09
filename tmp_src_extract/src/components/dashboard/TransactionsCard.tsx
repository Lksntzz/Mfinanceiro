import { ShoppingBag, Send } from "lucide-react";

const transactions = [
  { name: "Le point", category: "Compras", value: "R$ 51,43", date: "Hoje", icon: ShoppingBag },
  { name: "Mp*marialuciaper", category: "Compras", value: "R$ 5,00", date: "Hoje", icon: ShoppingBag },
  { name: "Pix enviado", category: "Outros", value: "R$ 10,00", date: "Hoje", icon: Send },
];

const TransactionsCard = () => {
  return (
    <div className="dashboard-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Últimos lançamentos</h3>
          <p className="text-xs text-muted-foreground">Hoje</p>
        </div>
        <button className="text-xs font-medium bg-secondary text-foreground px-3 py-1.5 rounded-lg">
          Ver histórico
        </button>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto min-h-0">
        {transactions.map((tx, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
              <tx.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
              <p className="text-xs text-muted-foreground">{tx.category}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">{tx.value}</p>
              <p className="text-xs text-muted-foreground">{tx.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionsCard;
