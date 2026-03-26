import { useState, useMemo, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Plus, CalendarIcon, Clock, User, Car, Wrench, GripVertical,
  Edit, X, Play, ChevronLeft, ChevronRight, Search
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
type AppointmentStatus = "confirmed" | "pending" | "done" | "cancelled";

interface MockAppointment {
  id: string;
  time: string; // "HH:mm"
  duration: number; // minutes
  customer: string;
  service: string;
  plate: string;
  technician: string;
  status: AppointmentStatus;
  phone?: string;
  vehicle?: string;
  notes?: string;
  date: string; // "YYYY-MM-DD"
  queued?: boolean;
}

// ── Status config ──────────────────────────────────────────────
const statusCfg: Record<AppointmentStatus, { label: string; bg: string; text: string; border: string }> = {
  confirmed: { label: "Confirmado", bg: "bg-info/15", text: "text-info", border: "border-info/30" },
  pending: { label: "Pendente", bg: "bg-warning/15", text: "text-warning", border: "border-warning/30" },
  done: { label: "Finalizado", bg: "bg-success/15", text: "text-success", border: "border-success/30" },
  cancelled: { label: "Cancelado", bg: "bg-destructive/15", text: "text-destructive", border: "border-destructive/30" },
};

// ── Mock data ──────────────────────────────────────────────────
const today = format(new Date(), "yyyy-MM-dd");
const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

const MOCK_APPOINTMENTS: MockAppointment[] = [
  { id: "1", time: "08:00", duration: 60, customer: "Carlos Silva", service: "Lavagem Completa", plate: "ABC-1234", technician: "João", status: "confirmed", phone: "(11) 99999-1111", vehicle: "Honda Civic 2022 Preto", date: today },
  { id: "2", time: "09:30", duration: 90, customer: "Maria Santos", service: "Polimento", plate: "DEF-5678", technician: "Pedro", status: "pending", phone: "(11) 99999-2222", vehicle: "Toyota Corolla 2023 Branco", date: today },
  { id: "3", time: "11:00", duration: 45, customer: "João Oliveira", service: "Lavagem Simples", plate: "GHI-9012", technician: "João", status: "done", phone: "(11) 99999-3333", vehicle: "VW Gol 2020 Prata", date: today },
  { id: "4", time: "13:00", duration: 120, customer: "Ana Costa", service: "Cristalização", plate: "JKL-3456", technician: "Lucas", status: "confirmed", phone: "(11) 99999-4444", vehicle: "BMW X1 2024 Azul", date: today },
  { id: "5", time: "14:30", duration: 60, customer: "Pedro Ferreira", service: "Lavagem Completa", plate: "MNO-7890", technician: "Pedro", status: "cancelled", phone: "(11) 99999-5555", vehicle: "Fiat Argo 2021 Vermelho", date: today },
  { id: "6", time: "16:00", duration: 90, customer: "Lucas Mendes", service: "Higienização Interna", plate: "PQR-1234", technician: "Lucas", status: "confirmed", phone: "(11) 99999-6666", vehicle: "Jeep Compass 2023 Preto", date: today },
  { id: "7", time: "09:00", duration: 60, customer: "Fernanda Lima", service: "Lavagem Completa", plate: "STU-5678", technician: "João", status: "confirmed", date: tomorrow },
  { id: "8", time: "11:00", duration: 90, customer: "Roberto Dias", service: "Polimento", plate: "VWX-9012", technician: "Pedro", status: "pending", date: tomorrow },
];

const MOCK_QUEUE: MockAppointment[] = [
  { id: "q1", time: "", duration: 60, customer: "Thiago Rocha", service: "Lavagem Simples", plate: "YZA-3456", technician: "", status: "pending", date: today, queued: true },
  { id: "q2", time: "", duration: 90, customer: "Camila Alves", service: "Polimento + Cera", plate: "BCD-7890", technician: "", status: "pending", date: today, queued: true },
  { id: "q3", time: "", duration: 45, customer: "Bruno Souza", service: "Lavagem Rápida", plate: "EFG-1234", technician: "", status: "pending", date: today, queued: true },
];

const TECHNICIANS = ["João", "Pedro", "Lucas"];
const SERVICES_LIST = ["Lavagem Simples", "Lavagem Completa", "Polimento", "Cristalização", "Higienização Interna", "Polimento + Cera"];
const MOCK_CUSTOMERS = [
  { id: "c1", name: "Carlos Silva", vehicles: [{ id: "v1", label: "Honda Civic 2022 - ABC-1234" }] },
  { id: "c2", name: "Maria Santos", vehicles: [{ id: "v2", label: "Toyota Corolla 2023 - DEF-5678" }] },
  { id: "c3", name: "João Oliveira", vehicles: [{ id: "v3", label: "VW Gol 2020 - GHI-9012" }] },
  { id: "c4", name: "Ana Costa", vehicles: [{ id: "v4", label: "BMW X1 2024 - JKL-3456" }] },
  { id: "c5", name: "Pedro Ferreira", vehicles: [{ id: "v5", label: "Fiat Argo 2021 - MNO-7890" }] },
  { id: "c6", name: "Fernanda Lima", vehicles: [{ id: "v6", label: "Hyundai HB20 2022 - STU-5678" }] },
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7..20

// ── Component ──────────────────────────────────────────────────
export default function Agendamentos() {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterTech, setFilterTech] = useState("all");
  const [filterService, setFilterService] = useState("all");
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);
  const [queue, setQueue] = useState(MOCK_QUEUE);

  // Detail sheet
  const [detailApt, setDetailApt] = useState<MockAppointment | null>(null);
  // New appointment dialog
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Drag state
  const dragRef = useRef<{ id: string; source: "timeline" | "queue" } | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // ── Filtered appointments ──
  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (a.date !== dateStr) return false;
      if (filterTech !== "all" && a.technician !== filterTech) return false;
      if (filterService !== "all" && a.service !== filterService) return false;
      return true;
    });
  }, [appointments, dateStr, filterTech, filterService]);

  // ── Week data ──
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekAppointments = useMemo(() => {
    return weekDays.map(day => {
      const ds = format(day, "yyyy-MM-dd");
      return {
        day,
        items: appointments.filter(a => a.date === ds),
      };
    });
  }, [appointments, weekDays]);

  // ── Drag handlers ──
  const handleDragStart = (id: string, source: "timeline" | "queue") => {
    dragRef.current = { id, source };
  };

  const handleDropOnTimeline = (hour: number) => {
    if (!dragRef.current) return;
    const { id, source } = dragRef.current;
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;

    if (source === "queue") {
      const item = queue.find(q => q.id === id);
      if (item) {
        setQueue(prev => prev.filter(q => q.id !== id));
        setAppointments(prev => [...prev, { ...item, time: timeStr, date: dateStr, queued: false }]);
      }
    } else {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, time: timeStr } : a));
    }
    dragRef.current = null;
  };

  // ── Navigate date ──
  const prevDay = () => setSelectedDate(prev => addDays(prev, -1));
  const nextDay = () => setSelectedDate(prev => addDays(prev, 1));

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Agendamentos</h1>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setView("daily")}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  view === "daily" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Diário
              </button>
              <button
                onClick={() => setView("weekly")}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  view === "weekly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Semanal
              </button>
            </div>
            <Button onClick={() => setShowNewDialog(true)} size="sm" className="rounded-lg">
              <Plus className="h-4 w-4 mr-1" /> Novo agendamento
            </Button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <Select value={filterTech} onValueChange={setFilterTech}>
            <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg"><SelectValue placeholder="Técnico" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos técnicos</SelectItem>
              {TECHNICIANS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg"><SelectValue placeholder="Serviço" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos serviços</SelectItem>
              {SERVICES_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
        </div>

        {/* ── Main content ── */}
        <div className="flex gap-4">
          {/* Timeline / Weekly */}
          <div className="flex-1 min-w-0">
            {view === "daily" ? (
              <DailyTimeline
                hours={HOURS}
                appointments={filtered}
                onDragStart={handleDragStart}
                onDrop={handleDropOnTimeline}
                onSelect={setDetailApt}
              />
            ) : (
              <WeeklyView
                weekDays={weekDays}
                weekAppointments={weekAppointments}
                onSelect={setDetailApt}
              />
            )}
          </div>

          {/* Queue sidebar */}
          <div className="w-[240px] shrink-0 hidden lg:block">
            <QueueSidebar queue={queue} onDragStart={handleDragStart} onSelect={setDetailApt} />
          </div>
        </div>
      </div>

      {/* ── Detail Sheet ── */}
      <AppointmentDetailSheet apt={detailApt} onClose={() => setDetailApt(null)} />

      {/* ── New Appointment Dialog ── */}
      <NewAppointmentDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </AppLayout>
  );
}

// ── Daily Timeline ─────────────────────────────────────────────
function DailyTimeline({
  hours, appointments, onDragStart, onDrop, onSelect,
}: {
  hours: number[];
  appointments: MockAppointment[];
  onDragStart: (id: string, source: "timeline" | "queue") => void;
  onDrop: (hour: number) => void;
  onSelect: (a: MockAppointment) => void;
}) {
  const ROW_H = 72; // px per hour

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="relative" style={{ minHeight: hours.length * ROW_H }}>
          {/* Hour lines */}
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-border/50 flex"
              style={{ top: i * ROW_H }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(h)}
            >
              <div className="w-16 shrink-0 px-3 py-1">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {h.toString().padStart(2, "0")}:00
                </span>
              </div>
              <div className="flex-1 min-h-[72px]" />
            </div>
          ))}

          {/* Appointment blocks */}
          {appointments.map(apt => {
            const [hh, mm] = apt.time.split(":").map(Number);
            const topOffset = (hh - hours[0]) * ROW_H + (mm / 60) * ROW_H;
            const height = Math.max((apt.duration / 60) * ROW_H, 36);
            const cfg = statusCfg[apt.status];

            return (
              <div
                key={apt.id}
                draggable
                onDragStart={() => onDragStart(apt.id, "timeline")}
                onClick={() => onSelect(apt)}
                className={cn(
                  "absolute left-16 right-3 rounded-lg border cursor-pointer transition-shadow hover:shadow-md",
                  cfg.bg, cfg.border
                )}
                style={{ top: topOffset + 2, height: height - 4 }}
              >
                <div className="px-3 py-1.5 h-full flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0 cursor-grab" />
                    <span className={cn("text-xs font-semibold", cfg.text)}>{apt.time}</span>
                    <span className="text-xs font-medium text-foreground truncate">{apt.customer}</span>
                    <Badge variant="outline" className={cn("ml-auto text-[10px] h-5 shrink-0", cfg.text, cfg.border)}>
                      {cfg.label}
                    </Badge>
                  </div>
                  {height > 44 && (
                    <div className="flex items-center gap-3 mt-1 ml-5">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Wrench className="h-3 w-3" /> {apt.service}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Car className="h-3 w-3" /> {apt.plate}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> {apt.technician}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Weekly View ────────────────────────────────────────────────
function WeeklyView({
  weekDays, weekAppointments, onSelect,
}: {
  weekDays: Date[];
  weekAppointments: { day: Date; items: MockAppointment[] }[];
  onSelect: (a: MockAppointment) => void;
}) {
  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-border">
        {weekAppointments.map(({ day, items }, i) => (
          <div key={i} className="min-h-[400px]">
            <div className={cn(
              "p-2 text-center border-b border-border",
              isToday(day) && "bg-primary/5"
            )}>
              <p className="text-[10px] uppercase text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </p>
              <p className={cn(
                "text-sm font-semibold",
                isToday(day) ? "text-primary" : "text-foreground"
              )}>
                {format(day, "dd")}
              </p>
            </div>
            <div className="p-1.5 space-y-1">
              {items.map(apt => {
                const cfg = statusCfg[apt.status];
                return (
                  <button
                    key={apt.id}
                    onClick={() => onSelect(apt)}
                    className={cn(
                      "w-full text-left rounded-md p-1.5 border text-[10px] leading-tight transition-colors hover:shadow-sm",
                      cfg.bg, cfg.border
                    )}
                  >
                    <p className={cn("font-semibold", cfg.text)}>{apt.time}</p>
                    <p className="text-foreground font-medium truncate">{apt.customer}</p>
                    <p className="text-muted-foreground truncate">{apt.service}</p>
                  </button>
                );
              })}
              {items.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-6 italic">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Queue Sidebar ──────────────────────────────────────────────
function QueueSidebar({
  queue, onDragStart, onSelect,
}: {
  queue: MockAppointment[];
  onDragStart: (id: string, source: "timeline" | "queue") => void;
  onSelect: (a: MockAppointment) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl h-[calc(100vh-260px)] flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Fila de espera</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{queue.length} aguardando</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {queue.map(q => (
            <div
              key={q.id}
              draggable
              onDragStart={() => onDragStart(q.id, "queue")}
              onClick={() => onSelect(q)}
              className="bg-warning/10 border border-warning/20 rounded-lg p-2.5 cursor-grab hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-xs font-medium text-foreground truncate">{q.customer}</span>
              </div>
              <p className="text-[11px] text-muted-foreground ml-[18px]">{q.service}</p>
              <div className="flex items-center gap-2 mt-1 ml-[18px]">
                <span className="text-[10px] text-muted-foreground">{q.plate}</span>
                <span className="text-[10px] text-muted-foreground">• {q.duration}min</span>
              </div>
            </div>
          ))}
          {queue.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 italic">Fila vazia</p>
          )}
        </div>
      </ScrollArea>
      <div className="p-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">Arraste para a timeline →</p>
      </div>
    </div>
  );
}

// ── Detail Sheet ───────────────────────────────────────────────
function AppointmentDetailSheet({ apt, onClose }: { apt: MockAppointment | null; onClose: () => void }) {
  if (!apt) return null;
  const cfg = statusCfg[apt.status];

  return (
    <Sheet open={!!apt} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detalhes do Agendamento
            <Badge className={cn("text-[10px]", cfg.bg, cfg.text, cfg.border)}>{cfg.label}</Badge>
          </SheetTitle>
          <SheetDescription>Informações completas do agendamento.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock icon={<Clock className="h-4 w-4" />} label="Horário" value={apt.time || "Sem horário"} />
            <InfoBlock icon={<CalendarIcon className="h-4 w-4" />} label="Data" value={apt.date} />
            <InfoBlock icon={<User className="h-4 w-4" />} label="Cliente" value={apt.customer} />
            <InfoBlock icon={<Car className="h-4 w-4" />} label="Placa" value={apt.plate} />
            <InfoBlock icon={<Wrench className="h-4 w-4" />} label="Serviço" value={apt.service} />
            <InfoBlock icon={<User className="h-4 w-4" />} label="Técnico" value={apt.technician || "Não definido"} />
          </div>

          {apt.vehicle && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Veículo</p>
              <p className="text-sm text-foreground">{apt.vehicle}</p>
            </div>
          )}

          {apt.phone && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Telefone</p>
              <p className="text-sm text-foreground">{apt.phone}</p>
            </div>
          )}

          {apt.notes && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Observações</p>
              <p className="text-sm text-foreground">{apt.notes}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button className="rounded-lg" size="sm">
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
            </Button>
            <Button variant="outline" className="rounded-lg" size="sm">
              <Play className="h-3.5 w-3.5 mr-1.5" /> Iniciar OS
            </Button>
            <Button variant="destructive" className="rounded-lg" size="sm">
              <X className="h-3.5 w-3.5 mr-1.5" /> Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ── New Appointment Dialog ─────────────────────────────────────
function NewAppointmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");

  const filteredCustomers = MOCK_CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const customerVehicles = MOCK_CUSTOMERS.find(c => c.id === selectedCustomer)?.vehicles || [];

  const toggleService = (s: string) => {
    setSelectedServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>Preencha os dados para criar um novo agendamento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Customer search */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Cliente</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start rounded-lg text-sm h-9">
                  <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  {selectedCustomer
                    ? MOCK_CUSTOMERS.find(c => c.id === selectedCustomer)?.name
                    : "Buscar cliente..."
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 pointer-events-auto" align="start">
                <div className="p-2 border-b border-border">
                  <Input
                    placeholder="Digitar nome..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="h-8 text-xs rounded-md"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c.id);
                        setSelectedVehicle("");
                        setCustomerSearch("");
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors",
                        selectedCustomer === c.id && "bg-secondary font-medium"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Veículo</label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle} disabled={!selectedCustomer}>
              <SelectTrigger className="rounded-lg h-9 text-sm"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                {customerVehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Services (multi) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Serviços</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SERVICES_LIST.map(s => (
                <label
                  key={s}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors",
                    selectedServices.includes(s)
                      ? "bg-primary/5 border-primary/30 text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Checkbox
                    checked={selectedServices.includes(s)}
                    onCheckedChange={() => toggleService(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full rounded-lg h-9 text-sm justify-start", !date && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {date ? format(date, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Horário</label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="rounded-lg h-9 text-sm"><SelectValue placeholder="00:00" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 27 }, (_, i) => {
                    const h = Math.floor(i / 2) + 7;
                    const m = i % 2 === 0 ? "00" : "30";
                    if (h > 19) return null;
                    const val = `${h.toString().padStart(2, "0")}:${m}`;
                    return <SelectItem key={val} value={val}>{val}</SelectItem>;
                  }).filter(Boolean)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Technician */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Técnico</label>
            <Select value={technician} onValueChange={setTechnician}>
              <SelectTrigger className="rounded-lg h-9 text-sm"><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
              <SelectContent>
                {TECHNICIANS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Observações</label>
            <Textarea
              className="rounded-lg text-sm min-h-[60px]"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalhes adicionais..."
            />
          </div>

          <Button type="submit" className="w-full rounded-lg">Confirmar agendamento</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
