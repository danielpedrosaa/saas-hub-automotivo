import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useShopData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Services() {
  const { shopId } = useAuth();
  const { data: services, isLoading } = useServices();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setPrice("");
    setDuration("60");
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setName(s.name);
    setPrice(String(s.price));
    setDuration(String(s.duration_minutes));
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);

    try {
      if (editId) {
        const { error } = await supabase
          .from("services")
          .update({ name, price: Number(price), duration_minutes: Number(duration) })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert({
          shop_id: shopId,
          name,
          price: Number(price),
          duration_minutes: Number(duration),
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: editId ? "Serviço atualizado!" : "Serviço criado!" });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Serviço removido" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Serviços</h1>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-10 w-10">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-12 tabular-nums"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração (min)</Label>
                    <Input
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      type="number"
                      min="1"
                      className="h-12 tabular-nums"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="h-12 w-full font-bold uppercase tracking-wider">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : services?.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum serviço cadastrado
          </p>
        ) : (
          <div className="space-y-3">
            {services?.map((s) => (
              <Card key={s.id} className="border-border bg-secondary">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="tabular-nums">R$ {Number(s.price).toFixed(2)}</span>
                      {" • "}
                      {s.duration_minutes} min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-10 w-10">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-10 w-10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
