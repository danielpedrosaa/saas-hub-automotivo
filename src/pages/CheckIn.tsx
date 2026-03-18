import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useServices, useCustomers } from "@/hooks/useShopData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function CheckIn() {
  const { shopId, user } = useAuth();
  const { data: services } = useServices();
  const { data: customers } = useCustomers();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !user) return;
    setSubmitting(true);

    try {
      // Create or select customer
      let finalCustomerId = customerId || null;
      if (!customerId && customerName) {
        const { data: newCust, error: custErr } = await supabase
          .from("customers")
          .insert({ shop_id: shopId, name: customerName, phone: customerPhone || null })
          .select("id")
          .single();
        if (custErr) throw custErr;
        finalCustomerId = newCust.id;
      }

      // Create vehicle
      const { data: vehicle, error: vehErr } = await supabase
        .from("vehicles")
        .insert({
          shop_id: shopId,
          plate: plate.toUpperCase(),
          model: model || null,
          customer_id: finalCustomerId,
        })
        .select("id")
        .single();
      if (vehErr) throw vehErr;

      // Create job
      const { error: jobErr } = await supabase.from("jobs").insert({
        shop_id: shopId,
        vehicle_id: vehicle.id,
        service_id: serviceId || null,
        notes: notes || null,
        created_by: user.id,
      });
      if (jobErr) throw jobErr;

      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Check-in realizado!" });
      navigate("/jobs");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Novo Check-in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Placa *</Label>
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="ABC1D23"
              className="h-12 font-mono text-xl uppercase tracking-widest"
              maxLength={7}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ex: Civic 2022"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Novo cliente</SelectItem>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {customerId === "new" && (
            <div className="space-y-3 rounded-md border border-border bg-card p-3">
              <div className="space-y-2">
                <Label>Nome do cliente</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-12"
                  type="tel"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecionar serviço" />
              </SelectTrigger>
              <SelectContent>
                {services?.filter((s) => s.active).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — R$ {Number(s.price).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="min-h-[80px]"
            />
          </div>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              type="submit"
              disabled={submitting}
              className="h-14 w-full text-sm font-bold uppercase tracking-wider"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrar Check-in"}
            </Button>
          </motion.div>
        </form>
      </div>
    </AppLayout>
  );
}
