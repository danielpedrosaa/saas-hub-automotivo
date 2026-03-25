import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Phone, Car, Calendar, DollarSign, Star,
  ChevronLeft, ChevronRight, ArrowUpDown
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
type ClientTag = "VIP" | "Frota" | "Recorrente" | "Novo";

interface MockClient {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  address: string;
  tags: ClientTag[];
  vehicles: { plate: string; model: string }[];
  totalVisits: number;
  lastService: string; // date
  lastServiceName: string;
  totalSpent: number;
  avgRating: number;
}

const tagCfg: Record<ClientTag, { bg: string; text: string }> = {
  VIP: { bg: "bg-warning/15", text: "text-warning" },
  Frota: { bg: "bg-info/15", text: "text-info" },
  Recorrente: { bg: "bg-success/15", text: "text-success" },
  Novo: { bg: "bg-purple/15", text: "text-purple" },
};

const MOCK_CLIENTS: MockClient[] = [
  { id: "c1", name: "Carlos Silva", phone: "(11) 99999-1111", email: "carlos@email.com", cpf: "123.456.789-00", address: "Rua Augusta, 100 - Consolação", tags: ["VIP", "Recorrente"], vehicles: [{ plate: "ABC-1234", model: "Honda Civic 2022" }, { plate: "XYZ-9876", model: "Toyota SW4 2024" }], totalVisits: 24, lastService: "2025-03-20", lastServiceName: "Polimento", totalSpent: 4850, avgRating: 4.8 },
  { id: "c2", name: "Maria Santos", phone: "(11) 99999-2222", email: "maria@email.com", cpf: "234.567.890-11", address: "Av. Paulista, 1500 - Bela Vista", tags: ["Recorrente"], vehicles: [{ plate: "DEF-5678", model: "Toyota Corolla 2023" }], totalVisits: 12, lastService: "2025-03-18", lastServiceName: "Cristalização", totalSpent: 2300, avgRating: 4.5 },
  { id: "c3", name: "João Oliveira", phone: "(11) 99999-3333", email: "joao@email.com", cpf: "345.678.901-22", address: "Rua Oscar Freire, 800 - Jardins", tags: ["Novo"], vehicles: [{ plate: "GHI-9012", model: "VW Gol 2020" }], totalVisits: 2, lastService: "2025-03-19", lastServiceName: "Lavagem Simples", totalSpent: 90, avgRating: 5.0 },
  { id: "c4", name: "Ana Costa", phone: "(11) 99999-4444", email: "ana@email.com", cpf: "456.789.012-33", address: "Al. Santos, 200 - Paraíso", tags: ["VIP"], vehicles: [{ plate: "JKL-3456", model: "BMW X1 2024" }, { plate: "MNP-1122", model: "Mercedes GLA 2023" }], totalVisits: 18, lastService: "2025-03-19", lastServiceName: "Higienização + Polimento", totalSpent: 6200, avgRating: 4.9 },
  { id: "c5", name: "Pedro Ferreira", phone: "(11) 99999-5555", email: "pedro@email.com", cpf: "567.890.123-44", address: "Rua Haddock Lobo, 400 - Cerqueira César", tags: ["Recorrente"], vehicles: [{ plate: "MNO-7890", model: "Fiat Argo 2021" }], totalVisits: 8, lastService: "2025-03-15", lastServiceName: "Lavagem Completa", totalSpent: 680, avgRating: 4.2 },
  { id: "c6", name: "Lucas Mendes", phone: "(11) 99999-6666", email: "lucas@email.com", cpf: "678.901.234-55", address: "Rua Bela Cintra, 600 - Consolação", tags: ["Frota"], vehicles: [{ plate: "PQR-1234", model: "Jeep Compass 2023" }, { plate: "STU-4567", model: "Fiat Toro 2022" }, { plate: "VWX-8901", model: "Chevrolet S10 2023" }], totalVisits: 32, lastService: "2025-03-20", lastServiceName: "Lavagem Frota", totalSpent: 8400, avgRating: 4.6 },
  { id: "c7", name: "Fernanda Lima", phone: "(11) 99999-7777", email: "fernanda@email.com", cpf: "789.012.345-66", address: "Rua Pamplona, 300 - Jardim Paulista", tags: ["Novo"], vehicles: [{ plate: "STU-5678", model: "Hyundai HB20 2022" }], totalVisits: 1, lastService: "2025-03-17", lastServiceName: "Lavagem Simples", totalSpent: 45, avgRating: 0 },
  { id: "c8", name: "Roberto Dias", phone: "(11) 99999-8888", email: "roberto@email.com", cpf: "890.123.456-77", address: "Av. Rebouças, 1200 - Pinheiros", tags: ["Recorrente"], vehicles: [{ plate: "VWX-9012", model: "Chevrolet Onix 2023" }], totalVisits: 6, lastService: "2025-03-17", lastServiceName: "Polimento + Cera", totalSpent: 520, avgRating: 4.0 },
  { id: "c9", name: "Camila Alves", phone: "(11) 99999-9999", email: "camila@email.com", cpf: "901.234.567-88", address: "Rua da Consolação, 900 - Consolação", tags: ["VIP", "Frota"], vehicles: [{ plate: "YZA-3456", model: "Renault Kwid 2021" }, { plate: "BCD-7890", model: "VW T-Cross 2024" }], totalVisits: 15, lastService: "2025-03-16", lastServiceName: "Cristalização", totalSpent: 3800, avgRating: 4.7 },
  { id: "c10", name: "Thiago Rocha", phone: "(11) 98888-1111", email: "thiago@email.com", cpf: "012.345.678-99", address: "Rua Augusta, 2500 - Cerqueira César", tags: [], vehicles: [{ plate: "BCD-7891", model: "Ford Ka 2020" }], totalVisits: 3, lastService: "2025-03-16", lastServiceName: "Lavagem Simples", totalSpent: 135, avgRating: 3.5 },
];

const PAGE_SIZE = 8;

export default function ClientesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "lastService" | "totalSpent" | "totalVisits">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const filtered = useMemo(() => {
    let list = [...MOCK_CLIENTS];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(t) ||
        c.phone.includes(t) ||
        c.vehicles.some(v => v.plate.toLowerCase().includes(t)) ||
        c.address.toLowerCase().includes(t)
      );
    }
    if (tagFilter !== "all") {
      list = list.filter(c => c.tags.includes(tagFilter as ClientTag));
    }
    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortBy) {
        case "name": va = a.name; vb = b.name; break;
        case "lastService": va = a.lastService; vb = b.lastService; break;
        case "totalSpent": va = a.totalSpent; vb = b.totalSpent; break;
        case "totalVisits": va = a.totalVisits; vb = b.totalVisits; break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [searchTerm, tagFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const daysAgo = (dateStr: string) => {
    const d = differenceInDays(new Date(), new Date(dateStr));
    if (d === 0) return "Hoje";
    if (d === 1) return "Ontem";
    return `${d}d atrás`;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} clientes encontrados</p>
          </div>
          <Button onClick={() => setShowNewDialog(true)} size="sm" className="rounded-lg">
            <Plus className="h-4 w-4 mr-1" /> Novo cliente
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, telefone, placa, bairro..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 h-8 text-xs rounded-lg"
            />
          </div>

          <div className="flex gap-1">
            {(["all", "VIP", "Frota", "Recorrente", "Novo"] as const).map(tag => (
              <button
                key={tag}
                onClick={() => { setTagFilter(tag); setPage(1); }}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-medium transition-colors border",
                  tagFilter === tag
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
                )}
              >
                {tag === "all" ? "Todos" : tag}
              </button>
            ))}
          </div>

          <Select value={sortBy} onValueChange={v => { setSortBy(v as any); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg ml-auto">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="lastService">Última visita</SelectItem>
              <SelectItem value="totalSpent">Total gasto</SelectItem>
              <SelectItem value="totalVisits">Frequência</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Client list */}
        <div className="space-y-2">
          {paged.map(client => (
            <div
              key={client.id}
              onClick={() => navigate(`/clientes/${client.id}`)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(client.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground truncate">{client.name}</span>
                    {client.tags.map(tag => (
                      <Badge key={tag} variant="outline" className={cn("text-[9px] h-4 border-0", tagCfg[tag].bg, tagCfg[tag].text)}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {client.vehicles.map(v => v.plate).join(", ")}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Visitas</p>
                    <p className="text-sm font-bold text-foreground">{client.totalVisits}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Último</p>
                    <p className="text-sm font-medium text-foreground">{daysAgo(client.lastService)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-bold text-foreground">R$ {client.totalSpent.toLocaleString("pt-BR")}</p>
                  </div>
                  {client.avgRating > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Nota</p>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-warning fill-warning" /> {client.avgRating}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {paged.length === 0 && (
            <div className="text-center py-16 text-sm text-muted-foreground">Nenhum cliente encontrado.</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground mx-2">{page} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* New client dialog */}
      <NewClientDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </AppLayout>
  );
}

// ── New Client Dialog ──────────────────────────────────────────
function NewClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Cadastre um novo cliente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); onOpenChange(false); }} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Nome completo</label>
            <Input className="rounded-lg h-9 text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Telefone</label>
              <Input className="rounded-lg h-9 text-sm" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">CPF</label>
              <Input className="rounded-lg h-9 text-sm" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">E-mail</label>
            <Input className="rounded-lg h-9 text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <Button type="submit" className="w-full rounded-lg">Cadastrar cliente</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
