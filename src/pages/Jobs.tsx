import { useState } from "react";
import { useJobs, useServices } from "@/hooks/useShopData";
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
import { Loader2, Plus, ClipboardList, Calendar, Search, ArrowUpDown, ClipboardCheck, AlertTriangle, Pencil, Trash2, X, Check, Percent, Lock, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import type { Enums } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CarDiagram, { type VisualMarker } from "@/components/checklist/CarDiagram";
import JobPhotoUpload from "@/components/photos/JobPhotoUpload";
import JobPhotoGallery from "@/components/photos/JobPhotoGallery";

type JobStatus = Enums<"job_status">;

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-warning text-warning-foreground" },
  in_progress: { label: "Em Execução", className: "bg-primary text-primary-foreground" },
  done: { label: "Finalizado", className: "bg-success text-success-foreground" },
};

const nextStatus: Record<JobStatus, JobStatus | null> = {
  waiting: "in_progress",
  in_progress: "done",
  done: null,
};

const nextLabel: Record<JobStatus, string> = {
  waiting: "Iniciar",
  in_progress: "Finalizar",
  done: "",
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

  const { data: jobs, isLoading } = useJobs();
  const { data: allServices } = useServices();
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [search, setSearch] = useState("");
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
      // Delete old services and re-insert
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

  const filtered = (jobs ?? [])
    .filter((j) => filter === "all" || j.status === filter)
    .filter((j) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const customerName = (j as any).vehicles?.customers?.name?.toLowerCase() ?? "";
      const plate = (j as any).vehicles?.plate?.toLowerCase() ?? "";
      return customerName.includes(q) || plate.includes(q);
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortAsc ? da - db : db - da;
    });

  const advanceStatus = async (jobId: string, current: JobStatus) => {
    const next = nextStatus[current];
    if (!next) return;

    const updates: any = { status: next };
    if (next === "in_progress") updates.started_at = new Date().toISOString();
    if (next === "done") updates.finished_at = new Date().toISOString();

    const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["jobs", shopId] });
      setSelectedJob(null);
    }
  };

  // Extract checklist data from selected job
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Ordens de Serviço</h1>
          <Button size="icon" onClick={() => navigate("/checkin")} className="h-10 w-10">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "waiting", "in_progress", "done"] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilter(s)}
              className="shrink-0 text-xs"
            >
              {s === "all" ? "Todas" : statusConfig[s].label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente ou placa..."
              className="h-10 pl-10 text-sm"
            />
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setSortAsc(!sortAsc)}
            className="h-10 w-10 shrink-0"
            title={sortAsc ? "Mais antigas primeiro" : "Mais recentes primeiro"}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <ClipboardList className="h-10 w-10" />
            <p className="text-sm">Nenhuma OS encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((job) => {
                const vehicle = (job as any).vehicles;
                const customer = vehicle?.customers;
                const checklistCount = ((job as any).job_checklist || []).length;

                return (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card
                      className="cursor-pointer border-border bg-secondary active:bg-muted transition-colors"
                      onClick={() => setSelectedJob(job)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-mono text-xl font-bold uppercase tracking-wider text-foreground">
                              {vehicle?.plate}
                            </p>
                            {customer?.name && (
                              <p className="text-sm text-muted-foreground">{customer.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {vehicle?.model}
                              {vehicle?.color ? ` • ${vehicle.color}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <Badge className={statusConfig[job.status].className}>
                              {statusConfig[job.status].label}
                            </Badge>
                            {checklistCount > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                {checklistCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(job.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-primary">
                            R$ {Number(job.total_price).toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* OS Detail Dialog */}
        <Dialog open={!!selectedJob} onOpenChange={(o) => !o && setSelectedJob(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            {selectedJob && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Detalhes da OS</span>
                    <Badge className={statusConfig[selectedJob.status].className}>
                      {statusConfig[selectedJob.status].label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Vehicle + Customer */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Veículo</p>
                    <p className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground">
                      {(selectedJob as any).vehicles?.plate}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[(selectedJob as any).vehicles?.model, (selectedJob as any).vehicles?.color]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>

                  {(selectedJob as any).vehicles?.customers?.name && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="text-sm font-semibold text-foreground">
                        {(selectedJob as any).vehicles.customers.name}
                      </p>
                    </div>
                  )}

                  {/* Checklist section */}
                  {hasChecklist && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Checklist — {jobChecklist.length} {jobChecklist.length === 1 ? "problema" : "problemas"}
                      </p>

                      {visualChecklist.length > 0 && (
                        <div className="rounded-lg border border-border p-2">
                          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Diagrama visual</p>
                          <CarDiagram
                            markers={visualChecklist}
                            onAddMarker={() => {}}
                            onRemoveMarker={() => {}}
                            readOnly
                          />
                        </div>
                      )}

                      {structuredChecklist.length > 0 && (
                        <div className="space-y-1.5">
                          {structuredChecklist.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/20 p-2.5"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm text-foreground">{item.label}</p>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground mt-0.5">↳ {item.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Services */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Serviços</p>
                      {selectedJob.status !== "done" && !editing && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(selectedJob)} className="h-7 gap-1 text-xs">
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                      )}
                    </div>

                    {editing ? (
                      <div className="space-y-2">
                        {editServices.map((s) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <span className="text-sm text-foreground flex-1 truncate">{s.service_name}</span>
                            <div className="relative w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={s.price}
                                onChange={(e) => updateEditPrice(s.id, Number(e.target.value))}
                                className="h-8 pl-8 text-sm tabular-nums"
                              />
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeEditService(s.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}

                        {/* Add service */}
                        {allServices && allServices.filter((s) => s.active && !editServices.find((es) => es.service_id === s.id)).length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Adicionar serviço</p>
                            <div className="flex flex-wrap gap-1.5">
                              {allServices.filter((s) => s.active && !editServices.find((es) => es.service_id === s.id)).map((svc) => (
                                <Button key={svc.id} variant="outline" size="sm" className="h-7 text-xs" onClick={() => addServiceToEdit(svc)}>
                                  + {svc.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Subtotal + discount */}
                        <div className="border-t border-border pt-2 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="tabular-nums text-foreground">R$ {editSubtotal.toFixed(2)}</span>
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
                                max={editSubtotal}
                                value={editDiscount}
                                onChange={(e) => setEditDiscount(Math.min(Number(e.target.value), editSubtotal))}
                                className="h-8 pl-8 text-sm tabular-nums"
                              />
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">Valor Final</span>
                            <span className="text-lg font-bold tabular-nums text-primary">R$ {editFinal.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={cancelEdit} className="flex-1 h-10">
                            Cancelar
                          </Button>
                          <Button onClick={saveEdit} disabled={savingEdit || editServices.length === 0} className="flex-1 h-10">
                            {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {((selectedJob as any).job_services || []).map((js: any) => (
                          <div key={js.id} className="flex justify-between text-sm">
                            <span className="text-foreground">{js.service_name}</span>
                            <span className="tabular-nums text-muted-foreground">
                              R$ {Number(js.price).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-border pt-2 space-y-1">
                          {Number(selectedJob.discount || 0) > 0 && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="tabular-nums text-muted-foreground">
                                  R$ {(Number(selectedJob.total_price) + Number(selectedJob.discount)).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-destructive flex items-center gap-1">
                                  <Percent className="h-3 w-3" /> Desconto
                                </span>
                                <span className="tabular-nums text-destructive">
                                  - R$ {Number(selectedJob.discount).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">
                              {Number(selectedJob.discount || 0) > 0 ? "Valor Final" : "Total"}
                            </span>
                            <span className="text-lg font-bold tabular-nums text-primary">
                              R$ {Number(selectedJob.total_price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Photos section */}
                  {selectedJob.status === "done" ? (
                    <JobPhotoGallery photos={(selectedJob as any).job_photos || []} />
                  ) : (
                    <div className="space-y-3">
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

                  {/* Notes */}
                  {selectedJob.notes && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm text-foreground">{selectedJob.notes}</p>
                    </div>
                  )}

                  {/* Internal Notes */}
                  <InternalNotesField
                    jobId={selectedJob.id}
                    initialValue={selectedJob.internal_notes || ""}
                    onSaved={() => queryClient.invalidateQueries({ queryKey: ["jobs", shopId] })}
                  />

                  {/* Timestamps */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Criada: {format(new Date(selectedJob.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    {selectedJob.started_at && (
                      <p>Iniciada: {format(new Date(selectedJob.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    )}
                    {selectedJob.finished_at && (
                      <p>Finalizada: {format(new Date(selectedJob.finished_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    )}
                  </div>

                  {/* Status action */}
                  {!editing && nextStatus[selectedJob.status] && (
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        onClick={() => advanceStatus(selectedJob.id, selectedJob.status)}
                        className="h-14 w-full text-sm font-bold uppercase tracking-wider"
                      >
                        {nextLabel[selectedJob.status]}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
