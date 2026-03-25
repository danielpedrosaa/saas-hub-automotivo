import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { sendWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";
import {
  Users, TrendingUp, DollarSign, MessageSquare, AlertTriangle, Clock,
  Send, ChevronRight, Settings2, Zap, UserX
} from "lucide-react";

/* ── mock data ─────────────────────────────────────────── */
interface InactiveClient {
  id: string;
  name: string;
  whatsapp: string;
  lastService: string;
  lastDate: string;
  plate: string;
  lastValue: number;
  avgFrequencyDays: number;
  daysSinceLast: number;
}

const MOCK_CLIENTS: InactiveClient[] = [
  { id: "1", name: "Carlos Mendes", whatsapp: "11999880011", lastService: "Polimento Técnico", lastDate: "2026-02-20", plate: "ABC-1D23", lastValue: 350, avgFrequencyDays: 30, daysSinceLast: 33 },
  { id: "2", name: "Fernanda Lima", whatsapp: "11988770022", lastService: "Vitrificação", lastDate: "2026-01-10", plate: "DEF-4E56", lastValue: 1200, avgFrequencyDays: 60, daysSinceLast: 74 },
  { id: "3", name: "Roberto Alves", whatsapp: "11977660033", lastService: "Lavagem Detalhada", lastDate: "2026-02-28", plate: "GHI-7F89", lastValue: 180, avgFrequencyDays: 15, daysSinceLast: 25 },
  { id: "4", name: "Ana Beatriz", whatsapp: "11966550044", lastService: "Higienização Interna", lastDate: "2026-01-25", plate: "JKL-0G12", lastValue: 280, avgFrequencyDays: 45, daysSinceLast: 59 },
  { id: "5", name: "Marcos Souza", whatsapp: "11955440055", lastService: "Cristalização", lastDate: "2025-12-15", plate: "MNO-3H45", lastValue: 900, avgFrequencyDays: 90, daysSinceLast: 100 },
  { id: "6", name: "Juliana Torres", whatsapp: "11944330066", lastService: "Polimento 3 Etapas", lastDate: "2026-03-05", plate: "PQR-6I78", lastValue: 500, avgFrequencyDays: 30, daysSinceLast: 20 },
  { id: "7", name: "Diego Ramos", whatsapp: "11933220077", lastService: "Lavagem Premium", lastDate: "2026-02-10", plate: "STU-9J01", lastValue: 150, avgFrequencyDays: 20, daysSinceLast: 43 },
  { id: "8", name: "Patrícia Nunes", whatsapp: "11922110088", lastService: "Vitrificação + PPF", lastDate: "2025-11-20", plate: "VWX-2K34", lastValue: 3500, avgFrequencyDays: 120, daysSinceLast: 125 },
];

const TEMPLATES = [
  { id: "t1", label: "Sentimos sua falta!", text: "Olá {nome}! 👋 Sentimos sua falta aqui na loja. Seu veículo {placa} merece os melhores cuidados. Que tal agendar uma visita? Estamos com condições especiais!" },
  { id: "t2", label: "Promoção especial para você!", text: "Oi {nome}! 🎉 Preparamos uma promoção exclusiva para clientes especiais como você. Traga seu {placa} e aproveite 15% de desconto no próximo serviço. Válido por 7 dias!" },
  { id: "t3", label: "Personalizado", text: "" },
];

/* ── helpers ───────────────────────────────────────────── */
function riskBadge(days: number, avgFreq: number) {
  const ratio = days / avgFreq;
  if (ratio >= 2) return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Risco alto</Badge>;
  if (ratio >= 1.2) return <Badge className="bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30">Atenção</Badge>;
  return <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30">OK</Badge>;
}

function filterByPeriod(clients: InactiveClient[], period: string) {
  if (period === "15-30") return clients.filter(c => c.daysSinceLast >= 15 && c.daysSinceLast < 30);
  if (period === "30-60") return clients.filter(c => c.daysSinceLast >= 30 && c.daysSinceLast < 60);
  if (period === "60+") return clients.filter(c => c.daysSinceLast >= 60);
  return clients;
}

/* ── component ─────────────────────────────────────────── */
export default function CrmRetornoPage() {
  const [period, setPeriod] = useState("all");
  const [msgOpen, setMsgOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<InactiveClient | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [customText, setCustomText] = useState("");
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoDays, setAutoDays] = useState("30");
  const [autoTemplate, setAutoTemplate] = useState(TEMPLATES[0].id);

  const filtered = period === "all" ? MOCK_CLIENTS : filterByPeriod(MOCK_CLIENTS, period);
  const totalInactive = MOCK_CLIENTS.length;

  // metrics (mock)
  const reactivationRate = 32;
  const recoveredRevenue = 4850;
  const messagesSent = 47;

  function openMessage(client: InactiveClient) {
    setSelectedClient(client);
    setSelectedTemplate(TEMPLATES[0].id);
    setCustomText("");
    setMsgOpen(true);
  }

  function getMessageText(): string {
    const tpl = TEMPLATES.find(t => t.id === selectedTemplate);
    if (!tpl || tpl.id === "t3") return customText;
    let txt = tpl.text;
    if (selectedClient) {
      txt = txt.replace(/\{nome\}/g, selectedClient.name.split(" ")[0]);
      txt = txt.replace(/\{placa\}/g, selectedClient.plate);
    }
    return txt;
  }

  function handleSend() {
    if (!selectedClient) return;
    const msg = getMessageText();
    if (!msg.trim()) { toast.error("Digite uma mensagem"); return; }
    sendWhatsApp(selectedClient.whatsapp, msg);
    toast.success("Mensagem enviada via WhatsApp");
    setMsgOpen(false);
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">CRM de Retorno</h1>
            <Badge variant="secondary" className="gap-1 text-sm">
              <UserX className="h-3.5 w-3.5" />
              {totalInactive} inativos
            </Badge>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--success))]/10">
                <TrendingUp className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Reativação</p>
                <p className="text-2xl font-bold">{reactivationRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--info))]/10">
                <DollarSign className="h-5 w-5 text-[hsl(var(--info))]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Recuperada (mês)</p>
                <p className="text-2xl font-bold">R$ {recoveredRevenue.toLocaleString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--purple))]/10">
                <MessageSquare className="h-5 w-5 text-[hsl(var(--purple))]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                <p className="text-2xl font-bold">{messagesSent}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs + List */}
        <Tabs defaultValue="all" value={period} onValueChange={setPeriod}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="15-30">15–30 dias</TabsTrigger>
            <TabsTrigger value="30-60">30–60 dias</TabsTrigger>
            <TabsTrigger value="60+">60+ dias</TabsTrigger>
          </TabsList>

          {/* same content for all tab values */}
          {["all", "15-30", "30-60", "60+"].map(val => (
            <TabsContent key={val} value={val} className="mt-4 space-y-3">
              {filtered.length === 0 && (
                <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum cliente neste período.</CardContent></Card>
              )}
              {filtered.map(client => (
                <Card key={client.id} className="transition-colors hover:border-primary/20">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{client.name}</span>
                        {riskBadge(client.daysSinceLast, client.avgFrequencyDays)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{client.lastService}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{client.daysSinceLast} dias atrás</span>
                        <span>{client.plate}</span>
                        <span>R$ {client.lastValue.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Frequência média: a cada {client.avgFrequencyDays} dias</p>
                    </div>
                    <Button size="sm" className="gap-1.5 bg-[hsl(var(--whatsapp))] text-[hsl(var(--whatsapp-foreground))] hover:bg-[hsl(var(--whatsapp))]/90" onClick={() => openMessage(client)}>
                      <Send className="h-4 w-4" /> Enviar mensagem
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Automation config */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[hsl(var(--warning))]" />
              <CardTitle className="text-lg">Automação de Retorno</CardTitle>
            </div>
            <CardDescription>Dispare mensagens automaticamente quando o cliente atingir um período de inatividade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-toggle" className="font-medium">Ativar automação</Label>
              <Switch id="auto-toggle" checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            </div>
            {autoEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Dias sem visita para disparar</Label>
                  <Select value={autoDays} onValueChange={setAutoDays}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="45">45 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template padrão</Label>
                  <Select value={autoTemplate} onValueChange={setAutoTemplate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.filter(t => t.id !== "t3").map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message dialog */}
        <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar mensagem para {selectedClient?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate === "t3" ? (
                <div className="space-y-2">
                  <Label>Mensagem personalizada</Label>
                  <Textarea rows={5} value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Digite sua mensagem..." />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">{getMessageText()}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMsgOpen(false)}>Cancelar</Button>
              <Button className="gap-1.5 bg-[hsl(var(--whatsapp))] text-[hsl(var(--whatsapp-foreground))] hover:bg-[hsl(var(--whatsapp))]/90" onClick={handleSend}>
                <Send className="h-4 w-4" /> Enviar via WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
