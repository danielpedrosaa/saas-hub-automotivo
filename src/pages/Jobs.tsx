import { useState, useEffect } from "react";
import { useJobs } from "@/hooks/useShopData";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ClipboardList, Calendar, Search, ArrowUpDown, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import type { Enums } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CarDiagram, { type VisualMarker } from "@/components/checklist/CarDiagram";

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

export default function Jobs() {
  const { data: jobs, isLoading } = useJobs();
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const queryClient = useQueryClient();
  const { shopId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
                    <p className="text-xs text-muted-foreground">Serviços</p>
                    {((selectedJob as any).job_services || []).map((js: any) => (
                      <div key={js.id} className="flex justify-between text-sm">
                        <span className="text-foreground">{js.service_name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          R$ {Number(js.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-lg font-bold tabular-nums text-primary">
                        R$ {Number(selectedJob.total_price).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedJob.notes && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm text-foreground">{selectedJob.notes}</p>
                    </div>
                  )}

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
                  {nextStatus[selectedJob.status] && (
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
