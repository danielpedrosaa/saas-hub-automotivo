import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useVehicles, useCustomers } from "@/hooks/useShopData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Search, Car, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Vehicles() {
  const { shopId } = useAuth();
  const { data: vehicles, isLoading } = useVehicles();
  const { data: customers } = useCustomers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [observations, setObservations] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setPlate("");
    setModel("");
    setColor("");
    setObservations("");
    setCustomerId("");
  };

  const openEdit = (v: any) => {
    setEditId(v.id);
    setPlate(v.plate);
    setModel(v.model || "");
    setColor(v.color || "");
    setObservations(v.observations || "");
    setCustomerId(v.customer_id || "");
    setOpen(true);
  };

  const filtered = vehicles?.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.plate.toLowerCase().includes(q) ||
      (v.model && v.model.toLowerCase().includes(q)) ||
      ((v as any).customers?.name && (v as any).customers.name.toLowerCase().includes(q))
    );
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);

    const trimmedPlate = plate.trim().toUpperCase();
    if (!trimmedPlate || trimmedPlate.length > 10) {
      toast({ title: "Erro", description: "Placa inválida", variant: "destructive" });
      setSaving(false);
      return;
    }

    try {
      const payload = {
        plate: trimmedPlate,
        model: model.trim() || null,
        color: color.trim() || null,
        observations: observations.trim() || null,
        customer_id: customerId || null,
      };

      if (editId) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", editId);
        if (error) throw error;
        toast({ title: "Veículo atualizado!" });
      } else {
        const { error } = await supabase.from("vehicles").insert({ ...payload, shop_id: shopId });
        if (error) throw error;
        toast({ title: "Veículo cadastrado!" });
      }
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Veículos</h1>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-10 w-10">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Placa *</Label>
                  <Input
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="h-12 font-mono text-lg uppercase tracking-widest"
                    maxLength={10}
                    placeholder="ABC1D23"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input value={model} onChange={(e) => setModel(e.target.value)} className="h-12" placeholder="Civic 2022" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-12" placeholder="Preto" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Proprietário</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem vínculo</SelectItem>
                      {customers?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    className="min-h-[80px]"
                    maxLength={500}
                  />
                </div>
                <Button type="submit" disabled={saving} className="h-12 w-full font-bold uppercase tracking-wider">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa, modelo ou cliente..."
            className="h-12 pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Car className="h-10 w-10" />
            <p className="text-sm">{search ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered?.map((v) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                <Card className="border-border bg-secondary">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-mono text-xl font-bold uppercase tracking-wider text-foreground">
                        {v.plate}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[v.model, (v as any).color].filter(Boolean).join(" • ") || "—"}
                      </p>
                      {(v as any).customers?.name && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <User className="h-3 w-3" /> {(v as any).customers.name}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)} className="h-10 w-10 shrink-0">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
