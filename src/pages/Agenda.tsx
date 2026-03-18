import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppointments, useCustomers, useVehicles, useServices } from "@/hooks/useShopData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Plus, Clock, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'done' | 'cancelled' | 'no_show';

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning text-warning-foreground" },
  confirmed: { label: "Confirmado", className: "bg-success text-success-foreground" },
  in_progress: { label: "Em Progresso", className: "bg-primary text-primary-foreground" },
  done: { label: "Finalizado", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", className: "bg-destructive text-destructive-foreground" },
  no_show: { label: "Não Compareceu", className: "bg-muted text-muted-foreground" }
};

export default function Agenda() {
  const { shopId, user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: appointments, isLoading } = useAppointments();
  const { data: customers } = useCustomers();
  const { data: services } = useServices();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [listFilter, setListFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form State
  const [customerId, setCustomerId] = useState("");
  const { data: vehicles } = useVehicles(customerId || undefined);
  const [vehicleId, setVehicleId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const selectedDayItems = useMemo(() => {
    if (!appointments || !selectedDate) return [];
    return appointments.filter(a => isSameDay(parseISO(a.scheduled_at), selectedDate));
  }, [appointments, selectedDate]);

  const listItems = useMemo(() => {
    if (!appointments) return [];
    let filtered = appointments;
    if (listFilter !== "all") {
      filtered = filtered.filter(a => a.status === listFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => {
        const cName = (a.customers as any)?.name || "";
        const vPlate = (a.vehicles as any)?.plate || "";
        return cName.toLowerCase().includes(term) || vPlate.toLowerCase().includes(term);
      });
    }
    return filtered;
  }, [appointments, listFilter, searchTerm]);

  const appointmentDates = useMemo(() => {
    if (!appointments) return [];
    return appointments.map(a => parseISO(a.scheduled_at));
  }, [appointments]);

  const stats = useMemo(() => {
    if (!appointments) return { confirmed: 0, pending: 0, cancelled: 0 };
    return {
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      pending: appointments.filter(a => a.status === 'pending').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
    }
  }, [appointments]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !vehicleId || !serviceId || !date || !time) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const service = services?.find(s => s.id === serviceId);
    const scheduledAt = new Date(date);
    const [hours, minutes] = time.split(':');
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const { error } = await supabase.from("appointments").insert({
      shop_id: shopId,
      customer_id: customerId,
      vehicle_id: vehicleId,
      service_id: serviceId,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: service?.duration_minutes || 60,
      status: "confirmed",
      notes,
      created_by: user?.id
    });

    if (error) {
      toast.error("Erro ao agendar");
      console.error(error);
    } else {
      toast.success("Agendamento criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsSheetOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setCustomerId("");
    setVehicleId("");
    setServiceId("");
    setDate(undefined);
    setTime("");
    setNotes("");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agenda</h1>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button onClick={resetForm} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Novo Agendamento</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Novo Agendamento</SheetTitle>
                <SheetDescription>Selecione o cliente, veículo e serviço para agendar.</SheetDescription>
              </SheetHeader>
              <form onSubmit={handleCreateAppointment} className="space-y-4 pt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Veículo</label>
                  <Select value={vehicleId} onValueChange={setVehicleId} disabled={!customerId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles?.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.model} - {v.plate}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Serviço</label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                    <SelectContent>
                      {services?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("rounded-xl w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "P", { locale: ptBR }) : <span>Selecione</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Horário</label>
                    <Select value={time} onValueChange={setTime}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="00:00" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }).map((_, i) => {
                          const hour = (i + 8).toString().padStart(2, '0') + ':00';
                          return <SelectItem key={hour} value={hour}>{hour}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações</label>
                  <Textarea className="rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
                </div>

                <Button type="submit" className="w-full rounded-xl">Confirmar agendamento</Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="calendario" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 rounded-xl">
              <TabsTrigger value="calendario" className="rounded-lg">Calendário</TabsTrigger>
              <TabsTrigger value="lista" className="rounded-lg">Lista</TabsTrigger>
              <TabsTrigger value="solicitacoes" disabled className="rounded-lg">Solicitações</TabsTrigger>
            </TabsList>

            <TabsContent value="calendario" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">{stats.confirmed} Confirmados</Badge>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">{stats.pending} Pendentes</Badge>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{stats.cancelled} Cancelados</Badge>
                  </div>
                  
                  <div className="bg-card border border-border rounded-xl p-3 inline-block">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      components={{
                        DayContent: (props) => {
                          const isBooked = appointmentDates.some(d => isSameDay(d, props.date));
                          return (
                            <div className="relative flex h-full w-full items-center justify-center">
                              {props.date.getDate()}
                              {isBooked && (
                                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                              )}
                            </div>
                          );
                        }
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">
                    Agendamentos: {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : ""}
                  </h3>
                  
                  <div className="space-y-3">
                    {selectedDayItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center italic">Nenhum agendamento para este dia.</p>
                    ) : (
                      selectedDayItems.map((apt: any) => (
                        <div key={apt.id} className="flex items-center gap-4 p-3 rounded-xl border bg-card">
                          <div className="flex flex-col items-center justify-center w-14 shrink-0 border-r pr-4">
                            <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                            <span className="font-mono font-bold text-sm">{format(parseISO(apt.scheduled_at), "HH:mm")}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{(apt.customers as any)?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{(apt.services as any)?.name} • {(apt.vehicles as any)?.plate}</p>
                          </div>
                          <Badge className={statusConfig[apt.status as AppointmentStatus]?.className}>{statusConfig[apt.status as AppointmentStatus]?.label}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="lista" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar nome ou placa..." 
                    className="pl-9 bg-background rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={listFilter} onValueChange={setListFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
                    <SelectValue placeholder="Filtro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="confirmed">Confirmados</SelectItem>
                    <SelectItem value="cancelled">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {listItems.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">Nenhum agendamento encontrado.</p>
                ) : (
                  listItems.map((apt: any) => (
                    <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card gap-3">
                      <div>
                        <p className="font-semibold text-sm">{(apt.customers as any)?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(apt.scheduled_at), "dd/MM/yyyy 'às' HH:mm")} • {(apt.vehicles as any)?.plate} • {(apt.services as any)?.name}
                        </p>
                      </div>
                      <Badge className={cn("w-fit", statusConfig[apt.status as AppointmentStatus]?.className)}>
                        {statusConfig[apt.status as AppointmentStatus]?.label}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
