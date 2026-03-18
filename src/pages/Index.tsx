import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/hooks/useShopData";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus, Car, Clock, CheckCircle2, Loader2,
  CalendarDays, CalendarRange, DollarSign, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Enums } from "@/integrations/supabase/types";

type JobStatus = Enums<"job_status">;

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-warning text-warning-foreground" },
  in_progress: { label: "Em Execução", className: "bg-primary text-primary-foreground" },
  done: { label: "Finalizado", className: "bg-success text-success-foreground" },
  delivered: { label: "Entregue", className: "bg-[hsl(var(--delivered))] text-[hsl(var(--delivered-foreground))]" },
};

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

  // Recent active jobs (waiting + in_progress), max 3
  const recentActive = useMemo(() => {
    if (!jobs) return [];
    return jobs
      .filter((j) => j.status === "waiting" || j.status === "in_progress")
      .slice(0, 3);
  }, [jobs]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
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
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {/* Status cards */}
            <motion.div variants={item} className="grid grid-cols-3 gap-2">
              <StatCard
                icon={<Clock className="h-4 w-4" />}
                value={waiting}
                label="Aguardando"
                color="text-warning"
              />
              <StatCard
                icon={<Car className="h-4 w-4" />}
                value={inProgress}
                label="Em execução"
                color="text-primary"
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                value={doneToday}
                label="Concluídos"
                color="text-success"
              />
            </motion.div>

            {/* Dashboard row */}
            <motion.div variants={item} className="grid grid-cols-2 gap-2">
              <StatCard
                icon={<CalendarDays className="h-4 w-4" />}
                value={ordersToday}
                label="OS do dia"
                color="text-accent"
              />
              <StatCard
                icon={<CalendarRange className="h-4 w-4" />}
                value={ordersMonth}
                label="OS do mês"
                color="text-accent"
              />
            </motion.div>

            {/* Revenue */}
            <motion.div variants={item}>
              <Card className="border-border bg-secondary">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Faturamento do mês</p>
                    <p className="text-xl font-bold tabular-nums text-foreground font-mono">
                      {formatCurrency(revenueMonth)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick action */}
            <motion.div variants={item} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => navigate("/checkin")}
                className="h-14 w-full text-sm font-bold uppercase tracking-wider"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nova OS
              </Button>
            </motion.div>

            {/* Recent active jobs */}
            {recentActive.length > 0 && (
              <motion.div variants={item} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">OS em andamento</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/jobs")}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    Ver todas <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                {recentActive.map((job) => {
                  const vehicle = (job as any).vehicles;
                  const customer = vehicle?.customers;
                  return (
                    <Card
                      key={job.id}
                      className="cursor-pointer border-border bg-secondary active:bg-muted transition-colors"
                      onClick={() => navigate("/jobs")}
                    >
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
                              {vehicle?.plate}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {customer?.name ?? vehicle?.model ?? "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`${statusConfig[job.status].className} text-[10px] px-2 py-0.5`}>
                            {statusConfig[job.status].label}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
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
      <CardContent className="flex flex-col items-center gap-0.5 p-3 text-center">
        <span className={color}>{icon}</span>
        <span className="text-xl font-bold tabular-nums text-foreground">{value}</span>
        <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
      </CardContent>
    </Card>
  );
}
