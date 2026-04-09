import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  badge?: string;
  badgeType?: "success" | "warning" | "danger" | "info";
  subtitle?: string;
}

const MetricCard = ({
  label,
  value,
  icon: Icon,
  iconColor = "text-primary",
  badge,
  badgeType = "info",
  subtitle,
}: MetricCardProps) => {
  const badgeClass = {
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    info: "badge-info",
  }[badgeType];

  return (
    <div className="dashboard-card flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <span className="metric-label flex items-center gap-1">{label}</span>
        <span className="metric-value">{value}</span>
        <div className="flex items-center gap-2 mt-1">
          {badge && <span className={badgeClass}>{badge}</span>}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </div>
      <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

export default MetricCard;
