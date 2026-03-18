import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/hooks/useShopData";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Car, Clock, CheckCircle2, Loader2,
  CalendarDays, CalendarRange, DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Index() {
  const { profile, role } = useAuth();
  const { data: jobs, isLoading } = useJobs();
  const navigate = useNavigate();

  const today = new Date();

  const waiting = jobs?.filter((j) => j.status === "waiting").length ?? 0;
  const inProgress = jobs?.filter((j) => j.status === "in_progress").length ?? 0;
  const doneToday = jobs?.filter((j) => {
    if (j.status !== "done" || !j.finished_at) return false;
    return new Date(j.finished_at).toDateString() === today.toDateString();
  }).length ?? 0;

  const { ordersToday, ordersMonth, revenueMonth } = useMemo(() => {
    if (!jobs) return { ordersToday: 0, ordersMonth: 0, revenueMonth: 0 };
    const todayStr = today.toDateString();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let oToday = 0;
    let oMonth = 0;
    let rMonth = 0;

    for (const j of jobs) {
      const created = new Date(j.created_at);
      if (created.toDateString() === todayStr) oToday++;
      if (created.getMonth() === currentMonth && created.getFullYear() === currentYear) {
        oMonth++;
        if (j.status === "done") rMonth += Number(j.total_price) || 0;
      }
    }
    return { ordersToday: oToday, ordersMonth: oMonth, revenueMonth: rMonth };
  }, [jobs]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(" ")[0] ?? ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {role === "owner" ? "Painel do proprietário" : "Painel do funcionário"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Status cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<Clock className="h-5 w-5" />}
                value={waiting}
                label="Aguardando"
                color="text-warning"
              />
              <StatCard
                icon={<Car className="h-5 w-5" />}
                value={inProgress}
                label="Em execução"
                color="text-primary"
              />
              <StatCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                value={doneToday}
                label="Concluídos hoje"
                color="text-success"
              />
            </div>

            {/* Dashboard cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<CalendarDays className="h-5 w-5" />}
                value={ordersToday}
                label="OS do dia"
                color="text-accent"
              />
              <StatCard
                icon={<CalendarRange className="h-5 w-5" />}
                value={ordersMonth}
                label="OS do mês"
                color="text-accent"
              />
            </div>

            <Card className="border-border bg-secondary">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-success">
                    <DollarSign className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Faturamento do mês</p>
                    <p className="text-lg font-bold tabular-nums text-foreground font-mono">
                      {formatCurrency(revenueMonth)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => navigate("/checkin")}
                className="h-14 w-full text-sm font-bold uppercase tracking-wider"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nova OS
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <Card className="border-border bg-secondary">
      <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
        <span className={color}>{icon}</span>
        <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
