import { useState, useMemo, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, ArrowRight, Loader2, Check, ClipboardCheck, 
  Car as CarIcon, Percent, Lock, Search, Plus, Trash2, Camera, X, ImagePlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CarDiagram, { type VisualMarker } from "@/components/checklist/CarDiagram";

interface SelectedService {
  service_id: string;
  service_name: string;
  price: number;
}

const TOTAL_STEPS = 4;

export default function CheckIn() {
  const { shopId, user } = useAuth();
  const { data: services } = useServices();
  const { data: customers } = useCustomers();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // STEP 1 - Client & Vehicle
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  
  // Modals for Step 1
  const [openNewCustomer, setOpenNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustWhatsapp, setNewCustWhatsapp] = useState("");
  
  const [openNewVehicle, setOpenNewVehicle] = useState(false);
  const [newVehPlate, setNewVehPlate] = useState("");
  const [newVehModel, setNewVehModel] = useState("");
  
  // Custom API hook data fetch
  const { data: customerVehicles } = useVehicles(customerId || undefined);
  const selectedCustomer = customers?.find((c) => c.id === customerId);
  const selectedVehicle = customerVehicles?.find((v) => v.id === vehicleId);

  // STEP 2 - Services
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [openCustomService, setOpenCustomService] = useState(false);
  const [customSvcName, setCustomSvcName] = useState("");
  const [customSvcPrice, setCustomSvcPrice] = useState("");
  const [discount, setDiscount] = useState(0);

  // STEP 3 - Checklist
  const [visualMarkers, setVisualMarkers] = useState<VisualMarker[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // STEP 4 - Confirmation
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const finalPrice = Math.max(0, totalPrice - discount);

  // Filtering Context
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.whatsapp && c.whatsapp.includes(q)));
  }, [customers, customerSearch]);

  const handleCreateCustomer = async () => {
    if (!newCustName.trim()) return;
    try {
      const { data, error } = await supabase.from("customers").insert({
        shop_id: shopId,
        name: newCustName.trim(),
        whatsapp: newCustWhatsapp.trim() || null
      }).select().single();
      if (error) throw error;
      toast({ title: "Cliente criado!" });
      setCustomerId(data.id);
      setOpenNewCustomer(false);
      setNewCustName("");
      setNewCustWhatsapp("");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateVehicle = async () => {
    if (!newVehPlate.trim() || !newVehModel.trim() || !customerId) return;
    try {
      const { data, error } = await supabase.from("vehicles").insert({
        shop_id: shopId,
        customer_id: customerId,
        plate: newVehPlate.trim().toUpperCase(),
        model: newVehModel.trim()
      }).select().single();
      if (error) throw error;
      toast({ title: "Veículo cadastrado!" });
      setVehicleId(data.id);
      setOpenNewVehicle(false);
      setNewVehPlate("");
      setNewVehModel("");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // Service Handlers
  const toggleService = (svc: { id: string; name: string; price: number }) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.service_id === svc.id);
      if (exists) return prev.filter((s) => s.service_id !== svc.id);
      return [...prev, { service_id: svc.id, service_name: svc.name, price: svc.price }];
    });
  };

  const updateServicePrice = (id: string, newPrice: number) => {
    setSelectedServices((prev) => prev.map((s) => (s.service_id === id ? { ...s, price: newPrice } : s)));
  };

  const handleAddCustomService = () => {
    if (!customSvcName.trim() || !customSvcPrice) return;
    const customId = `custom-${crypto.randomUUID()}`;
    setSelectedServices(prev => [...prev, { 
      service_id: customId, 
      service_name: customSvcName.trim(), 
      price: Number(customSvcPrice) 
    }]);
    setOpenCustomService(false);
    setCustomSvcName("");
    setCustomSvcPrice("");
  };

  // Photo Handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles].slice(0, 6)); // max 6
    }
  };
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return !!customerId && !!vehicleId;
      case 2: return selectedServices.length > 0;
      case 3: return photos.length > 0; // "mínimo 1 foto obrigatorio"
      case 4: return !!paymentMethod;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!shopId || !user) return;
    if (photos.length === 0) {
       toast({ title: "Falta foto", description: "É necessário ao menos uma foto do veículo.", variant: "destructive" });
       return;
    }

    setSubmitting(true);
    try {
      // 1. Create Job with Payment Method
      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          shop_id: shopId,
          vehicle_id: vehicleId,
          total_price: finalPrice,
          discount: discount,
          notes: notes.trim() || null,
          payment_method: paymentMethod, // nova coluna adicionada via SQL
          created_by: user.id,
        })
        .select("id")
        .single();
      if (jobErr) throw jobErr;

      // 2. Insert job_services
      const jobServices = selectedServices.map((s) => ({
        job_id: job.id,
        service_id: s.service_id.startsWith('custom') ? null : s.service_id,
        service_name: s.service_name,
        price: s.price,
      }));
      if (jobServices.length > 0) {
         const { error: jsErr } = await supabase.from("job_services").insert(jobServices);
         if (jsErr) throw jsErr;
      }

      // 3. Insert Checklist Markers
      if (visualMarkers.length > 0) {
        const checklistRows = visualMarkers.map((m) => ({
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

      // 4. Upload Photos directly to native structure
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
      toast({ title: "OS criada com sucesso!" });
      navigate("/jobs");
    } catch (err: any) {
      toast({ title: "Erro na finalização", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ["Cliente & Veículo", "Serviços", "Checklist do Veículo", "Confirmação"];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        
        {/* WIZARD HEADER */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => (step > 1 ? setStep(step - 1) : navigate("/jobs"))} className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">Nova OS</h1>
              <p className="text-sm font-medium text-primary uppercase tracking-widest mt-0.5">
                Etapa {step}: {stepTitles[step - 1]}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-full flex-1 transition-colors duration-300 ${i + 1 <= step ? "bg-primary" : "bg-transparent"}`} />
            ))}
          </div>
        </div>

        {/* WIZARD CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="pb-20"
          >
            {/* ETAPA 1 - Cliente & Veículo */}
            {step === 1 && (
              <div className="space-y-8">
                 {/* Seleção de Cliente */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <Label className="text-base">1. Buscar ou cadastrar cliente</Label>
                       <Button variant="outline" size="sm" onClick={() => setOpenNewCustomer(true)} className="h-8 gap-1 rounded-full text-xs shadow-none">
                         <Plus className="h-3.5 w-3.5" /> Novo Cliente
                       </Button>
                    </div>
                    {!customerId ? (
                       <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Buscar por nome ou whatsapp..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="pl-10 h-11 rounded-xl bg-card" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                             {filteredCustomers.slice(0,6).map((c) => (
                                <Card key={c.id} className="cursor-pointer border-border hover:border-primary/50 transition-colors shadow-none rounded-xl" onClick={() => { setCustomerId(c.id); setVehicleId(""); }}>
                                  <CardContent className="p-3 flex items-center gap-3">
                                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                                       <span className="font-bold text-sm text-foreground">{c.name.substring(0,2).toUpperCase()}</span>
                                     </div>
                                     <div className="flex-1 min-w-0">
                                       <p className="font-semibold text-sm truncate">{c.name}</p>
                                       <p className="text-xs text-muted-foreground truncate">{c.whatsapp || c.phone || "Sem contato"}</p>
                                     </div>
                                  </CardContent>
                                </Card>
                             ))}
                          </div>
                       </div>
                    ) : (
                       <Card className="border-primary bg-primary/5 rounded-xl shadow-none">
                          <CardContent className="p-4 flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                   <Check className="h-5 w-5" />
                                </div>
                                <div>
                                   <p className="font-bold text-foreground">{selectedCustomer?.name}</p>
                                   <p className="text-sm text-muted-foreground">{selectedCustomer?.whatsapp || "Registrado"}</p>
                                </div>
                             </div>
                             <Button variant="ghost" size="sm" onClick={() => { setCustomerId(""); setVehicleId(""); }} className="text-xs text-muted-foreground">Trocar</Button>
                          </CardContent>
                       </Card>
                    )}
                 </div>

                 {/* Seleção de Veículo */}
                 {customerId && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                       <div className="flex justify-between items-center">
                          <Label className="text-base">2. Selecione o veículo</Label>
                          <Button variant="outline" size="sm" onClick={() => setOpenNewVehicle(true)} className="h-8 gap-1 rounded-full text-xs shadow-none">
                            <Plus className="h-3.5 w-3.5" /> Novo Veículo
                          </Button>
                       </div>
                       
                       {customerVehicles && customerVehicles.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                             {customerVehicles.map((v) => (
                                <Card 
                                   key={v.id} 
                                   className={`cursor-pointer transition-colors shadow-none rounded-xl border-2 ${vehicleId === v.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} 
                                   onClick={() => setVehicleId(v.id)}
                                >
                                  <CardContent className="p-4 flex items-center gap-4">
                                     <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${vehicleId === v.id ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
                                       {vehicleId === v.id && <Check className="h-4 w-4" />}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <p className="font-mono font-bold text-lg uppercase tracking-wider truncate">{v.plate}</p>
                                        <p className="text-xs text-muted-foreground truncate">{v.model}</p>
                                     </div>
                                  </CardContent>
                                </Card>
                             ))}
                          </div>
                       ) : (
                          <div className="bg-muted/50 p-6 rounded-xl border border-dashed border-border text-center">
                             <CarIcon className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                             <p className="text-sm text-muted-foreground mb-4">Nenhum carro atrelado a este cliente.</p>
                             <Button onClick={() => setOpenNewVehicle(true)} className="shadow-none rounded-full h-9">
                                Cadastrar seu 1º Veículo
                             </Button>
                          </div>
                       )}
                    </div>
                 )}
              </div>
            )}

            {/* ETAPA 2 - Serviços */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <Label className="text-base">Serviços da OS</Label>
                   <Button variant="secondary" size="sm" onClick={() => setOpenCustomService(true)} className="h-8 gap-1 rounded-full text-xs shadow-none">
                     <Plus className="h-3.5 w-3.5" /> Adicionar serviço avulso
                   </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {/* Custom added services inline mixed with remote */}
                   {selectedServices.filter(s => s.service_id.startsWith('custom')).map(s => (
                      <Card key={s.service_id} className="border-2 border-primary bg-primary/5 shadow-none rounded-xl">
                         <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                               <Checkbox checked={true} onCheckedChange={() => toggleService({ id: s.service_id, name: s.service_name, price: s.price })} className="h-5 w-5" />
                               <div className="flex-1 font-semibold text-sm truncate">{s.service_name} (Avulso)</div>
                            </div>
                            <div className="pl-8 flex items-center gap-2">
                               <Label className="text-xs">Preço: R$</Label>
                               <Input type="number" step="0.01" value={s.price} onChange={(e) => updateServicePrice(s.service_id, Number(e.target.value))} className="h-9 w-32 tabular-nums text-sm bg-card border-none shadow-sm" />
                            </div>
                         </CardContent>
                      </Card>
                   ))}

                   {services?.filter(s => s.active).map(svc => {
                      const selected = selectedServices.find((s) => s.service_id === svc.id);
                      return (
                        <Card key={svc.id} className={`border-2 transition-colors shadow-none rounded-xl ${selected ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                           <CardContent className="p-4 space-y-3">
                              <div className="flex flex-start gap-4">
                                 <Checkbox checked={!!selected} onCheckedChange={() => toggleService(svc)} className="h-5 w-5 mt-1" />
                                 <div className="flex-1 cursor-pointer" onClick={() => toggleService(svc)}>
                                    <p className="font-semibold text-sm leading-tight text-foreground">{svc.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Ref: R$ {Number(svc.price).toFixed(2)} • {svc.duration_minutes} min</p>
                                 </div>
                              </div>
                              {selected && (
                                <div className="pl-9 flex items-center gap-2">
                                   <div className="relative w-full sm:w-1/2">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">R$</span>
                                      <Input type="number" step="0.01" min="0" value={selected.price} onChange={(e) => updateServicePrice(svc.id, Number(e.target.value))} className="h-9 pl-9 tabular-nums text-sm font-bold bg-background shadow-sm border-none" />
                                   </div>
                                </div>
                              )}
                           </CardContent>
                        </Card>
                      )
                   })}
                </div>

                {/* Resumo Rodapé Fixo Inferior desta aba */}
                <div className="bg-muted p-4 rounded-xl border border-border space-y-3">
                   <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Subtotal</span>
                      <span className="tabular-nums font-mono font-bold text-foreground">R$ {totalPrice.toFixed(2)}</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium flex items-center gap-2 text-destructive shrink-0">
                        <Percent className="h-4 w-4" /> Desconto
                      </Label>
                      <div className="relative flex-1 sm:w-1/3 sm:flex-none">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-destructive">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalPrice}
                          value={discount}
                          onChange={(e) => setDiscount(Math.min(Number(e.target.value), totalPrice))}
                          className="h-10 pl-9 text-sm tabular-nums font-mono font-bold text-destructive border-none shadow-sm bg-background"
                        />
                      </div>
                   </div>
                   <div className="flex justify-between items-center bg-primary/10 p-4 rounded-xl mt-2 border border-primary/20">
                      <span className="font-bold uppercase tracking-wider text-sm text-foreground">Total Líquido</span>
                      <span className="text-2xl font-black tabular-nums font-mono text-primary">R$ {finalPrice.toFixed(2)}</span>
                   </div>
                </div>
              </div>
            )}

            {/* ETAPA 3 - Checklist e Fotos */}
            {step === 3 && (
              <div className="space-y-8">
                 <div className="space-y-4">
                    <Label className="text-base flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Mapeamento de Danos</Label>
                    <p className="text-xs text-muted-foreground">Clique nas áreas do diagrama para marcar desgastes ou problemas existentes antes da entrada da OS.</p>
                    
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm max-w-[400px] mx-auto">
                       <CarDiagram markers={visualMarkers} onAddMarker={(m) => setVisualMarkers([...visualMarkers, m])} onRemoveMarker={(id) => setVisualMarkers(visualMarkers.filter(m=>m.id!==id))} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <Label className="text-base flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Fotos do Veículo *</Label>
                       <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">{photos.length}/6 permitidas</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                       {photos.map((file, i) => (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm group">
                             <img src={URL.createObjectURL(file)} className="h-full w-full object-cover transition-transform group-hover:scale-105" alt="Preview"/>
                             <button onClick={() => removePhoto(i)} className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive/90 text-white hover:bg-destructive shadow-sm backdrop-blur-sm">
                               <X className="h-3.5 w-3.5" />
                             </button>
                          </div>
                       ))}
                       {photos.length < 6 && (
                          <button onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors">
                             <ImagePlus className="h-6 w-6" />
                             <span className="text-xs font-semibold">Enviar Foto</span>
                          </button>
                       )}
                    </div>
                    <input ref={fileRef} type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                 </div>
              </div>
            )}

            {/* ETAPA 4 - Confirmação */}
            {step === 4 && (
              <div className="space-y-6">
                 <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Resumo do Serviço</p>
                       <div className="flex gap-4 items-center">
                          <h2 className="text-2xl font-mono font-bold tracking-tight">{selectedVehicle?.plate}</h2>
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{selectedCustomer?.name}</span>
                       </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                       {selectedServices.map(s => (
                          <div key={s.service_id} className="flex justify-between items-center">
                             <span className="text-sm font-medium text-foreground">{s.service_name}</span>
                             <span className="text-sm font-mono text-muted-foreground">R$ {s.price.toFixed(2)}</span>
                          </div>
                       ))}
                    </div>

                    <div className="bg-primary/5 p-4 border-t border-border flex justify-between items-center">
                       <span className="font-bold text-foreground">TOTAL FINAL</span>
                       <span className="text-2xl font-mono font-black text-primary">R$ {finalPrice.toFixed(2)}</span>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <Label className="text-base text-foreground font-semibold">Forma de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                       <SelectTrigger className="w-full h-12 rounded-xl bg-card border-border shadow-sm">
                          <SelectValue placeholder="Selecione o método..." />
                       </SelectTrigger>
                        <SelectContent className="rounded-xl">
                           <SelectItem value="Débito">Débito</SelectItem>
                           <SelectItem value="Crédito">Crédito</SelectItem>
                           <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                           <SelectItem value="Boleto">Boleto</SelectItem>
                           <SelectItem value="Transferência">Transferência</SelectItem>
                           <SelectItem value="PIX">PIX</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>

                 <div className="space-y-3">
                    <Label className="text-base text-foreground font-semibold">Observações Gerais</Label>
                    <Textarea
                       value={notes}
                       onChange={(e) => setNotes(e.target.value)}
                       placeholder="Condição combinada, prazo extra, algo a relatar na OS?"
                       className="min-h-[100px] rounded-xl bg-card border-border shadow-sm text-sm"
                    />
                 </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* CONTROLES WIZARD BOTTOM FIXO */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 border-t border-border bg-background/80 backdrop-blur-md pb-4 sm:pb-4 z-40">
           <div className="max-w-4xl mx-auto flex gap-3">
             {step < TOTAL_STEPS ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()} className="h-14 flex-1 rounded-2xl text-base font-black uppercase tracking-widest shadow-none bg-foreground text-background hover:bg-foreground/90 transition-all">
                  Continuar Para Etapa {step + 1}
                </Button>
             ) : (
                <Button onClick={handleSubmit} disabled={!canAdvance() || submitting} className="h-14 flex-1 rounded-2xl text-lg font-black uppercase tracking-widest shadow-none bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                  {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Criar OS e Finalizar"}
                </Button>
             )}
           </div>
        </div>

        {/* MODALS INLINE - ETAPA 1 */}
        <Dialog open={openNewCustomer} onOpenChange={setOpenNewCustomer}>
           <DialogContent className="rounded-2xl w-[95vw] sm:max-w-md">
              <DialogHeader>
                 <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                 <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Ex: João Silva" className="h-12 rounded-xl" autoFocus />
                 </div>
                 <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={newCustWhatsapp} onChange={(e) => setNewCustWhatsapp(e.target.value)} placeholder="(11) 99999-9999" type="tel" className="h-12 rounded-xl" />
                 </div>
                 <Button onClick={handleCreateCustomer} className="w-full h-12 rounded-xl font-bold bg-success hover:bg-success/90 text-success-foreground">Salvar Cliente</Button>
              </div>
           </DialogContent>
        </Dialog>

        <Dialog open={openNewVehicle} onOpenChange={setOpenNewVehicle}>
           <DialogContent className="rounded-2xl w-[95vw] sm:max-w-md">
              <DialogHeader>
                 <DialogTitle>Cadastro Rápido de Veículo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                 <div className="space-y-2">
                    <Label>Placa</Label>
                    <Input value={newVehPlate} onChange={(e) => setNewVehPlate(e.target.value)} placeholder="ABC-1234" className="h-12 rounded-xl uppercase" autoFocus />
                 </div>
                 <div className="space-y-2">
                    <Label>Modelo/Cor</Label>
                    <Input value={newVehModel} onChange={(e) => setNewVehModel(e.target.value)} placeholder="Ex: Civic Preto" className="h-12 rounded-xl" />
                 </div>
                 <Button onClick={handleCreateVehicle} className="w-full h-12 rounded-xl font-bold bg-success hover:bg-success/90 text-success-foreground">Salvar Veículo</Button>
              </div>
           </DialogContent>
        </Dialog>

        {/* MODAL INLINE - ETAPA 2 SERVIÇO AVULSO */}
        <Dialog open={openCustomService} onOpenChange={setOpenCustomService}>
           <DialogContent className="rounded-2xl w-[95vw] sm:max-w-md">
              <DialogHeader>
                 <DialogTitle>Serviço Avulso Personalizado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                 <div className="space-y-2">
                    <Label>Nome do Serviço</Label>
                    <Input value={customSvcName} onChange={(e) => setCustomSvcName(e.target.value)} placeholder="Ex: Martelinho de Ouro" className="h-12 rounded-xl" autoFocus />
                 </div>
                 <div className="space-y-2">
                    <Label>Preço Fechado</Label>
                    <Input type="number" step="0.01" value={customSvcPrice} onChange={(e) => setCustomSvcPrice(e.target.value)} placeholder="50.00" className="h-12 rounded-xl font-mono" />
                 </div>
                 <Button onClick={handleAddCustomService} className="w-full h-12 rounded-xl font-bold text-base shadow-none">Inserir Avulso</Button>
              </div>
           </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
