import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomersWithStats } from "@/hooks/useShopData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Loader2, Search, Users, ChevronRight, MessageCircle, 
  MapPin, Calendar, FileText, Settings, Trash, Eye
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Customers() {
  const { shopId } = useAuth();
  const navigate = useNavigate();
  const { data: customersRaw, isLoading } = useCustomersWithStats();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("nome");
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [receiveWhatsapp, setReceiveWhatsapp] = useState(true);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  // Optional Fields
  const [activeOptionals, setActiveOptionals] = useState<string[]>([]);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [extraPhone, setExtraPhone] = useState("");
  const [activePlan, setActivePlan] = useState("");
  const [origin, setOrigin] = useState("");
  const [notes, setNotes] = useState("");
  
  // Vehicles Form State
  const [newVehicles, setNewVehicles] = useState([{ plate: "", model: "", color: "", year: "", observations: "" }]);

  const resetForm = () => {
    setReceiveWhatsapp(true);
    setName("");
    setWhatsapp("");
    setActiveOptionals([]);
    setCpfCnpj("");
    setEmail("");
    setAddress("");
    setBirthdate("");
    setExtraPhone("");
    setActivePlan("");
    setOrigin("");
    setNotes("");
    setNewVehicles([{ plate: "", model: "", color: "", year: "", observations: "" }]);
  };

  const customers = useMemo(() => {
    if (!customersRaw) return [];
    return customersRaw.map((c) => {
      const visits = c.vehicles?.reduce((acc: number, v: any) => acc + (v.jobs?.length || 0), 0) || 0;
      const totalSpent = c.vehicles?.reduce((acc: number, v: any) => {
        const spentOnVeh = v.jobs?.filter((j: any) => j.status === 'done' || j.status === 'delivered')
          .reduce((s: number, j: any) => s + (Number(j.total_price) || 0), 0) || 0;
        return acc + spentOnVeh;
      }, 0) || 0;
      return { ...c, visits, totalSpent };
    });
  }, [customersRaw]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const hasVehicleMatch = c.vehicles?.some((v: any) => v.plate.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q));
      return (
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        hasVehicleMatch
      );
    }).sort((a, b) => {
      if (sortOrder === "nome") return a.name.localeCompare(b.name);
      if (sortOrder === "recente") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === "gasto") return b.totalSpent - a.totalSpent;
      return 0;
    });
  }, [customers, search, sortOrder]);

  const toggleOptional = (key: string) => {
    setActiveOptionals(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addVehicleField = () => {
    setNewVehicles([...newVehicles, { plate: "", model: "", color: "", year: "", observations: "" }]);
  };

  const removeVehicleField = (index: number) => {
    setNewVehicles(newVehicles.filter((_, i) => i !== index));
  };

  const updateVehicleField = (index: number, field: string, value: string) => {
    const updated = [...newVehicles];
    updated[index] = { ...updated[index], [field]: value };
    setNewVehicles(updated);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    
    if (!name.trim() || !whatsapp.trim()) {
      toast({ title: "Erro", description: "Nome e WhatsApp são obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Insert Customer
      const { data: customerData, error: customerError } = await supabase.from("customers").insert({
        shop_id: shopId,
        name: name.trim(),
        whatsapp: whatsapp.trim() || null,
        phone: extraPhone.trim() || null,
        email: email.trim() || null,
        cpf_cnpj: cpfCnpj.trim() || null,
        address: address.trim() || null,
        birthdate: birthdate || null,
        notes: notes.trim() || null,
        receive_whatsapp: receiveWhatsapp
      }).select().single();

      if (customerError) throw customerError;

      // 2. Insert Vehicles if any valid ones exist
      const validVehicles = newVehicles.filter(v => v.plate.trim() && v.model.trim());
      if (validVehicles.length > 0) {
        const vehiclesToInsert = validVehicles.map(v => ({
          shop_id: shopId,
          customer_id: customerData.id,
          plate: v.plate.trim().toUpperCase(),
          model: v.model.trim(),
          color: v.color.trim() || null,
          observations: v.observations.trim() || (v.year ? `Ano: ${v.year}` : null)
        }));
        const { error: vehicleError } = await supabase.from("vehicles").insert(vehiclesToInsert);
        if (vehicleError) throw vehicleError;
      }

      toast({ title: "Cliente cadastrado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["customers_stats"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/15 text-primary rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
              <p className="text-sm text-muted-foreground">{customers.length} cadastrados</p>
            </div>
          </div>
          
          <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <SheetTrigger asChild>
              <Button className="rounded-xl w-full sm:w-auto font-bold tracking-wide shadow-none bg-success hover:bg-success/90 text-success-foreground">
                <Plus className="mr-2 h-5 w-5" /> Novo cliente
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto pt-10">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2 text-xl">
                   <Users className="h-5 w-5 text-primary" /> Cadastrar Cliente
                </SheetTitle>
                <SheetDescription>Insera as informações do cliente e seus veículos.</SheetDescription>
              </SheetHeader>
              
              <form onSubmit={handleSave} className="space-y-6">
                {/* Switch de Mensagens Auto */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Receber mensagens automáticas</Label>
                    <p className="text-xs text-muted-foreground">Lembretes de status e cobrança por WhatsApp</p>
                  </div>
                  <Switch checked={receiveWhatsapp} onCheckedChange={setReceiveWhatsapp} />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Dados Principais *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input placeholder="Ex: João da Silva" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl bg-card" />
                    </div>
                    <div className="space-y-2">
                       <Label>WhatsApp</Label>
                       <div className="flex gap-2">
                          <Select defaultValue="+55">
                            <SelectTrigger className="w-[90px] rounded-xl bg-card"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="+55">🇧🇷 +55</SelectItem></SelectContent>
                          </Select>
                          <Input type="tel" placeholder="(11) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required className="rounded-xl flex-1 bg-card" />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Veículos</h3>
                     <Button type="button" variant="outline" size="sm" onClick={addVehicleField} className="rounded-xl text-xs h-8">
                       <Plus className="h-3 w-3 mr-1" /> Add
                     </Button>
                  </div>
                  
                  {newVehicles.map((veh, index) => (
                    <div key={index} className="p-4 rounded-xl border border-border bg-card/50 relative space-y-4 group">
                      {newVehicles.length > 1 && (
                         <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeVehicleField(index)}>
                           <Trash className="h-3 w-3" />
                         </Button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Placa *</Label>
                          <Input className="rounded-md uppercase" value={veh.plate} onChange={(e) => updateVehicleField(index, "plate", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Modelo *</Label>
                          <Input className="rounded-md" value={veh.model} onChange={(e) => updateVehicleField(index, "model", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Cor</Label>
                          <Input className="rounded-md" value={veh.color} onChange={(e) => updateVehicleField(index, "color", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Ano</Label>
                          <Input className="rounded-md" type="number" value={veh.year} onChange={(e) => updateVehicleField(index, "year", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Informações Adicionais</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "cpf", label: "CPF/CNPJ", icon: FileText },
                      { key: "email", label: "E-mail", icon: MessageCircle },
                      { key: "address", label: "Endereço", icon: MapPin },
                      { key: "birth", label: "Nascimento", icon: Calendar },
                      { key: "extra_phone", label: "Telefone Extra", icon: MessageCircle },
                      { key: "notes", label: "Observações", icon: Settings },
                    ].map(opt => (
                      <Button 
                        key={opt.key} 
                        type="button" 
                        variant={activeOptionals.includes(opt.key) ? "secondary" : "outline"} 
                        size="sm" 
                        className="rounded-full h-7 text-xs shadow-none gap-1"
                        onClick={() => toggleOptional(opt.key)}
                      >
                        <opt.icon className="h-3 w-3" /> {opt.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {activeOptionals.includes("cpf") && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>CPF/CNPJ</Label>
                        <Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className="rounded-xl bg-card" />
                      </div>
                    )}
                    {activeOptionals.includes("email") && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>E-mail</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl bg-card" />
                      </div>
                    )}
                    {activeOptionals.includes("birth") && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Data de Nascimento</Label>
                        <Input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} className="rounded-xl bg-card" />
                      </div>
                    )}
                    {activeOptionals.includes("extra_phone") && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Telefone Extra</Label>
                        <Input type="tel" value={extraPhone} onChange={e => setExtraPhone(e.target.value)} className="rounded-xl bg-card" />
                      </div>
                    )}
                  </div>
                  {activeOptionals.includes("address") && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label>Endereço Completo</Label>
                      <Input value={address} onChange={e => setAddress(e.target.value)} className="rounded-xl bg-card" />
                    </div>
                  )}
                  {activeOptionals.includes("notes") && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label>Observações</Label>
                      <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl bg-card" />
                    </div>
                  )}
                </div>

                <SheetFooter className="mt-8">
                  <Button type="submit" disabled={saving} className="h-12 w-full font-bold uppercase tracking-wider rounded-xl shadow-none bg-success hover:bg-success/90 text-success-foreground">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar Cliente"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        {/* TOOLBAR FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, WhatsApp, placa ou veículo..."
              className="h-11 pl-10 rounded-xl bg-card shadow-sm border-border w-full"
            />
          </div>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl bg-card">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="nome">Nome A-Z</SelectItem>
              <SelectItem value="recente">Mais recente</SelectItem>
              <SelectItem value="gasto">Maior gasto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* LISTAGEM DOS CLIENTES */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Users className="h-12 w-12 opacity-20" />
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 hidden md:table-header-group">
                  <TableRow>
                    <TableHead className="w-[30%]">Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Veículos</TableHead>
                    <TableHead className="text-center">Visitas</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead className="text-center w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow 
                      key={c.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors flex flex-col md:table-row py-3 md:py-0 border-b last:border-0"
                      onClick={() => navigate(`/customers/${c.id}`)}
                    >
                      <TableCell className="flex items-center gap-3 w-full md:w-auto p-4">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {c.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate hidden md:block">Adicionado em: {new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell className="p-4 pt-0 md:pt-4">
                        {c.whatsapp ? (
                          <span className="flex items-center gap-1 text-sm font-medium">
                            <MessageCircle className="h-3 w-3 text-success" /> {c.whatsapp}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">S/ Contato</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="p-4 pt-0 md:pt-4 border-t border-border border-dashed md:border-none">
                        <div className="flex flex-wrap gap-1">
                          {c.vehicles?.length > 0 ? c.vehicles.map((v: any, i: number) => (
                            <span key={i} className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-border">
                              {v.plate}
                            </span>
                          )) : (
                            <span className="text-xs text-muted-foreground italic">0 veículos</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="p-4 pt-0 md:pt-4 text-left md:text-center text-sm font-semibold">
                         <span className="md:hidden text-muted-foreground font-normal text-xs mr-2">Visitas:</span>
                         {c.visits}
                      </TableCell>
                      
                      <TableCell className="p-4 pt-0 md:pt-4 text-left md:text-right font-mono text-success font-bold text-sm">
                         <span className="md:hidden text-muted-foreground font-normal text-xs mr-2 font-sans">Gasto:</span>
                         {formatCurrency(c.totalSpent)}
                      </TableCell>
                      
                      <TableCell className="p-4 pt-0 md:pt-4 flex justify-end">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}`)}}>
                           <Eye className="h-4 w-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
