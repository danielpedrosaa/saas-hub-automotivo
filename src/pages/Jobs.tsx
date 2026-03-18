import { useState } from "react";
import { useJobs } from "@/hooks/useShopData";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Enums } from "@/integrations/supabase/types";

type JobStatus = Enums<"job_status">;

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-warning text-warning-foreground" },
  in_progress: { label: "Em Processo", className: "bg-primary text-primary-foreground" },
  done: { label: "Concluído", className: "bg-success text-success-foreground" },
};

const nextStatus: Record<JobStatus, JobStatus | null> = {
  waiting: "in_progress",
  in_progress: "done",
  done: null,
};

export default function Jobs() {
  const { data: jobs, isLoading } = useJobs();
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const queryClient = useQueryClient();
  const { shopId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const filtered = jobs?.filter((j) => filter === "all" || j.status === filter) ?? [];

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
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Veículos</h1>
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
              {s === "all" ? "Todos" : statusConfig[s].label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum veículo encontrado
          </p>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card className="border-border bg-secondary">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="font-mono text-xl font-bold uppercase tracking-wider text-foreground">
                          {(job as any).vehicles?.plate}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(job as any).vehicles?.model} • {(job as any).services?.name ?? "—"}
                        </p>
                        <Badge className={statusConfig[job.status].className}>
                          {statusConfig[job.status].label}
                        </Badge>
                      </div>
                      {nextStatus[job.status] && (
                        <motion.div whileTap={{ scale: 0.95 }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => advanceStatus(job.id, job.status)}
                            className="min-h-[48px] text-xs"
                          >
                            {job.status === "waiting" ? "Iniciar" : "Concluir"}
                          </Button>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
