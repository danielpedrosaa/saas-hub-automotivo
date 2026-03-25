import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Plus, Search, CalendarIcon, List, LayoutGrid, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Download, CheckCheck, Wrench, Car, User, X
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
type OSStatus = "waiting" | "in_progress" | "done" | "delivered" | "cancelled";

interface MockOS {
  id: string;
  number: string;
  date: string;
  customer: string;
  customerPhone: string;
  vehicleModel: string;
  plate: string;
  color: string;
  services: { name: string; price: number }[];
  technician: string;
  total: number;
  discount: number;
  status: OSStatus;
  notes: string;
  internalNotes: string;
  paymentMethod: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  deliveredAt: string | null;
}

const statusCfg: Record<OSStatus, { label: string; bg: string; text: string }> = {
  waiting: { label: "Aguardando", bg: "bg-warning/15", text: "text-warning" },
  in_progress: { label: "Em Execução", bg: "bg-info/15", text: "text-info" },
  done: { label: "Finalizado", bg: "bg-success/15", text: "text-success" },
  delivered: { label: "Entregue", bg: "bg-purple/15", text: "text-purple" },
  cancelled: { label: "Cancelado", bg: "bg-destructive/15", text: "text-destructive" },
};

const TECHNICIANS = ["João", "Pedro", "Lucas", "Rafael"];
const SERVICES_CATALOG = [
  { name: "Lavagem Simples", price: 45 },
  { name: "Lavagem Completa", price: 80 },
  { name: "Polimento", price: 150 },
  { name: "Cristalização", price: 250 },
  { name: "Higienização Interna", price: 120 },
  { name: "Cera de Proteção", price: 60 },
  { name: "Revitalização de Plásticos", price: 40 },
  { name: "Limpeza de Motor", price: 70 },
];

const MOCK_OS: MockOS[] = [
  { id: "1", number: "OS-001", date: "2025-03-20", customer: "Carlos Silva", customerPhone: "(11) 99999-1111", vehicleModel: "Honda Civic 2022", plate: "ABC-1234", color: "Preto", services: [{ name: "Lavagem Completa", price: 80 }, { name: "Polimento", price: 150 }], technician: "João", total: 230, discount: 0, status: "in_progress", notes: "Cliente pede cuidado extra no capô", internalNotes: "Risco no para-lama esquerdo já existia", paymentMethod: "Crédito", createdAt: "2025-03-20T08:30:00", startedAt: "2025-03-20T09:00:00", finishedAt: null, deliveredAt: null },
  { id: "2", number: "OS-002", date: "2025-03-20", customer: "Maria Santos", customerPhone: "(11) 99999-2222", vehicleModel: "Toyota Corolla 2023", plate: "DEF-5678", color: "Branco", services: [{ name: "Cristalização", price: 250 }], technician: "Pedro", total: 250, discount: 0, status: "waiting", notes: "", internalNotes: "", paymentMethod: "", createdAt: "2025-03-20T09:15:00", startedAt: null, finishedAt: null, deliveredAt: null },
  { id: "3", number: "OS-003", date: "2025-03-19", customer: "João Oliveira", customerPhone: "(11) 99999-3333", vehicleModel: "VW Gol 2020", plate: "GHI-9012", color: "Prata", services: [{ name: "Lavagem Simples", price: 45 }], technician: "João", total: 45, discount: 0, status: "done", notes: "", internalNotes: "", paymentMethod: "Dinheiro", createdAt: "2025-03-19T10:00:00", startedAt: "2025-03-19T10:30:00", finishedAt: "2025-03-19T11:15:00", deliveredAt: null },
  { id: "4", number: "OS-004", date: "2025-03-19", customer: "Ana Costa", customerPhone: "(11) 99999-4444", vehicleModel: "BMW X1 2024", plate: "JKL-3456", color: "Azul", services: [{ name: "Polimento", price: 150 }, { name: "Cristalização", price: 250 }, { name: "Higienização Interna", price: 120 }], technician: "Lucas", total: 494, discount: 26, status: "delivered", notes: "Aplicar cera final", internalNotes: "Banco traseiro com mancha difícil", paymentMethod: "Débito", createdAt: "2025-03-19T07:45:00", startedAt: "2025-03-19T08:00:00", finishedAt: "2025-03-19T12:00:00", deliveredAt: "2025-03-19T14:00:00" },
  { id: "5", number: "OS-005", date: "2025-03-18", customer: "Pedro Ferreira", customerPhone: "(11) 99999-5555", vehicleModel: "Fiat Argo 2021", plate: "MNO-7890", color: "Vermelho", services: [{ name: "Lavagem Completa", price: 80 }], technician: "Pedro", total: 80, discount: 0, status: "cancelled", notes: "Cliente cancelou", internalNotes: "", paymentMethod: "", createdAt: "2025-03-18T14:00:00", startedAt: null, finishedAt: null, deliveredAt: null },
  { id: "6", number: "OS-006", date: "2025-03-18", customer: "Lucas Mendes", customerPhone: "(11) 99999-6666", vehicleModel: "Jeep Compass 2023", plate: "PQR-1234", color: "Preto", services: [{ name: "Higienização Interna", price: 120 }, { name: "Cera de Proteção", price: 60 }], technician: "Rafael", total: 180, discount: 0, status: "delivered", notes: "", internalNotes: "", paymentMethod: "Transferência", createdAt: "2025-03-18T08:00:00", startedAt: "2025-03-18T08:30:00", finishedAt: "2025-03-18T11:00:00", deliveredAt: "2025-03-18T13:00:00" },
  { id: "7", number: "OS-007", date: "2025-03-17", customer: "Fernanda Lima", customerPhone: "(11) 99999-7777", vehicleModel: "Hyundai HB20 2022", plate: "STU-5678", color: "Cinza", services: [{ name: "Lavagem Simples", price: 45 }, { name: "Revitalização de Plásticos", price: 40 }], technician: "João", total: 85, discount: 0, status: "delivered", notes: "", internalNotes: "", paymentMethod: "Dinheiro", createdAt: "2025-03-17T09:00:00", startedAt: "2025-03-17T09:15:00", finishedAt: "2025-03-17T10:00:00", deliveredAt: "2025-03-17T11:00:00" },
  { id: "8", number: "OS-008", date: "2025-03-17", customer: "Roberto Dias", customerPhone: "(11) 99999-8888", vehicleModel: "Chevrolet Onix 2023", plate: "VWX-9012", color: "Branco", services: [{ name: "Polimento", price: 150 }, { name: "Cera de Proteção", price: 60 }], technician: "Pedro", total: 210, discount: 0, status: "done", notes: "", internalNotes: "Verificar finalização do polimento", paymentMethod: "Crédito", createdAt: "2025-03-17T13:00:00", startedAt: "2025-03-17T13:30:00", finishedAt: "2025-03-17T16:00:00", deliveredAt: null },
  { id: "9", number: "OS-009", date: "2025-03-16", customer: "Camila Alves", customerPhone: "(11) 99999-9999", vehicleModel: "Renault Kwid 2021", plate: "YZA-3456", color: "Vermelho", services: [{ name: "Lavagem Completa", price: 80 }, { name: "Limpeza de Motor", price: 70 }], technician: "Lucas", total: 150, discount: 0, status: "delivered", notes: "", internalNotes: "", paymentMethod: "Boleto", createdAt: "2025-03-16T08:00:00", startedAt: "2025-03-16T08:30:00", finishedAt: "2025-03-16T10:30:00", deliveredAt: "2025-03-16T12:00:00" },
  { id: "10", number: "OS-010", date: "2025-03-16", customer: "Thiago Rocha", customerPhone: "(11) 98888-1111", vehicleModel: "Ford Ka 2020", plate: "BCD-7890", color: "Prata", services: [{ name: "Lavagem Simples", price: 45 }], technician: "Rafael", total: 45, discount: 0, status: "delivered", notes: "", internalNotes: "", paymentMethod: "Dinheiro", createdAt: "2025-03-16T15:00:00", startedAt: "2025-03-16T15:15:00", finishedAt: "2025-03-16T15:45:00", deliveredAt: "2025-03-16T16:00:00" },
];

const MOCK_CUSTOMERS = [
  { id: "c1", name: "Carlos Silva", vehicles: [{ id: "v1", model: "Honda Civic 2022", plate: "ABC-1234" }] },
  { id: "c2", name: "Maria Santos", vehicles: [{ id: "v2", model: "Toyota Corolla 2023", plate: "DEF-5678" }] },
  { id: "c3", name: "João Oliveira", vehicles: [{ id: "v3", model: "VW Gol 2020", plate: "GHI-9012" }] },
  { id: "c4", name: "Ana Costa", vehicles: [{ id: "v4", model: "BMW X1 2024", plate: "JKL-3456" }] },
  { id: "c5", name: "Pedro Ferreira", vehicles: [{ id: "v5", model: "Fiat Argo 2021", plate: "MNO-7890" }] },
];

const PAGE_SIZE = 8;

export default function OrdensServico() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [sortCol, setSortCol] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNewDialog, setShowNewDialog] = useState(false);

  // ── Filter & sort ──
  const filtered = useMemo(() => {
    let list = [...MOCK_OS];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(o =>
        o.number.toLowerCase().includes(t) ||
        o.customer.toLowerCase().includes(t) ||
        o.plate.toLowerCase().includes(t)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter(o => o.status === statusFilter);
    }
    if (techFilter !== "all") {
      list = list.filter(o => o.technician === techFilter);
    }
    if (dateFrom) {
      list = list.filter(o => new Date(o.date) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter(o => new Date(o.date) <= dateTo);
    }
    // Sort
    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortCol) {
        case "number": va = a.number; vb = b.number; break;
        case "date": va = a.date; vb = b.date; break;
        case "customer": va = a.customer; vb = b.customer; break;
        case "total": va = a.total; vb = b.total; break;
        case "status": va = a.status; vb = b.status; break;
        default: va = a.date; vb = b.date;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [searchTerm, statusFilter, techFilter, dateFrom, dateTo, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(o => o.id)));
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const clearDateFilter = () => { setDateFrom(undefined); setDateTo(undefined); };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Ordens de Serviço</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} ordens encontradas</p>
          </div>
          <Button onClick={() => setShowNewDialog(true)} size="sm" className="rounded-lg">
            <Plus className="h-4 w-4 mr-1" /> Nova OS
          </Button>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nº, nome ou placa..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 h-8 text-xs rounded-lg"
            />
          </div>

          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {(Object.entries(statusCfg)).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={techFilter} onValueChange={v => { setTechFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg"><SelectValue placeholder="Técnico" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos técnicos</SelectItem>
              {TECHNICIANS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {dateFrom && dateTo
                  ? `${format(dateFrom, "dd/MM")} - ${format(dateTo, "dd/MM")}`
                  : "Período"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 pointer-events-auto" align="start">
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">De</p>
                  <Calendar mode="single" selected={dateFrom} onSelect={d => { setDateFrom(d || undefined); setPage(1); }} className="p-2 pointer-events-auto" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Até</p>
                  <Calendar mode="single" selected={dateTo} onSelect={d => { setDateTo(d || undefined); setPage(1); }} className="p-2 pointer-events-auto" />
                </div>
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={clearDateFilter}>Limpar datas</Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex bg-secondary rounded-lg p-0.5 ml-auto">
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "cards" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {viewMode === "list" ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox checked={selected.size === paged.length && paged.length > 0} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-xs" onClick={() => toggleSort("number")}>
                      <span className="flex items-center gap-1">Nº OS <SortIcon col="number" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-xs" onClick={() => toggleSort("date")}>
                      <span className="flex items-center gap-1">Data <SortIcon col="date" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-xs" onClick={() => toggleSort("customer")}>
                      <span className="flex items-center gap-1">Cliente <SortIcon col="customer" /></span>
                    </TableHead>
                    <TableHead className="text-xs">Veículo</TableHead>
                    <TableHead className="text-xs">Serviço(s)</TableHead>
                    <TableHead className="text-xs">Técnico</TableHead>
                    <TableHead className="cursor-pointer select-none text-xs" onClick={() => toggleSort("total")}>
                      <span className="flex items-center gap-1">Valor <SortIcon col="total" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-xs" onClick={() => toggleSort("status")}>
                      <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(os => {
                    const cfg = statusCfg[os.status];
                    return (
                      <TableRow
                        key={os.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/os/${os.id}`)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selected.has(os.id)} onCheckedChange={() => toggleSelect(os.id)} />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{os.number}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(os.date), "dd/MM/yy")}</TableCell>
                        <TableCell className="text-xs font-medium">{os.customer}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{os.vehicleModel} <span className="font-mono">{os.plate}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{os.services.map(s => s.name).join(", ")}</TableCell>
                        <TableCell className="text-xs">{os.technician}</TableCell>
                        <TableCell className="text-xs font-semibold">R$ {os.total.toFixed(0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] border-0", cfg.bg, cfg.text)}>{cfg.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground">Nenhuma OS encontrada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={cn(
                        "h-7 w-7 rounded-md text-xs transition-colors",
                        page === i + 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Cards view ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paged.map(os => {
              const cfg = statusCfg[os.status];
              return (
                <div
                  key={os.id}
                  onClick={() => navigate(`/os/${os.id}`)}
                  className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-foreground">{os.number}</span>
                    <Badge variant="outline" className={cn("text-[10px] border-0", cfg.bg, cfg.text)}>{cfg.label}</Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{os.customer}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{os.vehicleModel} • {os.plate}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{os.services.map(s => s.name).join(", ")}</p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{os.technician} • {format(new Date(os.date), "dd/MM")}</span>
                    <span className="text-sm font-bold text-foreground">R$ {os.total}</span>
                  </div>
                </div>
              );
            })}
            {paged.length === 0 && (
              <div className="col-span-full text-center py-12 text-sm text-muted-foreground">Nenhuma OS encontrada.</div>
            )}
          </div>
        )}

        {/* Pagination for cards */}
        {viewMode === "cards" && totalPages > 1 && (
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

        {/* ── Bulk actions bar ── */}
        {selected.size > 0 && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4">
            <span className="text-sm font-medium">{selected.size} selecionada(s)</span>
            <Button size="sm" variant="secondary" className="rounded-lg h-8 text-xs">
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar como entregue
            </Button>
            <Button size="sm" variant="secondary" className="rounded-lg h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" /> Exportar
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg h-8 text-xs text-background/70" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── New OS Dialog ── */}
      <NewOSDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </AppLayout>
  );
}

// ── New OS Dialog ──────────────────────────────────────────────
function NewOSDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");

  const filteredCust = MOCK_CUSTOMERS.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  const customerObj = MOCK_CUSTOMERS.find(c => c.id === selectedCustomer);

  const total = useMemo(() => {
    return SERVICES_CATALOG.filter(s => selectedServices.has(s.name)).reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices]);

  const toggleService = (name: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          <DialogDescription>Preencha os dados para abrir uma nova OS.</DialogDescription>
        </DialogHeader>

        <form onSubmit={e => { e.preventDefault(); onOpenChange(false); }} className="space-y-4 pt-2">
          {/* Customer combobox */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Cliente</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start rounded-lg text-sm h-9">
                  <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  {customerObj?.name || "Buscar cliente..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 pointer-events-auto" align="start">
                <div className="p-2 border-b border-border">
                  <Input placeholder="Digitar nome..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="h-8 text-xs rounded-md" />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  {filteredCust.map(c => (
                    <button key={c.id} type="button" onClick={() => { setSelectedCustomer(c.id); setSelectedVehicle(""); setCustomerSearch(""); }}
                      className={cn("w-full text-left px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors", selectedCustomer === c.id && "bg-secondary font-medium")}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Veículo</label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle} disabled={!selectedCustomer}>
              <SelectTrigger className="rounded-lg h-9 text-sm"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                {customerObj?.vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.model} - {v.plate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Services checklist */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Serviços</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto border border-border rounded-lg p-2">
              {SERVICES_CATALOG.map(s => (
                <label
                  key={s.name}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-xs cursor-pointer transition-colors border",
                    selectedServices.has(s.name)
                      ? "bg-primary/5 border-primary/30"
                      : "border-transparent hover:bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selectedServices.has(s.name)} onCheckedChange={() => toggleService(s.name)} />
                    <span className="text-foreground">{s.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">R$ {s.price}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Technician */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Técnico</label>
            <Select value={technician} onValueChange={setTechnician}>
              <SelectTrigger className="rounded-lg h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TECHNICIANS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Observações</label>
            <Textarea className="rounded-lg text-sm min-h-[60px]" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="text-lg font-bold text-foreground">R$ {total.toFixed(2)}</span>
          </div>

          <Button type="submit" className="w-full rounded-lg">Abrir OS</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
