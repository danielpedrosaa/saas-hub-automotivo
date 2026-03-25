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
  ClipboardList, Target, MessageSquare, AlertTriangle,
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
            <h1 className="text-2xl font-extralight text-foreground tracking-tight">
              Olá, <strong className="font-normal">{profile?.full_name?.split(" ")[0] ?? ""}</strong>
            </h1>
            <p className="text-xs text-muted-foreground font-extralight mt-0.5">
              {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/checkin")} className="h-9 bg-primary hover:bg-primary/90 text-black font-medium text-xs rounded-[10px] px-4">
              <Plus className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} /> Nova OS
            </Button>
            <Button variant="outline" onClick={() => navigate("/agenda")} className="h-9 text-xs border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground font-light rounded-[10px] px-4">
              Agendamento
            </Button>
            <Button variant="outline" onClick={() => navigate("/jobs")} className="h-9 text-xs border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground font-light rounded-[10px] px-4">
              Orçamento
            </Button>
            {/* Eye toggle */}
            <button
              onClick={() => setHideValues(v => !v)}
              title={hideValues ? "Exibir valores" : "Ocultar valores sensíveis"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors",
                hideValues
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {hideValues ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.div>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <motion.div variants={item} className="flex items-center gap-2.5 bg-secondary/40 border border-border rounded-xl px-4 py-0">
          <svg className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="flex-1 bg-transparent border-none outline-none text-[13px] font-light text-foreground py-3 placeholder:text-muted-foreground"
            placeholder="Buscar ordens, clientes, placas..."
          />
          <span className="text-[10px] font-normal text-muted-foreground/60 bg-secondary/60 px-2 py-0.5 rounded shrink-0">⌘K</span>
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
              iconBg: "bg-warning/15",
              iconColor: "text-warning",
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
            {/* (Calendar row removed — not in reference) */}

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

            {/* ── ROW 2.5: Financeiro + Oportunidades ─────────────────── */}
            <motion.div variants={item} className="grid grid-cols-12 gap-3">

              {/* Resumo financeiro */}
              <C className="col-span-6 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Resumo financeiro</p>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-secondary rounded-lg overflow-hidden">
                      {["Diário", "Semanal", "Mensal"].map((p) => (
                        <button
                          key={p}
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-medium transition-colors",
                            p === "Diário"
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => navigate("/financial")} className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                      detalhes <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Entradas / Saídas */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-secondary/60 rounded-lg p-3">
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Entradas hoje</p>
                    <p className="text-xl font-extralight text-success leading-none">{mask("R$ 1.730")}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">Valor total de todas as entradas</p>
                  </div>
                  <div className="bg-secondary/60 rounded-lg p-3">
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Saídas hoje</p>
                    <p className="text-xl font-extralight text-destructive leading-none">{mask("R$ 340")}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">Produtos, comissões, despesas</p>
                  </div>
                </div>

                {/* Faturas pendentes */}
                <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2 mb-4">
                  <span className="text-[11px] text-muted-foreground">Faturas de cartões pendentes</span>
                  <span className="text-[12px] font-semibold text-pink">{mask("R$ 1.220,00")}</span>
                </div>

                {/* Receita semanal */}
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Receita semanal</p>
                <div className="flex-1 min-h-[80px] relative">
                  <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path d="M0,40 L50,35 L100,30 L150,25 L200,20 L250,30 L300,55 L300,80 L0,80 Z" fill="url(#areaGrad)" />
                    <polyline points="0,40 50,35 100,30 150,25 200,20 250,30 300,55" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinejoin="round" />
                    {[[0,40],[50,35],[100,30],[150,25],[200,20],[250,30],[300,55]].map(([x,y],i) => (
                      <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
                    ))}
                  </svg>
                </div>
                <div className="flex justify-between mt-1">
                  {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((d) => (
                    <span key={d} className="text-[9px] text-muted-foreground">{d}</span>
                  ))}
                </div>
              </C>

              {/* Oportunidades */}
              <C className="col-span-6 flex flex-col">
                <CH
                  left="Oportunidades"
                  right={
                    <button onClick={() => navigate("/jobs?filter=opportunities")} className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
                      ver todas <ChevronRight className="h-3 w-3" />
                    </button>
                  }
                />
                <div className="flex-1 space-y-3">
                  {[
                    { initials: "ML", name: "Marina Lopes", detail: "Pediu orçamento de vitrificação", value: "R$ 900", ago: "há 5 dias", agoColor: "text-destructive" },
                    { initials: "TP", name: "Thiago Pires", detail: "Interessado em polimento + PPF", value: "R$ 2.400", ago: "há 2 dias", agoColor: "text-warning" },
                    { initials: "RS", name: "Renata Silva", detail: "Lavagem recorrente mensal (3 carros)", value: "R$ 450/mês", ago: "hoje", agoColor: "text-success" },
                  ].map((opp) => (
                    <div key={opp.initials} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{opp.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{opp.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{opp.detail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-semibold text-foreground">{mask(opp.value)}</p>
                        <p className={cn("text-[10px] font-medium", opp.agoColor)}>{opp.ago}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-3 border-t border-border/50 flex items-center gap-4">
                  {[
                    { n: 3, label: "pendentes", color: "text-warning" },
                    { n: 8, label: "fechadas este mês", color: "text-success" },
                    { n: 2, label: "perdidas", color: "text-destructive" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-baseline gap-1">
                      <span className={cn("text-[16px] font-extralight", s.color)}>{maskNum(s.n)}</span>
                      <span className="text-[9px] text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                  <div className="ml-auto text-right">
                    <p className="text-[14px] font-semibold text-foreground">{mask("R$ 3.750")}</p>
                    <p className="text-[9px] text-muted-foreground">valor em aberto</p>
                  </div>
                </div>
              </C>
            </motion.div>

            {/* ── ROW 3: Serviços + Performance + Top Clientes ─────── */}
            <motion.div variants={item} className="grid grid-cols-3 gap-3">

              {/* Serviços mais vendidos */}
              <C className="flex flex-col">
                <CH left="Serviços mais vendidos" right="este mês" />
                <div className="flex-1 flex flex-col gap-2">
                  {[
                    { name: "Lavagem completa", qty: 48 },
                    { name: "Polimento cristalizado", qty: 31 },
                    { name: "Higienização interna", qty: 24 },
                    { name: "Vitrificação", qty: 12 },
                    { name: "Lavagem + cera", qty: 9 },
                  ].map((s, i) => (
                    <div key={s.name} className="flex items-start gap-2.5">
                      <span className="text-[11px] font-light text-muted-foreground/60 w-4 text-right shrink-0 mt-px">{i + 1}</span>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-light text-muted-foreground truncate">{s.name}</p>
                          <span className="text-[11px] font-normal text-muted-foreground shrink-0">{maskNum(s.qty)}</span>
                        </div>
                        <div className="h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-muted-foreground/45" style={{ width: `${(s.qty / 48) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </C>

              {/* Performance dos técnicos */}
              <C className="flex flex-col">
                <CH left="Performance dos técnicos" right="este mês" />
                <div className="flex-1 flex flex-col gap-6">
                  {[
                    { initials: "JC", name: "João Carlos", role: "Polimento / Vitrificação", services: 24, rating: 4.8, pct: 100 },
                    { initials: "MS", name: "Marcos Silva", role: "Lavagem / Higienização", services: 19, rating: 4.6, pct: 79 },
                    { initials: "RL", name: "Rafael Lima", role: "Lavagem geral", services: 15, rating: 4.3, pct: 63 },
                    { initials: "AP", name: "André Pereira", role: "Detalhamento", services: 11, rating: 4.9, pct: 46 },
                  ].map((t) => (
                    <div key={t.initials} className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-secondary text-muted-foreground text-[9px] font-normal">{t.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-normal text-foreground truncate">{t.name}</p>
                        <p className="text-[8px] font-extralight text-muted-foreground">{t.role}</p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-center">
                          <span className="text-[12px] font-light text-foreground tabular-nums">{maskNum(t.services)}</span>
                          <p className="text-[7px] font-light uppercase tracking-[0.06em] text-muted-foreground">serviços</p>
                        </div>
                        <div className="text-center">
                          <span className="text-[12px] font-light text-foreground tabular-nums">{t.rating}</span>
                          <p className="text-[7px] font-light uppercase tracking-[0.06em] text-muted-foreground">avaliação</p>
                        </div>
                      </div>
                      <div className="w-20 shrink-0">
                        <div className="h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${t.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </C>

              {/* Top clientes */}
              <C className="flex flex-col">
                <CH left="Top clientes" right="este mês" />
                <div className="flex-1 divide-y divide-border/50">
                  {[
                    { initials: "RM", name: "Ricardo Mendes", visits: 3, spent: "R$ 880" },
                    { initials: "FL", name: "Fernanda Lima", visits: 4, spent: "R$ 600" },
                    { initials: "CO", name: "Carlos Oliveira", visits: 2, spent: "R$ 280" },
                    { initials: "BF", name: "Bruno Ferreira", visits: 1, spent: "R$ 150" },
                    { initials: "NS", name: "Nikolas Souza", visits: 1, spent: "R$ 120" },
                  ].map((c) => (
                    <div key={c.initials} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.visits} {c.visits === 1 ? "visita" : "visitas"}</p>
                      </div>
                      <span className="text-[12px] font-semibold text-primary shrink-0">{mask(c.spent)}</span>
                    </div>
                  ))}
                </div>
              </C>
            </motion.div>

            {/* ── ROW 4: Fidelidade + Clientes com plano ─────── */}
            <motion.div variants={item} className="grid grid-cols-12 gap-3">

              {/* Planos de fidelidade */}
              <C className="col-span-6 flex flex-col">
                <CH left="Planos de fidelidade" right={<span className="text-[10px] text-primary cursor-pointer hover:underline">gerenciar →</span>} />
                <div className="grid grid-cols-2 gap-2 flex-1">
                  {/* Básico */}
                  <div className="rounded-lg border border-border/60 p-3 flex flex-col relative overflow-hidden">
                    <div className="absolute top-2 right-[-22px] bg-success text-black text-[8px] font-semibold px-7 py-0.5 rotate-45 uppercase tracking-wider">Popular</div>
                    <p className="text-[12px] font-normal text-foreground">Plano Básico</p>
                    <p className="text-[10px] font-extralight text-muted-foreground mb-2 leading-tight">4 lavagens simples por mês</p>
                    <p className="text-lg font-extralight text-foreground">R$ 119 <span className="text-[10px] text-muted-foreground font-light">/mês</span></p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-muted-foreground">👥 7 assinantes</span>
                      <span className="text-[9px] text-success">↗ Economia 30%</span>
                    </div>
                  </div>
                  {/* Premium */}
                  <div className="rounded-lg border border-border/60 p-3 flex flex-col">
                    <p className="text-[12px] font-normal text-foreground">Plano Premium</p>
                    <p className="text-[10px] font-extralight text-muted-foreground mb-2 leading-tight">4 lavagens completas + 1 polimento</p>
                    <p className="text-lg font-extralight text-foreground">R$ 299 <span className="text-[10px] text-muted-foreground font-light">/mês</span></p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-muted-foreground">👥 3 assinantes</span>
                      <span className="text-[9px] text-success">↗ Economia 25%</span>
                    </div>
                  </div>
                  {/* Frota */}
                  <div className="rounded-lg border border-border/60 p-3 flex flex-col">
                    <p className="text-[11px] font-semibold text-foreground">Plano Frota</p>
                    <p className="text-[9px] text-muted-foreground mb-2">8 lavagens simples (até 3 veículos)</p>
                    <p className="text-lg font-light text-foreground">R$ 199 <span className="text-[9px] text-muted-foreground font-normal">/mês</span></p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-muted-foreground">👥 2 assinantes</span>
                      <span className="text-[9px] text-muted-foreground">🚗 Multi-veículo</span>
                    </div>
                  </div>
                  {/* Criar novo */}
                  <div className="rounded-lg border border-dashed border-border/40 p-3 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/40 transition-colors">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Criar novo plano</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-auto pt-3 border-t border-border/30">
                  <div><span className="text-lg font-light text-foreground">12</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">assinantes ativos</p></div>
                  <div><span className="text-lg font-light text-success">R$ 2.966</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">receita recorrente/mês</p></div>
                  <div><span className="text-lg font-light text-foreground">92%</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">taxa de retenção</p></div>
                </div>
              </C>

              {/* Clientes com plano ativo */}
              <C className="col-span-6 flex flex-col">
                <CH left="Clientes com plano ativo" right={<span className="text-[10px] text-primary cursor-pointer hover:underline">ver todos →</span>} />
                <div className="flex-1 space-y-3">
                  {[
                    { initials: "RM", name: "Ricardo Mendes", plan: "Plano Básico · desde jan/26", used: 3, total: 4, color: "bg-success" },
                    { initials: "FL", name: "Fernanda Lima", plan: "Plano Premium · desde fev/26", used: 2, total: 5, color: "bg-primary" },
                    { initials: "CO", name: "Carlos Oliveira", plan: "Plano Básico · desde mar/26", used: 1, total: 4, color: "bg-primary" },
                    { initials: "AB", name: "Ana Beatriz", plan: "Plano Frota · desde jan/26", used: 8, total: 8, color: "bg-success" },
                    { initials: "BF", name: "Bruno Ferreira", plan: "Plano Premium · desde fev/26", used: 3, total: 5, color: "bg-primary" },
                    { initials: "MV", name: "Marcos Vinícius", plan: "Plano Básico · desde mar/26", used: 2, total: 4, color: "bg-primary" },
                  ].map((c) => (
                    <div key={c.initials} className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-[9px] text-muted-foreground">{c.plan}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${c.used === c.total ? "bg-success" : "bg-primary/60"}`} style={{ width: `${(c.used / c.total) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-12 text-right">
                          {c.used}/{c.total} usadas{c.used === c.total && " ✓"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </C>
            </motion.div>

            {/* ── ROW 5: CRM de retorno + Pós-venda ─────── */}
            <motion.div variants={item} className="grid grid-cols-12 gap-3">

              {/* CRM de retorno */}
              <C className="col-span-6 flex flex-col">
                <CH left="CRM de retorno" right={<span className="text-[10px] text-primary cursor-pointer hover:underline">ver todos →</span>} />
                <div className="flex-1 space-y-0 divide-y divide-border/30">
                  {[
                    { name: "Pedro Henrique", days: 47, plate: "JKL-3M56", risk: "Risco alto", riskColor: "bg-destructive/15 text-destructive border-destructive/20" },
                    { name: "Camila Santos", days: 33, plate: "NOP-7Q89", risk: "Atenção", riskColor: "bg-warning/15 text-warning border-warning/20" },
                    { name: "Lucas Martins", days: 62, plate: "RST-1U23", risk: "Risco alto", riskColor: "bg-destructive/15 text-destructive border-destructive/20" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-3 py-3 first:pt-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground">{c.name}</p>
                        <p className="text-[9px] text-muted-foreground">Última visita: {c.days} dias · {c.plate}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] px-2 py-0.5 ${c.riskColor} shrink-0`}>{c.risk}</Badge>
                      <span className="text-[10px] text-primary cursor-pointer hover:underline shrink-0">Enviar msg →</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-auto pt-3 border-t border-border/30">
                  <div><span className="text-lg font-light text-destructive">5</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">inativos 30+ dias</p></div>
                  <div><span className="text-lg font-light text-warning">3</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">inativos 15-30 dias</p></div>
                  <div><span className="text-lg font-light text-success">68%</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">taxa de reativação</p></div>
                </div>
              </C>

              {/* Pós-venda automático */}
              <C className="col-span-6 flex flex-col">
                <CH left="Pós-venda automático" right={<span className="text-[10px] text-primary cursor-pointer hover:underline">configurar →</span>} />
                <div className="flex-1 space-y-3">
                  {[
                    { icon: <CheckCircle2 className="h-4 w-4" />, iconBg: "bg-success/15 text-success", title: "Pesquisa de satisfação", desc: "Enviada 24h após o serviço via WhatsApp", status: "Ativo" },
                    { icon: <MessageSquare className="h-4 w-4" />, iconBg: "bg-blue-500/15 text-blue-400", title: "Pedido de avaliação Google", desc: "Enviado se nota ≥ 4 estrelas", status: "Ativo" },
                    { icon: <AlertTriangle className="h-4 w-4" />, iconBg: "bg-warning/15 text-warning", title: "Alerta nota baixa", desc: "Notifica o dono se nota ≤ 2", status: "Ativo" },
                  ].map((a) => (
                    <div key={a.title} className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${a.iconBg}`}>{a.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground">{a.title}</p>
                        <p className="text-[9px] text-muted-foreground">{a.desc}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-success shrink-0">{a.status}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-auto pt-3 border-t border-border/30">
                  <div><span className="text-lg font-light text-foreground">4.7</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">nota média</p></div>
                  <div><span className="text-lg font-light text-foreground">89%</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">taxa de resposta</p></div>
                  <div><span className="text-lg font-light text-success">14</span><p className="text-[8px] text-muted-foreground uppercase tracking-wider">avaliações Google este mês</p></div>
                </div>
              </C>
            </motion.div>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}
