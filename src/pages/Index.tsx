import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/hooks/useShopData";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Car, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Index() {
  const { profile, role } = useAuth();
  const { data: jobs, isLoading } = useJobs();
  const navigate = useNavigate();

  const waiting = jobs?.filter((j) => j.status === "waiting").length ?? 0;
  const inProgress = jobs?.filter((j) => j.status === "in_progress").length ?? 0;
  const doneToday = jobs?.filter((j) => {
    if (j.status !== "done" || !j.finished_at) return false;
    return new Date(j.finished_at).toDateString() === new Date().toDateString();
  }).length ?? 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(" ")[0] ?? ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {role === "owner" ? "Painel do proprietário" : "Painel do funcionário"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<Clock className="h-5 w-5" />}
                value={waiting}
                label="Aguardando"
                color="text-warning"
              />
              <StatCard
                icon={<Car className="h-5 w-5" />}
                label="Em execução"
                color="text-primary"
              />
              <StatCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                value={doneToday}
                label="Concluídos"
                color="text-success"
              />
            </div>

            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => navigate("/checkin")}
                className="h-14 w-full text-sm font-bold uppercase tracking-wider"
              >
                <Plus className="mr-2 h-5 w-5" />
                Novo Check-in
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <Card className="border-border bg-secondary">
      <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
        <span className={color}>{icon}</span>
        <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
