import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Star, MessageSquare, AlertTriangle, ExternalLink, Clock,
  ThumbsUp, ThumbsDown, Bell, Award,
} from "lucide-react";

// ── Mock data ──────────────────────────────────────────────
const STAR_DIST = [
  { stars: "5★", count: 48, fill: "hsl(var(--success))" },
  { stars: "4★", count: 25, fill: "hsl(var(--info))" },
  { stars: "3★", count: 10, fill: "hsl(var(--warning))" },
  { stars: "2★", count: 4, fill: "hsl(var(--destructive))" },
  { stars: "1★", count: 2, fill: "hsl(var(--destructive))" },
];

const RECENT_REVIEWS = [
  { id: "1", name: "Carlos Silva", stars: 5, comment: "Excelente serviço! Carro ficou impecável.", date: "2026-03-24", service: "Lavagem Completa" },
  { id: "2", name: "Ana Oliveira", stars: 4, comment: "Muito bom, só demorou um pouco mais que o esperado.", date: "2026-03-23", service: "Polimento" },
  { id: "3", name: "Marcos Souza", stars: 5, comment: "Sempre top! Recomendo demais.", date: "2026-03-23", service: "Higienização" },
  { id: "4", name: "Fernanda Dias", stars: 3, comment: "Razoável, esperava mais capricho nos detalhes.", date: "2026-03-22", service: "Lavagem Simples" },
  { id: "5", name: "Roberto Lima", stars: 5, comment: "Perfeito como sempre!", date: "2026-03-21", service: "Cera Cristalizadora" },
];

const LOW_SCORE_ALERTS = [
  { id: "1", name: "Juliana Costa", stars: 2, comment: "Ficaram marcas no painel. Decepcionada.", date: "2026-03-22", service: "Higienização", contacted: true },
  { id: "2", name: "Pedro Santos", stars: 1, comment: "Veículo entregue ainda sujo. Inaceitável.", date: "2026-03-20", service: "Lavagem Simples", contacted: false },
];

const PREVIEW_VALUES: Record<string, string> = {
  "{nome}": "Carlos Silva",
  "{servico}": "Lavagem Completa",
  "{placa}": "ABC-1D23",
  "{loja}": "Polish Point",
  "{link}": "https://g.page/r/example/review",
};

const renderPreview = (t: string) =>
  Object.entries(PREVIEW_VALUES).reduce((s, [k, v]) => s.split(k).join(v), t);

const renderStars = (n: number) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < n ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

// ── Component ──────────────────────────────────────────────
export default function PosVendaPage() {
  const [satisfactionActive, setSatisfactionActive] = useState(true);
  const [satisfactionDelay, setSatisfactionDelay] = useState("24");
  const [satisfactionTemplate, setSatisfactionTemplate] = useState(
    "Olá {nome}! 😊\n\nSeu {servico} no veículo {placa} foi finalizado!\n\nDe 1 a 5, como você avalia nosso serviço?\n\nSua opinião é muito importante para nós!\n\n— {loja}"
  );

  const [googleActive, setGoogleActive] = useState(true);
  const [googleMinStars, setGoogleMinStars] = useState([4]);
  const [googleLink, setGoogleLink] = useState("https://g.page/r/example/review");
  const [googleTemplate, setGoogleTemplate] = useState(
    "Oi {nome}! 🌟\n\nFicamos felizes com sua avaliação! Que tal deixar sua opinião no Google também?\n\n{link}\n\nIsso nos ajuda muito! Obrigado! 🙏\n\n— {loja}"
  );

  const [alertActive, setAlertActive] = useState(true);
  const [alertMaxStars, setAlertMaxStars] = useState([2]);
  const [alertContact, setAlertContact] = useState("whatsapp");

  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [draftTemplate, setDraftTemplate] = useState("");

  const openEdit = (card: string, template: string) => {
    setEditingCard(card);
    setDraftTemplate(template);
  };

  const saveTemplate = () => {
    if (editingCard === "satisfaction") setSatisfactionTemplate(draftTemplate);
    if (editingCard === "google") setGoogleTemplate(draftTemplate);
    setEditingCard(null);
  };

  const insertVar = (v: string) => setDraftTemplate(prev => prev + v);

  const totalReviews = STAR_DIST.reduce((s, d) => s + d.count, 0);
  const avgScore = STAR_DIST.reduce((s, d, i) => s + (5 - i) * d.count, 0) / totalReviews;

  const VARIABLES = editingCard === "google"
    ? ["{nome}", "{servico}", "{placa}", "{loja}", "{link}"]
    : ["{nome}", "{servico}", "{placa}", "{loja}"];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pós-venda Automático</h1>
            <p className="text-sm text-muted-foreground">Pesquisas de satisfação e automação de avaliações</p>
          </div>
        </div>

        {/* ── Automation Cards ── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* 1. Pesquisa de satisfação */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-info" />
                  <CardTitle className="text-base">Pesquisa de Satisfação</CardTitle>
                </div>
                <Switch checked={satisfactionActive} onCheckedChange={setSatisfactionActive} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Envia pesquisa automática após a OS ser finalizada</p>
              <div className="space-y-2">
                <Label className="text-xs">Delay após finalizar OS</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={satisfactionDelay} onChange={e => setSatisfactionDelay(e.target.value)} className="w-20" />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Preview</p>
                <p className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                  {renderPreview(satisfactionTemplate).slice(0, 120)}…
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => openEdit("satisfaction", satisfactionTemplate)}>
                Editar template
              </Button>
            </CardContent>
          </Card>

          {/* 2. Avaliação Google */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-success" />
                  <CardTitle className="text-base">Avaliação Google</CardTitle>
                </div>
                <Switch checked={googleActive} onCheckedChange={setGoogleActive} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Solicita avaliação no Google para notas altas</p>
              <div className="space-y-2">
                <Label className="text-xs">Se nota ≥ {googleMinStars[0]} estrelas</Label>
                <Slider value={googleMinStars} onValueChange={setGoogleMinStars} min={1} max={5} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1★</span><span>5★</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Link Google</Label>
                <div className="flex items-center gap-2">
                  <Input value={googleLink} onChange={e => setGoogleLink(e.target.value)} className="text-xs" />
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => openEdit("google", googleTemplate)}>
                Editar template
              </Button>
            </CardContent>
          </Card>

          {/* 3. Alerta nota baixa */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-base">Alerta Nota Baixa</CardTitle>
                </div>
                <Switch checked={alertActive} onCheckedChange={setAlertActive} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Notifica o responsável quando um cliente dá nota baixa</p>
              <div className="space-y-2">
                <Label className="text-xs">Se nota ≤ {alertMaxStars[0]} estrelas</Label>
                <Slider value={alertMaxStars} onValueChange={setAlertMaxStars} min={1} max={5} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1★</span><span>5★</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notificar via</Label>
                <div className="flex gap-2">
                  <Button variant={alertContact === "whatsapp" ? "default" : "outline"} size="sm" onClick={() => setAlertContact("whatsapp")}>
                    WhatsApp
                  </Button>
                  <Button variant={alertContact === "email" ? "default" : "outline"} size="sm" onClick={() => setAlertContact("email")}>
                    E-mail
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-xs text-destructive font-medium">⚠️ Alertas são enviados em tempo real para o responsável</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Dashboard de Resultados ── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Nota média */}
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Nota Média Geral</p>
              <p className="text-5xl font-bold text-foreground">{avgScore.toFixed(1)}</p>
              <div className="mt-2">{renderStars(Math.round(avgScore))}</div>
              <p className="mt-2 text-xs text-muted-foreground">{totalReviews} avaliações</p>
            </CardContent>
          </Card>

          {/* Distribuição por estrelas */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Distribuição por Estrelas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {STAR_DIST.map(d => (
                  <div key={d.stars} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-medium text-foreground">{d.stars}</span>
                    <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(d.count / totalReviews) * 100}%`, backgroundColor: d.fill }}
                      />
                    </div>
                    <span className="w-10 text-sm text-muted-foreground text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Recent reviews + Alerts ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent reviews */}
          <Card>
            <CardHeader><CardTitle className="text-base">Avaliações Recentes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {RECENT_REVIEWS.map(r => (
                <div key={r.id} className="flex gap-3 rounded-lg border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                    {r.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      {renderStars(r.stars)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.service} · {new Date(r.date).toLocaleDateString("pt-BR")}</p>
                    <p className="text-sm text-foreground mt-1">{r.comment}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Low score alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base">Alertas de Nota Baixa</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {LOW_SCORE_ALERTS.map(a => (
                <div key={a.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      {renderStars(a.stars)}
                    </div>
                    <Badge variant={a.contacted ? "secondary" : "destructive"} className="text-xs">
                      {a.contacted ? "Contatado" : "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.service} · {new Date(a.date).toLocaleDateString("pt-BR")}</p>
                  <p className="text-sm text-foreground">{a.comment}</p>
                  {!a.contacted && (
                    <Button size="sm" variant="outline" className="text-xs">Entrar em contato</Button>
                  )}
                </div>
              ))}
              {LOW_SCORE_ALERTS.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum alerta pendente 🎉</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Sheet: Edit Template ── */}
      <Sheet open={!!editingCard} onOpenChange={open => { if (!open) setEditingCard(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingCard === "satisfaction" ? "Template - Pesquisa de Satisfação" : "Template - Avaliação Google"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label>Variáveis disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map(v => (
                  <Button key={v} variant="outline" size="sm" onClick={() => insertVar(v)}>
                    <code className="text-xs">{v}</code>
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Template da mensagem</Label>
              <Textarea value={draftTemplate} onChange={e => setDraftTemplate(e.target.value)} rows={8} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground">{renderPreview(draftTemplate)}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingCard(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={saveTemplate}>Salvar template</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
