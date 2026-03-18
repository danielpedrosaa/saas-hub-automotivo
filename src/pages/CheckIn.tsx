import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useServices, useCustomers, useVehicles } from "@/hooks/useShopData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Loader2, Check, ClipboardCheck, Car as CarIcon, Percent, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CarDiagram, { type VisualMarker } from "@/components/checklist/CarDiagram";
import StructuredChecklist, {
  type ChecklistItem,
  createInitialChecklist,
} from "@/components/checklist/StructuredChecklist";

interface SelectedService {
  service_id: string;
  service_name: string;
  price: number;
}

const TOTAL_STEPS = 5;

export default function CheckIn() {
  const { shopId, user } = useAuth();
  const { data: services } = useServices();
  const { data: customers } = useCustomers();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Checklist state
  const [visualMarkers, setVisualMarkers] = useState<VisualMarker[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(createInitialChecklist);

  const { data: customerVehicles } = useVehicles(customerId || undefined);

  const selectedCustomer = customers?.find((c) => c.id === customerId);
  const selectedVehicle = customerVehicles?.find((v) => v.id === vehicleId);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const finalPrice = Math.max(0, totalPrice - discount);

  const toggleService = (svc: { id: string; name: string; price: number }) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.service_id === svc.id);
      if (exists) return prev.filter((s) => s.service_id !== svc.id);
      return [...prev, { service_id: svc.id, service_name: svc.name, price: svc.price }];
    });
  };

  const updateServicePrice = (serviceId: string, newPrice: number) => {
    setSelectedServices((prev) =>
      prev.map((s) => (s.service_id === serviceId ? { ...s, price: newPrice } : s))
    );
  };

  const addVisualMarker = (marker: VisualMarker) => {
    setVisualMarkers((prev) => [...prev, marker]);
  };

  const removeVisualMarker = (id: string) => {
    setVisualMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return !!customerId;
      case 2: return !!vehicleId;
      case 3: return true; // checklist is optional
      case 4: return selectedServices.length > 0;
      case 5: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!shopId || !user) return;
    setSubmitting(true);

    try {
      // Create job
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          shop_id: shopId,
          vehicle_id: vehicleId,
          total_price: finalPrice,
          discount: discount,
          notes: notes.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (jobErr) throw jobErr;

      // Insert job_services
      const jobServices = selectedServices.map((s) => ({
        job_id: job.id,
        service_id: s.service_id,
        service_name: s.service_name,
        price: s.price,
      }));
      const { error: jsErr } = await supabase.from("job_services").insert(jobServices);
      if (jsErr) throw jsErr;

      // Insert checklist items (visual markers + structured items that are checked)
      const checklistRows = [
        ...visualMarkers.map((m) => ({
          job_id: job.id,
          item_type: "visual" as const,
          label: m.label,
          position_x: m.x,
          position_y: m.y,
          car_view: m.view,
          notes: null,
        })),
        ...checklistItems
          .filter((item) => item.checked)
          .map((item) => ({
            job_id: job.id,
            item_type: "structured" as const,
            label: item.label,
            notes: item.notes.trim() || null,
            position_x: null,
            position_y: null,
            car_view: null,
          })),
      ];

      if (checklistRows.length > 0) {
        const { error: clErr } = await supabase.from("job_checklist").insert(checklistRows);
        if (clErr) throw clErr;
      }

      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "OS criada com sucesso!" });
      navigate("/jobs");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ["Cliente", "Veículo", "Checklist", "Serviços", "Resumo"];

  const checkedStructuredCount = checklistItems.filter((i) => i.checked).length;
  const totalChecklistCount = visualMarkers.length + checkedStructuredCount;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Nova OS</h1>
            <p className="text-xs text-muted-foreground">
              Passo {step} de {TOTAL_STEPS} — {stepTitles[step - 1]}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
          >
            {/* STEP 1: Select customer */}
            {step === 1 && (
              <div className="space-y-3">
                <Label>Selecione o cliente</Label>
                {customers?.map((c) => (
                  <Card
                    key={c.id}
                    className={`cursor-pointer border-2 transition-colors ${
                      customerId === c.id ? "border-primary bg-primary/10" : "border-border bg-secondary"
                    }`}
                    onClick={() => { setCustomerId(c.id); setVehicleId(""); }}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        customerId === c.id ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {customerId === c.id && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!customers || customers.length === 0) && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum cliente cadastrado. Cadastre um cliente primeiro.
                  </p>
                )}
              </div>
            )}

            {/* STEP 2: Select vehicle */}
            {step === 2 && (
              <div className="space-y-3">
                <Label>Veículos de {selectedCustomer?.name}</Label>
                {customerVehicles?.map((v) => (
                  <Card
                    key={v.id}
                    className={`cursor-pointer border-2 transition-colors ${
                      vehicleId === v.id ? "border-primary bg-primary/10" : "border-border bg-secondary"
                    }`}
                    onClick={() => setVehicleId(v.id)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        vehicleId === v.id ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {vehicleId === v.id && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <p className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
                          {v.plate}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[v.model, (v as any).color].filter(Boolean).join(" • ") || "—"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!customerVehicles || customerVehicles.length === 0) && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum veículo cadastrado para este cliente.
                  </p>
                )}
              </div>
            )}

            {/* STEP 3: Vehicle checklist */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    Checklist do veículo
                  </Label>
                  {totalChecklistCount > 0 && (
                    <span className="text-xs text-destructive font-medium">
                      {totalChecklistCount} {totalChecklistCount === 1 ? "problema" : "problemas"}
                    </span>
                  )}
                </div>

                <Tabs defaultValue="visual" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="visual" className="text-xs">
                      <CarIcon className="mr-1.5 h-3.5 w-3.5" />
                      Diagrama
                      {visualMarkers.length > 0 && (
                        <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                          {visualMarkers.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="list" className="text-xs">
                      <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                      Lista
                      {checkedStructuredCount > 0 && (
                        <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                          {checkedStructuredCount}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="visual" className="mt-3">
                    <CarDiagram
                      markers={visualMarkers}
                      onAddMarker={addVisualMarker}
                      onRemoveMarker={removeVisualMarker}
                    />
                  </TabsContent>
                  <TabsContent value="list" className="mt-3">
                    <StructuredChecklist
                      items={checklistItems}
                      onChange={setChecklistItems}
                    />
                  </TabsContent>
                </Tabs>

                <p className="text-xs text-muted-foreground text-center">
                  Opcional — você pode pular se não houver problemas
                </p>
              </div>
            )}

            {/* STEP 4: Select services + edit prices */}
            {step === 4 && (
              <div className="space-y-3">
                <Label>Selecione os serviços</Label>
                {services?.filter((s) => s.active).map((svc) => {
                  const selected = selectedServices.find((s) => s.service_id === svc.id);
                  return (
                    <Card
                      key={svc.id}
                      className={`border-2 transition-colors ${
                        selected ? "border-primary bg-primary/10" : "border-border bg-secondary"
                      }`}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => toggleService(svc)}
                        >
                          <Checkbox
                            checked={!!selected}
                            className="h-5 w-5"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{svc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Padrão: R$ {Number(svc.price).toFixed(2)} • {svc.duration_minutes} min
                            </p>
                          </div>
                        </div>
                        {selected && (
                          <div className="flex items-center gap-2 pl-8">
                            <Label className="text-xs shrink-0">Preço:</Label>
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={selected.price}
                                onChange={(e) => updateServicePrice(svc.id, Number(e.target.value))}
                                className="h-10 pl-10 tabular-nums text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {selectedServices.length > 0 && (
                  <div className="flex justify-between rounded-md bg-muted p-3">
                    <span className="text-sm font-semibold text-foreground">Total</span>
                    <span className="text-lg font-bold tabular-nums text-primary">
                      R$ {totalPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: Summary + notes */}
            {step === 5 && (
              <div className="space-y-4">
                <Card className="border-border bg-secondary">
                  <CardContent className="space-y-3 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-semibold text-foreground">{selectedCustomer?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Veículo</p>
                      <p className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
                        {selectedVehicle?.plate}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[selectedVehicle?.model, (selectedVehicle as any)?.color].filter(Boolean).join(" • ")}
                      </p>
                    </div>

                    {/* Checklist summary */}
                    {totalChecklistCount > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Checklist</p>
                        <p className="text-sm text-destructive font-medium">
                          {totalChecklistCount} {totalChecklistCount === 1 ? "problema registrado" : "problemas registrados"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {visualMarkers.map((m) => (
                            <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">
                              <span className="h-1 w-1 rounded-full bg-destructive" />
                              {m.label} ({m.view === "top" ? "topo" : m.view === "left_side" ? "esq." : "dir."})
                            </span>
                          ))}
                          {checklistItems.filter((i) => i.checked).map((i) => (
                            <span key={i.id} className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">
                              <span className="h-1 w-1 rounded-full bg-destructive" />
                              {i.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted-foreground">Serviços</p>
                      {selectedServices.map((s) => (
                        <div key={s.service_id} className="flex justify-between text-sm">
                          <span className="text-foreground">{s.service_name}</span>
                          <span className="tabular-nums text-muted-foreground">R$ {s.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Discount */}
                    <div className="border-t border-border pt-2 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tabular-nums text-foreground">R$ {totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                          <Percent className="h-3 w-3" /> Desconto
                        </Label>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={totalPrice}
                            value={discount}
                            onChange={(e) => setDiscount(Math.min(Number(e.target.value), totalPrice))}
                            className="h-9 pl-8 text-sm tabular-nums"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">Valor Final</span>
                        <span className="text-xl font-bold tabular-nums text-primary">
                          R$ {finalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalhes adicionais sobre esta OS..."
                    className="min-h-[80px]"
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" /> Observações internas
                  </Label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Anotações da equipe, alertas, instruções..."
                    className="min-h-[60px] bg-muted/50 border-dashed"
                    maxLength={1000}
                  />
                </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-2">
          {step < TOTAL_STEPS ? (
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className="h-14 w-full text-sm font-bold uppercase tracking-wider"
              >
                {step === 3 ? (totalChecklistCount > 0 ? "Próximo" : "Pular") : "Próximo"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="h-14 w-full text-sm font-bold uppercase tracking-wider"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar OS"}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
