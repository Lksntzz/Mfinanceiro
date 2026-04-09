import { AlertTriangle } from "lucide-react";

interface AlertBannerProps {
  title?: string;
  message?: string;
}

const AlertBanner = ({
  title = "Atenção: seu saldo não cobre o restante do ciclo",
  message = "Para não ficar no vermelho, reduza seus gastos diários em R$ 48,11",
}: AlertBannerProps) => {
  return (
    <div className="dashboard-card border-warning/30 bg-warning/5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-warning" />
      </div>
      <div>
        <p className="text-sm font-semibold text-warning">{title}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default AlertBanner;
