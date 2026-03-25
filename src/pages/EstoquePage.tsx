import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Package, Plus, AlertTriangle, ArrowUpDown, Search, ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";

const CATEGORIES = ["Shampoo", "Cera", "Polidor", "Vitrificador", "Pano", "Acessórios", "Outros"];

const INITIAL_PRODUCTS = [
  { id: "1", name: "Shampoo Automotivo 5L", category: "Shampoo", qty: 3, min: 5, cost: 45.0, supplier: "AutoClean" },
  { id: "2", name: "Cera de Carnaúba Premium", category: "Cera", qty: 12, min: 5, cost: 89.9, supplier: "Wax Pro" },
  { id: "3", name: "Polidor de Corte 500ml", category: "Polidor", qty: 2, min: 4, cost: 62.0, supplier: "Norton" },
  { id: "4", name: "Vitrificador 9H 50ml", category: "Vitrificador", qty: 8, min: 3, cost: 189.9, supplier: "Gtechniq" },
  { id: "5", name: "Pano Microfibra 40x40", category: "Pano", qty: 25, min: 20, cost: 12.5, supplier: "Mandala" },
  { id: "6", name: "Shampoo Neutro 1L", category: "Shampoo", qty: 1, min: 3, cost: 22.0, supplier: "AutoClean" },
  { id: "7", name: "Cera Spray Rápida", category: "Cera", qty: 6, min: 4, cost: 35.0, supplier: "Wax Pro" },
  { id: "8", name: "Revitalizador de Plásticos", category: "Outros", qty: 4, min: 3, cost: 28.0, supplier: "Vonixx" },
  { id: "9", name: "Descontaminante Ferroso", category: "Outros", qty: 0, min: 2, cost: 55.0, supplier: "Vonixx" },
  { id: "10", name: "Flanela Camurça Sintética", category: "Pano", qty: 15, min: 10, cost: 18.0, supplier: "Mandala" },
];

type Product = typeof INITIAL_PRODUCTS[0];

const getStatus = (qty: number, min: number) => {
  if (qty === 0) return "Crítico";
  if (qty <= min) return "Baixo";
  return "Normal";
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Normal: "bg-success/10 text-success border-success/20",
    Baixo: "bg-warning/10 text-warning border-warning/20",
    Crítico: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return <Badge variant="outline" className={map[status]}>{status}</Badge>;
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EstoquePage() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newOpen, setNewOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [movProduct, setMovProduct] = useState<Product | null>(null);

  // new product form
  const [fName, setFName] = useState("");
  const [fCat, setFCat] = useState("");
  const [fQty, setFQty] = useState("");
  const [fMin, setFMin] = useState("");
  const [fCost, setFCost] = useState("");
  const [fSupplier, setFSupplier] = useState("");

  // movement form
  const [movType, setMovType] = useState<"Entrada" | "Saída">("Entrada");
  const [movQty, setMovQty] = useState("");
  const [movReason, setMovReason] = useState("");
  const [movOS, setMovOS] = useState("");

  const criticalCount = products.filter(p => getStatus(p.qty, p.min) === "Crítico").length;

  const filtered = useMemo(() => {
    return products.filter(p => {
      const status = getStatus(p.qty, p.min);
      if (filterCat !== "all" && p.category !== filterCat) return false;
      if (filterStatus !== "all" && status !== filterStatus) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, filterCat, filterStatus]);

  const resetNew = () => { setFName(""); setFCat(""); setFQty(""); setFMin(""); setFCost(""); setFSupplier(""); };

  const saveNew = () => {
    setProducts(prev => [...prev, {
      id: String(Date.now()), name: fName, category: fCat, qty: Number(fQty),
      min: Number(fMin), cost: Number(fCost), supplier: fSupplier,
    }]);
    setNewOpen(false);
    resetNew();
  };

  const openMov = (p: Product) => {
    setMovProduct(p);
    setMovType("Entrada");
    setMovQty("");
    setMovReason("");
    setMovOS("");
    setMovOpen(true);
  };

  const saveMov = () => {
    if (!movProduct) return;
    const delta = movType === "Entrada" ? Number(movQty) : -Number(movQty);
    setProducts(prev => prev.map(p =>
      p.id === movProduct.id ? { ...p, qty: Math.max(0, p.qty + delta) } : p
    ));
    setMovOpen(false);
  };

  const showCritical = () => { setFilterStatus("Crítico"); setFilterCat("all"); setSearch(""); };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
              <p className="text-sm text-muted-foreground">Controle de produtos e insumos</p>
            </div>
          </div>
          <Button onClick={() => { resetNew(); setNewOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Novo produto
          </Button>
        </div>

        {/* Critical alert */}
        {criticalCount > 0 && (
          <button
            onClick={showCritical}
            className="flex w-full items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left transition-colors hover:bg-destructive/10"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {criticalCount} produto{criticalCount > 1 ? "s" : ""} com estoque crítico
            </p>
            <span className="ml-auto text-xs text-destructive/70 underline">Ver itens →</span>
          </button>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto…" className="pl-9" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Baixo">Baixo</SelectItem>
              <SelectItem value="Crítico">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-center">Mínimo</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const status = getStatus(p.qty, p.min);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{p.category}</Badge></TableCell>
                    <TableCell className="text-center font-mono">{p.qty}</TableCell>
                    <TableCell className="text-center text-muted-foreground font-mono">{p.min}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(p.cost)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.supplier}</TableCell>
                    <TableCell>{statusBadge(status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openMov(p)}>
                        <ArrowUpDown className="mr-1 h-3 w-3" /> Movimentar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ── Modal: Novo Produto ── */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={fName} onChange={e => setFName(e.target.value)} placeholder="Ex: Shampoo Neutro 1L" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={fCat} onValueChange={setFCat}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" value={fQty} onChange={e => setFQty(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estoque mínimo</Label>
                <Input type="number" value={fMin} onChange={e => setFMin(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Custo unitário (R$)</Label>
              <Input type="number" value={fCost} onChange={e => setFCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={fSupplier} onChange={e => setFSupplier(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={saveNew} disabled={!fName || !fCat}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Movimentação ── */}
      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Movimentação — {movProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button
                  variant={movType === "Entrada" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMovType("Entrada")}
                >
                  <ArrowDownToLine className="mr-1 h-4 w-4" /> Entrada
                </Button>
                <Button
                  variant={movType === "Saída" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMovType("Saída")}
                >
                  <ArrowUpFromLine className="mr-1 h-4 w-4" /> Saída
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" value={movQty} onChange={e => setMovQty(e.target.value)} />
              {movProduct && (
                <p className="text-xs text-muted-foreground">Estoque atual: {movProduct.qty}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea value={movReason} onChange={e => setMovReason(e.target.value)} placeholder="Ex: Compra fornecedor / Uso em OS" rows={2} />
            </div>
            {movType === "Saída" && (
              <div className="space-y-2">
                <Label>Vinculado a OS (opcional)</Label>
                <Input value={movOS} onChange={e => setMovOS(e.target.value)} placeholder="Nº da OS" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovOpen(false)}>Cancelar</Button>
            <Button onClick={saveMov} disabled={!movQty || Number(movQty) <= 0}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
