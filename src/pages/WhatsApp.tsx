import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, Clock, Zap, Plus, Pencil, CheckCircle2, FileText, AlertTriangle, Eye } from "lucide-react";
import { useMessageTemplate } from "@/hooks/useMessageTemplate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { parseTemplate } from "@/lib/whatsapp";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type TriggerType = 'job_done' | 'job_reminder' | 'reactivation' | 'birthday';

const triggerLabels: Record<TriggerType, string> = {
  job_done: "OS Finalizada",
  job_reminder: "Lembrete de lavagem (30 dias)",
  reactivation: "Reativação (60 dias)",
  birthday: "Aniversário do Cliente"
};

const triggerIcons: Record<TriggerType, any> = {
  job_done: CheckCircle2,
  job_reminder: Clock,
  reactivation: Zap,
  birthday: FileText
};

export default function WhatsApp() {
  const { data: templates, isLoading } = useMessageTemplate();
  const { shopId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Fom state
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>('job_done');
  const [messageText, setMessageText] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Mocks para dashboard / historico
  const mockSent = 34; // Mensagens enviadas
  const mockQueue = 2; // Na fila
  const mockCredits = "Ilimitado";

  const handleOpenSheet = (tmpl?: any) => {
    if (tmpl) {
      setEditingId(tmpl.id);
      setName(tmpl.name);
      setTriggerType(tmpl.trigger_type);
      setMessageText(tmpl.message_template);
      setIsActive(tmpl.active);
    } else {
      setEditingId(null);
      setName("");
      setTriggerType('job_done');
      setMessageText("Olá {nome_cliente}! Seu carro de placa {placa} está finalizado! Valor total: {valor} em nossa oficina {nome_loja}.");
      setIsActive(true);
    }
    setIsSheetOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !messageText.trim() || !shopId) return;

    try {
      if (editingId) {
        // UPDATE
        const { error } = await supabase.from("whatsapp_templates").update({
          name: name.trim(),
          trigger_type: triggerType,
          message_template: messageText.trim(),
          active: isActive,
        }).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Template atualizado!" });
      } else {
        // INSERT
        const { error } = await supabase.from("whatsapp_templates").insert({
          shop_id: shopId,
          name: name.trim(),
          trigger_type: triggerType,
          message_template: messageText.trim(),
          active: isActive,
        });
        if (error) throw error;
        toast({ title: "Novo template criado!" });
      }

      queryClient.invalidateQueries({ queryKey: ["whatsapp_templates"] });
      setIsSheetOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const toggleTemplateActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from("whatsapp_templates").update({ active: !current }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["whatsapp_templates"] });
    } catch (err: any) {
      toast({ title: "Erro na alteração", description: err.message, variant: "destructive" });
    }
  };

  const previewData = {
     customerName: "João Silva",
     customerWhatsapp: null,
     vehiclePlate: "ABC-1234",
     vehicleModel: "Civic",
     services: [{ name: "Lavagem", price: 100 }],
     totalPrice: 100,
     discount: 0,
     shopName: "HubAuto Motors"
  };

  const mockHistory = [
     { id: 1, date: "18/03/2026 10:45", customer: "Maria Souza", type: "OS Finalizada", msg: "Olá Maria Souza! O serviço Lavagem no veículo DEF-5678...", status: "Enviado" },
     { id: 2, date: "18/03/2026 09:12", customer: "José Augusto", type: "Lembrete de lavagem (30 dias)", msg: "Olá José Augusto! Já faz 30 dias que você nos visitou...", status: "Enviado" },
     { id: 3, date: "17/03/2026 16:30", customer: "Amanda Costa", type: "Reativação (60 dias)", msg: "Olá Amanda Costa! Sentimos sua falta...", status: "Falha" },
     { id: 4, date: "17/03/2026 14:20", customer: "Ricardo Oliveira", type: "OS Finalizada", msg: "Olá Ricardo... Seu veículo XYZ-9999 está concluído", status: "Enviado" },
  ];

  const triggerStats = Object.keys(triggerLabels).map(key => {
     const tKey = key as TriggerType;
     const matchingTmpl = templates?.find(t => t.trigger_type === tKey);
     return {
        key: tKey,
        label: triggerLabels[tKey],
        icon: triggerIcons[tKey],
        count: tKey === 'job_done' ? mockSent : tKey === 'job_reminder' ? 8 : 0, 
        isActive: matchingTmpl?.active || false,
        id: matchingTmpl?.id || null
     };
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-whatsapp/15 text-whatsapp rounded-xl">
             <MessageCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Automações WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Gerencie mensagens e disparos inteligentes.</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
           <TabsList className="grid w-full grid-cols-3 mb-6 rounded-xl">
              <TabsTrigger value="dashboard" className="rounded-lg">Dashboard</TabsTrigger>
              <TabsTrigger value="templates" className="rounded-lg">Templates</TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg">Histórico</TabsTrigger>
           </TabsList>

           <TabsContent value="dashboard" className="space-y-6">
              {/* 3 cards essenciais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <Card className="border-border bg-secondary rounded-xl shadow-none">
                    <CardContent className="p-4 flex flex-col justify-center">
                       <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Send className="h-4 w-4 text-whatsapp" /> Enviadas no mês</span>
                       <span className="text-3xl font-black font-mono text-foreground mt-2">{mockSent}</span>
                    </CardContent>
                 </Card>
                 <Card className="border-border bg-secondary rounded-xl shadow-none">
                    <CardContent className="p-4 flex flex-col justify-center">
                       <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Clock className="h-4 w-4 text-warning" /> Na fila</span>
                       <span className="text-3xl font-black font-mono text-foreground mt-2">{mockQueue}</span>
                    </CardContent>
                 </Card>
                 <Card className="border-border bg-secondary rounded-xl shadow-none">
                    <CardContent className="p-4 flex flex-col justify-center">
                       <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Zap className="h-4 w-4 text-primary" /> Créditos</span>
                       <span className="text-3xl font-black font-mono text-foreground mt-2">{mockCredits}</span>
                    </CardContent>
                 </Card>
              </div>

              {/* Mensagens por gatilho com toggle in-line */}
              <Card className="border-border bg-card rounded-xl shadow-none">
                 <div className="p-4 border-b border-border bg-muted/20">
                    <h3 className="text-base font-bold text-foreground">Status dos Gatilhos no Workspace</h3>
                 </div>
                 <div className="divide-y divide-border">
                    {triggerStats.map(st => {
                       const Icon = st.icon;
                       return (
                          <div key={st.key} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-secondary rounded-lg border border-border">
                                   <Icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                   <p className="font-semibold text-sm">{st.label}</p>
                                   <p className="text-xs text-muted-foreground">{st.count} envios disparados</p>
                                </div>
                             </div>
                             <div>
                                {st.id ? (
                                   <Switch checked={st.isActive} onCheckedChange={() => toggleTemplateActive(st.id, st.isActive)} />
                                ) : (
                                   <Badge variant="outline" className="text-[10px] text-muted-foreground bg-secondary">Não configurado</Badge>
                                )}
                             </div>
                          </div>
                       )
                    })}
                 </div>
              </Card>
           </TabsContent>

           <TabsContent value="templates" className="space-y-4">
              <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                 <p className="text-sm font-medium text-muted-foreground">Listagem de Modelos ativos operantes.</p>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                       <Button size="sm" onClick={() => handleOpenSheet()} className="rounded-lg shadow-none">
                          <Plus className="h-4 w-4 mr-1.5" /> Novo template
                       </Button>
                    </SheetTrigger>
                    
                    <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                       <SheetHeader className="mb-6">
                          <SheetTitle>{editingId ? "Editar Template" : "Novo Template"}</SheetTitle>
                          <SheetDescription>Configure as tags e as macros do envio.</SheetDescription>
                       </SheetHeader>
                       
                       <form onSubmit={handleSave} className="space-y-6">
                          <div className="space-y-2">
                             <Label>Nome Interno do Template</Label>
                             <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Aviso Conclusão Padrão" className="h-11 rounded-xl" />
                          </div>

                          <div className="space-y-2">
                             <Label>Gatilho (Quando a mensagem sai?)</Label>
                             <Select required value={triggerType} onValueChange={(v: TriggerType) => setTriggerType(v)}>
                                <SelectTrigger className="h-11 rounded-xl">
                                   <SelectValue placeholder="Selecione o disparo..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                   <SelectItem value="job_done">OS Finalizada (Botão de concluir)</SelectItem>
                                   <SelectItem value="job_reminder" disabled>Lembrete 30 dias (Breve)</SelectItem>
                                   <SelectItem value="reactivation" disabled>Reativação 60 dias (Breve)</SelectItem>
                                   <SelectItem value="birthday" disabled>Aniversário (Breve)</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>

                          <div className="space-y-2">
                             <div className="flex justify-between items-end">
                               <Label>Corpo da Mensagem</Label>
                               <span className="text-[10px] text-muted-foreground">Use tags limitadas ao disparo</span>
                             </div>
                             <Textarea 
                               required 
                               value={messageText} 
                               onChange={e => setMessageText(e.target.value)} 
                               className="min-h-[120px] rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-mono"
                             />
                             <div className="flex flex-wrap gap-1 mt-2">
                               {['{nome_cliente}', '{placa}', '{servicos}', '{valor}', '{nome_loja}'].map(tag => (
                                  <Badge key={tag} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors bg-secondary" onClick={() => setMessageText(p => p + ' ' + tag)}>
                                     {tag}
                                  </Badge>
                               ))}
                             </div>
                          </div>

                          <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border border-dashed">
                             <Label className="flex items-center gap-2"><Eye className="h-4 w-4 text-whatsapp" /> Preview Real</Label>
                             <div className="bg-whatsapp/10 p-4 rounded-xl text-sm whitespace-pre-wrap text-foreground italic border border-whatsapp/20">
                                {parseTemplate(messageText, previewData)}
                             </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                             <div>
                                <h4 className="font-semibold text-sm">Status Ativo</h4>
                                <p className="text-xs text-muted-foreground">A mensagem irá ser avaliada neste fluxo.</p>
                             </div>
                             <Switch checked={isActive} onCheckedChange={setIsActive} />
                          </div>

                          <Button type="submit" className="w-full h-12 rounded-xl font-bold uppercase tracking-widest bg-primary text-primary-foreground">
                             {editingId ? "Salvar Alterações" : "Criar Regra Local"}
                          </Button>
                       </form>
                    </SheetContent>
                 </Sheet>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {!templates || templates.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 border border-border border-dashed rounded-xl">
                       <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                       Nenhum template criado
                    </div>
                 ) : (
                    templates.map(tmpl => (
                       <Card key={tmpl.id} className="border-border bg-card rounded-xl shadow-none">
                          <CardContent className="p-4 space-y-4">
                             <div className="flex justify-between items-start">
                                <div>
                                   <div className="flex gap-2 items-center mb-1">
                                      <h3 className="font-bold text-sm">{tmpl.name}</h3>
                                      <Badge variant="outline" className="text-[10px] scale-90">{triggerLabels[tmpl.trigger_type as TriggerType]}</Badge>
                                   </div>
                                   <p className="text-xs text-muted-foreground line-clamp-2 italic">"{tmpl.message_template}"</p>
                                </div>
                                <Switch checked={tmpl.active} onCheckedChange={() => toggleTemplateActive(tmpl.id, tmpl.active)} />
                             </div>
                             <div className="flex border-t border-border pt-3">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenSheet(tmpl)} className="text-xs h-7 text-primary hover:bg-primary/10 ml-auto">
                                   <Pencil className="h-3 w-3 mr-1" /> Editar
                                </Button>
                             </div>
                          </CardContent>
                       </Card>
                    ))
                 )}
              </div>
           </TabsContent>

           <TabsContent value="history">
              <Card className="border-border bg-card rounded-xl shadow-none overflow-hidden">
                 <div className="p-4 border-b border-border bg-muted/20">
                    <h3 className="text-base font-bold text-foreground">Log de Comunicações</h3>
                 </div>
                 <div className="overflow-x-auto">
                    <Table>
                       <TableHeader>
                          <TableRow className="bg-muted/10">
                             <TableHead>Data/Hora</TableHead>
                             <TableHead>Cliente</TableHead>
                             <TableHead>Tipo (Gatilho)</TableHead>
                             <TableHead className="max-w-[200px]">Mensagem (Truncada)</TableHead>
                             <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {mockHistory.map(row => (
                             <TableRow key={row.id}>
                                <TableCell className="text-xs text-muted-foreground">{row.date}</TableCell>
                                <TableCell className="font-semibold text-sm">{row.customer}</TableCell>
                                <TableCell><Badge variant="outline" className="bg-secondary">{row.type}</Badge></TableCell>
                                <TableCell className="max-w-[200px] truncate text-xs italic text-muted-foreground">"{row.msg}"</TableCell>
                                <TableCell className="text-right">
                                   <Badge className={row.status === 'Enviado' ? 'bg-success shadow-none font-semibold text-[10px]' : 'bg-destructive shadow-none font-semibold text-[10px]'}>{row.status}</Badge>
                                </TableCell>
                             </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                 </div>
              </Card>
           </TabsContent>
        </Tabs>

      </div>
    </AppLayout>
  );
}
