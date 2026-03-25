import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Crown, Plus, Pencil, Power, Pause, ArrowUpCircle, XCircle,
  TrendingUp, Users, RefreshCw, UserMinus, Star
} from "lucide-react";

// ── Mock data ──────────────────────────────────────────────
const SERVICES_CATALOG = [
  "Lavagem Simples", "Lavagem Completa", "Polimento", "Higienização Interna",
  "Cera Cristalizadora", "Lavagem de Motor",
];

const MOCK_PLANS = [
  { id: "1", name: "Básico", price: 99.9, services: ["Lavagem Simples"], usesPerMonth: 4, multiVehicle: false, active: true },
  { id: "2", name: "Premium", price: 199.9, services: ["Lavagem Completa", "Higienização Interna"], usesPerMonth: 4, multiVehicle: true, active: true },
  { id: "3", name: "VIP", price: 349.9, services: ["Lavagem Completa", "Polimento", "Cera Cristalizadora", "Higienização Interna"], usesPerMonth: 8, multiVehicle: true, active: true },
];

const MOCK_SUBSCRIBERS = [
  { id: "1", name: "Carlos Silva", plan: "Premium", used: 3, total: 4, payment: "Pago" as const, renewal: "2026-04-15" },
  { id: "2", name: "Ana Oliveira", plan: "VIP", used: 6, total: 8, payment: "Pago" as const, renewal: "2026-04-20" },
  { id: "3", name: "Marcos Souza", plan: "Básico", used: 4, total: 4, payment: "Pendente" as const, renewal: "2026-04-05" },
  { id: "4", name: "Juliana Costa", plan: "Premium", used: 2, total: 4, payment: "Atrasado" as const, renewal: "2026-03-28" },
  { id: "5", name: "Roberto Lima", plan: "Básico", used: 1, total: 4, payment: "Pago" as const, renewal: "2026-04-18" },
  { id: "6", name: "Fernanda Dias", plan: "VIP", used: 5, total: 8, payment: "Pago" as const, renewal: "2026-04-22" },
];

const MRR_DATA = [
  { month: "Out", mrr: 2800 }, { month: "Nov", mrr: 3200 }, { month: "Dez", mrr: 3600 },
  { month: "Jan", mrr: 4100 }, { month: "Fev", mrr: 4500 }, { month: "Mar", mrr: 4950 },
];

const PLAN_DIST = [
  { name: "Básico", value: 12, color: "hsl(var(--info))" },
  { name: "Premium", value: 18, color: "hsl(var(--warning))" },
  { name: "VIP", value: 8, color: "hsl(var(--purple))" },
];

// ── Helpers ────────────────────────────────────────────────
const paymentBadge = (status: "Pago" | "Pendente" | "Atrasado") => {
  const map = {
    Pago: "bg-success/10 text-success border-success/20",
    Pendente: "bg-warning/10 text-warning border-warning/20",
    Atrasado: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return <Badge variant="outline" className={map[status]}>{status}</Badge>;
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Component ──────────────────────────────────────────────
export default function FidelidadePage() {
  const [plans, setPlans] = useState(MOCK_PLANS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<typeof MOCK_PLANS[0] | null>(null);
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");

  // form state
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formUses, setFormUses] = useState("4");
  const [formMulti, setFormMulti] = useState(false);
  const [formServices, setFormServices] = useState<string[]>([]);

  const openCreate = () => {
    setEditingPlan(null);
    setFormName(""); setFormPrice(""); setFormUses("4"); setFormMulti(false); setFormServices([]);
    setDialogOpen(true);
  };

  const openEdit = (p: typeof MOCK_PLANS[0]) => {
    setEditingPlan(p);
    setFormName(p.name); setFormPrice(String(p.price)); setFormUses(String(p.usesPerMonth));
    setFormMulti(p.multiVehicle); setFormServices(p.services);
    setDialogOpen(true);
  };

  const savePlan = () => {
    const data = {
      id: editingPlan?.id || String(Date.now()),
      name: formName, price: Number(formPrice), services: formServices,
      usesPerMonth: Number(formUses), multiVehicle: formMulti, active: true,
    };
    if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? data : p));
    } else {
      setPlans(prev => [...prev, data]);
    }
    setDialogOpen(false);
  };

  const togglePlan = (id: string) =>
    setPlans(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));

  const toggleService = (s: string) =>
    setFormServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const filteredSubs = MOCK_SUBSCRIBERS.filter(s =>
    (filterPlan === "all" || s.plan === filterPlan) &&
    (filterPayment === "all" || s.payment === filterPayment)
  );

  const totalSubs = MOCK_SUBSCRIBERS.length;
  const mrr = 4950;
  const retention = 92;
  const churn = 8;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fidelidade</h1>
            <p className="text-sm text-muted-foreground">Planos de assinatura e programa de fidelidade</p>
          </div>
        </div>

        <Tabs defaultValue="planos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="assinantes">Assinantes</TabsTrigger>
            <TabsTrigger value="relatorio">Relatório</TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: Planos ─── */}
          <TabsContent value="planos" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {plans.map(plan => (
                <Card key={plan.id} className={`relative transition-opacity ${!plan.active ? "opacity-50" : ""}`}>
                  {!plan.active && (
                    <Badge variant="outline" className="absolute right-3 top-3 bg-muted text-muted-foreground">Inativo</Badge>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-warning" />
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{fmt(plan.price)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Serviços incluídos</p>
                      <div className="flex flex-wrap gap-1">
                        {plan.services.map(s => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usos/mês</span>
                      <span className="font-medium text-foreground">{plan.usesPerMonth}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Multi-veículo</span>
                      <Badge variant={plan.multiVehicle ? "default" : "secondary"} className="text-xs">
                        {plan.multiVehicle ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                        <Pencil className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => togglePlan(plan.id)}>
                        <Power className="mr-1 h-3 w-3" /> {plan.active ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Create new */}
              <button
                onClick={openCreate}
                className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">Criar novo plano</span>
              </button>
            </div>
          </TabsContent>

          {/* ─── TAB 2: Assinantes ─── */}
          <TabsContent value="assinantes" className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Plano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  {plans.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pagamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Renovação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubs.map(sub => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell><Badge variant="outline">{sub.plan}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={(sub.used / sub.total) * 100} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground">{sub.used}/{sub.total}</span>
                        </div>
                      </TableCell>
                      <TableCell>{paymentBadge(sub.payment)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sub.renewal).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Pausar"><Pause className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Upgrade"><ArrowUpCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Cancelar" className="text-destructive hover:text-destructive"><XCircle className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSubs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum assinante encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ─── TAB 3: Relatório ─── */}
          <TabsContent value="relatorio" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "MRR", value: fmt(mrr), icon: TrendingUp, color: "text-success" },
                { label: "Assinantes", value: String(totalSubs), icon: Users, color: "text-info" },
                { label: "Retenção", value: `${retention}%`, icon: RefreshCw, color: "text-purple" },
                { label: "Churn", value: `${churn}%`, icon: UserMinus, color: "text-destructive" },
              ].map(kpi => (
                <Card key={kpi.label}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${kpi.color}`}>
                      <kpi.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* MRR Line */}
              <Card>
                <CardHeader><CardTitle className="text-base">Evolução do MRR</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{ mrr: { label: "MRR", color: "hsl(var(--success))" } }} className="h-[260px]">
                    <LineChart data={MRR_DATA}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis tickFormatter={v => `R$${(v/1000).toFixed(1)}k`} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                      <Line type="monotone" dataKey="mrr" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Plan Distribution Donut */}
              <Card>
                <CardHeader><CardTitle className="text-base">Distribuição por Plano</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center">
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={PLAN_DIST} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {PLAN_DIST.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Dialog: Criar / Editar Plano ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do plano</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Premium" />
            </div>
            <div className="space-y-2">
              <Label>Preço mensal (R$)</Label>
              <Input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="199.90" />
            </div>
            <div className="space-y-2">
              <Label>Serviços incluídos</Label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES_CATALOG.map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={formServices.includes(s)} onCheckedChange={() => toggleService(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Usos por mês</Label>
              <Input type="number" value={formUses} onChange={e => setFormUses(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formMulti} onCheckedChange={setFormMulti} />
              <Label>Multi-veículo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={savePlan} disabled={!formName || !formPrice}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
