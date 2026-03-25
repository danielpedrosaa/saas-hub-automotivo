import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Phone, Mail, MapPin, CreditCard, Edit, MessageSquare,
  CalendarPlus, FileText, Star, Car, DollarSign, TrendingUp, Crown,
  Plus, AlertCircle
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
type ClientTag = "VIP" | "Frota" | "Recorrente" | "Novo";

const tagCfg: Record<ClientTag, { bg: string; text: string }> = {
  VIP: { bg: "bg-warning/15", text: "text-warning" },
  Frota: { bg: "bg-info/15", text: "text-info" },
  Recorrente: { bg: "bg-success/15", text: "text-success" },
  Novo: { bg: "bg-purple/15", text: "text-purple" },
};

// ── Mock data ──────────────────────────────────────────────────
const CLIENTS: Record<string, any> = {
  c1: {
    id: "c1", name: "Carlos Silva", phone: "(11) 99999-1111", email: "carlos@email.com",
    cpf: "123.456.789-00", address: "Rua Augusta, 100 - Consolação, São Paulo - SP",
    tags: ["VIP", "Recorrente"] as ClientTag[],
    vehicles: [
      { id: "v1", model: "Honda Civic", year: 2022, color: "Preto", plate: "ABC-1234", km: "32.000" },
      { id: "v2", model: "Toyota SW4", year: 2024, color: "Branco", plate: "XYZ-9876", km: "8.500" },
    ],
    history: [
      { date: "2025-03-20", service: "Polimento", vehicle: "Honda Civic - ABC-1234", technician: "João", value: 150, rating: 5 },
      { date: "2025-03-12", service: "Lavagem Completa", vehicle: "Toyota SW4 - XYZ-9876", technician: "Pedro", value: 80, rating: 5 },
      { date: "2025-03-01", service: "Cristalização", vehicle: "Honda Civic - ABC-1234", technician: "Lucas", value: 250, rating: 4 },
      { date: "2025-02-18", service: "Higienização Interna", vehicle: "Honda Civic - ABC-1234", technician: "João", value: 120, rating: 5 },
      { date: "2025-02-05", service: "Lavagem Completa", vehicle: "Toyota SW4 - XYZ-9876", technician: "Pedro", value: 80, rating: 5 },
      { date: "2025-01-22", service: "Polimento + Cera", vehicle: "Honda Civic - ABC-1234", technician: "João", value: 210, rating: 4 },
      { date: "2025-01-08", service: "Lavagem Simples", vehicle: "Honda Civic - ABC-1234", technician: "Rafael", value: 45, rating: 5 },
    ],
    notes: "Cliente preferencial. Prefere ser atendido pelo João. Sempre traz dois veículos. Gosta de esperar no local - oferecer café.",
    totalSpent: 4850, totalVisits: 24, avgRating: 4.8, plan: "Premium", frequency: "2x/mês",
  },
  c2: {
    id: "c2", name: "Maria Santos", phone: "(11) 99999-2222", email: "maria@email.com",
    cpf: "234.567.890-11", address: "Av. Paulista, 1500 - Bela Vista, São Paulo - SP",
    tags: ["Recorrente"] as ClientTag[],
    vehicles: [
      { id: "v3", model: "Toyota Corolla", year: 2023, color: "Branco", plate: "DEF-5678", km: "18.000" },
    ],
    history: [
      { date: "2025-03-18", service: "Cristalização", vehicle: "Toyota Corolla - DEF-5678", technician: "Pedro", value: 250, rating: 4 },
      { date: "2025-03-02", service: "Lavagem Completa", vehicle: "Toyota Corolla - DEF-5678", technician: "João", value: 80, rating: 5 },
      { date: "2025-02-15", service: "Polimento", vehicle: "Toyota Corolla - DEF-5678", technician: "Lucas", value: 150, rating: 4 },
    ],
    notes: "Agenda sempre por WhatsApp. Prefere horário da manhã.",
    totalSpent: 2300, totalVisits: 12, avgRating: 4.5, plan: "Básico", frequency: "1x/mês",
  },
  c4: {
    id: "c4", name: "Ana Costa", phone: "(11) 99999-4444", email: "ana@email.com",
    cpf: "456.789.012-33", address: "Al. Santos, 200 - Paraíso, São Paulo - SP",
    tags: ["VIP"] as ClientTag[],
    vehicles: [
      { id: "v5", model: "BMW X1", year: 2024, color: "Azul", plate: "JKL-3456", km: "5.200" },
      { id: "v6", model: "Mercedes GLA", year: 2023, color: "Preto", plate: "MNP-1122", km: "22.000" },
    ],
    history: [
      { date: "2025-03-19", service: "Higienização + Polimento", vehicle: "BMW X1 - JKL-3456", technician: "Lucas", value: 270, rating: 5 },
      { date: "2025-03-05", service: "Cristalização", vehicle: "Mercedes GLA - MNP-1122", technician: "João", value: 250, rating: 5 },
    ],
    notes: "Exigente com acabamento. Sempre verificar antes de entregar. Cliente VIP - prioridade na fila.",
    totalSpent: 6200, totalVisits: 18, avgRating: 4.9, plan: "Premium", frequency: "3x/mês",
  },
  c6: {
    id: "c6", name: "Lucas Mendes", phone: "(11) 99999-6666", email: "lucas@email.com",
    cpf: "678.901.234-55", address: "Rua Bela Cintra, 600 - Consolação, São Paulo - SP",
    tags: ["Frota"] as ClientTag[],
    vehicles: [
      { id: "v7", model: "Jeep Compass", year: 2023, color: "Preto", plate: "PQR-1234", km: "45.000" },
      { id: "v8", model: "Fiat Toro", year: 2022, color: "Prata", plate: "STU-4567", km: "62.000" },
      { id: "v9", model: "Chevrolet S10", year: 2023, color: "Branco", plate: "VWX-8901", km: "38.000" },
    ],
    history: [
      { date: "2025-03-20", service: "Lavagem Frota (3 veículos)", vehicle: "Frota completa", technician: "Equipe", value: 240, rating: 5 },
      { date: "2025-03-13", service: "Lavagem Frota (3 veículos)", vehicle: "Frota completa", technician: "Equipe", value: 240, rating: 4 },
    ],
    notes: "Contrato de frota - 4 lavagens/mês. Sempre agenda segunda-feira de manhã.",
    totalSpent: 8400, totalVisits: 32, avgRating: 4.6, plan: "Frota", frequency: "4x/mês",
  },
};

// Fill missing IDs with a generic fallback
const getClient = (id: string) => CLIENTS[id] || {
  id, name: "Cliente não encontrado", phone: "", email: "", cpf: "", address: "",
  tags: [], vehicles: [], history: [], notes: "", totalSpent: 0, totalVisits: 0,
  avgRating: 0, plan: "—", frequency: "—",
};

export default function ClienteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = getClient(id || "");
  const [notes, setNotes] = useState(client.notes);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);

  if (!client.name || client.name === "Cliente não encontrado") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">Cliente não encontrado</p>
          <Button variant="outline" className="mt-4 rounded-lg" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigate("/clientes")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(client.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
                {client.tags.map((tag: ClientTag) => (
                  <Badge key={tag} variant="outline" className={cn("text-[9px] h-4 border-0", tagCfg[tag].bg, tagCfg[tag].text)}>{tag}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Cliente desde jan/2024 • {client.totalVisits} visitas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg text-xs">
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg text-xs">
              <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Agendar
            </Button>
            <Button size="sm" className="rounded-lg text-xs">
              <FileText className="h-3.5 w-3.5 mr-1" /> Nova OS
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main content - 3 cols */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4 rounded-xl">
                <TabsTrigger value="dados" className="rounded-lg text-xs">Dados</TabsTrigger>
                <TabsTrigger value="veiculos" className="rounded-lg text-xs">Veículos</TabsTrigger>
                <TabsTrigger value="historico" className="rounded-lg text-xs">Histórico</TabsTrigger>
                <TabsTrigger value="observacoes" className="rounded-lg text-xs">Observações</TabsTrigger>
              </TabsList>

              {/* Tab: Dados */}
              <TabsContent value="dados">
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Dados pessoais</h3>
                    <Button variant="ghost" size="sm" className="text-xs"><Edit className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoField icon={<Phone className="h-4 w-4" />} label="Telefone" value={client.phone} />
                    <InfoField icon={<Mail className="h-4 w-4" />} label="E-mail" value={client.email} />
                    <InfoField icon={<CreditCard className="h-4 w-4" />} label="CPF" value={client.cpf} />
                    <InfoField icon={<MapPin className="h-4 w-4" />} label="Endereço" value={client.address} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Tags</p>
                    <div className="flex gap-1.5">
                      {client.tags.map((tag: ClientTag) => (
                        <Badge key={tag} variant="outline" className={cn("text-xs", tagCfg[tag].bg, tagCfg[tag].text)}>{tag}</Badge>
                      ))}
                      <button className="h-6 px-2 rounded-full border border-dashed border-border text-[10px] text-muted-foreground hover:border-foreground/30 transition-colors">
                        + Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Veículos */}
              <TabsContent value="veiculos">
                <div className="space-y-3">
                  {client.vehicles.map((v: any) => (
                    <div key={v.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Car className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{v.model} <span className="font-normal text-muted-foreground">{v.year}</span></p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono font-medium">{v.plate}</span>
                          <span>{v.color}</span>
                          <span>{v.km} km</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs"><Edit className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowVehicleDialog(true)}
                    className="w-full bg-card border-2 border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Adicionar veículo
                  </button>
                </div>
              </TabsContent>

              {/* Tab: Histórico */}
              <TabsContent value="historico">
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Serviço</TableHead>
                        <TableHead className="text-xs">Veículo</TableHead>
                        <TableHead className="text-xs">Técnico</TableHead>
                        <TableHead className="text-xs">Valor</TableHead>
                        <TableHead className="text-xs">Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.history.map((h: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(h.date), "dd/MM/yy")}</TableCell>
                          <TableCell className="text-xs font-medium">{h.service}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{h.vehicle}</TableCell>
                          <TableCell className="text-xs">{h.technician}</TableCell>
                          <TableCell className="text-xs font-semibold">R$ {h.value}</TableCell>
                          <TableCell>
                            {h.rating > 0 && (
                              <span className="flex items-center gap-0.5 text-xs">
                                <Star className="h-3 w-3 text-warning fill-warning" /> {h.rating}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Tab: Observações */}
              <TabsContent value="observacoes">
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Notas internas</h3>
                  <Textarea
                    className="rounded-lg text-sm min-h-[160px]"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre este cliente..."
                  />
                  <Button size="sm" className="rounded-lg text-xs">Salvar</Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 1 col */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Métricas</h3>

              <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Total gasto" value={`R$ ${client.totalSpent.toLocaleString("pt-BR")}`} color="text-success" />
              <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Frequência" value={client.frequency} color="text-info" />
              <MetricCard icon={<Star className="h-4 w-4" />} label="Nota média" value={client.avgRating > 0 ? client.avgRating.toString() : "—"} color="text-warning" />
              <MetricCard icon={<Crown className="h-4 w-4" />} label="Plano" value={client.plan} color="text-purple" />
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Ações rápidas</h3>
              <Button variant="outline" size="sm" className="w-full rounded-lg text-xs justify-start">
                <MessageSquare className="h-3.5 w-3.5 mr-2" /> Enviar WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="w-full rounded-lg text-xs justify-start">
                <CalendarPlus className="h-3.5 w-3.5 mr-2" /> Agendar serviço
              </Button>
              <Button variant="outline" size="sm" className="w-full rounded-lg text-xs justify-start">
                <FileText className="h-3.5 w-3.5 mr-2" /> Criar OS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add vehicle dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Veículo</DialogTitle>
            <DialogDescription>Vincule um novo veículo a este cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); setShowVehicleDialog(false); }} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Modelo</label>
                <Input className="rounded-lg h-9 text-sm" placeholder="Ex: Honda Civic" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Ano</label>
                <Input className="rounded-lg h-9 text-sm" placeholder="2024" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Placa</label>
                <Input className="rounded-lg h-9 text-sm" placeholder="ABC-1234" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Cor</label>
                <Input className="rounded-lg h-9 text-sm" placeholder="Preto" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Quilometragem</label>
              <Input className="rounded-lg h-9 text-sm" placeholder="32.000" />
            </div>
            <Button type="submit" className="w-full rounded-lg">Adicionar veículo</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0", color)}>{icon}</div>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
