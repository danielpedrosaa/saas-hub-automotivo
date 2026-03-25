import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, TrendingUp, Target, BarChart3, Plus, Send, MessageSquarePlus, GripVertical } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

// ── Types ──

type Stage = "lead" | "sent" | "negotiation" | "won" | "lost";

interface Activity {
  id: string;
  date: string;
  text: string;
}

interface Opportunity {
  id: string;
  client: string;
  service: string;
  value: number;
  stage: Stage;
  responsible: string;
  responsibleInitials: string;
  daysSinceContact: number;
  activities: Activity[];
}

// ── Mock Data ──

const INITIAL_DATA: Opportunity[] = [
  { id: "o1", client: "Carlos Silva", service: "Vitrificação Completa", value: 2800, stage: "lead", responsible: "André", responsibleInitials: "AN", daysSinceContact: 1, activities: [{ id: "a1", date: "2025-03-24", text: "Lead recebido via Instagram" }] },
  { id: "o2", client: "Marina Santos", service: "PPF Frontal", value: 4500, stage: "lead", responsible: "Ricardo", responsibleInitials: "RI", daysSinceContact: 3, activities: [{ id: "a2", date: "2025-03-22", text: "Contato inicial por WhatsApp" }] },
  { id: "o3", client: "Roberto Lima", service: "Coating Cerâmico", value: 1800, stage: "sent", responsible: "André", responsibleInitials: "AN", daysSinceContact: 5, activities: [{ id: "a3", date: "2025-03-20", text: "Orçamento enviado por email" }, { id: "a4", date: "2025-03-18", text: "Visita ao estúdio" }] },
  { id: "o4", client: "Fernanda Souza", service: "Polimento + Vitrificação", value: 3200, stage: "sent", responsible: "Ricardo", responsibleInitials: "RI", daysSinceContact: 2, activities: [{ id: "a5", date: "2025-03-23", text: "Orçamento enviado via WhatsApp" }] },
  { id: "o5", client: "Pedro Almeida", service: "PPF Completo", value: 12000, stage: "negotiation", responsible: "André", responsibleInitials: "AN", daysSinceContact: 1, activities: [{ id: "a6", date: "2025-03-24", text: "Negociação de parcelamento" }, { id: "a7", date: "2025-03-22", text: "Orçamento enviado" }, { id: "a8", date: "2025-03-20", text: "Lead via indicação" }] },
  { id: "o6", client: "Juliana Costa", service: "Higienização Premium", value: 600, stage: "negotiation", responsible: "Ricardo", responsibleInitials: "RI", daysSinceContact: 8, activities: [{ id: "a9", date: "2025-03-17", text: "Aguardando retorno da cliente" }] },
  { id: "o7", client: "Marcos Oliveira", service: "Vitrificação 5 camadas", value: 3500, stage: "won", responsible: "André", responsibleInitials: "AN", daysSinceContact: 0, activities: [{ id: "a10", date: "2025-03-25", text: "Serviço agendado para 28/03" }, { id: "a11", date: "2025-03-24", text: "Pagamento confirmado" }] },
  { id: "o8", client: "Ana Paula", service: "Lavagem Premium Mensal", value: 450, stage: "won", responsible: "Ricardo", responsibleInitials: "RI", daysSinceContact: 0, activities: [{ id: "a12", date: "2025-03-25", text: "Plano mensal fechado" }] },
  { id: "o9", client: "Lucas Ferreira", service: "PPF Parcial", value: 3800, stage: "lost", responsible: "André", responsibleInitials: "AN", daysSinceContact: 15, activities: [{ id: "a13", date: "2025-03-10", text: "Cliente optou pela concorrência - preço" }] },
];

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "lead", label: "Novo Lead", color: "bg-blue-500/10 border-blue-500/30" },
  { key: "sent", label: "Orçamento Enviado", color: "bg-amber-500/10 border-amber-500/30" },
  { key: "negotiation", label: "Negociação", color: "bg-purple-500/10 border-purple-500/30" },
  { key: "won", label: "Fechado (Ganho)", color: "bg-emerald-500/10 border-emerald-500/30" },
  { key: "lost", label: "Perdido", color: "bg-destructive/10 border-destructive/30" },
];

const RESPONSIBLES = ["André", "Ricardo"];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function contactBadge(days: number) {
  if (days <= 2) return { label: `${days}d`, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" };
  if (days <= 7) return { label: `${days}d`, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
  return { label: `${days}d`, cls: "bg-destructive/15 text-destructive border-destructive/30" };
}

// ── Droppable Column ──

function KanbanColumn({ stage, children, count, total }: { stage: Stage; children: React.ReactNode; count: number; total: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const s = STAGES.find((s) => s.key === stage)!;

  return (
    <div
      ref={setNodeRef}
      className={cn("flex flex-col rounded-xl border min-w-[280px] w-[280px] shrink-0 transition-colors", s.color, isOver && "ring-2 ring-primary/50")}
    >
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">{s.label}</h3>
          <Badge variant="secondary" className="text-[10px] font-mono">{count}</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{fmt(total)}</p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
        {children}
      </div>
    </div>
  );
}

// ── Draggable Card ──

function OpportunityCard({ opp, onClick }: { opp: Opportunity; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opp.id, data: { stage: opp.stage } });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const badge = contactBadge(opp.daysSinceContact);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-lg border border-border bg-card p-3 space-y-2 cursor-pointer hover:shadow-md transition-shadow", isDragging && "opacity-50 shadow-lg")}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{opp.client}</p>
          <p className="text-xs text-muted-foreground truncate">{opp.service}</p>
        </div>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 shrink-0 touch-none">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold font-mono text-primary">{fmt(opp.value)}</span>
        <Badge variant="outline" className={cn("text-[10px] font-mono border", badge.cls)}>{badge.label}</Badge>
      </div>
      <div className="flex items-center gap-1.5">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[9px] bg-muted">{opp.responsibleInitials}</AvatarFallback>
        </Avatar>
        <span className="text-[11px] text-muted-foreground">{opp.responsible}</span>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function OportunidadesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_DATA);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filters
  const [filterResp, setFilterResp] = useState("all");
  const [filterMinValue, setFilterMinValue] = useState("");
  const [filterMaxValue, setFilterMaxValue] = useState("");

  // New form
  const [newClient, setNewClient] = useState("");
  const [newService, setNewService] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newResp, setNewResp] = useState("André");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(() => {
    let list = [...opportunities];
    if (filterResp !== "all") list = list.filter((o) => o.responsible === filterResp);
    if (filterMinValue) list = list.filter((o) => o.value >= Number(filterMinValue));
    if (filterMaxValue) list = list.filter((o) => o.value <= Number(filterMaxValue));
    return list;
  }, [opportunities, filterResp, filterMinValue, filterMaxValue]);

  const byStage = (stage: Stage) => filtered.filter((o) => o.stage === stage);

  // KPIs
  const openTotal = useMemo(() => opportunities.filter((o) => !["won", "lost"].includes(o.stage)).reduce((s, o) => s + o.value, 0), [opportunities]);
  const wonThisMonth = useMemo(() => opportunities.filter((o) => o.stage === "won").length, [opportunities]);
  const conversionRate = useMemo(() => {
    const closed = opportunities.filter((o) => o.stage === "won" || o.stage === "lost").length;
    const won = opportunities.filter((o) => o.stage === "won").length;
    return closed > 0 ? (won / closed) * 100 : 0;
  }, [opportunities]);
  const avgTicket = useMemo(() => {
    const won = opportunities.filter((o) => o.stage === "won");
    return won.length > 0 ? won.reduce((s, o) => s + o.value, 0) / won.length : 0;
  }, [opportunities]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const oppId = String(active.id);
    let targetStage: Stage;

    // Dropped on a column
    if (STAGES.some((s) => s.key === over.id)) {
      targetStage = over.id as Stage;
    } else {
      // Dropped on another card — find its stage
      const targetOpp = opportunities.find((o) => o.id === over.id);
      if (!targetOpp) return;
      targetStage = targetOpp.stage;
    }

    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, stage: targetStage } : o))
    );
  };

  const openDetail = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setSheetOpen(true);
  };

  const handleNewOpp = (e: React.FormEvent) => {
    e.preventDefault();
    const opp: Opportunity = {
      id: `o${Date.now()}`,
      client: newClient,
      service: newService,
      value: Number(newValue) || 0,
      stage: "lead",
      responsible: newResp,
      responsibleInitials: newResp.slice(0, 2).toUpperCase(),
      daysSinceContact: 0,
      activities: [{ id: `a${Date.now()}`, date: new Date().toISOString().split("T")[0], text: "Oportunidade criada" }],
    };
    setOpportunities((prev) => [opp, ...prev]);
    setDialogOpen(false);
    setNewClient("");
    setNewService("");
    setNewValue("");
  };

  const addActivity = (oppId: string, text: string) => {
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === oppId
          ? { ...o, daysSinceContact: 0, activities: [{ id: `a${Date.now()}`, date: new Date().toISOString().split("T")[0], text }, ...o.activities] }
          : o
      )
    );
    if (selectedOpp?.id === oppId) {
      setSelectedOpp((prev) => prev ? { ...prev, daysSinceContact: 0, activities: [{ id: `a${Date.now()}`, date: new Date().toISOString().split("T")[0], text }, ...prev.activities] } : prev);
    }
  };

  const activeOpp = activeId ? opportunities.find((o) => o.id === activeId) : null;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Oportunidades</h1>
            <p className="text-xs text-muted-foreground">Pipeline de vendas e orçamentos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova oportunidade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle></DialogHeader>
              <form onSubmit={handleNewOpp} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Nome do cliente" className="h-12" required />
                </div>
                <div className="space-y-2">
                  <Label>Serviço de interesse *</Label>
                  <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Ex: Vitrificação Completa" className="h-12" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor estimado (R$)</Label>
                    <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="0" type="number" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select value={newResp} onValueChange={setNewResp}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESPONSIBLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="h-12 w-full font-bold uppercase tracking-wider">Criar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total em aberto", value: fmt(openTotal), icon: DollarSign, accent: true },
            { label: "Fechadas no mês", value: String(wonThisMonth), icon: Target },
            { label: "Taxa de conversão", value: `${conversionRate.toFixed(1)}%`, icon: TrendingUp },
            { label: "Ticket médio", value: fmt(avgTicket), icon: BarChart3 },
          ].map((k) => (
            <Card key={k.label} className={cn("border-border rounded-xl shadow-none", k.accent && "bg-primary/5")}>
              <CardContent className="p-4 flex items-center gap-3">
                <k.icon className={cn("h-5 w-5 shrink-0", k.accent ? "text-primary" : "text-muted-foreground")} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <p className={cn("text-lg font-bold font-mono truncate", k.accent ? "text-primary" : "text-foreground")}>{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterResp} onValueChange={setFilterResp}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {RESPONSIBLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={filterMinValue} onChange={(e) => setFilterMinValue(e.target.value)} placeholder="Valor mín" type="number" className="w-[110px] h-9 text-xs" />
          <Input value={filterMaxValue} onChange={(e) => setFilterMaxValue(e.target.value)} placeholder="Valor máx" type="number" className="w-[110px] h-9 text-xs" />
          {(filterResp !== "all" || filterMinValue || filterMaxValue) && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setFilterResp("all"); setFilterMinValue(""); setFilterMaxValue(""); }}>Limpar</Button>
          )}
        </div>

        {/* Kanban */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {STAGES.map((stage) => {
              const items = byStage(stage.key);
              const total = items.reduce((s, o) => s + o.value, 0);
              return (
                <KanbanColumn key={stage.key} stage={stage.key} count={items.length} total={total}>
                  <SortableContext items={items.map((o) => o.id)} strategy={verticalListSortingStrategy}>
                    {items.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">Nenhuma oportunidade</div>
                    ) : (
                      items.map((opp) => (
                        <OpportunityCard key={opp.id} opp={opp} onClick={() => openDetail(opp)} />
                      ))
                    )}
                  </SortableContext>
                </KanbanColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeOpp && (
              <div className="rounded-lg border border-primary bg-card p-3 shadow-xl w-[260px] opacity-90">
                <p className="text-sm font-semibold">{activeOpp.client}</p>
                <p className="text-xs text-muted-foreground">{activeOpp.service}</p>
                <p className="text-sm font-bold font-mono text-primary mt-1">{fmt(activeOpp.value)}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedOpp && (
            <div className="space-y-6 pt-2">
              <SheetHeader>
                <SheetTitle className="text-left">{selectedOpp.client}</SheetTitle>
                <p className="text-sm text-muted-foreground">{selectedOpp.service}</p>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Valor</p>
                  <p className="text-lg font-bold font-mono text-primary">{fmt(selectedOpp.value)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Etapa</p>
                  <p className="text-sm font-semibold">{STAGES.find((s) => s.key === selectedOpp.stage)?.label}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-muted">{selectedOpp.responsibleInitials}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{selectedOpp.responsible}</span>
                <Badge variant="outline" className={cn("ml-auto text-[10px] border", contactBadge(selectedOpp.daysSinceContact).cls)}>
                  {selectedOpp.daysSinceContact === 0 ? "Hoje" : `${selectedOpp.daysSinceContact}d atrás`}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => addActivity(selectedOpp.id, "Orçamento enviado ao cliente")}>
                  <Send className="h-3.5 w-3.5" /> Enviar orçamento
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => addActivity(selectedOpp.id, "Atividade registrada")}>
                  <MessageSquarePlus className="h-3.5 w-3.5" /> Registrar atividade
                </Button>
              </div>

              {/* Timeline */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline de atividades</p>
                <div className="space-y-0">
                  {selectedOpp.activities.map((act, i) => (
                    <div key={act.id} className="flex gap-3 py-2.5 relative">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        {i < selectedOpp.activities.length - 1 && <div className="w-px flex-1 bg-border" />}
                      </div>
                      <div className="min-w-0 pb-1">
                        <p className="text-sm">{act.text}</p>
                        <p className="text-[11px] text-muted-foreground">{act.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
