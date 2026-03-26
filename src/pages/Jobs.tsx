import { useState, useMemo } from "react";
import { useJobs, useServices, useShop } from "@/hooks/useShopData";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ClipboardList, Calendar, Search, ArrowUpDown, ClipboardCheck, AlertTriangle, Pencil, Trash2, X, Check, Percent, Lock, Save, CalendarIcon, MessageCircle, FileText, Eye } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Enums } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CarDiagram, { type VisualMarker } from "@/components/checklist/CarDiagram";
import JobPhotoUpload from "@/components/photos/JobPhotoUpload";
import JobPhotoGallery from "@/components/photos/JobPhotoGallery";
import { buildCompletionMessage, buildReadyMessage, sendWhatsApp, type WhatsAppJobData } from "@/lib/whatsapp";
import { useMessageTemplate } from "@/hooks/useMessageTemplate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Note: Ensure your local Supabase types include "cancelled" if using TypeScript strict. 
// If not, ts will ignore or fallback to general string logic.
type JobStatus = Enums<"job_status"> | "cancelled";

const statusConfig: Record<string, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-warning text-warning-foreground" },
  in_progress: { label: "Em execução", className: "bg-info text-info-foreground" },
  done: { label: "Finalizado", className: "bg-success text-success-foreground" },
  delivered: { label: "Entregue", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelada", className: "bg-destructive text-destructive-foreground" },
};

const nextStatus: Record<string, string | null> = {
  waiting: "in_progress",
  in_progress: "done",
  done: "delivered",
  delivered: null,
  cancelled: null,
};

const nextLabel: Record<string, string> = {
  waiting: "Iniciar",
  in_progress: "Finalizar",
  done: "Marcar Entregue",
  delivered: "",
  cancelled: "",
};

function InternalNotesField({ jobId, initialValue, onSaved }: { jobId: string; initialValue: string; onSaved: () => void }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const changed = value !== initialValue;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("jobs").update({ internal_notes: value.trim() || null }).eq("id", jobId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Anotação salva!" }); onSaved(); }
    setSaving(false);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Lock className="h-3 w-3" /> Observações internas
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Anotações da equipe, alertas, instruções..."
        className="min-h-[60px] text-sm bg-muted/50 border-dashed"
        maxLength={1000}
      />
      {changed && (
        <Button size="sm" onClick={save} disabled={saving} className="h-8 gap-1 text-xs">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar
        </Button>
      )}
    </div>
  );
}

export default function Jobs() {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status");
  const { data: jobs, isLoading } = useJobs();
  const { data: allServices } = useServices();
  const { data: shop } = useShop();
  const { data: messageTemplate } = useMessageTemplate();
  
  const validFilters = ["all", "waiting", "in_progress", "done", "delivered", "cancelled"];
  const [filter, setFilter] = useState<string>(initialStatus && validFilters.includes(initialStatus) ? initialStatus : "all");
  
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortAsc, setSortAsc] = useState(false);
  
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editServices, setEditServices] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  
  const queryClient = useQueryClient();
  const { shopId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const openEdit = (job: any) => {
    setEditServices((job.job_services || []).map((s: any) => ({ ...s })));
    setEditDiscount(Number(job.discount || 0));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const updateEditPrice = (id: string, price: number) => {
    setEditServices((prev) => prev.map((s) => (s.id === id ? { ...s, price } : s)));
  };

  const removeEditService = (id: string) => {
    setEditServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addServiceToEdit = (svc: any) => {
    if (editServices.find((s) => s.service_id === svc.id)) return;
    setEditServices((prev) => [
      ...prev,
      { id: crypto.randomUUID(), service_id: svc.id, service_name: svc.name, price: Number(svc.price), job_id: selectedJob.id, isNew: true },
    ]);
  };

  const editSubtotal = editServices.reduce((sum, s) => sum + Number(s.price), 0);
  const editFinal = Math.max(0, editSubtotal - editDiscount);

  const saveEdit = async () => {
    if (!selectedJob || editServices.length === 0) return;
    setSavingEdit(true);
    try {
      await supabase.from("job_services").delete().eq("job_id", selectedJob.id);
      const rows = editServices.map((s) => ({
        job_id: selectedJob.id,
        service_id: s.service_id,
        service_name: s.service_name,
        price: Number(s.price),
      }));
      const { error: isErr } = await supabase.from("job_services").insert(rows);
      if (isErr) throw isErr;
      
      const { error: jErr } = await supabase
        .from("jobs")
        .update({ total_price: editFinal, discount: editDiscount })
        .eq("id", selectedJob.id);
      if (jErr) throw jErr;
      
      toast({ title: "OS atualizada!" });
      queryClient.invalidateQueries({ queryKey: ["jobs", shopId] });
      setEditing(false);
      setSelectedJob(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = useMemo(() => {
    return (jobs ?? [])
      .filter((j) => filter === "all" || j.status === filter)
      .filter((j) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const customerName = (j as any).vehicles?.customers?.name?.toLowerCase() ?? "";
        const plate = (j as any).vehicles?.plate?.toLowerCase() ?? "";
        const osString = j.id.toLowerCase();
        return customerName.includes(q) || plate.includes(q) || osString.includes(q);
      })
      .filter((j) => {
        const d = new Date(j.created_at);
        if (dateFrom && d < new Date(dateFrom.setHours(0, 0, 0, 0))) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sortAsc ? da - db : db - da;
      });
  }, [jobs, filter, search, dateFrom, dateTo, sortAsc]);

  const hasDateFilter = !!dateFrom || !!dateTo;

  const getWhatsAppData = (job: any): WhatsAppJobData => {
    const vehicle = job.vehicles;
    const customer = vehicle?.customers;
    return {
      customerName: customer?.name || "Cliente",
      customerWhatsapp: customer?.whatsapp || customer?.phone || null,
      vehiclePlate: vehicle?.plate || "",
      vehicleModel: vehicle?.model || null,
      services: (job.job_services || []).map((s: any) => ({ name: s.service_name, price: Number(s.price) })),
      totalPrice: Number(job.total_price),
      discount: Number(job.discount || 0),
      shopName: shop?.name || "Nossa Loja",
    };
  };

  const handleSendWhatsApp = (job: any, type: "completion" | "ready") => {
    const data = getWhatsAppData(job);
    const message = type === "completion" ? buildCompletionMessage(data, messageTemplate) : buildReadyMessage(data, messageTemplate);
    const sent = sendWhatsApp(data.customerWhatsapp, message);
    if (!sent) {
      toast({ title: "⚠️ Sem WhatsApp", description: "Cliente não possui número de WhatsApp cadastrado.", variant: "destructive" });
    }
  };

  const advanceStatus = async (jobId: string, current: string) => {
    const next = nextStatus[current];
    if (!next) return;
    
    // IF CURRENT == "done", open WhatsApp modal implicitly as requested? 
    // Wait, the specification says: "AO FINALIZAR UMA OS (status → Concluída): Botão Enviar relatório via WhatsApp aparece." We have this in Dialog! "Status muda para 'Entregue' após envio" — the user can do this via dialog. Let's keep the backend update:

    const updates: any = { status: next };
    if (next === "in_progress") updates.started_at = new Date().toISOString();
    if (next === "done") updates.finished_at = new Date().toISOString();

    const job = jobs?.find((j) => j.id === jobId);

    const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const statusLabels: Record<string, string> = {
        in_progress: "🔧 Serviço iniciado!",
        done: "✅ Serviço finalizado!",
        delivered: "🚗 Veículo entregue!",
      };
      toast({ title: statusLabels[next] || "Status atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["jobs", shopId] });
      setSelectedJob(null);

      if (next === "done" && job) {
        setTimeout(() => handleSendWhatsApp(job, "completion"), 500);
      }
    }
  };

  const cancelJobStatus = async (jobId: string) => {
     if (!confirm("Tem certeza que deseja cancelar essa OS?")) return;
     const { error } = await supabase.from("jobs").update({ status: 'waiting' as any }).eq("id", jobId);
     if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
     } else {
        toast({ title: "OS Cancelada." });
        queryClient.invalidateQueries({ queryKey: ["jobs", shopId] });
        setSelectedJob(null);
     }
  }

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const jobChecklist = (selectedJob as any)?.job_checklist ?? [];
  const visualChecklist: VisualMarker[] = jobChecklist
    .filter((c: any) => c.item_type === "visual")
    .map((c: any) => ({
      id: c.id,
      x: Number(c.position_x),
      y: Number(c.position_y),
      view: c.car_view as "top" | "left_side" | "right_side",
      label: c.label,
    }));
  const structuredChecklist = jobChecklist.filter((c: any) => c.item_type === "structured");
  const hasChecklist = jobChecklist.length > 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/15 text-primary rounded-xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Ordens de Serviço</h1>
              <p className="text-sm text-muted-foreground">Gerencie todos os serviços e veículos num só lugar.</p>
            </div>
          </div>
          
          <Button onClick={() => navigate("/checkin")} className="rounded-xl w-full sm:w-auto font-bold tracking-wide shadow-none bg-primary text-primary-foreground h-11">
            <Plus className="mr-2 h-5 w-5" /> Nova OS
          </Button>
        </div>

        {/* TABS E BUSCA */}
        <div className="space-y-3">
            {/* Horizontal Tabs Filtros */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {validFilters.map((s) => {
                const count = s === "all" ? (jobs?.length ?? 0) : (jobs?.filter((j) => j.status === s).length ?? 0);
                const isActive = filter === s;
                return (
                  <Button
                    key={s}
                    variant={isActive ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setFilter(s)}
                    className={cn(
                        "shrink-0 h-9 px-4 rounded-xl shadow-none text-xs gap-1.5 transition-colors",
                        isActive ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted font-medium text-muted-foreground"
                    )}
                  >
                    {s !== "all" && (
                      <span className={cn("h-2 w-2 rounded-full", statusConfig[s]?.className)} />
                    )}
                    {s === "all" ? "Todas" : statusConfig[s]?.label}
                    <span className={cn("text-[10px]", isActive ? "opacity-80" : "opacity-40")}>({count})</span>
                  </Button>
                );
              })}
            </div>

            {/* Toolbar Search Date Sort */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por placa, cliente ou código da OS..."
                  className="h-11 pl-10 rounded-xl bg-card shadow-sm border-border text-sm w-full"
                />
              </div>

              <div className="flex gap-2 items-center shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-11 rounded-xl shadow-sm text-xs gap-1.5", dateFrom && "border-primary text-primary")}>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-11 rounded-xl shadow-sm text-xs gap-1.5", dateTo && "border-primary text-primary")}>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {hasDateFilter && (
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortAsc(!sortAsc)}
                    className="h-11 w-11 rounded-xl shadow-sm text-muted-foreground shrink-0"
                    title={sortAsc ? "Mais antigas primeiro" : "Mais recentes primeiro"}
                >
                    <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
        </div>

        {/* LISTAGEM TABELA COMPLETA */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground bg-card/50 rounded-xl border border-border border-dashed">
            <ClipboardList className="h-12 w-12 opacity-20" />
            <p className="text-sm font-medium">Nenhuma OS encontrada para os filtros atuais</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 hidden md:table-header-group">
                  <TableRow>
                    <TableHead className="w-[110px]">Nº OS</TableHead>
                    <TableHead className="w-[200px]">Cliente + Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Serviços</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                    <TableHead className="text-center w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                  {filtered.map((job) => {
                    const vehicle = (job as any).vehicles;
                    const customer = vehicle?.customers;
                    const services = (job as any).job_services || [];
                    
                    return (
                        <TableRow 
                            key={job.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors flex flex-col md:table-row py-3 md:py-0 border-b last:border-0"
                            onClick={() => setSelectedJob(job)}
                        >
                            <TableCell className="p-4 pt-4 md:pt-4">
                                <span className="md:hidden text-muted-foreground text-xs uppercase tracking-wider mr-2">Nº OS:</span>
                                <span className="font-mono text-xs font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-md border border-border/50">
                                   #{job.id.substring(0,6).toUpperCase()}
                                </span>
                            </TableCell>

                            <TableCell className="p-4 pt-1 md:pt-4">
                               <div className="flex flex-col min-w-[150px]">
                                   <span className="font-semibold text-sm truncate">{customer?.name || "Desconhecido"}</span>
                                   <span className="text-xs text-muted-foreground truncate">{vehicle?.model || "Sem Modelo"} {vehicle?.color ? `- ${vehicle.color}` : ""}</span>
                               </div>
                            </TableCell>

                            <TableCell className="p-4 pt-0 md:pt-4 border-t border-border border-dashed md:border-none">
                               <span className="md:hidden text-muted-foreground text-xs uppercase tracking-wider mr-2">Placa:</span>
                               <span className="font-mono text-sm font-bold uppercase tracking-widest">{vehicle?.plate}</span>
                            </TableCell>

                            <TableCell className="p-4 pt-1 md:pt-4 text-xs text-muted-foreground max-w-[200px] truncate" title={services.map((s:any)=>s.service_name).join(', ')}>
                                <span className="md:hidden text-muted-foreground text-xs uppercase tracking-wider mr-2 block mb-1">Serviços:</span>
                                {services.length > 0 ? services.map((s:any)=>s.service_name).join(', ') : "Nenhum serviço"}
                            </TableCell>

                            <TableCell className="p-4 pt-1 md:pt-4 text-left md:text-right font-mono font-bold text-sm text-foreground">
                                <span className="md:hidden text-muted-foreground text-xs uppercase tracking-wider font-sans mr-2">Total:</span>
                                {formatCurrency(Number(job.total_price))}
                            </TableCell>

                            <TableCell className="p-4 pt-1 md:pt-4 text-left md:text-center">
                                <span className="md:hidden text-muted-foreground text-xs uppercase tracking-wider font-sans mr-2">Status:</span>
                                <Badge className={cn("shadow-none", statusConfig[job.status]?.className)}>
                                    {statusConfig[job.status]?.label || job.status}
                                </Badge>
                            </TableCell>

                            <TableCell className="p-4 pt-1 md:pt-4 text-left md:text-right text-xs text-muted-foreground">
                                <span className="md:hidden text-muted-foreground text-xs uppercase tracking-wider font-sans mr-2">Data:</span>
                                {format(new Date(job.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>

                            <TableCell className="p-4 pt-2 md:pt-4 flex justify-end items-center gap-2 border-t border-border mt-2 md:border-none md:mt-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                  })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* MODAL DETALHES OS / RESUMO PARA FINALIZAÇÃO */}
        <Dialog open={!!selectedJob} onOpenChange={(o) => (!o || savingEdit) && !editing && setSelectedJob(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto w-full sm:max-w-2xl rounded-2xl md:rounded-2xl p-0">
            {selectedJob && (
              <div className="flex flex-col h-full bg-card rounded-2xl p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-xl font-bold tracking-tight text-foreground">Ordem de Serviço #{selectedJob.id.substring(0,8).toUpperCase()}</span>
                    <Badge className={cn("text-sm px-3 py-1 shadow-none", statusConfig[selectedJob.status]?.className)}>
                      {statusConfig[selectedJob.status]?.label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 flex-1">
                  
                  {/* Visão Rápida Header OS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-border">
                     <div className="col-span-2 md:col-span-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Veículo Placa</p>
                        <p className="font-mono font-bold text-lg">{(selectedJob as any).vehicles?.plate}</p>
                     </div>
                     <div className="col-span-2 md:col-span-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Modelo</p>
                        <p className="font-semibold text-sm truncate">{[(selectedJob as any).vehicles?.model, (selectedJob as any).vehicles?.color].filter(Boolean).join(" • ")}</p>
                     </div>
                     <div className="col-span-2 md:col-span-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Cliente</p>
                        <p className="font-semibold text-sm truncate">{(selectedJob as any).vehicles?.customers?.name || "Padrão"}</p>
                     </div>
                     <div className="col-span-2 md:col-span-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Contato</p>
                        <p className="font-semibold text-sm truncate">{(selectedJob as any).vehicles?.customers?.whatsapp || "N/A"}</p>
                     </div>
                  </div>

                  {/* Checklist Summary */}
                  {hasChecklist && (
                    <div className="bg-muted/30 p-4 rounded-xl border border-muted-foreground/10 space-y-3">
                      <p className="text-xs text-foreground font-semibold flex items-center gap-2 tracking-wide uppercase">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        Checklist do Veículo ({jobChecklist.length} apontamentos)
                      </p>

                      {visualChecklist.length > 0 && (
                        <div className="rounded-xl border border-border bg-card p-3 shadow-sm max-w-[300px] mx-auto">
                          <CarDiagram
                            markers={visualChecklist}
                            onAddMarker={() => {}}
                            onRemoveMarker={() => {}}
                            readOnly
                          />
                        </div>
                      )}

                      {structuredChecklist.length > 0 && (
                        <div className="space-y-2">
                          {structuredChecklist.map((item: any) => (
                            <div key={item.id} className="flex items-start gap-2 rounded-lg bg-card border border-border p-3 shadow-sm">
                              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.label}</p>
                                {item.notes && <p className="text-xs text-muted-foreground mt-1">Obs: {item.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Services Row */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                         <FileText className="h-4 w-4 text-primary" /> Serviços e Valores
                      </p>
                      {selectedJob.status !== "done" && selectedJob.status !== "delivered" && selectedJob.status !== 'cancelled' && !editing && (
                        <Button variant="outline" size="sm" onClick={() => openEdit(selectedJob)} className="h-8 gap-1 text-xs rounded-lg shadow-none">
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                      )}
                    </div>

                    {editing ? (
                      <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border">
                        {editServices.map((s) => (
                          <div key={s.id} className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border shadow-sm">
                            <span className="text-sm font-medium text-foreground flex-1 truncate pl-2">{s.service_name}</span>
                            <div className="relative w-32 shrink-0">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={s.price}
                                onChange={(e) => updateEditPrice(s.id, Number(e.target.value))}
                                className="h-9 pl-8 text-sm tabular-nums font-mono font-bold rounded-md bg-secondary border-none"
                              />
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-md" onClick={() => removeEditService(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        {/* Add service button list */}
                        {allServices && allServices.filter((s) => s.active && !editServices.find((es) => es.service_id === s.id)).length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Adicionar à OS</p>
                            <div className="flex flex-wrap gap-2">
                              {allServices.filter((s) => s.active && !editServices.find((es) => es.service_id === s.id)).map((svc) => (
                                <Button key={svc.id} variant="outline" size="sm" className="h-8 text-xs rounded-lg shadow-none border-dashed bg-card hover:bg-muted" onClick={() => addServiceToEdit(svc)}>
                                  <Plus className="h-3 w-3 mr-1" /> {svc.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-6 mt-4 border-t border-border border-dashed space-y-4">
                          <div className="flex justify-between items-center text-sm px-2">
                            <span className="text-muted-foreground font-medium">Subtotal</span>
                            <span className="tabular-nums font-mono font-bold text-foreground">{formatCurrency(editSubtotal)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-4 px-2">
                            <Label className="text-sm font-medium flex items-center gap-2 text-destructive">
                              <Percent className="h-4 w-4" /> Desconto
                            </Label>
                            <div className="relative w-32">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-destructive">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={editSubtotal}
                                value={editDiscount}
                                onChange={(e) => setEditDiscount(Math.min(Number(e.target.value), editSubtotal))}
                                className="h-9 pl-9 text-sm tabular-nums font-mono font-bold text-destructive border-destructive/30 rounded-md bg-destructive/5"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl mt-2 border border-primary/10">
                            <span className="font-bold uppercase tracking-wider text-sm text-foreground">Valor Final</span>
                            <span className="text-2xl font-black tabular-nums font-mono text-primary">{formatCurrency(editFinal)}</span>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button variant="secondary" onClick={cancelEdit} className="flex-1 h-12 rounded-xl font-bold shadow-none">
                            Cancelar
                          </Button>
                          <Button onClick={saveEdit} disabled={savingEdit || editServices.length === 0} className="flex-1 h-12 rounded-xl font-bold tracking-wide shadow-none">
                            {savingEdit ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar Alterações"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="divide-y divide-border">
                          {((selectedJob as any).job_services || []).map((js: any) => (
                            <div key={js.id} className="flex justify-between items-center p-4">
                              <span className="text-sm font-medium text-foreground">{js.service_name}</span>
                              <span className="text-sm font-mono font-bold text-muted-foreground">
                                {formatCurrency(Number(js.price))}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="bg-muted/30 p-4 border-t border-border space-y-3">
                          {Number(selectedJob.discount || 0) > 0 && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground font-medium">Subtotal</span>
                                <span className="font-mono text-muted-foreground font-semibold">
                                  {formatCurrency(Number(selectedJob.total_price) + Number(selectedJob.discount))}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-destructive font-bold flex items-center gap-1">
                                  <Percent className="h-3 w-3" /> Desconto
                                </span>
                                <span className="font-mono text-destructive font-bold">
                                  - {formatCurrency(Number(selectedJob.discount))}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between items-center pt-2">
                            <span className="font-bold text-lg text-foreground">
                              {Number(selectedJob.discount || 0) > 0 ? "TOTAL LÍQUIDO" : "TOTAL"}
                            </span>
                            <span className="text-2xl font-black tabular-nums text-primary font-mono tracking-tight">
                              {formatCurrency(Number(selectedJob.total_price))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* General Notes */}
                  {selectedJob.notes && (
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Observações do Orçamento</p>
                      <p className="text-sm text-foreground italic leading-relaxed">"{selectedJob.notes}"</p>
                    </div>
                  )}

                  {/* Fotos Container */}
                  <div className="space-y-4">
                     {selectedJob.status === "done" || selectedJob.status === "delivered" ? (
                      <JobPhotoGallery photos={(selectedJob as any).job_photos || []} />
                     ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <JobPhotoUpload
                          jobId={selectedJob.id}
                          photoType="before"
                          photos={((selectedJob as any).job_photos || []).filter((p: any) => p.photo_type === "before")}
                          onPhotosChange={() => queryClient.invalidateQueries({ queryKey: ["jobs", shopId] })}
                        />
                        {selectedJob.status === "in_progress" && (
                          <JobPhotoUpload
                            jobId={selectedJob.id}
                            photoType="after"
                            photos={((selectedJob as any).job_photos || []).filter((p: any) => p.photo_type === "after")}
                            onPhotosChange={() => queryClient.invalidateQueries({ queryKey: ["jobs", shopId] })}
                          />
                        )}
                      </div>
                     )}
                  </div>

                  {/* Internal Notes Configurado num box destacado */}
                  <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10">
                     <InternalNotesField
                        jobId={selectedJob.id}
                        initialValue={selectedJob.internal_notes || ""}
                        onSaved={() => queryClient.invalidateQueries({ queryKey: ["jobs", shopId] })}
                     />
                  </div>
                  
                  {/* Actions & WhatsApp Integration */}
                  <div className="space-y-3 pt-6 border-t border-border border-dashed">
                      
                      {/* Envio de WhatsApp só para OS que fazem sentido */}
                      <div className="flex flex-col sm:flex-row gap-3">
                         <Button
                          variant="outline"
                          className="flex-1 h-12 rounded-xl text-sm font-bold border-whatsapp text-whatsapp hover:bg-whatsapp hover:text-white shadow-none transition-colors"
                          onClick={() => handleSendWhatsApp(selectedJob, "completion")}
                         >
                          <MessageCircle className="h-5 w-5 mr-2" />
                          Enviar Relatório WhatsApp
                         </Button>

                         {(selectedJob.status === "done" || selectedJob.status === "delivered") && (
                          <Button
                            variant="secondary"
                            className="flex-1 h-12 rounded-xl text-sm font-bold shadow-none"
                            onClick={() => handleSendWhatsApp(selectedJob, "ready")}
                          >
                            🚗 Pronto para retirada
                          </Button>
                         )}
                      </div>

                      {/* Botão de Avanço de Status Gigante se n ta editando nem finalizada */}
                      {!editing && nextStatus[selectedJob.status] && selectedJob.status !== 'cancelled' && (
                        <Button
                          onClick={() => advanceStatus(selectedJob.id, selectedJob.status)}
                          className={cn(
                              "w-full h-14 rounded-2xl text-base font-black uppercase tracking-widest shadow-none transition-all",
                              selectedJob.status === 'in_progress' ? 'bg-success text-success-foreground hover:bg-success/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          )}
                        >
                          {nextLabel[selectedJob.status]}
                        </Button>
                      )}

                      {/* Action danger */}
                      {!editing && selectedJob.status !== "delivered" && selectedJob.status !== "cancelled" && (
                          <div className="flex justify-center mt-2">
                             <Button variant="ghost" className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full px-4 h-8" onClick={() => cancelJobStatus(selectedJob.id)}>
                                Cancelar Ordem de Serviço
                             </Button>
                          </div>
                      )}
                  </div>

                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
