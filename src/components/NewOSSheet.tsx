import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices, useCustomers, useVehicles } from "@/hooks/useShopData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Check, ClipboardCheck, Car as CarIcon,
  Percent, Search, Plus, X, ImagePlus, Camera,
  ChevronDown, ChevronUp, ArrowLeft, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CarDiagram, { type VisualMarker } from "@/components/checklist/CarDiagram";
import { cn } from "@/lib/utils";

interface SelectedService {
  service_id: string;
  service_name: string;
  price: number;
}

const TOTAL_STEPS = 4;
const STEP_LABELS = ["Cliente & Veículo", "Serviços", "Checklist", "Resumo & Confirmação"];

// ── Progress bar ───────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1 h-1 w-full">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 h-full rounded-full transition-colors duration-300",
            i + 1 <= current ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1 — Cliente & Veículo
// ═══════════════════════════════════════════════════════════════════════════
function StepClienteVeiculo({
  customerId, setCustomerId,
  vehicleId, setVehicleId,
  shopId,
}: {
  customerId: string; setCustomerId: (v: string) => void;
  vehicleId: string; setVehicleId: (v: string) => void;
  shopId: string;
}) {
  const { data: customers } = useCustomers();
  const { data: customerVehicles } = useVehicles(customerId || undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [customerSearch, setCustomerSearch] = useState("");

  // New customer inline form
  const [showNewCust, setShowNewCust]       = useState(false);
  const [newCustName, setNewCustName]       = useState("");
  const [newCustWhatsapp, setNewCustWhatsapp] = useState("");
  const [newCustEmail, setNewCustEmail]     = useState("");
  const [newCustCnpj, setNewCustCnpj]       = useState("");
  const [newCustNotes, setNewCustNotes]     = useState("");
  const [extraFields, setExtraFields]       = useState<Set<string>>(new Set());
  const [creatingCust, setCreatingCust]     = useState(false);

  // New vehicle inline form
  const [showNewVeh, setShowNewVeh]     = useState(false);
  const [newVehPlate, setNewVehPlate]   = useState("");
  const [newVehModel, setNewVehModel]   = useState("");
  const [newVehColor, setNewVehColor]   = useState("");
  const [newVehYear, setNewVehYear]     = useState("");
  const [newVehNotes, setNewVehNotes]   = useState("");
  const [creatingVeh, setCreatingVeh]   = useState(false);

  const selectedCustomer = customers?.find(c => c.id === customerId);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || (c.whatsapp?.includes(q))
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const toggleExtra = (field: string) => {
    setExtraFields(prev => {
      const next = new Set(prev);
      next.has(field) ? next.delete(field) : next.add(field);
      return next;
    });
  };

  const handleCreateCustomer = async () => {
    if (!newCustName.trim()) return;
    setCreatingCust(true);
    try {
      const { data, error } = await supabase.from("customers").insert({
        shop_id: shopId,
        name: newCustName.trim(),
        whatsapp: newCustWhatsapp.trim() || null,
        email: newCustEmail.trim() || null,
        cnpj: newCustCnpj.trim() || null,
        notes: newCustNotes.trim() || null,
      }).select().single();
      if (error) throw error;
      toast({ title: "✅ Cliente criado!" });
      setCustomerId(data.id);
      setVehicleId("");
      setShowNewCust(false);
      setNewCustName(""); setNewCustWhatsapp(""); setNewCustEmail("");
      setNewCustCnpj(""); setNewCustNotes(""); setExtraFields(new Set());
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setCreatingCust(false);
  };

  const handleCreateVehicle = async () => {
    if (!newVehPlate.trim() || !newVehModel.trim() || !customerId) return;
    setCreatingVeh(true);
    try {
      const { data, error } = await supabase.from("vehicles").insert({
        shop_id: shopId,
        customer_id: customerId,
        plate: newVehPlate.trim().toUpperCase(),
        model: newVehModel.trim(),
        color: newVehColor.trim() || null,
        year: newVehYear ? newVehYear.trim() : null,
        observations: newVehNotes.trim() || null,
      }).select().single();
      if (error) throw error;
      toast({ title: "✅ Veículo cadastrado!" });
      setVehicleId(data.id);
      setShowNewVeh(false);
      setNewVehPlate(""); setNewVehModel(""); setNewVehColor("");
      setNewVehYear(""); setNewVehNotes("");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setCreatingVeh(false);
  };

  return (
    <div className="space-y-5">

      {/* ── CLIENTE ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">1. Cliente</p>
          {!customerId && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 border-border hover:border-primary/40"
              onClick={() => setShowNewCust(v => !v)}
            >
              <Plus className="h-3 w-3" />
              {showNewCust ? "Cancelar" : "Novo cliente"}
            </Button>
          )}
        </div>

        {/* Selected customer chip */}
        {customerId && selectedCustomer ? (
          <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-xl px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <span className="font-bold text-sm text-primary">{selectedCustomer.name.substring(0, 1).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selectedCustomer.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{selectedCustomer.whatsapp || selectedCustomer.phone || "Sem contato"}</p>
            </div>
            <Button
              size="sm" variant="ghost"
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2"
              onClick={() => { setCustomerId(""); setVehicleId(""); }}
            >
              Trocar
            </Button>
          </div>
        ) : showNewCust ? (
          /* ── Inline new customer form ── */
          <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Nome *</Label>
                <Input value={newCustName} onChange={e => setNewCustName(e.target.value)} placeholder="João Silva" autoFocus className="h-9 text-sm" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">WhatsApp *</Label>
                <Input value={newCustWhatsapp} onChange={e => setNewCustWhatsapp(e.target.value)} placeholder="(11) 99999-0000" type="tel" className="h-9 text-sm" />
              </div>
            </div>

            {/* Optional extra fields */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "email",  label: "+ E-mail" },
                { key: "cnpj",   label: "+ CNPJ" },
                { key: "notes",  label: "+ Observações" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => toggleExtra(f.key)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                    extraFields.has(f.key)
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {extraFields.has(f.key) ? f.label.replace("+", "−") : f.label}
                </button>
              ))}
            </div>

            {extraFields.has("email") && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <Input value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)} placeholder="cliente@email.com" className="h-9 text-sm" />
              </div>
            )}
            {extraFields.has("cnpj") && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CNPJ</Label>
                <Input value={newCustCnpj} onChange={e => setNewCustCnpj(e.target.value)} placeholder="00.000.000/0001-00" className="h-9 text-sm" />
              </div>
            )}
            {extraFields.has("notes") && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <Textarea value={newCustNotes} onChange={e => setNewCustNotes(e.target.value)} placeholder="Anotações sobre o cliente..." className="text-sm min-h-[60px] resize-none" />
              </div>
            )}

            <Button
              onClick={handleCreateCustomer}
              disabled={!newCustName.trim() || !newCustWhatsapp.trim() || creatingCust}
              className="w-full h-9 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 rounded-lg gap-1.5"
            >
              {creatingCust ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Adicionar cliente
            </Button>
          </div>
        ) : (
          /* ── Search ── */
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou WhatsApp..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-card"
              />
            </div>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-0.5">
              {filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCustomerId(c.id); setVehicleId(""); setCustomerSearch(""); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-secondary">
                    <span className="font-bold text-xs text-foreground">{c.name.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.whatsapp || c.phone || "Sem contato"}</p>
                  </div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum cliente encontrado.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── VEÍCULO ── */}
      {customerId && (
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">2. Veículo</p>
            {!showNewVeh && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-[11px] gap-1 border-border hover:border-primary/40"
                onClick={() => setShowNewVeh(true)}
              >
                <Plus className="h-3 w-3" /> Novo veículo
              </Button>
            )}
          </div>

          {showNewVeh ? (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Placa *</Label>
                  <Input value={newVehPlate} onChange={e => setNewVehPlate(e.target.value.toUpperCase())} placeholder="ABC-1234" autoFocus className="h-9 text-sm font-mono uppercase" maxLength={8} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Modelo *</Label>
                  <Input value={newVehModel} onChange={e => setNewVehModel(e.target.value)} placeholder="Honda Civic" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cor</Label>
                  <Input value={newVehColor} onChange={e => setNewVehColor(e.target.value)} placeholder="Preto" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ano</Label>
                  <Input value={newVehYear} onChange={e => setNewVehYear(e.target.value)} placeholder="2022" type="number" className="h-9 text-sm" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <Textarea value={newVehNotes} onChange={e => setNewVehNotes(e.target.value)} placeholder="Detalhes extras..." className="text-sm min-h-[55px] resize-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9 flex-1 text-xs" onClick={() => setShowNewVeh(false)}>Cancelar</Button>
                <Button
                  onClick={handleCreateVehicle}
                  disabled={!newVehPlate.trim() || !newVehModel.trim() || creatingVeh}
                  className="h-9 flex-1 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 rounded-lg gap-1.5"
                >
                  {creatingVeh ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Adicionar veículo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {customerVehicles && customerVehicles.length > 0 ? customerVehicles.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVehicleId(v.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors text-left",
                    vehicleId === v.id
                      ? "border-primary bg-primary/8"
                      : "border-border hover:border-primary/40 hover:bg-card"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                    vehicleId === v.id ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}>
                    {vehicleId === v.id && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-sm uppercase tracking-wider text-foreground">{v.plate}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{v.model}</p>
                  </div>
                </button>
              )) : (
                <div className="flex flex-col items-center py-5 gap-2 border border-dashed border-border rounded-xl">
                  <CarIcon className="h-6 w-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Nenhum veículo cadastrado para este cliente.</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowNewVeh(true)}>
                    <Plus className="h-3 w-3" /> Cadastrar veículo
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2 — Serviços
// ═══════════════════════════════════════════════════════════════════════════
function StepServicos({
  selectedServices, setSelectedServices, discount, setDiscount,
}: {
  selectedServices: SelectedService[];
  setSelectedServices: React.Dispatch<React.SetStateAction<SelectedService[]>>;
  discount: number;
  setDiscount: (v: number) => void;
}) {
  const { data: services } = useServices();
  const [showAvulso, setShowAvulso] = useState(false);
  const [avulsoName, setAvulsoName] = useState("");
  const [avulsoPrice, setAvulsoPrice] = useState("");

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const finalPrice = Math.max(0, totalPrice - discount);

  const toggleService = (svc: { id: string; name: string; price: number }) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.service_id === svc.id);
      if (exists) return prev.filter(s => s.service_id !== svc.id);
      return [...prev, { service_id: svc.id, service_name: svc.name, price: svc.price }];
    });
  };

  const updatePrice = (id: string, price: number) =>
    setSelectedServices(prev => prev.map(s => s.service_id === id ? { ...s, price } : s));

  const addAvulso = () => {
    if (!avulsoName.trim() || !avulsoPrice) return;
    setSelectedServices(prev => [...prev, {
      service_id: `custom-${crypto.randomUUID()}`,
      service_name: avulsoName.trim(),
      price: Number(avulsoPrice),
    }]);
    setAvulsoName(""); setAvulsoPrice(""); setShowAvulso(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Serviços</p>
        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-border hover:border-primary/40" onClick={() => setShowAvulso(v => !v)}>
          <Plus className="h-3 w-3" /> Avulso
        </Button>
      </div>

      {showAvulso && (
        <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
          <Input value={avulsoName} onChange={e => setAvulsoName(e.target.value)} placeholder="Nome do serviço" className="h-9 text-sm" autoFocus />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">R$</span>
              <Input value={avulsoPrice} onChange={e => setAvulsoPrice(e.target.value)} type="number" placeholder="0.00" className="h-9 pl-9 text-sm font-mono" />
            </div>
            <Button size="sm" onClick={addAvulso} disabled={!avulsoName.trim() || !avulsoPrice} className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 px-4">Adicionar</Button>
          </div>
        </div>
      )}

      {/* Custom services */}
      {selectedServices.filter(s => s.service_id.startsWith("custom")).map(s => (
        <div key={s.service_id} className="border-2 border-primary bg-primary/5 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{s.service_name}</span>
            <Badge className="bg-primary/15 text-primary border-0 text-[10px]">Avulso</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">R$</Label>
            <Input type="number" step="0.01" value={s.price} onChange={e => updatePrice(s.service_id, Number(e.target.value))} className="h-8 w-32 text-sm font-mono" />
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setSelectedServices(prev => prev.filter(x => x.service_id !== s.service_id))}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* Catalog services */}
      <div className="space-y-2">
        {services?.filter(s => s.active).map(svc => {
          const sel = selectedServices.find(s => s.service_id === svc.id);
          return (
            <div
              key={svc.id}
              className={cn(
                "border-2 rounded-xl p-3 transition-colors cursor-pointer",
                sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              )}
              onClick={() => toggleService(svc)}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={!!sel} onCheckedChange={() => toggleService(svc)} className="h-4 w-4 mt-0.5 shrink-0" onClick={e => e.stopPropagation()} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                  <p className="text-[11px] text-muted-foreground">R$ {Number(svc.price).toFixed(2)} · {svc.duration_minutes} min</p>
                </div>
              </div>
              {sel && (
                <div className="flex items-center gap-2 mt-2 pl-7" onClick={e => e.stopPropagation()}>
                  <Label className="text-[11px] text-muted-foreground shrink-0">Preço:</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input type="number" step="0.01" value={sel.price} onChange={e => updatePrice(svc.id, Number(e.target.value))} className="h-8 pl-8 w-28 text-sm font-mono" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals */}
      {selectedServices.length > 0 && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono font-bold">R$ {totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm text-destructive flex items-center gap-1.5 shrink-0"><Percent className="h-3.5 w-3.5" /> Desconto</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-destructive">R$</span>
              <Input type="number" step="0.01" min="0" max={totalPrice} value={discount} onChange={e => setDiscount(Math.min(Number(e.target.value), totalPrice))} className="h-9 pl-8 w-28 text-sm font-mono text-destructive" />
            </div>
          </div>
          <div className="flex justify-between items-center bg-primary/10 p-3 rounded-xl border border-primary/20">
            <span className="font-bold text-sm uppercase tracking-wider text-foreground">Total líquido</span>
            <span className="text-xl font-black font-mono text-primary">R$ {finalPrice.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3 — Checklist & Fotos
// ═══════════════════════════════════════════════════════════════════════════
function StepChecklist({
  visualMarkers, setVisualMarkers,
  photos, setPhotos,
}: {
  visualMarkers: VisualMarker[];
  setVisualMarkers: React.Dispatch<React.SetStateAction<VisualMarker[]>>;
  photos: File[];
  setPhotos: React.Dispatch<React.SetStateAction<File[]>>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...files].slice(0, 6));
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5" /> Mapeamento de danos
        </p>
        <p className="text-[11px] text-muted-foreground">Clique no diagrama para marcar avarias existentes.</p>
        <div className="rounded-xl border border-border bg-card p-3">
          <CarDiagram
            markers={visualMarkers}
            onAddMarker={m => setVisualMarkers(prev => [...prev, m])}
            onRemoveMarker={id => setVisualMarkers(prev => prev.filter(m => m.id !== id))}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Fotos do veículo *
          </p>
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{photos.length}/6</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((file, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
              <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" alt="preview" />
              <button
                onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-destructive/90 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Foto</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4 — Resumo & Confirmação
// ═══════════════════════════════════════════════════════════════════════════
function StepResumo({
  selectedCustomer, selectedVehicle, selectedServices,
  discount, paymentMethod, setPaymentMethod,
  notes, setNotes, internalNotes, setInternalNotes,
}: {
  selectedCustomer: any; selectedVehicle: any;
  selectedServices: SelectedService[]; discount: number;
  paymentMethod: string; setPaymentMethod: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  internalNotes: string; setInternalNotes: (v: string) => void;
}) {
  const totalPrice = selectedServices.reduce((s, x) => s + x.price, 0);
  const finalPrice = Math.max(0, totalPrice - discount);

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Resumo da OS</p>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-lg tracking-wider text-foreground">{selectedVehicle?.plate}</span>
            <Badge className="bg-primary/15 text-primary border-0 text-[10px]">{selectedCustomer?.name}</Badge>
          </div>
        </div>
        <div className="p-4 space-y-2.5">
          {selectedServices.map(s => (
            <div key={s.service_id} className="flex justify-between text-sm">
              <span className="text-foreground">{s.service_name}</span>
              <span className="font-mono text-muted-foreground">R$ {s.price.toFixed(2)}</span>
            </div>
          ))}
          {discount > 0 && (
            <div className="flex justify-between text-sm text-destructive border-t border-border/50 pt-2">
              <span>Desconto</span>
              <span className="font-mono">− R$ {discount.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="px-4 py-3 bg-primary/8 border-t border-primary/15 flex justify-between items-center">
          <span className="font-bold text-sm text-foreground uppercase tracking-wider">Total</span>
          <span className="text-2xl font-black font-mono text-primary">R$ {finalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Forma de pagamento</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="h-10 rounded-xl bg-card border-border">
            <SelectValue placeholder="Selecionar método..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="Pix">Pix via Chave/QR Code</SelectItem>
            <SelectItem value="Débito">Cartão de Débito</SelectItem>
            <SelectItem value="Crédito">Cartão de Crédito</SelectItem>
            <SelectItem value="Dinheiro">Dinheiro Espécie</SelectItem>
            <SelectItem value="A Receber">A Receber</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Observações gerais</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condições combinadas, prazo extra..." className="text-sm min-h-[70px] resize-none rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Observações internas</Label>
        <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Somente visível para a equipe..." className="text-sm min-h-[60px] resize-none rounded-xl" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN: NewOSSheet
// ═══════════════════════════════════════════════════════════════════════════
interface NewOSSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function NewOSSheet({ open, onClose }: NewOSSheetProps) {
  const { shopId, user } = useAuth();
  const { data: customers } = useCustomers();
  const { data: customerVehicles } = useVehicles(undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  // Step 2
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [discount, setDiscount] = useState(0);

  // Step 3
  const [visualMarkers, setVisualMarkers] = useState<VisualMarker[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

  // Step 4
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Derived
  const selectedCustomer = customers?.find(c => c.id === customerId);

  // We need customer vehicles — grab them using same hook pattern
  const { data: cvList } = useVehicles(customerId || undefined);
  const selectedVehicle = cvList?.find(v => v.id === vehicleId);

  const totalPrice = selectedServices.reduce((s, x) => s + x.price, 0);
  const finalPrice = Math.max(0, totalPrice - discount);

  const canAdvance = () => {
    if (step === 1) return !!customerId && !!vehicleId;
    if (step === 2) return selectedServices.length > 0;
    if (step === 3) return photos.length > 0;
    if (step === 4) return !!paymentMethod;
    return false;
  };

  const resetAll = () => {
    setStep(1);
    setCustomerId(""); setVehicleId("");
    setSelectedServices([]); setDiscount(0);
    setVisualMarkers([]); setPhotos([]);
    setPaymentMethod(""); setNotes(""); setInternalNotes("");
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleSubmit = async () => {
    if (!shopId || !user) return;
    if (photos.length === 0) {
      toast({ title: "Falta foto", description: "É necessário ao menos uma foto do veículo.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create job
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          shop_id: shopId,
          vehicle_id: vehicleId,
          total_price: finalPrice,
          discount,
          notes: notes.trim() || null,
          internal_notes: internalNotes.trim() || null,
          payment_method: paymentMethod,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (jobErr) throw jobErr;

      // 2. job_services
      const jobServices = selectedServices.map(s => ({
        job_id: job.id,
        service_id: s.service_id.startsWith("custom") ? null : s.service_id,
        service_name: s.service_name,
        price: s.price,
      }));
      if (jobServices.length > 0) {
        const { error: jsErr } = await supabase.from("job_services").insert(jobServices);
        if (jsErr) throw jsErr;
      }

      // 3. Checklist markers
      if (visualMarkers.length > 0) {
        const checklistRows = visualMarkers.map(m => ({
          job_id: job.id,
          item_type: "visual" as const,
          label: m.label,
          position_x: m.x,
          position_y: m.y,
          car_view: m.view,
        }));
        const { error: clErr } = await supabase.from("job_checklist").insert(checklistRows);
        if (clErr) throw clErr;
      }

      // 4. Upload photos
      for (const file of photos) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${job.id}/before/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("job-photos").upload(path, file);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(path);
          await supabase.from("job_photos").insert({ job_id: job.id, photo_url: urlData.publicUrl, photo_type: "before" });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "✅ OS criada com sucesso!" });
      handleClose();
    } catch (err: any) {
      toast({ title: "Erro na finalização", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!shopId) return null;

  return (
    <Sheet open={open} onOpenChange={open => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] sm:max-w-[480px] p-0 flex flex-col bg-background border-l border-border"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-primary/40 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div className="flex-1">
              <SheetTitle className="text-base font-bold text-foreground">Nova OS</SheetTitle>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-widest mt-0.5">
                Etapa {step} de {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
              </p>
            </div>
          </div>
          <ProgressBar current={step} total={TOTAL_STEPS} />
        </SheetHeader>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
            >
              {step === 1 && (
                <StepClienteVeiculo
                  customerId={customerId} setCustomerId={setCustomerId}
                  vehicleId={vehicleId} setVehicleId={setVehicleId}
                  shopId={shopId}
                />
              )}
              {step === 2 && (
                <StepServicos
                  selectedServices={selectedServices}
                  setSelectedServices={setSelectedServices}
                  discount={discount}
                  setDiscount={setDiscount}
                />
              )}
              {step === 3 && (
                <StepChecklist
                  visualMarkers={visualMarkers} setVisualMarkers={setVisualMarkers}
                  photos={photos} setPhotos={setPhotos}
                />
              )}
              {step === 4 && (
                <StepResumo
                  selectedCustomer={selectedCustomer}
                  selectedVehicle={selectedVehicle}
                  selectedServices={selectedServices}
                  discount={discount}
                  paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                  notes={notes} setNotes={setNotes}
                  internalNotes={internalNotes} setInternalNotes={setInternalNotes}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer — action button */}
        <div className="px-5 pb-5 pt-3 border-t border-border shrink-0">
          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="w-full h-11 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 rounded-xl gap-2"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canAdvance() || submitting}
              className="w-full h-11 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 rounded-xl gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? "Criando OS..." : "Criar OS"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
