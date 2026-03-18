import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useJobs, useAppointments, useTeam } from "@/hooks/useShopData";
import { useShop } from "@/hooks/useShopData";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus, Car, Clock, CheckCircle2, Loader2,
  CalendarDays, CalendarRange, DollarSign, ChevronRight,
  TrendingUp, Activity, ArrowUpRight, ArrowUp, ArrowDown,
  Users, FileText, Zap, Building2, Eye, EyeOff, CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Enums } from "@/integrations/supabase/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type JobStatus = Enums<"job_status">;

const statusConfig: Record<JobStatus, { label: string; color: string; bg: string }> = {
  waiting:     { label: "Aguardando",  color: "text-warning",  bg: "bg-warning/15 border-warning/20" },
  in_progress: { label: "Em execução", color: "text-primary",  bg: "bg-primary/15 border-primary/20" },
  done:        { label: "Concluído",   color: "text-success",  bg: "bg-success/15 border-success/20" },
  delivered:   { label: "Entregue",    color: "text-success",  bg: "bg-success/15 border-success/20" },
};

// Payment method palette
const pmColors: Record<string, string> = {
  pix:      "#C8FF00",
  debit:    "#60a5fa",
  credit:   "#a78bfa",
  cash:     "#34d399",
  boleto:   "#fb923c",
  transfer: "#f472b6",
};
const pmLabels: Record<string, string> = {
  pix: "Pix", debit: "Débito", credit: "Crédito",
  cash: "Dinheiro", boleto: "Boleto", transfer: "Transferência",
};

// ── Card wrapper ───────────────────────────────────────────────────────────
function C({ children, className, onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn("bg-card border border-border rounded-xl p-[14px]", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── Card section header ────────────────────────────────────────────────────
function CH({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{left}</p>
      {right && <div className="text-[10px] text-muted-foreground">{right}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Index() {
  const { profile, role } = useAuth();
  const { data: jobs, isLoading: isJobsLoading } = useJobs();
  const { data: appointments, isLoading: isApptLoading } = useAppointments();
  const { data: team } = useTeam();
  const { data: shop } = useShop();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ── Eye toggle — hide sensitive values ──────────────────────────────────
  const [hideValues, setHideValues] = useState(false);
  const mask = (v: string) => (hideValues ? "••••" : v);
  const maskNum = (v: number | string) => (hideValues ? "—" : String(v));

  const isLoading = isJobsLoading || isApptLoading;
  const today = new Date();

  const getGreeting = () => {
    const h = today.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  // ── Derived values (all existing logic preserved) ────────────────────────
  const waiting    = jobs?.filter(j => j.status === "waiting").length ?? 0;
  const inProgress = jobs?.filter(j => j.status === "in_progress").length ?? 0;
  const doneToday  = jobs?.filter(j => {
    if (j.status !== "done" || !j.finished_at) return false;
    return new Date(j.finished_at).toDateString() === today.toDateString();
  }).length ?? 0;

  const { ordersToday, ordersMonth, revenueMonth, revenueToday } = useMemo(() => {
    if (!jobs) return { ordersToday: 0, ordersMonth: 0, revenueMonth: 0, revenueToday: 0 };
    const todayStr = today.toDateString();
    const cm = today.getMonth(), cy = today.getFullYear();
    let oT = 0, oM = 0, rM = 0, rT = 0;
    for (const j of jobs) {
      const c = new Date(j.created_at);
      if (c.toDateString() === todayStr) { oT++; if (j.status === "done") rT += Number(j.total_price) || 0; }
      if (c.getMonth() === cm && c.getFullYear() === cy) {
        oM++;
        if (j.status === "done" || j.status === "delivered") rM += Number(j.total_price) || 0;
      }
    }
    return { ordersToday: oT, ordersMonth: oM, revenueMonth: rM, revenueToday: rT };
  }, [jobs]);

  const pendingJobs  = jobs?.filter(j => j.status === "waiting").length ?? 0;
  const approvedJobs = jobs?.filter(j => j.status === "in_progress" || j.status === "done").length ?? 0;

  const { topCustomers } = useMemo(() => {
    if (!jobs) return { topCustomers: [] };
    const cm = today.getMonth(), cy = today.getFullYear();
    const map = new Map<string, { name: string; spent: number; count: number }>();
    jobs.forEach(j => {
      const c = new Date(j.created_at);
      if (c.getMonth() !== cm || c.getFullYear() !== cy) return;
      const v = (j as any).vehicles;
      if (!v?.customer_id) return;
      if (!map.has(v.customer_id)) map.set(v.customer_id, { name: v.customers?.name || "Desconhecido", spent: 0, count: 0 });
      const e = map.get(v.customer_id)!;
      e.count++;
      if (j.status === "done" || j.status === "delivered") e.spent += Number(j.total_price) || 0;
    });
    return { topCustomers: Array.from(map.values()).sort((a, b) => b.spent - a.spent).slice(0, 5) };
  }, [jobs]);

  const recentActive = useMemo(() =>
    jobs?.filter(j => j.status === "waiting" || j.status === "in_progress").slice(0, 6) ?? [],
    [jobs]
  );

  const appointmentDates = useMemo(
    () => (appointments as any[])?.map((a: any) => parseISO(a.scheduled_at)) ?? [],
    [appointments]
  );

  const appointmentsToday = useMemo(
    () => (appointments as any[])?.filter((a: any) => isSameDay(parseISO(a.scheduled_at), today)).length ?? 0,
    [appointments]
  );

  const salesByMethod = useMemo(() => {
    if (!jobs) return [];
    const cm = today.getMonth(), cy = today.getFullYear();
    const map: Record<string, number> = {};
    for (const j of jobs) {
      const c = new Date(j.created_at);
      if (c.getMonth() !== cm || c.getFullYear() !== cy) continue;
      if (j.status !== "done" && j.status !== "delivered") continue;
      const pm = (j as any).payment_method || "pix";
      map[pm] = (map[pm] || 0) + (Number(j.total_price) || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const last7 = useMemo(() => {
    if (!jobs) return [];
    const map = new Map<string, { name: string; total: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map.set(d.toDateString(), { name: format(d, "EEE", { locale: ptBR }).substring(0, 3), total: 0 });
    }
    for (const j of jobs) {
      if (j.status !== "done" && j.status !== "delivered") continue;
      const fd = j.finished_at ? new Date(j.finished_at).toDateString() : new Date(j.created_at).toDateString();
      if (map.has(fd)) map.get(fd)!.total += Number(j.total_price) || 0;
    }
    return Array.from(map.values());
  }, [jobs]);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const anim: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } } };

  // ════════════════════════════════════════════════════════════════════════════
  // MOBILE — card stack (unchanged)
  // ════════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <AppLayout>
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {getGreeting()},{" "}
              <span className="text-primary">{profile?.full_name?.split(" ")[0] ?? ""}!</span>
            </h1>
            <p className="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">
              {format(today, "EEEE • d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : (
            <motion.div variants={anim} initial="hidden" animate="show" className="space-y-5">
              {/* Faturamento */}
              <motion.div variants={item}>
                <C>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                      <DollarSign className="h-6 w-6 text-primary" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Faturamento do mês</p>
                      <p className="text-3xl font-extrabold tracking-tight text-foreground truncate">{formatCurrency(revenueMonth)}</p>
                    </div>
                  </div>
                </C>
              </motion.div>

              {/* 3 status */}
              <motion.div variants={item} className="grid grid-cols-3 gap-2">
                {[
                  { label: "Aguardando", value: waiting, icon: Clock, icolor: "text-warning", bg: "bg-warning/10" },
                  { label: "Execução",   value: inProgress, icon: Car, icolor: "text-primary", bg: "bg-primary/10" },
                  { label: "Concluídos", value: doneToday, icon: CheckCircle2, icolor: "text-success", bg: "bg-success/10" },
                ].map(({ label, value, icon: Icon, icolor, bg }) => (
                  <button key={label} onClick={() => navigate("/jobs")} className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-2 text-center">
                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", bg)}>
                      <Icon className={cn("h-3.5 w-3.5", icolor)} strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl font-extrabold text-foreground leading-none">{value}</span>
                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
                  </button>
                ))}
              </motion.div>

              {/* 2 OS cards */}
              <motion.div variants={item} className="grid grid-cols-2 gap-2">
                {[
                  { label: "OS do dia",  value: ordersToday,  icon: CalendarDays },
                  { label: "OS do mês",  value: ordersMonth,  icon: CalendarRange },
                ].map(({ label, value, icon: Icon }) => (
                  <C key={label} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-foreground leading-none">{value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
                    </div>
                  </C>
                ))}
              </motion.div>

              {/* Nova OS */}
              <motion.div variants={item} whileTap={{ scale: 0.97 }}>
                <Button onClick={() => navigate("/checkin")} className="h-14 w-full rounded-xl bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-widest text-sm">
                  <Plus className="mr-2 h-5 w-5" strokeWidth={3} /> Nova OS
                </Button>
              </motion.div>

              {/* OS ativas */}
              {recentActive.length > 0 && (
                <motion.div variants={item} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Em Andamento</h2>
                    <button onClick={() => navigate("/jobs")} className="flex items-center gap-0.5 text-xs text-primary font-semibold">Ver todas <ChevronRight className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="space-y-2">
                    {recentActive.map(job => {
                      const v = (job as any).vehicles;
                      const st = statusConfig[job.status] ?? statusConfig.waiting;
                      return (
                        <button key={job.id} onClick={() => navigate("/jobs")} className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 text-left">
                          <div className="shrink-0 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
                            <span className="font-mono text-[11px] font-bold text-primary tracking-widest uppercase">{v?.plate ?? "—"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{v?.customers?.name ?? v?.model ?? "—"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{v?.model ?? ""}</p>
                          </div>
                          <span className={cn("shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase", st.bg, st.color)}>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </AppLayout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DESKTOP — CERA-style 3-row grid
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <AppLayout>
      <motion.div variants={anim} initial="hidden" animate="show" className="space-y-4">

        {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Olá, <span className="text-primary">{profile?.full_name?.split(" ")[0] ?? ""}!</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/checkin")} className="h-8 bg-primary hover:bg-primary/90 text-black font-bold text-xs rounded-lg px-4">
              <Plus className="h-3.5 w-3.5 mr-1.5" strokeWidth={3} /> Nova OS
            </Button>
            <Button variant="outline" onClick={() => navigate("/agenda")} className="h-8 text-xs border border-white/10 hover:border-primary/30 text-foreground hover:text-primary rounded-lg px-4">
              Novo Agendamento
            </Button>
            <Button variant="outline" onClick={() => navigate("/jobs")} className="h-8 text-xs border border-white/10 hover:border-primary/30 text-foreground hover:text-primary rounded-lg px-4">
              Novo Orçamento
            </Button>
            <Button variant="outline" onClick={() => navigate("/agenda")} className="h-8 text-xs border border-white/10 hover:border-primary/30 text-foreground hover:text-primary rounded-lg px-4">
              Preencher Vagas
            </Button>
            {/* Eye toggle */}
            <button
              onClick={() => setHideValues(v => !v)}
              title={hideValues ? "Exibir valores" : "Ocultar valores sensíveis"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                hideValues
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {hideValues ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* ── ROW 1: Calendário | Resumo Vendas | Resumo Financeiro ── */}
            <motion.div variants={item} className="grid gap-3" style={{ gridTemplateColumns: "1fr 1.7fr 1.2fr" }}>

              {/* Calendário — clicável */}
              <C>
                <CH
                  left="Calendário"
                  right={
                    <Badge className={cn("text-[9px] font-semibold rounded-full border-0 px-2",
                      appointmentsToday > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {appointmentsToday > 0 ? `${appointmentsToday} hoje` : "Sem agendamentos"}
                    </Badge>
                  }
                />
                <Calendar
                  mode="single"
                  selected={today}
                  onSelect={(date) => {
                    if (date) navigate(`/jobs?date=${format(date, "yyyy-MM-dd")}`);
                  }}
                  className="p-0 w-full [&_.rdp]:w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-day_button]:h-7 [&_.rdp-day_button]:w-7 [&_.rdp-day_button]:text-[11px] [&_.rdp-head_cell]:text-[9px] [&_.rdp-caption_label]:text-[11px] [&_.rdp-caption_label]:font-semibold"
                  modifiers={{ hasAppt: appointmentDates }}
                  modifiersClassNames={{ hasAppt: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary" }}
                />
              </C>

              {/* Resumo Vendas */}
              <C>
                <CH
                  left="Resumo das vendas"
                  right={<span className="text-primary font-bold">{formatCurrency(revenueMonth)}</span>}
                />
                {/* Legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                  {Object.entries(pmLabels).map(([key, lbl]) => (
                    <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: pmColors[key] }} />
                      {lbl}
                    </span>
                  ))}
                </div>
                {salesByMethod.length > 0 ? (
                  <div className="h-[80px]">
                    <ChartContainer config={{ value: { label: "Valor", color: "#C8FF00" } }} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesByMethod} barSize={22} barCategoryGap="20%">
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "Outfit" }} tickFormatter={v => pmLabels[v]?.substring(0, 3) || v} />
                          <ChartTooltip content={<ChartTooltipContent formatter={(v: number) => formatCurrency(v)} />} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {salesByMethod.map((e, i) => <Cell key={i} fill={pmColors[e.name] || "#C8FF00"} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="h-[80px] flex items-center justify-center">
                    <p className="text-xs text-muted-foreground italic">Nenhuma venda registrada ainda</p>
                  </div>
                )}
              </C>

              {/* Resumo Financeiro */}
              <C>
                <CH left="Resumo financeiro" right={<span className="text-primary font-bold tracking-tight">{mask(formatCurrency(revenueMonth))}</span>} />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-secondary/50 rounded-lg p-2 flex flex-col">
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Entradas hoje</p>
                    <p className="text-xs font-extrabold text-[#22c55e]">↑ {mask(formatCurrency(revenueToday))}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 flex flex-col">
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Saídas hoje</p>
                    <p className="text-xs font-extrabold text-[#ef4444]">↓ {mask(formatCurrency(0))}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 flex flex-col">
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Fatura cartão</p>
                    <p className="text-xs font-extrabold text-primary">⇄ {mask(formatCurrency(0))}</p>
                  </div>
                </div>
              </C>
            </motion.div>

            {/* ── ROW 2: 4 cards operacionais ─────────────────────────── */}
            <motion.div variants={item} className="grid grid-cols-4 gap-3">

              <C
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate("/jobs?filter=quotes")}
              >
                <CH left="Orçamentos esse mês" />
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-3xl font-extrabold text-foreground leading-none">{maskNum(pendingJobs)}</p>
                    <p className="text-[10px] text-warning mt-1">pendentes</p>
                  </div>
                  <div className="border-l border-border pl-4 mb-0.5">
                    <p className="text-3xl font-extrabold text-foreground leading-none">{maskNum(approvedJobs)}</p>
                    <p className="text-[10px] text-primary mt-1">aprovados</p>
                  </div>
                </div>
              </C>

              <C
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate("/settings?tab=space")}
              >
                <CH left="Vagas no espaço hoje" right={<span className="text-primary font-bold">{maskNum(inProgress)} / 10</span>} />
                <div className="mt-1 mb-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: hideValues ? "0%" : `${Math.min((inProgress / 10) * 100, 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{maskNum(doneToday)} concluídas hoje</p>
                <p className="text-[10px] text-primary font-semibold mt-0.5">{maskNum(waiting)} aguardando</p>
              </C>

              <C
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate("/jobs?filter=opportunities")}
              >
                <CH left="Oportunidades para hoje" />
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-3xl font-extrabold text-foreground leading-none">{maskNum(waiting)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">pendentes</p>
                  </div>
                  <div className="border-l border-border pl-4 mb-0.5">
                    <p className="text-3xl font-extrabold text-foreground leading-none">{maskNum(doneToday)}</p>
                    <p className="text-[10px] text-primary mt-1">realizadas</p>
                  </div>
                </div>
              </C>

              <C
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate("/team")}
              >
                <CH left="Funcionários cadastrados" />
                <p className="text-3xl font-extrabold text-foreground leading-none">{maskNum(team?.length ?? 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">cadastrados no sistema</p>
              </C>
            </motion.div>

            {/* ── ROW 3: Empresa | Top 5 ──────────────────────────────── */}
            <motion.div variants={item} className="grid gap-3" style={{ gridTemplateColumns: "1fr 1.6fr" }}>

              {/* Empresa */}
              <C
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate("/settings?tab=company")}
              >
                <CH left="Sua empresa" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <span className="text-lg font-extrabold text-primary">
                      {(shop as any)?.name?.substring(0, 1).toUpperCase() ?? "H"}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm leading-tight">{(shop as any)?.name ?? "HubAuto"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Desde {(shop as any)?.created_at
                        ? format(new Date((shop as any).created_at), "MMM yyyy", { locale: ptBR })
                        : "—"}
                    </p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-0 font-semibold text-[10px]">Plano Essencial</Badge>
              </C>

              {/* Top 5 */}
              <C
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate("/customers")}
              >
                <CH left="Top 5 clientes" right={<span className="text-primary text-[10px] font-semibold">Este mês</span>} />
                {topCustomers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">Não há clientes no momento</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {topCustomers.map((c: any, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {c.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.count} OS</p>
                        </div>
                        <span className="font-mono text-[12px] font-bold text-primary shrink-0">{mask(formatCurrency(c.spent))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </C>
            </motion.div>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}
