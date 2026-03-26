import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Edit, Printer, Clock, User, Car, Wrench, CreditCard,
  CheckCircle2, AlertCircle, Camera, FileText, MessageSquare
} from "lucide-react";

type OSStatus = "waiting" | "in_progress" | "done" | "delivered" | "cancelled";

const statusCfg: Record<OSStatus, { label: string; bg: string; text: string }> = {
  waiting: { label: "Aguardando", bg: "bg-warning/15", text: "text-warning" },
  in_progress: { label: "Em execução", bg: "bg-primary/15", text: "text-primary" },
  done: { label: "Finalizado", bg: "bg-success/15", text: "text-success" },
  delivered: { label: "Entregue", bg: "bg-muted", text: "text-muted-foreground" },
  cancelled: { label: "Cancelado", bg: "bg-destructive/15", text: "text-destructive" },
};

// Same mock data for lookup
const MOCK_OS = [
  { id: "1", number: "OS-001", date: "2025-03-20", customer: "Carlos Silva", customerPhone: "(11) 99999-1111", vehicleModel: "Honda Civic 2022", plate: "ABC-1234", color: "Preto", services: [{ name: "Lavagem Completa", price: 80 }, { name: "Polimento", price: 150 }], technician: "João", total: 230, discount: 0, status: "in_progress" as OSStatus, notes: "Cliente pede cuidado extra no capô", internalNotes: "Risco no para-lama esquerdo já existia", paymentMethod: "Crédito", createdAt: "2025-03-20T08:30:00", startedAt: "2025-03-20T09:00:00", finishedAt: null, deliveredAt: null },
  { id: "2", number: "OS-002", date: "2025-03-20", customer: "Maria Santos", customerPhone: "(11) 99999-2222", vehicleModel: "Toyota Corolla 2023", plate: "DEF-5678", color: "Branco", services: [{ name: "Cristalização", price: 250 }], technician: "Pedro", total: 250, discount: 0, status: "waiting" as OSStatus, notes: "", internalNotes: "", paymentMethod: "", createdAt: "2025-03-20T09:15:00", startedAt: null, finishedAt: null, deliveredAt: null },
  { id: "3", number: "OS-003", date: "2025-03-19", customer: "João Oliveira", customerPhone: "(11) 99999-3333", vehicleModel: "VW Gol 2020", plate: "GHI-9012", color: "Prata", services: [{ name: "Lavagem Simples", price: 45 }], technician: "João", total: 45, discount: 0, status: "done" as OSStatus, notes: "", internalNotes: "", paymentMethod: "Dinheiro", createdAt: "2025-03-19T10:00:00", startedAt: "2025-03-19T10:30:00", finishedAt: "2025-03-19T11:15:00", deliveredAt: null },
  { id: "4", number: "OS-004", date: "2025-03-19", customer: "Ana Costa", customerPhone: "(11) 99999-4444", vehicleModel: "BMW X1 2024", plate: "JKL-3456", color: "Azul", services: [{ name: "Polimento", price: 150 }, { name: "Cristalização", price: 250 }, { name: "Higienização Interna", price: 120 }], technician: "Lucas", total: 494, discount: 26, status: "delivered" as OSStatus, notes: "Aplicar cera final", internalNotes: "Banco traseiro com mancha difícil", paymentMethod: "Débito", createdAt: "2025-03-19T07:45:00", startedAt: "2025-03-19T08:00:00", finishedAt: "2025-03-19T12:00:00", deliveredAt: "2025-03-19T14:00:00" },
  { id: "5", number: "OS-005", date: "2025-03-18", customer: "Pedro Ferreira", customerPhone: "(11) 99999-5555", vehicleModel: "Fiat Argo 2021", plate: "MNO-7890", color: "Vermelho", services: [{ name: "Lavagem Completa", price: 80 }], technician: "Pedro", total: 80, discount: 0, status: "cancelled" as OSStatus, notes: "Cliente cancelou", internalNotes: "", paymentMethod: "", createdAt: "2025-03-18T14:00:00", startedAt: null, finishedAt: null, deliveredAt: null },
];

const timelineSteps = [
  { key: "createdAt", label: "OS Criada", icon: FileText },
  { key: "startedAt", label: "Execução Iniciada", icon: Wrench },
  { key: "finishedAt", label: "Serviço Finalizado", icon: CheckCircle2 },
  { key: "deliveredAt", label: "Veículo Entregue", icon: Car },
];

const mockChecklistItems = [
  { label: "Lataria sem danos", checked: true },
  { label: "Rodas em bom estado", checked: true },
  { label: "Vidros sem trincas", checked: true },
  { label: "Interior limpo", checked: false },
  { label: "Motor sem vazamentos", checked: true },
  { label: "Documentos verificados", checked: true },
];

const mockPhotos = [
  { url: "/placeholder.svg", label: "Frente" },
  { url: "/placeholder.svg", label: "Traseira" },
  { url: "/placeholder.svg", label: "Lateral E" },
  { url: "/placeholder.svg", label: "Lateral D" },
];

export default function OSDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const os = MOCK_OS.find(o => o.id === id);

  if (!os) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">OS não encontrada</p>
          <Button variant="outline" className="mt-4 rounded-lg" onClick={() => navigate("/os")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const cfg = statusCfg[os.status];
  const subtotal = os.services.reduce((s, sv) => s + sv.price, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigate("/os")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{os.number}</h1>
                <Badge variant="outline" className={cn("text-[10px] border-0", cfg.bg, cfg.text)}>{cfg.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Criada em {format(new Date(os.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg text-xs"><Edit className="h-3.5 w-3.5 mr-1" /> Editar</Button>
            <Button variant="outline" size="sm" className="rounded-lg text-xs"><Printer className="h-3.5 w-3.5 mr-1" /> Imprimir</Button>
            <Button variant="outline" size="sm" className="rounded-lg text-xs"><MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status Timeline */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>
              <div className="flex items-start">
                {timelineSteps.map((step, i) => {
                  const value = (os as any)[step.key];
                  const isActive = !!value;
                  const isLast = i === timelineSteps.length - 1;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center relative">
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors",
                        isActive
                          ? "bg-success/15 border-success text-success"
                          : "bg-secondary border-border text-muted-foreground"
                      )}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <p className={cn("text-[10px] mt-1.5 text-center font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
                      {value && <p className="text-[9px] text-muted-foreground">{format(new Date(value), "HH:mm")}</p>}
                      {!isLast && (
                        <div className={cn(
                          "absolute top-4 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5",
                          isActive ? "bg-success" : "bg-border"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Services */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Serviços</h3>
              <div className="space-y-2">
                {os.services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">R$ {s.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {os.discount > 0 && (
                  <div className="flex justify-between text-xs text-destructive">
                    <span>Desconto</span><span>- R$ {os.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground">
                  <span>Total</span><span>R$ {os.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Checklist de Inspeção</h3>
              <div className="grid grid-cols-2 gap-2">
                {mockChecklistItems.map((item, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-xs border",
                    item.checked ? "bg-success/5 border-success/20 text-foreground" : "bg-destructive/5 border-destructive/20 text-foreground"
                  )}>
                    <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0", item.checked ? "text-success" : "text-destructive")} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Fotos</h3>
              <div className="grid grid-cols-4 gap-2">
                {mockPhotos.map((p, i) => (
                  <div key={i} className="aspect-square bg-secondary rounded-lg flex flex-col items-center justify-center border border-border">
                    <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">
            {/* Client info */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Cliente</h3>
              <div className="space-y-2">
                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Nome" value={os.customer} />
                <InfoRow icon={<MessageSquare className="h-3.5 w-3.5" />} label="Telefone" value={os.customerPhone} />
              </div>
            </div>

            {/* Vehicle info */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Veículo</h3>
              <div className="space-y-2">
                <InfoRow icon={<Car className="h-3.5 w-3.5" />} label="Modelo" value={os.vehicleModel} />
                <InfoRow icon={<FileText className="h-3.5 w-3.5" />} label="Placa" value={os.plate} />
                <InfoRow icon={<span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground inline-block" />} label="Cor" value={os.color} />
              </div>
            </div>

            {/* Technician */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Execução</h3>
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Técnico" value={os.technician} />
              {os.paymentMethod && <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="Pagamento" value={os.paymentMethod} />}
            </div>

            {/* Notes */}
            {(os.notes || os.internalNotes) && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Observações</h3>
                {os.notes && (
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Cliente</p>
                    <p className="text-xs text-foreground">{os.notes}</p>
                  </div>
                )}
                {os.internalNotes && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                    <p className="text-[10px] text-warning mb-0.5 uppercase tracking-wider font-medium">Interno</p>
                    <p className="text-xs text-foreground">{os.internalNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {os.status === "waiting" && (
                <Button className="w-full rounded-lg" size="sm"><Wrench className="h-3.5 w-3.5 mr-1.5" /> Iniciar Execução</Button>
              )}
              {os.status === "in_progress" && (
                <Button className="w-full rounded-lg" size="sm"><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Finalizar Serviço</Button>
              )}
              {os.status === "done" && (
                <Button className="w-full rounded-lg" size="sm"><Car className="h-3.5 w-3.5 mr-1.5" /> Marcar como Entregue</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
