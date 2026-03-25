import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bell, MessageSquare, CheckCircle2, AlertTriangle, TrendingDown, Clock } from "lucide-react";

const VARIABLES = [
  { key: "{nome}", label: "Nome" },
  { key: "{data}", label: "Data" },
  { key: "{hora}", label: "Hora" },
  { key: "{servico}", label: "Serviço" },
  { key: "{placa}", label: "Placa" },
];

const PREVIEW_VALUES: Record<string, string> = {
  "{nome}": "Carlos Silva",
  "{data}": "28/03/2026",
  "{hora}": "14:00",
  "{servico}": "Lavagem Completa",
  "{placa}": "ABC-1D23",
};

const INITIAL_TRIGGERS = [
  {
    id: "confirm",
    title: "Confirmação imediata após agendamento",
    description: "Enviada automaticamente quando um agendamento é criado",
    icon: CheckCircle2,
    active: true,
    template: "Olá {nome}! ✅\n\nSeu agendamento foi confirmado:\n📅 {data} às {hora}\n🚗 Veículo: {placa}\n🔧 Serviço: {servico}\n\nTe esperamos! 😊",
  },
  {
    id: "24h",
    title: "Lembrete 24h antes",
    description: "Enviado 24 horas antes do horário agendado",
    icon: Bell,
    active: true,
    template: "Olá {nome}! 👋\n\nLembrando que amanhã você tem um agendamento:\n📅 {data} às {hora}\n🚗 Veículo: {placa}\n🔧 Serviço: {servico}\n\nPodemos confirmar sua presença?",
  },
  {
    id: "2h",
    title: "Lembrete 2h antes",
    description: "Enviado 2 horas antes do horário agendado",
    icon: Clock,
    active: false,
    template: "Oi {nome}! ⏰\n\nSeu horário é daqui a 2 horas!\n📅 Hoje às {hora}\n🚗 {placa} — {servico}\n\nEstamos te esperando!",
  },
  {
    id: "day",
    title: "Lembrete no dia",
    description: "Enviado pela manhã no dia do agendamento",
    icon: MessageSquare,
    active: true,
    template: "Bom dia {nome}! ☀️\n\nHoje é dia de cuidar do seu veículo!\n🕐 Horário: {hora}\n🚗 {placa}\n🔧 {servico}\n\nNos vemos em breve!",
  },
];

const renderPreview = (template: string) =>
  Object.entries(PREVIEW_VALUES).reduce((t, [k, v]) => t.replaceAll(k, v), template);

export default function LembretesPage() {
  const [triggers, setTriggers] = useState(INITIAL_TRIGGERS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTemplate, setDraftTemplate] = useState("");

  const editing = triggers.find(t => t.id === editingId);

  const toggleActive = (id: string) =>
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));

  const openEdit = (t: typeof INITIAL_TRIGGERS[0]) => {
    setEditingId(t.id);
    setDraftTemplate(t.template);
  };

  const saveTemplate = () => {
    if (!editingId) return;
    setTriggers(prev => prev.map(t => t.id === editingId ? { ...t, template: draftTemplate } : t));
    setEditingId(null);
  };

  const insertVar = (v: string) => setDraftTemplate(prev => prev + v);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lembretes Automáticos</h1>
            <p className="text-sm text-muted-foreground">Configure mensagens automáticas para agendamentos</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Mensagens este mês", value: "342", icon: MessageSquare, color: "text-info" },
            { label: "Taxa de confirmação", value: "78%", icon: CheckCircle2, color: "text-success" },
            { label: "No-shows (antes → depois)", value: "18% → 6%", icon: TrendingDown, color: "text-purple" },
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

        {/* Trigger Cards */}
        <div className="space-y-3">
          {triggers.map(trigger => (
            <Card key={trigger.id} className={`transition-opacity ${!trigger.active ? "opacity-60" : ""}`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <trigger.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{trigger.title}</p>
                    <Badge variant={trigger.active ? "default" : "secondary"} className="text-xs">
                      {trigger.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{trigger.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Switch checked={trigger.active} onCheckedChange={() => toggleActive(trigger.id)} />
                  <Button variant="outline" size="sm" onClick={() => openEdit(trigger)}>Editar template</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sheet: Edit Template */}
      <Sheet open={!!editingId} onOpenChange={open => { if (!open) setEditingId(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label>Variáveis disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map(v => (
                  <Button key={v.key} variant="outline" size="sm" onClick={() => insertVar(v.key)}>
                    {v.label} <code className="ml-1 text-xs text-muted-foreground">{v.key}</code>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template da mensagem</Label>
              <Textarea
                value={draftTemplate}
                onChange={e => setDraftTemplate(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground">{renderPreview(draftTemplate)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={saveTemplate}>Salvar template</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
