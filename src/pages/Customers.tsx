import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomers } from "@/hooks/useShopData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Search, Phone, MessageCircle, Mail, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function Customers() {
  const { shopId } = useAuth();
  const { data: customers, isLoading } = useCustomers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setName(c.name);
    setPhone(c.phone || "");
    setWhatsapp(c.whatsapp || "");
    setEmail(c.email || "");
    setOpen(true);
  };

  const filtered = customers?.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.whatsapp && c.whatsapp.includes(q))
    );
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim() || null;
    const trimmedWhatsapp = whatsapp.trim() || null;
    const trimmedEmail = email.trim() || null;

    if (!trimmedName || trimmedName.length > 100) {
      toast({ title: "Erro", description: "Nome inválido (máx 100 caracteres)", variant: "destructive" });
      setSaving(false);
      return;
    }

    try {
      if (editId) {
        const { error } = await supabase
          .from("customers")
          .update({ name: trimmedName, phone: trimmedPhone, whatsapp: trimmedWhatsapp, email: trimmedEmail })
          .eq("id", editId);
        if (error) throw error;
        toast({ title: "Cliente atualizado!" });
      } else {
        const { error } = await supabase.from("customers").insert({
          shop_id: shopId,
          name: trimmedName,
          phone: trimmedPhone,
          whatsapp: trimmedWhatsapp,
          email: trimmedEmail,
        });
        if (error) throw error;
        toast({ title: "Cliente cadastrado!" });
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
          <h1 className="text-xl font-bold">Clientes</h1>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-10 w-10">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" maxLength={100} required />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" type="tel" placeholder="(11) 1234-5678" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="h-12" type="tel" placeholder="(11) 91234-5678" />
                </div>
                <div className="space-y-2">
                  <Label>Email (opcional)</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" type="email" placeholder="cliente@email.com" />
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
            placeholder="Buscar por nome ou telefone..."
            className="h-12 pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users className="h-10 w-10" />
            <p className="text-sm">
              {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered?.map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                <Card className="border-border bg-secondary">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{c.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </span>
                        )}
                        {(c as any).whatsapp && (
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {(c as any).whatsapp}
                          </span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {c.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-10 w-10 shrink-0">
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
