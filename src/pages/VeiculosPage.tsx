import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Search, Car, CalendarIcon, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MockVehicle {
  id: string;
  plate: string;
  model: string;
  year: number;
  color: string;
  customerName: string;
  customerId: string;
  km: number;
  lastService: string;
  lastServiceDate: string;
  nextReminder: string | null;
}

const MOCK_VEHICLES: MockVehicle[] = [
  { id: "v1", plate: "ABC1D23", model: "Honda Civic", year: 2022, color: "Preto", customerName: "Carlos Silva", customerId: "c1", km: 32500, lastService: "Polimento", lastServiceDate: "2025-03-10", nextReminder: "Vitrificação vence em 15 dias" },
  { id: "v2", plate: "XYZ9K88", model: "Toyota Corolla", year: 2023, color: "Branco", customerName: "Ana Costa", customerId: "c2", km: 18200, lastService: "Vitrificação", lastServiceDate: "2025-02-20", nextReminder: null },
  { id: "v3", plate: "DEF4H56", model: "Jeep Compass", year: 2021, color: "Prata", customerName: "Roberto Lima", customerId: "c3", km: 55800, lastService: "Lavagem Premium", lastServiceDate: "2025-03-18", nextReminder: "Lavagem programada em 7 dias" },
  { id: "v4", plate: "GHI7J01", model: "VW Golf", year: 2020, color: "Azul", customerName: "Fernanda Souza", customerId: "c4", km: 67200, lastService: "PPF Parcial", lastServiceDate: "2025-01-05", nextReminder: "Revisão PPF em 30 dias" },
  { id: "v5", plate: "JKL2M34", model: "BMW 320i", year: 2023, color: "Preto", customerName: "Marcos Oliveira", customerId: "c5", km: 12400, lastService: "Coating Cerâmico", lastServiceDate: "2025-03-01", nextReminder: null },
  { id: "v6", plate: "MNO5P67", model: "Mercedes C200", year: 2022, color: "Cinza", customerName: "Patricia Mendes", customerId: "c6", km: 28900, lastService: "Higienização", lastServiceDate: "2024-12-15", nextReminder: "Última lavagem há 90+ dias" },
  { id: "v7", plate: "PQR8S90", model: "Hyundai HB20", year: 2019, color: "Vermelho", customerName: "João Santos", customerId: "c7", km: 89300, lastService: "Polimento + Cera", lastServiceDate: "2025-02-10", nextReminder: null },
  { id: "v8", plate: "STU1V23", model: "Fiat Pulse", year: 2024, color: "Branco", customerName: "Carlos Silva", customerId: "c1", km: 5600, lastService: "Vitrificação", lastServiceDate: "2025-03-15", nextReminder: "Revisão vitrificação em 60 dias" },
];

const COLORS = [...new Set(MOCK_VEHICLES.map((v) => v.color))];
const MODELS = [...new Set(MOCK_VEHICLES.map((v) => v.model))];

type SortKey = "plate" | "model" | "year" | "km" | "lastServiceDate";

export default function VeiculosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortKey, setSortKey] = useState<SortKey>("plate");
  const [sortAsc, setSortAsc] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New vehicle form
  const [newPlate, setNewPlate] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newKm, setNewKm] = useState("");

  const filtered = useMemo(() => {
    let list = [...MOCK_VEHICLES];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.plate.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.customerName.toLowerCase().includes(q)
      );
    }
    if (colorFilter !== "all") list = list.filter((v) => v.color === colorFilter);
    if (modelFilter !== "all") list = list.filter((v) => v.model === modelFilter);
    if (dateFrom) list = list.filter((v) => new Date(v.lastServiceDate) >= dateFrom);
    if (dateTo) list = list.filter((v) => new Date(v.lastServiceDate) <= dateTo);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "plate") cmp = a.plate.localeCompare(b.plate);
      else if (sortKey === "model") cmp = a.model.localeCompare(b.model);
      else if (sortKey === "year") cmp = a.year - b.year;
      else if (sortKey === "km") cmp = a.km - b.km;
      else if (sortKey === "lastServiceDate") cmp = a.lastServiceDate.localeCompare(b.lastServiceDate);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [search, colorFilter, modelFilter, dateFrom, dateTo, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <button onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === col ? "text-primary" : "text-muted-foreground/50")} />
    </button>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Veículos</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Novo veículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Veículo</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); setDialogOpen(false); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input value={newPlate} onChange={(e) => setNewPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" className="h-12 font-mono uppercase tracking-widest" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Honda Civic" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="2024" type="number" className="h-12" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Preto" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Km atual</Label>
                    <Input value={newKm} onChange={(e) => setNewKm(e.target.value)} placeholder="0" type="number" className="h-12" />
                  </div>
                </div>
                <Button type="submit" className="h-12 w-full font-bold uppercase tracking-wider">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por placa, modelo ou cliente..." className="h-12 pl-10" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={colorFilter} onValueChange={setColorFilter}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Cor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cores</SelectItem>
              {COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os modelos</SelectItem>
              {MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-10 gap-1.5 text-sm", dateFrom && "text-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-10 gap-1.5 text-sm", dateTo && "text-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {(colorFilter !== "all" || modelFilter !== "all" || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-10 text-xs" onClick={() => { setColorFilter("all"); setModelFilter("all"); setDateFrom(undefined); setDateTo(undefined); }}>
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Car className="h-10 w-10" />
            <p className="text-sm">{search ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado"}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead><SortHeader label="Placa" col="plate" /></TableHead>
                  <TableHead><SortHeader label="Modelo" col="model" /></TableHead>
                  <TableHead className="hidden md:table-cell"><SortHeader label="Ano" col="year" /></TableHead>
                  <TableHead className="hidden md:table-cell">Cor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden lg:table-cell"><SortHeader label="Km" col="km" /></TableHead>
                  <TableHead className="hidden lg:table-cell"><SortHeader label="Último serviço" col="lastServiceDate" /></TableHead>
                  <TableHead className="hidden xl:table-cell">Lembrete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/veiculos/${v.id}`)}
                  >
                    <TableCell className="font-mono font-bold uppercase tracking-wider text-foreground">{v.plate}</TableCell>
                    <TableCell>{v.model}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{v.year}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{v.color}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{v.customerName}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{v.km.toLocaleString("pt-BR")} km</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{format(new Date(v.lastServiceDate), "dd/MM/yy", { locale: ptBR })}</span>
                      <span className="ml-1.5 text-xs">{v.lastService}</span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {v.nextReminder ? (
                        <Badge variant="secondary" className="text-[10px] font-normal">{v.nextReminder}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">{filtered.length} veículo(s)</p>
      </div>
    </AppLayout>
  );
}
