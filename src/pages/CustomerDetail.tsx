import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomers } from "@/hooks/useShopData";
import { useCustomerJobs } from "@/hooks/useCustomerJobs";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Phone, MessageCircle, Mail, ClipboardList, Calendar, AlertTriangle, ClipboardCheck, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Enums } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import CarDiagram, { type VisualMarker } from "@/components/checklist/CarDiagram";
import JobPhotoUpload from "@/components/photos/JobPhotoUpload";
import JobPhotoGallery from "@/components/photos/JobPhotoGallery";

type JobStatus = Enums<"job_status">;

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-warning text-warning-foreground" },
  in_progress: { label: "Em execução", className: "bg-primary text-primary-foreground" },
  done: { label: "Finalizado", className: "bg-success text-success-foreground" },
  delivered: { label: "Entregue", className: "bg-muted text-muted-foreground" },
};

const nextStatus: Record<JobStatus, JobStatus | null> = {
  waiting: "in_progress",
  in_progress: "done",
  done: "delivered",
  delivered: null,
};

const nextLabel: Record<JobStatus, string> = {
  waiting: "Iniciar",
  in_progress: "Finalizar",
  done: "Marcar Entregue",
  delivered: "",
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customers, isLoading: loadingCustomer } = useCustomers();
  const { data: jobs, isLoading: loadingJobs } = useCustomerJobs(id);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const queryClient = useQueryClient();
  const { shopId } = useAuth();
  const { toast } = useToast();

  const customer = customers?.find((c) => c.id === id);

  const totalSpent = jobs?.reduce((sum, j) => sum + Number(j.total_price), 0) ?? 0;
  const totalJobs = jobs?.length ?? 0;
  const completedJobs = jobs?.filter((j) => j.status === "done").length ?? 0;

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
      queryClient.invalidateQueries({ queryKey: ["customer-jobs", id] });
      queryClient.invalidateQueries({ queryKey: ["jobs", shopId] });
      setSelectedJob(null);
    }
  };

  // Full job detail fetch for dialog (with checklist + photos)
  const [fullJob, setFullJob] = useState<any>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const openJobDetail = async (job: any) => {
    setSelectedJob(job);
    setLoadingFull(true);
    const { data } = await supabase
      .from("jobs")
      .select("*, vehicles(plate, model, color, customers(name)), job_services(*), job_checklist(*), job_photos(*)")
      .eq("id", job.id)
      .single();
    setFullJob(data);
    setLoadingFull(false);
  };

  const closeDetail = () => {
    setSelectedJob(null);
    setFullJob(null);
  };

  const jobChecklist = fullJob?.job_checklist ?? [];
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

  if (loadingCustomer) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <p className="text-center text-muted-foreground">Cliente não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold truncate">{customer.name}</h1>
        </div>

        {/* Contact info */}
        <Card className="border-border bg-secondary">
          <CardContent className="p-4 space-y-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone}
                </a>
              )}
              {customer.whatsapp && (
                <a href={`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
                  <MessageCircle className="h-3.5 w-3.5" /> {customer.whatsapp}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Mail className="h-3.5 w-3.5" /> {customer.email}
                </a>
              )}
            </div>
            {/* Stats */}
            <div className="flex gap-4 border-t border-border pt-2 text-center">
              <div className="flex-1">
                <p className="text-lg font-bold text-foreground">{totalJobs}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">OS Total</p>
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-foreground">{completedJobs}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Finalizadas</p>
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-primary">R$ {totalSpent.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Pago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job history */}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Histórico de OS</h2>

        {loadingJobs ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !jobs || jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <ClipboardList className="h-8 w-8" />
            <p className="text-sm">Nenhuma OS registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {jobs.map((job) => {
                const vehicle = (job as any).vehicles;
                const services = (job as any).job_services || [];
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card
                      className="cursor-pointer border-border bg-secondary active:bg-muted transition-colors"
                      onClick={() => openJobDetail(job)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <p className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
                              {vehicle?.plate}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {vehicle?.model}{vehicle?.color ? ` • ${vehicle.color}` : ""}
                            </p>
                          </div>
                          <Badge className={statusConfig[job.status].className}>
                            {statusConfig[job.status].label}
                          </Badge>
                        </div>
                        {/* Services list */}
                        {services.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {services.map((s: any) => s.service_name).join(", ")}
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-border pt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(job.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
        <Dialog open={!!selectedJob} onOpenChange={(o) => !o && closeDetail()}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            {loadingFull ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : fullJob && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Detalhes da OS</span>
                    <Badge className={statusConfig[fullJob.status].className}>
                      {statusConfig[fullJob.status].label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Veículo</p>
                    <p className="font-mono text-2xl font-bold uppercase tracking-wider text-foreground">
                      {fullJob.vehicles?.plate}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[fullJob.vehicles?.model, fullJob.vehicles?.color].filter(Boolean).join(" • ")}
                    </p>
                  </div>

                  {hasChecklist && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Checklist — {jobChecklist.length} {jobChecklist.length === 1 ? "problema" : "problemas"}
                      </p>
                      {visualChecklist.length > 0 && (
                        <div className="rounded-lg border border-border p-2">
                          <CarDiagram markers={visualChecklist} onAddMarker={() => {}} onRemoveMarker={() => {}} readOnly />
                        </div>
                      )}
                      {structuredChecklist.length > 0 && (
                        <div className="space-y-1.5">
                          {structuredChecklist.map((item: any) => (
                            <div key={item.id} className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/20 p-2.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm text-foreground">{item.label}</p>
                                {item.notes && <p className="text-xs text-muted-foreground mt-0.5">↳ {item.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Serviços</p>
                    {(fullJob.job_services || []).map((js: any) => (
                      <div key={js.id} className="flex justify-between text-sm">
                        <span className="text-foreground">{js.service_name}</span>
                        <span className="tabular-nums text-muted-foreground">R$ {Number(js.price).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-lg font-bold tabular-nums text-primary">R$ {Number(fullJob.total_price).toFixed(2)}</span>
                    </div>
                  </div>

                  {(fullJob.status === "done" || fullJob.status === "delivered") ? (
                    <JobPhotoGallery photos={fullJob.job_photos || []} />
                  ) : (
                    <div className="space-y-3">
                      <JobPhotoUpload
                        jobId={fullJob.id}
                        photoType="before"
                        photos={(fullJob.job_photos || []).filter((p: any) => p.photo_type === "before")}
                        onPhotosChange={() => {
                          queryClient.invalidateQueries({ queryKey: ["customer-jobs", id] });
                          queryClient.invalidateQueries({ queryKey: ["jobs", shopId] });
                        }}
                      />
                      {fullJob.status === "in_progress" && (
                        <JobPhotoUpload
                          jobId={fullJob.id}
                          photoType="after"
                          photos={(fullJob.job_photos || []).filter((p: any) => p.photo_type === "after")}
                          onPhotosChange={() => {
                            queryClient.invalidateQueries({ queryKey: ["customer-jobs", id] });
                            queryClient.invalidateQueries({ queryKey: ["jobs", shopId] });
                          }}
                        />
                      )}
                    </div>
                  )}

                  {fullJob.notes && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm text-foreground">{fullJob.notes}</p>
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Criada: {format(new Date(fullJob.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    {fullJob.started_at && <p>Iniciada: {format(new Date(fullJob.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>}
                    {fullJob.finished_at && <p>Finalizada: {format(new Date(fullJob.finished_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>}
                  </div>

                  {nextStatus[fullJob.status as JobStatus] && (
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        onClick={() => advanceStatus(fullJob.id, fullJob.status)}
                        className="h-14 w-full text-sm font-bold uppercase tracking-wider"
                      >
                        {nextLabel[fullJob.status as JobStatus]}
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
