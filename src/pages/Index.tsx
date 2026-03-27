import { useMemo, useState, useCallback } from "react";
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
  in_progress: { label: "Em execução", color: "text-info",  bg: "bg-info/15 border-info/20" },
  done:        { label: "Finalizado",  color: "text-success",  bg: "bg-success/15 border-success/20" },
  delivered:   { label: "Entregue",    color: "text-muted-foreground", bg: "bg-muted border-border" },
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
      className={cn("bg-card border border-border rounded-[14px] p-[18px] hover:bg-card/80 hover:border-border/80 transition-all", className)}
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
      <p className="text-[11px] font-light text-muted-foreground uppercase tracking-[0.1em]">{left}</p>
      {right && <div className="text-[11px] text-muted-foreground font-extralight">{right}</div>}
    </div>
  );
}

// ── Resumo Financeiro (interactive) ─────────────────────────────────────────
type FinancePeriod = "Diário" | "Semanal" | "Mensal";

const financeData: Record<FinancePeriod, {
  labels: string[]; values: number[];
  entradas: { label: string; value: string; hint: string };
  saidas: { label: string; value: string; hint: string };
}> = {
  "Diário": {
    labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    values: [580, 430, 690, 510, 780, 340, 120],
    entradas: { label: "ENTRADAS HOJE", value: "R$ 1.730", hint: "Valor total de todas as entradas" },
    saidas: { label: "SAÍDAS HOJE", value: "R$ 340", hint: "Produtos, comissões, despesas" },
  },
  "Semanal": {
    labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    values: [2100, 3400, 2800, 3150],
    entradas: { label: "ENTRADAS SEMANA", value: "R$ 9.840", hint: "Total dos últimos 7 dias" },
    saidas: { label: "SAÍDAS SEMANA", value: "R$ 2.190", hint: "Produtos, comissões, despesas" },
  },
  "Mensal": {
    labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
    values: [8200, 9100, 7600, 10200, 9500, 11000, 8800, 9700, 10500, 11200, 9800, 10800],
    entradas: { label: "ENTRADAS MÊS", value: "R$ 38.500", hint: "Total do mês atual" },
    saidas: { label: "SAÍDAS MÊS", value: "R$ 8.720", hint: "Produtos, comissões, despesas" },
  },
};

function FinanceiroCard({ mask, navigate }: { mask: (v: string) => string; navigate: (path: string) => void }) {
  const [period, setPeriod] = useState<FinancePeriod>("Diário");
  const data = financeData[period];
  const maxVal = Math.max(...data.values, 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Chart dimensions
  const chartW = 600;
  const chartH = 160;
  const padL = 10;
  const padR = 10;
  const padT = 15;
  const padB = 5;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const pts = data.values.map((v, i) => {
    const x = padL + (data.labels.length === 1 ? plotW / 2 : (i / (data.labels.length - 1)) * plotW);
    const y = padT + plotH - (v / maxVal) * plotH;
    return [x, y] as [number, number];
  });

  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M${pts[0][0]},${pts[0][1]} L${line} L${pts[pts.length - 1][0]},${padT + plotH} L${pts[0][0]},${padT + plotH} Z`;

  // Grid lines (4 horizontal)
  const gridLines = [0.25, 0.5, 0.75, 1].map(pct => padT + plotH - pct * plotH);

  return (
    <C className="col-span-6 flex flex-col h-[420px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-light text-muted-foreground uppercase tracking-wide">Resumo financeiro</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
            {(["Diário", "Semanal", "Mensal"] as FinancePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-[10px] font-normal px-3 py-[5px] rounded-md transition-all cursor-pointer",
                  p === period
                    ? "bg-card border border-border text-foreground shadow-sm"
                    : "border border-transparent text-muted-foreground hover:text-foreground/70"
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
        <div className="bg-secondary/60 rounded-xl p-3 border border-border hover:bg-secondary/80 transition-colors">
          <p className="text-[9px] text-muted-foreground font-normal uppercase tracking-wider mb-1">{data.entradas.label}</p>
          <p className="text-xl font-extralight text-success leading-none tabular-nums">{mask(data.entradas.value)}</p>
          <p className="text-[9px] font-extralight text-muted-foreground mt-0.5">{data.entradas.hint}</p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-3 border border-border hover:bg-secondary/80 transition-colors">
          <p className="text-[9px] text-muted-foreground font-normal uppercase tracking-wider mb-1">{data.saidas.label}</p>
          <p className="text-xl font-extralight text-destructive leading-none tabular-nums">{mask(data.saidas.value)}</p>
          <p className="text-[9px] font-extralight text-muted-foreground mt-0.5">{data.saidas.hint}</p>
        </div>
      </div>

      {/* Faturas pendentes */}
      <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2 mb-4">
        <span className="text-[11px] text-muted-foreground">Faturas de cartões pendentes</span>
        <span className="text-[12px] font-light text-pink">{mask("R$ 1.220,00")}</span>
      </div>

      {/* Area chart label */}
      <p className="text-[10px] font-light text-muted-foreground uppercase tracking-wide mb-2">
        Receita {period === "Diário" ? "semanal" : period === "Semanal" ? "mensal" : "anual"}
      </p>

      {/* Area chart — proper aspect ratio */}
      <div className="flex-1 min-h-0 relative">
        <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="areaGradFin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {gridLines.map((gy, i) => (
            <line key={i} x1={padL} y1={gy} x2={padL + plotW} y2={gy} stroke="hsl(var(--border))" strokeWidth="0.5" />
          ))}
          {/* Baseline */}
          <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="hsl(var(--border))" strokeWidth="0.5" />

          {/* Area fill */}
          <path d={area} fill="url(#areaGradFin)" />
          {/* Line */}
          <polyline points={line} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots + tooltips */}
          {pts.map(([x, y], i) => (
            <g key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-crosshair"
            >
              <circle cx={x} cy={y} r="10" fill="transparent" />
              <circle cx={x} cy={y} r={hoveredIdx === i ? 5 : 3.5} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5" className="transition-all" />
              {hoveredIdx === i && (
                <foreignObject x={x - 40} y={y - 28} width="80" height="22" overflow="visible">
                  <div className="bg-popover border border-border text-[10px] text-foreground font-light rounded px-1.5 py-0.5 text-center whitespace-nowrap">
                    R$ {data.values[i].toLocaleString("pt-BR")}
                  </div>
                </foreignObject>
              )}
            </g>
          ))}

          {/* X-axis labels */}
          {data.labels.map((label, i) => {
            const x = padL + (data.labels.length === 1 ? plotW / 2 : (i / (data.labels.length - 1)) * plotW);
            return (
              <text
                key={label}
                x={x}
                y={chartH + 14}
                textAnchor={i === 0 ? "start" : i === data.labels.length - 1 ? "end" : "middle"}
                fill="hsl(var(--muted-foreground))"
                fontSize="11"
                fontWeight="300"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </C>
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
             <h1 className="text-2xl font-light tracking-tight text-foreground">
               {getGreeting()},{" "}
               <span className="text-primary">{profile?.full_name?.split(" ")[0] ?? ""}!</span>
             </h1>
             <p className="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground font-extralight">
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
                       <p className="text-[10px] font-light uppercase tracking-widest text-muted-foreground">Faturamento do mês</p>
                       <p className="text-3xl font-extralight tracking-tight text-foreground truncate">{formatCurrency(revenueMonth)}</p>
                    </div>
                  </div>
                </C>
              </motion.div>

              {/* 3 status */}
              <motion.div variants={item} className="grid grid-cols-3 gap-2">
                {[
                  { label: "Aguardando", value: waiting, icon: Clock, icolor: "text-warning", bg: "bg-warning/10" },
                  { label: "Execução",   value: inProgress, icon: Car, icolor: "text-info", bg: "bg-info/10" },
                  { label: "Finalizados", value: doneToday, icon: CheckCircle2, icolor: "text-success", bg: "bg-success/10" },
                ].map(({ label, value, icon: Icon, icolor, bg }) => (
                  <button key={label} onClick={() => navigate("/jobs")} className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-2 text-center">
                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", bg)}>
                      <Icon className={cn("h-3.5 w-3.5", icolor)} strokeWidth={2.5} />
                    </div>
                     <span className="text-2xl font-extralight text-foreground leading-none">{value}</span>
                     <span className="text-[9px] text-muted-foreground font-light uppercase tracking-wide">{label}</span>
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
                      <p className="text-xl font-extralight text-foreground leading-none">{value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
                    </div>
                  </C>
                ))}
              </motion.div>

              {/* Nova OS */}
              <motion.div variants={item} whileTap={{ scale: 0.97 }}>
                 <Button onClick={() => navigate("/checkin")} className="h-14 w-full rounded-xl bg-primary hover:bg-primary/90 text-black font-normal uppercase tracking-widest text-sm">
                   <Plus className="mr-2 h-5 w-5" strokeWidth={2} /> Nova OS
                </Button>
              </motion.div>

              {/* OS ativas */}
              {recentActive.length > 0 && (
                <motion.div variants={item} className="space-y-3">
                  <div className="flex items-center justify-between">
                     <h2 className="text-[10px] font-light uppercase tracking-widest text-muted-foreground">Em Andamento</h2>
                     <button onClick={() => navigate("/jobs")} className="flex items-center gap-0.5 text-xs text-primary font-light">Ver todas <ChevronRight className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="space-y-2">
                    {recentActive.map(job => {
                      const v = (job as any).vehicles;
                      const st = statusConfig[job.status] ?? statusConfig.waiting;
                      return (
                        <button key={job.id} onClick={() => navigate("/jobs")} className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 text-left">
                          <div className="shrink-0 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
                            <span className="font-mono text-[11px] font-normal text-primary tracking-widest uppercase">{v?.plate ?? "—"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-normal text-foreground truncate">{v?.customers?.name ?? v?.model ?? "—"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{v?.model ?? ""}</p>
                          </div>
                          <span className={cn("shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-medium uppercase", st.bg, st.color)}>{st.label}</span>
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
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} /> Agendamento
            </Button>
            <Button variant="outline" onClick={() => navigate("/jobs")} className="h-9 text-xs border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground font-light rounded-[10px] px-4">
              <DollarSign className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} /> Orçamento
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
              <p className="text-[20px] font-extralight text-foreground leading-none tracking-tight tabular-nums">
                {mask(kpi.value)}
              </p>
              <p className="text-[10px] font-light text-muted-foreground mt-0.5">
                {kpi.label}
              </p>
              <span className={cn("inline-block mt-1.5 text-[9px] font-normal rounded-[5px] px-1.5 py-0.5", kpi.badgeColor)}>
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
                     <span className="text-[13px] text-muted-foreground font-light w-10 shrink-0">{row.time}</span>
                     <div className="flex-1 min-w-0">
                       <p className="text-[13px] font-normal text-foreground truncate">{row.name}</p>
                       <p className="text-[10px] text-muted-foreground font-extralight uppercase tracking-wide">{row.plate}</p>
                     </div>
                     <span className="text-[12px] text-muted-foreground font-extralight hidden lg:block">{row.service}</span>
                     <span className="text-[13px] font-light text-foreground w-16 text-right shrink-0">{mask(row.price)}</span>
                     <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium", st.bg, st.color)}>
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
                     <span className="text-[14px] font-light leading-none">{a.hour}</span>
                     <span className="text-[9px] text-muted-foreground font-extralight leading-none">{a.min}</span>
                   </div>
                   <div className="min-w-0">
                     <p className="text-[13px] font-normal text-foreground truncate">{a.name}</p>
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
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const occupied = i < 3;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "aspect-square rounded-md flex items-center justify-center",
                            occupied
                              ? "bg-muted border border-border"
                              : "border border-dashed border-border/40"
                          )}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={cn("text-muted-foreground", !occupied && "opacity-20")}>
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                            <circle cx="7" cy="17" r="2" />
                            <path d="M9 17h6" />
                            <circle cx="17" cy="17" r="2" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-border/50">
                  <p className="text-foreground leading-none">
                    <span className="text-[24px] font-extralight">3</span>
                    <span className="text-[13px] text-muted-foreground ml-1">/ 10 vagas</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">7 vagas disponíveis</p>
                </div>
              </C>

              {/* Orçamentos */}
              <C className="flex flex-col">
                <CH left="Orçamentos" right="este mês" />
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                  <p className="text-[40px] font-extralight text-foreground leading-none tabular-nums">{maskNum(8)}</p>
                  <p className="text-[11px] text-muted-foreground font-light">orçamentos no mês</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { n: 2, label: "pendentes", color: "text-warning" },
                    { n: 5, label: "aprovados", color: "text-success" },
                    { n: 1, label: "recusados", color: "text-destructive" },
                  ].map((q) => (
                    <div key={q.label} className="text-center">
                      <p className={cn("text-[22px] font-extralight leading-none", q.color)}>{maskNum(q.n)}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 mb-3">{q.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Valor total</p>
                     <p className="text-[13px] font-light text-foreground">{mask("R$ 4.280")}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-muted-foreground">Taxa de conversão</p>
                     <p className="text-[13px] font-light text-success">62%</p>
                  </div>
                </div>
              </C>

              {/* Resumo de vendas — por método de pagamento */}
              <C className="flex flex-col">
                <CH left="Resumo de vendas" right={<span className="font-light text-foreground">{mask("R$ 2.320,00")}</span>} />
                {/* Legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                  {[
                    { label: "Crédito", color: "#34d399" },
                    { label: "Débito", color: "#b8a038" },
                    { label: "Pix", color: "#2dd4bf" },
                    { label: "Dinheiro", color: "#5b8fa8" },
                    { label: "Boleto", color: "#6366f1" },
                    { label: "Transferência", color: "#f472b6" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
                {/* Bar chart */}
                {(() => {
                  const bars = [
                    { label: "Boleto", value: 0, color: "#6366f1" },
                    { label: "Crédito", value: 800, color: "#34d399" },
                    { label: "Débito", value: 420, color: "#b8a038" },
                    { label: "Pix", value: 450, color: "#2dd4bf" },
                    { label: "Dinheiro", value: 650, color: "#5b8fa8" },
                    { label: "Transf.", value: 0, color: "#f472b6" },
                  ];
                  const maxVal = Math.max(...bars.map(b => b.value), 1);
                  return (
                    <div className="flex-1 flex items-end justify-between gap-2 h-[110px]">
                      {bars.map((b) => {
                        const hPct = (b.value / maxVal) * 100;
                        return (
                          <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border text-[9px] text-foreground font-light rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none z-10">
                              {b.value > 0 ? `R$ ${b.value.toLocaleString("pt-BR")}` : "—"}
                            </div>
                            <div
                              className="w-3/4 max-w-[48px] rounded-sm transition-all hover:opacity-80 cursor-default"
                              style={{
                                height: b.value > 0 ? `${hPct}%` : "3px",
                                backgroundColor: b.color,
                                opacity: b.value === 0 ? 0.25 : 1,
                              }}
                            />
                            <span className="text-[8px] text-muted-foreground text-center leading-tight">{b.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {/* Breakdown */}
                <div className="mt-auto pt-3 border-t border-border/50 space-y-1.5">
                  {[
                    { label: "Crédito", value: "R$ 800,00", color: "#34d399" },
                    { label: "Dinheiro", value: "R$ 650,00", color: "#5b8fa8" },
                    { label: "Pix", value: "R$ 450,00", color: "#2dd4bf" },
                    { label: "Débito", value: "R$ 420,00", color: "#b8a038" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                        {r.label}
                      </span>
                      <span className="text-[11px] font-light" style={{ color: r.color }}>{mask(r.value)}</span>
                    </div>
                  ))}
                </div>
              </C>

              {/* Tempo médio por serviço */}
              <C className="flex flex-col">
                <CH left="Tempo médio por serviço" />
                <div className="flex-1 flex flex-col gap-2.5 min-h-[80px]">
                  {[
                    { label: "Lavagem simples", time: "25 min", mins: 25 },
                    { label: "Lavagem completa", time: "45 min", mins: 45 },
                    { label: "Higienização", time: "1h10", mins: 70 },
                    { label: "Polimento", time: "1h30", mins: 90 },
                    { label: "Vitrificação", time: "2h15", mins: 135 },
                  ].map((s) => {
                    const pct = (s.mins / 135) * 100;
                    return (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground w-[72px] shrink-0 text-right truncate">{s.label}</span>
                        <div className="flex-1 h-[10px] bg-border/40 rounded-sm overflow-hidden relative group">
                          <div
                            className="h-full rounded-sm bg-muted-foreground/35 hover:bg-primary/50 transition-colors"
                            style={{ width: `${pct}%` }}
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-foreground font-light pointer-events-none">
                            {s.time}
                          </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground w-[36px] shrink-0 tabular-nums">{s.time}</span>
                      </div>
                    );
                  })}
                </div>
              </C>
            </motion.div>

            <motion.div variants={item} className="grid grid-cols-12 gap-3">
              <FinanceiroCard mask={mask} navigate={navigate} />

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
                <div className="flex-1 space-y-2">
                  {[
                    { initials: "ML", name: "Marina Lopes", detail: "Pediu orçamento de vitrificação", value: "R$ 900", ago: "há 5 dias", agoColor: "text-destructive" },
                    { initials: "TP", name: "Thiago Pires", detail: "Interessado em polimento + PPF", value: "R$ 2.400", ago: "há 2 dias", agoColor: "text-warning" },
                    { initials: "RS", name: "Renata Silva", detail: "Lavagem recorrente mensal (3 carros)", value: "R$ 450/mês", ago: "hoje", agoColor: "text-success" },
                  ].map((opp) => (
                    <div key={opp.initials} className="flex items-center gap-3 p-2.5 rounded-[9px] bg-secondary/40 border border-border/40 hover:bg-secondary/60 hover:border-border transition-all cursor-pointer">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-secondary text-muted-foreground text-[10px] font-normal">{opp.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-normal text-foreground truncate">{opp.name}</p>
                        <p className="text-[10px] font-extralight text-muted-foreground truncate mt-0.5">{opp.detail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-light text-foreground tabular-nums">{mask(opp.value)}</p>
                        <p className={cn("text-[9px] font-light mt-0.5", opp.agoColor)}>{opp.ago}</p>
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
                    <div key={s.label}>
                      <span className={cn("text-[16px] font-extralight", s.color)}>{maskNum(s.n)}</span>
                      <p className="text-[9px] font-light text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                  <div className="ml-auto">
                    <span className="text-[16px] font-extralight text-foreground">{mask("R$ 3.750")}</span>
                    <p className="text-[9px] font-light text-muted-foreground">valor em aberto</p>
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
                    <div key={c.initials} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer px-2 -mx-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-secondary text-muted-foreground text-[9px] font-normal">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-normal text-foreground truncate">{c.name}</p>
                        <p className="text-[9px] font-extralight text-muted-foreground mt-0.5">{c.visits} {c.visits === 1 ? "visita" : "visitas"}</p>
                      </div>
                      <span className="text-[12px] font-light text-foreground tabular-nums shrink-0">{mask(c.spent)}</span>
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
                    <div className="absolute top-2 right-[-22px] bg-success text-black text-[8px] font-medium px-7 py-0.5 rotate-45 uppercase tracking-wider">Popular</div>
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
                     <p className="text-[11px] font-normal text-foreground">Plano Frota</p>
                     <p className="text-[9px] text-muted-foreground mb-2">8 lavagens simples (até 3 veículos)</p>
                     <p className="text-lg font-extralight text-foreground">R$ 199 <span className="text-[9px] text-muted-foreground font-extralight">/mês</span></p>
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
                <div className="flex items-center gap-4 mt-auto pt-3 border-t border-border">
                  <div><span className="text-[16px] font-extralight text-foreground">12</span><p className="text-[9px] font-light text-muted-foreground">assinantes ativos</p></div>
                  <div><span className="text-[16px] font-extralight text-success">R$ 2.966</span><p className="text-[9px] font-light text-muted-foreground">receita recorrente/mês</p></div>
                  <div><span className="text-[16px] font-extralight text-foreground">92%</span><p className="text-[9px] font-light text-muted-foreground">taxa de retenção</p></div>
                </div>
              </C>

              {/* Clientes com plano ativo */}
              <C className="col-span-6 flex flex-col">
                <CH left="Clientes com plano ativo" right={<span className="text-[10px] text-primary cursor-pointer hover:underline">ver todos →</span>} />
                <div className="flex-1 space-y-1.5">
                  {[
                    { initials: "RM", name: "Ricardo Mendes", plan: "Plano Básico · desde jan/26", used: 3, total: 4 },
                    { initials: "FL", name: "Fernanda Lima", plan: "Plano Premium · desde fev/26", used: 2, total: 5 },
                    { initials: "CO", name: "Carlos Oliveira", plan: "Plano Básico · desde mar/26", used: 1, total: 4 },
                    { initials: "AB", name: "Ana Beatriz", plan: "Plano Frota · desde jan/26", used: 8, total: 8 },
                    { initials: "BF", name: "Bruno Ferreira", plan: "Plano Premium · desde fev/26", used: 3, total: 5 },
                    { initials: "MV", name: "Marcos Vinícius", plan: "Plano Básico · desde mar/26", used: 2, total: 4 },
                  ].map((c) => (
                    <div key={c.initials} className="flex items-center gap-2 rounded-lg bg-secondary/40 border border-border/40 p-2 hover:bg-secondary/60 hover:border-border transition-all cursor-pointer">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-secondary text-muted-foreground text-[9px] font-normal">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-normal text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] font-extralight text-muted-foreground">{c.plan}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-[60px] h-1 bg-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${c.used === c.total ? "bg-success" : "bg-primary/60"}`} style={{ width: `${(c.used / c.total) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-light text-muted-foreground tabular-nums w-16 text-right">
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
                <div className="flex-1 space-y-1.5">
                  {[
                    { name: "Pedro Henrique", days: 47, plate: "JKL-3M56", risk: "Risco alto", riskColor: "bg-destructive/15 text-destructive border-destructive/20" },
                    { name: "Camila Santos", days: 33, plate: "NOP-7Q89", risk: "Atenção", riskColor: "bg-warning/15 text-warning border-warning/20" },
                    { name: "Lucas Martins", days: 62, plate: "RST-1U23", risk: "Risco alto", riskColor: "bg-destructive/15 text-destructive border-destructive/20" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-3 rounded-[10px] bg-secondary/40 border border-border/40 p-2.5 hover:bg-secondary/60 hover:border-border transition-all cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-normal text-foreground">{c.name}</p>
                        <p className="text-[10px] font-light text-muted-foreground tracking-wide">Última visita: {c.days} dias · {c.plate}</p>
                      </div>
                      <span className={cn("text-[10px] font-normal px-2.5 py-1 rounded-full shrink-0", c.riskColor)}>{c.risk}</span>
                      <button className="text-[10px] font-light text-muted-foreground hover:text-foreground hover:bg-secondary/60 px-2 py-1 rounded-md transition-all shrink-0">Enviar msg →</button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-5 mt-auto pt-3.5 border-t border-border">
                  <div><span className="text-[18px] font-extralight text-destructive">5</span><p className="text-[10px] font-light text-muted-foreground">inativos 30+ dias</p></div>
                  <div><span className="text-[18px] font-extralight text-warning">3</span><p className="text-[10px] font-light text-muted-foreground">inativos 15-30 dias</p></div>
                  <div><span className="text-[18px] font-extralight text-success">68%</span><p className="text-[10px] font-light text-muted-foreground">taxa de reativação</p></div>
                </div>
              </C>

              {/* Pós-venda automático */}
              <C className="col-span-6 flex flex-col">
                <CH left="Pós-venda automático" right={<span className="text-[10px] text-primary cursor-pointer hover:underline">configurar →</span>} />
                <div className="flex-1 space-y-2.5">
                  {[
                    { icon: <CheckCircle2 className="h-4 w-4" />, iconBg: "bg-success/15 text-success", title: "Pesquisa de satisfação", desc: "Enviada 24h após o serviço via WhatsApp", status: "Ativo" },
                    { icon: <MessageSquare className="h-4 w-4" />, iconBg: "bg-blue-500/15 text-blue-400", title: "Pedido de avaliação Google", desc: "Enviado se nota ≥ 4 estrelas", status: "Ativo" },
                    { icon: <AlertTriangle className="h-4 w-4" />, iconBg: "bg-warning/15 text-warning", title: "Alerta nota baixa", desc: "Notifica o dono se nota ≤ 2", status: "Ativo" },
                  ].map((a) => (
                    <div key={a.title} className="flex items-center gap-3 rounded-[11px] bg-secondary/40 border border-border/40 p-3.5">
                      <div className={`h-9 w-9 rounded-[9px] flex items-center justify-center shrink-0 ${a.iconBg}`}>{a.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-normal text-foreground">{a.title}</p>
                        <p className="text-[10px] font-extralight text-muted-foreground">{a.desc}</p>
                      </div>
                      <span className="text-[12px] font-light text-success shrink-0">{a.status}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-5 mt-auto pt-3.5 border-t border-border">
                  <div><span className="text-[18px] font-extralight text-foreground">4.7</span><p className="text-[10px] font-light text-muted-foreground">nota média</p></div>
                  <div><span className="text-[18px] font-extralight text-foreground">89%</span><p className="text-[10px] font-light text-muted-foreground">taxa de resposta</p></div>
                  <div><span className="text-[18px] font-extralight text-success">14</span><p className="text-[10px] font-light text-muted-foreground">avaliações Google este mês</p></div>
                </div>
              </C>
            </motion.div>
          </>
        )}

        {/* Bottom spacing */}
        <div className="h-16" />
      </motion.div>
    </AppLayout>
  );
}
