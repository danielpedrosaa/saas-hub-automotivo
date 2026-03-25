import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Minus, CreditCard, BarChart3, CalendarIcon, Receipt } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "custom";

// ── Mock data generators ──

const DAILY_HOURS = Array.from({ length: 13 }, (_, i) => {
  const h = 7 + i;
  return { label: `${h}h`, revenue: Math.round(Math.random() * 800 + 100), expenses: Math.round(Math.random() * 200 + 50) };
});

const WEEKLY_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => ({
  label: d,
  revenue: Math.round(Math.random() * 4000 + 1500),
  expenses: Math.round(Math.random() * 1200 + 400),
}));

const MONTHLY_WEEKS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"].map((w) => ({
  label: w,
  revenue: Math.round(Math.random() * 18000 + 8000),
  expenses: Math.round(Math.random() * 6000 + 2000),
}));

const PAYMENT_DATA = [
  { method: "Pix", current: 12400, previous: 10200 },
  { method: "Crédito", current: 8700, previous: 9100 },
  { method: "Débito", current: 5300, previous: 4800 },
  { method: "Dinheiro", current: 3200, previous: 3600 },
  { method: "Boleto", current: 1800, previous: 1400 },
  { method: "Transf.", current: 2100, previous: 1900 },
];

const PENDING_INVOICES = [
  { id: "f1", client: "Carlos Silva", value: 1200, due: "2025-03-28", card: "Visa •••• 4532" },
  { id: "f2", client: "Ana Costa", value: 850, due: "2025-03-30", card: "Master •••• 7891" },
  { id: "f3", client: "Marcos Oliveira", value: 2400, due: "2025-04-02", card: "Elo •••• 3344" },
];

const TOP_SERVICES = [
  { name: "Vitrificação", revenue: 14200, count: 12 },
  { name: "Polimento", revenue: 8400, count: 24 },
  { name: "Coating Cerâmico", revenue: 7800, count: 6 },
  { name: "PPF Parcial", revenue: 6200, count: 4 },
  { name: "Lavagem Premium", revenue: 5100, count: 34 },
  { name: "Higienização", revenue: 3200, count: 18 },
];

const COMPARISON_METRICS = [
  { metric: "Receita total", current: 33500, previous: 29800 },
  { metric: "Despesas totais", current: 9800, previous: 10200 },
  { metric: "Lucro líquido", current: 23700, previous: 19600 },
  { metric: "Ticket médio", current: 520, previous: 480 },
  { metric: "Qtde de serviços", current: 64, previous: 58 },
  { metric: "Novos clientes", current: 12, previous: 9 },
];

function getKPIs(period: Period) {
  const multiplier = period === "today" ? 0.08 : period === "week" ? 0.45 : 1;
  return {
    revenue: Math.round(33500 * multiplier),
    expenses: Math.round(9800 * multiplier),
    profit: Math.round(23700 * multiplier),
    ticket: Math.round(520),
    services: Math.round(64 * multiplier),
    revenueDelta: 12.4,
    expensesDelta: -3.9,
    profitDelta: 20.9,
    ticketDelta: 8.3,
    servicesDelta: 10.3,
  };
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function DeltaBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export default function FinanceiroPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const kpis = useMemo(() => getKPIs(period), [period]);
  const chartData = period === "today" ? DAILY_HOURS : period === "week" ? WEEKLY_DAYS : MONTHLY_WEEKS;

  const periodLabel = (p: Period) => {
    switch (p) {
      case "today": return "Hoje";
      case "week": return "Esta Semana";
      case "month": return "Este Mês";
      case "custom": return "Personalizado";
    }
  };

  const totalPending = PENDING_INVOICES.reduce((s, i) => s + i.value, 0);
  const maxServiceRevenue = TOP_SERVICES[0]?.revenue || 1;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visão geral de receitas, despesas e indicadores</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["today", "week", "month", "custom"] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setPeriod(p)}
              >
                {periodLabel(p)}
              </Button>
            ))}
          </div>
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 text-xs", customFrom && "text-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customFrom ? format(customFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 text-xs", customTo && "text-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customTo ? format(customTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Receita total", value: fmt(kpis.revenue), delta: kpis.revenueDelta, icon: DollarSign, accent: true },
            { label: "Despesas totais", value: fmt(kpis.expenses), delta: kpis.expensesDelta, icon: TrendingDown, destructive: true },
            { label: "Lucro líquido", value: fmt(kpis.profit), delta: kpis.profitDelta, icon: TrendingUp },
            { label: "Ticket médio", value: fmt(kpis.ticket), delta: kpis.ticketDelta, icon: Receipt },
            { label: "Serviços", value: String(kpis.services), delta: kpis.servicesDelta, icon: BarChart3 },
          ].map((k) => (
            <Card key={k.label} className={cn("border-border rounded-xl shadow-none", k.accent && "bg-primary/5", k.destructive && "bg-destructive/5")}>
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</span>
                  <k.icon className={cn("h-4 w-4", k.accent ? "text-primary" : k.destructive ? "text-destructive" : "text-muted-foreground")} />
                </div>
                <p className={cn("text-2xl font-black font-mono truncate", k.accent ? "text-primary" : k.destructive ? "text-destructive" : "text-foreground")}>
                  {k.value}
                </p>
                <DeltaBadge value={k.delta} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue line chart */}
          <Card className="border-border rounded-xl shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita ao longo do tempo</CardTitle>
              <p className="text-xs text-muted-foreground">
                {period === "today" ? "Por hora" : period === "week" ? "Por dia da semana" : "Por semana"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={55} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Receita" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment methods bar chart */}
          <Card className="border-border rounded-xl shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita por forma de pagamento</CardTitle>
              <p className="text-xs text-muted-foreground">Distribuição por método no período</p>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={PAYMENT_DATA} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="method" tickLine={false} axisLine={false} width={60} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="current" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Atual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entries vs Exits */}
        <Card className="border-border rounded-xl shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Entradas vs Saídas</CardTitle>
            <p className="text-xs text-muted-foreground">Comparativo de receitas e despesas</p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} width={60} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Entradas" />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bottom cards row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending invoices */}
          <Card className="border-border rounded-xl shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Faturas Pendentes
                </CardTitle>
                <Badge variant="secondary" className="font-mono text-xs">{fmt(totalPending)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {PENDING_INVOICES.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.client}</p>
                    <p className="text-[11px] text-muted-foreground">{inv.card} • Vence {format(new Date(inv.due), "dd/MM", { locale: ptBR })}</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-foreground shrink-0 ml-2">{fmt(inv.value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top services */}
          <Card className="border-border rounded-xl shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Serviços por Faturamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TOP_SERVICES.map((s, i) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                      <span className="font-medium truncate">{s.name}</span>
                    </span>
                    <span className="font-mono text-xs text-primary shrink-0">{fmt(s.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(s.revenue / maxServiceRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Comparison table */}
          <Card className="border-border rounded-xl shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparativo Período Anterior</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Métrica</TableHead>
                    <TableHead className="text-xs text-right">Atual</TableHead>
                    <TableHead className="text-xs text-right">Anterior</TableHead>
                    <TableHead className="text-xs text-right">Var.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPARISON_METRICS.map((m) => {
                    const isCurrency = m.metric !== "Qtde de serviços" && m.metric !== "Novos clientes";
                    const delta = m.previous > 0 ? ((m.current - m.previous) / m.previous) * 100 : 0;
                    const positive = delta >= 0;
                    // For expenses, negative delta is actually good
                    const isExpense = m.metric === "Despesas totais";
                    const good = isExpense ? !positive : positive;
                    return (
                      <TableRow key={m.metric}>
                        <TableCell className="text-xs font-medium py-2.5">{m.metric}</TableCell>
                        <TableCell className="text-xs text-right font-mono py-2.5">{isCurrency ? fmt(m.current) : m.current}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground py-2.5">{isCurrency ? fmt(m.previous) : m.previous}</TableCell>
                        <TableCell className="text-right py-2.5">
                          <span className={cn("text-xs font-semibold", good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                            {positive ? "+" : ""}{delta.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
