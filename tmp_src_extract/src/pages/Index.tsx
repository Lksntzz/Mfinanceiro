import { DollarSign, TrendingUp, CalendarDays, CreditCard } from "lucide-react";
import DashboardNav from "@/components/dashboard/DashboardNav";
import MetricCard from "@/components/dashboard/MetricCard";
import AlertBanner from "@/components/dashboard/AlertBanner";
import InsightCard from "@/components/dashboard/InsightCard";
import ChartSection from "@/components/dashboard/ChartSection";
import PeriodSummary from "@/components/dashboard/PeriodSummary";
import CategoriesCard from "@/components/dashboard/CategoriesCard";
import TransactionsCard from "@/components/dashboard/TransactionsCard";
import PrioritiesCard from "@/components/dashboard/PrioritiesCard";
import BottomBar from "@/components/dashboard/BottomBar";

const Index = () => {
  return (
    <div className="dashboard-grid">
      {/* Nav */}
      <DashboardNav />

      {/* Metric cards row */}
      <div className="metrics-row">
        <MetricCard
          label="Saldo disponível"
          value="R$ 720,21"
          icon={DollarSign}
          iconColor="text-success"
          badge="Seguro"
          badgeType="success"
          subtitle="Saldo positivo"
        />
        <MetricCard
          label="Limite diário"
          value="R$ 60,02"
          icon={TrendingUp}
          iconColor="text-primary"
          badge="Por dia"
          badgeType="info"
          subtitle="Até o próximo pagamento"
        />
        <MetricCard
          label="Dias restantes"
          value="12 dias"
          icon={CalendarDays}
          iconColor="text-primary"
          badge="até 20/04"
          badgeType="info"
          subtitle="Quarta-feira"
        />
        <MetricCard
          label="Gasto de hoje"
          value="R$ 0,00"
          icon={CreditCard}
          iconColor="text-success"
          badge="Sem gastos"
          badgeType="success"
          subtitle="Você está no controle"
        />
      </div>

      {/* Alert + Insight row */}
      <div className="alert-row">
        <AlertBanner />
        <InsightCard />
      </div>

      {/* Chart + Summary row */}
      <div className="chart-row">
        <ChartSection />
        <PeriodSummary />
      </div>

      {/* Bottom 3-column row */}
      <div className="bottom-row">
        <CategoriesCard />
        <TransactionsCard />
        <PrioritiesCard />
      </div>

      {/* Bottom bar */}
      <BottomBar />
    </div>
  );
};

export default Index;
