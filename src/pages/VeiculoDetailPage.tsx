import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Car, User, Gauge, Calendar, AlertTriangle, Camera, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface ServiceHistory {
  id: string;
  date: string;
  service: string;
  tech: string;
  value: number;
  photos: { id: string; url: string; type: "before" | "after" }[];
}

interface VehicleDetail {
  id: string;
  plate: string;
  model: string;
  year: number;
  color: string;
  km: number;
  customerName: string;
  customerId: string;
  customerPhone: string;
  photoUrl: string;
  history: ServiceHistory[];
  reminders: { id: string; text: string; severity: "warning" | "info" | "danger" }[];
}

const MOCK: Record<string, VehicleDetail> = {
  v1: {
    id: "v1", plate: "ABC1D23", model: "Honda Civic", year: 2022, color: "Preto", km: 32500,
    customerName: "Carlos Silva", customerId: "c1", customerPhone: "(11) 99999-1234",
    photoUrl: "",
    history: [
      { id: "h1", date: "2025-03-10", service: "Polimento", tech: "Ricardo", value: 350, photos: [
        { id: "p1", url: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=400", type: "before" },
        { id: "p2", url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400", type: "after" },
      ]},
      { id: "h2", date: "2025-01-15", service: "Vitrificação", tech: "André", value: 1200, photos: [
        { id: "p3", url: "https://images.unsplash.com/photo-1542362567-b07e54358753?w=400", type: "before" },
        { id: "p4", url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400", type: "after" },
      ]},
      { id: "h3", date: "2024-11-20", service: "Lavagem Premium", tech: "Ricardo", value: 180, photos: [] },
    ],
    reminders: [
      { id: "r1", text: "Vitrificação vence em 15 dias", severity: "warning" },
      { id: "r2", text: "Revisão de polimento recomendada", severity: "info" },
    ],
  },
  v2: {
    id: "v2", plate: "XYZ9K88", model: "Toyota Corolla", year: 2023, color: "Branco", km: 18200,
    customerName: "Ana Costa", customerId: "c2", customerPhone: "(11) 98888-5678",
    photoUrl: "",
    history: [
      { id: "h4", date: "2025-02-20", service: "Vitrificação", tech: "André", value: 1400, photos: [
        { id: "p5", url: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=400", type: "before" },
        { id: "p6", url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400", type: "after" },
      ]},
    ],
    reminders: [],
  },
};

// Fallback for IDs not in mock
const fallback: VehicleDetail = {
  id: "vx", plate: "DEF4H56", model: "Jeep Compass", year: 2021, color: "Prata", km: 55800,
  customerName: "Roberto Lima", customerId: "c3", customerPhone: "(11) 97777-9012",
  photoUrl: "",
  history: [
    { id: "h5", date: "2025-03-18", service: "Lavagem Premium", tech: "Ricardo", value: 180, photos: [] },
    { id: "h6", date: "2025-01-10", service: "Polimento", tech: "André", value: 400, photos: [] },
  ],
  reminders: [
    { id: "r3", text: "Lavagem programada em 7 dias", severity: "warning" },
  ],
};

export default function VeiculoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vehicle = MOCK[id || ""] || { ...fallback, id: id || "vx" };
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const totalSpent = vehicle.history.reduce((s, h) => s + h.value, 0);
  const allPhotos = vehicle.history.flatMap((h) => h.photos);

  const severityClass = (s: string) => {
    if (s === "danger") return "border-destructive/30 bg-destructive/10 text-destructive";
    if (s === "warning") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    return "border-primary/30 bg-primary/10 text-primary";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/veiculos")} className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold font-mono uppercase tracking-wider">{vehicle.plate}</h1>
            <p className="text-sm text-muted-foreground">{vehicle.model} • {vehicle.year} • {vehicle.color}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-secondary border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Gauge className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Km atual</p>
                <p className="font-bold">{vehicle.km.toLocaleString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Serviços</p>
                <p className="font-bold">{vehicle.history.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Car className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total gasto</p>
                <p className="font-bold">R$ {totalSpent.toLocaleString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary border-border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/clientes/${vehicle.customerId}`)}>
            <CardContent className="p-4 flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Proprietário</p>
                <p className="font-bold truncate flex items-center gap-1">{vehicle.customerName} <ExternalLink className="h-3 w-3 text-muted-foreground" /></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reminders */}
        {vehicle.reminders.length > 0 && (
          <div className="space-y-2">
            {vehicle.reminders.map((r) => (
              <div key={r.id} className={`flex items-center gap-2.5 rounded-lg border p-3 text-sm ${severityClass(r.severity)}`}>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {r.text}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="photos">Fotos ({allPhotos.length})</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
          </TabsList>

          {/* History tab */}
          <TabsContent value="history">
            {vehicle.history.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum serviço registrado</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="hidden md:table-cell">Técnico</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">Fotos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">{format(new Date(h.date), "dd/MM/yy", { locale: ptBR })}</TableCell>
                        <TableCell className="font-medium">{h.service}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{h.tech}</TableCell>
                        <TableCell className="text-right font-mono">R$ {h.value.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          {h.photos.length > 0 ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <Camera className="h-3 w-3 mr-1" />{h.photos.length}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Photos tab */}
          <TabsContent value="photos">
            {allPhotos.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma foto registrada</p>
            ) : (
              <div className="space-y-4">
                {vehicle.history.filter((h) => h.photos.length > 0).map((h) => (
                  <div key={h.id} className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      {format(new Date(h.date), "dd/MM/yy", { locale: ptBR })} — {h.service}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {h.photos.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setViewUrl(p.url)}
                          className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group"
                        >
                          <img src={p.url} alt={p.type} className="h-full w-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                          <Badge className="absolute top-1.5 left-1.5 text-[9px] uppercase" variant={p.type === "before" ? "outline" : "default"}>
                            {p.type === "before" ? "Antes" : "Depois"}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Data tab */}
          <TabsContent value="data">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Informações do Veículo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Placa", vehicle.plate],
                  ["Modelo", vehicle.model],
                  ["Ano", vehicle.year],
                  ["Cor", vehicle.color],
                  ["Quilometragem", `${vehicle.km.toLocaleString("pt-BR")} km`],
                  ["Proprietário", vehicle.customerName],
                  ["Telefone", vehicle.customerPhone],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Photo lightbox */}
      <Dialog open={!!viewUrl} onOpenChange={(o) => !o && setViewUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-1 bg-black border-none">
          {viewUrl && <img src={viewUrl} alt="Foto" className="w-full h-full object-contain rounded" />}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
