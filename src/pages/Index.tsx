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
  ClipboardList, Target,
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

        {/* ── ROW 0: KPI Cards ─────────────────────────────────────── */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Serviços hoje",
              value: "5",
              badge: "↑ 25% vs ontem",
              badgeColor: "bg-success/15 text-success",
              icon: ClipboardList,
              iconBg: "bg-info/15",
              iconColor: "text-info",
            },
            {
              label: "Ticket médio",
              value: "R$ 346",
              badge: "↑ 12%",
              badgeColor: "bg-success/15 text-success",
              icon: DollarSign,
              iconBg: "bg-teal/15",
              iconColor: "text-teal",
            },
            {
              label: "Receita hoje",
              value: "R$ 1.730",
              badge: "↓ 8%",
              badgeColor: "bg-destructive/15 text-destructive",
              icon: TrendingUp,
              iconBg: "bg-success/15",
              iconColor: "text-success",
            },
            {
              label: "Oportunidades abertas",
              value: "3",
              badge: "R$ 3.750 em aberto",
              badgeColor: "bg-warning/15 text-warning",
              icon: Target,
              iconBg: "bg-pink/15",
              iconColor: "text-pink",
            },
          ].map((kpi) => (
            <C key={kpi.label}>
              <div className="flex items-start justify-between mb-3">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", kpi.iconBg)}>
                  <kpi.icon className={cn("h-3.5 w-3.5", kpi.iconColor)} strokeWidth={2} />
                </div>
              </div>
              <p className="text-[20px] font-extralight text-foreground leading-none tracking-tight">
                {mask(kpi.value)}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em] mt-1.5">
                {kpi.label}
              </p>
              <span className={cn("inline-block mt-2 text-[10px] font-semibold rounded-full px-2 py-0.5", kpi.badgeColor)}>
                {kpi.badge}
              </span>
            </C>
          ))}
        </motion.div>

        {/* ── ROW 0.5: Fila do Dia + Próximos ─────────────────── */}
        <motion.div variants={item} className="grid grid-cols-12 gap-3">
          {/* Fila do Dia */}
          <C className="col-span-8 flex flex-col">
            <CH
              left="Fila do dia"
              right={
                <button onClick={() => navigate("/jobs")} className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                  ver todas <ChevronRight className="h-3 w-3" />
                </button>
              }
            />
            <div className="flex-1 flex flex-col divide-y divide-border/50">
              {[
                { time: "08:30", name: "Ricardo Mendes", plate: "ABC-1C23", service: "Polimento cristalizado", price: "R$ 380", status: "delivered" as JobStatus },
                { time: "09:15", name: "Fernanda Lima", plate: "XY7-4F56", service: "Lavagem completa", price: "R$ 120", status: "done" as JobStatus },
                { time: "10:00", name: "Carlos Oliveira", plate: "QRS-7F98", service: "Higienização interna", price: "R$ 250", status: "in_progress" as JobStatus },
                { time: "11:30", name: "Bruno Ferreira", plate: "MNO-2S34", service: "Vitrificação", price: "R$ 800", status: "waiting" as JobStatus },
                { time: "14:00", name: "Nikolas Souza", plate: "DEF-5H67", service: "Lavagem + cera", price: "R$ 180", status: "waiting" as JobStatus },
              ].map((row) => {
                const st = statusConfig[row.status];
                return (
                  <div key={row.time} className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-[13px] text-muted-foreground font-medium w-10 shrink-0">{row.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{row.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{row.plate}</p>
                    </div>
                    <span className="text-[12px] text-muted-foreground hidden lg:block">{row.service}</span>
                    <span className="text-[13px] font-medium text-foreground w-16 text-right shrink-0">{mask(row.price)}</span>
                    <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", st.bg, st.color)}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </C>

          {/* Próximos agendamentos */}
          <C className="col-span-4 flex flex-col">
            <CH
              left="Próximos"
              right={
                <button onClick={() => navigate("/agenda")} className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                  agenda <ChevronRight className="h-3 w-3" />
                </button>
              }
            />
            <div className="flex-1 flex flex-col gap-3">
              {[
                { hour: "15", min: "30", name: "Ana Beatriz", detail: "Lavagem cristalizada · LKR-8J32" },
                { hour: "16", min: "00", name: "Marcos Vinícius", detail: "Polimento + cera · DFQ-3K45" },
                { hour: "17", min: "00", name: "Juliana Rocha", detail: "Higienização completa · WGR-6L78" },
                { hour: "17", min: "45", name: "Pedro Almeida", detail: "Lavagem simples · GY8-8M90" },
              ].map((a) => (
                <div key={a.hour + a.min} className="flex items-center gap-3">
                  <div className="flex h-[38px] w-[38px] shrink-0 flex-col items-center justify-center rounded-lg bg-secondary text-foreground">
                    <span className="text-[14px] font-semibold leading-none">{a.hour}</span>
                    <span className="text-[9px] text-muted-foreground leading-none">{a.min}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </C>
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

            {/* ── ROW 2: Pátio + Orçamentos + Vendas + Tempo ────────── */}
            <motion.div variants={item} className="grid grid-cols-4 gap-3">

              {/* Pátio agora */}
              <C className="flex flex-col">
                <CH left="Pátio agora" />
                <div className="flex-1">
                  <div className="grid grid-cols-5 grid-rows-2 gap-1.5">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const occupied = i < 3;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "aspect-square rounded-lg flex items-center justify-center",
                            occupied
                              ? "bg-secondary border border-border"
                              : "border border-dashed border-border/50"
                          )}
                        >
                          {occupied && <Car className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-border/50">
                  <p className="text-[16px] font-extralight text-foreground leading-none">
                    <span className="font-semibold">3</span> / 10 vagas
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">7 vagas disponíveis</p>
                </div>
              </C>

              {/* Orçamentos */}
              <C className="flex flex-col">
                <CH left="Orçamentos" right="este mês" />
                <div className="flex items-end gap-5">
                  {[
                    { n: 2, label: "pendentes", color: "text-warning" },
                    { n: 5, label: "aprovados", color: "text-success" },
                    { n: 1, label: "recusados", color: "text-destructive" },
                  ].map((q) => (
                    <div key={q.label}>
                      <p className={cn("text-[28px] font-extralight leading-none", q.color)}>{maskNum(q.n)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{q.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Valor total</p>
                    <p className="text-[13px] font-semibold text-foreground">{mask("R$ 4.280")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Taxa de conversão</p>
                    <p className="text-[13px] font-semibold text-success">62%</p>
                  </div>
                </div>
              </C>

              {/* Resumo de vendas */}
              <C className="flex flex-col">
                <CH left="Resumo de vendas" right={<span className="font-semibold text-foreground">{mask("R$ 2.320,00")}</span>} />
                {/* Legend */}
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-2">
                  {[
                    { label: "Crédito", color: "#34d399" },
                    { label: "Débito", color: "#d4a017" },
                    { label: "Pix", color: "#2dd4bf" },
                    { label: "Dinheiro", color: "#60a5fa" },
                    { label: "Boleto", color: "#a78bfa" },
                    { label: "Transf.", color: "#f87171" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
                {/* CSS bar chart */}
                <div className="flex-1 flex items-end gap-1.5 min-h-[60px]">
                  {[
                    { day: "Seg", h: 45, color: "#a78bfa" },
                    { day: "Ter", h: 70, color: "#34d399" },
                    { day: "Qua", h: 55, color: "#d4a017" },
                    { day: "Qui", h: 80, color: "#2dd4bf" },
                    { day: "Sex", h: 60, color: "#60a5fa" },
                    { day: "Sáb", h: 40, color: "#60a5fa" },
                    { day: "Dom", h: 20, color: "#a78bfa" },
                  ].map((b) => (
                    <div key={b.day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-sm transition-all"
                        style={{ height: `${b.h}%`, backgroundColor: b.color, minHeight: 4 }}
                      />
                      <span className="text-[8px] text-muted-foreground">{b.day}</span>
                    </div>
                  ))}
                </div>
                {/* Breakdown */}
                <div className="mt-auto pt-3 border-t border-border/50 space-y-1">
                  {[
                    { label: "Crédito", value: "R$ 800,00", color: "#34d399" },
                    { label: "Dinheiro", value: "R$ 650,00", color: "#60a5fa" },
                    { label: "Pix", value: "R$ 450,00", color: "#2dd4bf" },
                    { label: "Débito", value: "R$ 420,00", color: "#d4a017" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{r.label}</span>
                      <span className="text-[10px] font-semibold" style={{ color: r.color }}>{mask(r.value)}</span>
                    </div>
                  ))}
                </div>
              </C>

              {/* Tempo médio por serviço */}
              <C className="flex flex-col">
                <CH left="Tempo médio por serviço" />
                <div className="flex-1 flex items-end gap-2 min-h-[80px]">
                  {[
                    { label: "Lavagem\nsimples", h: 30, time: "25 min" },
                    { label: "Lavagem\ncompleta", h: 50, time: "45 min" },
                    { label: "Higieni-\nzação", h: 65, time: "1h10" },
                    { label: "Polimento", h: 80, time: "1h30" },
                    { label: "Vitrifi-\ncação", h: 95, time: "2h15" },
                  ].map((b) => (
                    <div key={b.label} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border text-[9px] text-foreground font-medium rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none z-10">
                        {b.time}
                      </div>
                      <div
                        className="w-full rounded-t-sm bg-muted-foreground/30 hover:bg-primary/60 transition-colors cursor-default"
                        style={{ height: `${b.h}%`, minHeight: 4 }}
                      />
                      <span className="text-[7px] text-muted-foreground text-center leading-tight whitespace-pre-line">{b.label}</span>
                    </div>
                  ))}
                </div>
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
