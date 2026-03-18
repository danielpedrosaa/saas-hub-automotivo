import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useJobs } from "@/hooks/useShopData";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Tag, CalendarDays, TrendingDown, Eye, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

type PeriodType = 'this_month' | 'last_month' | 'last_30' | 'custom';

export default function Financial() {
  const { data: jobs, isLoading } = useJobs();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const dateRange = useMemo(() => {
    const today = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'this_month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'last_30':
        start = subDays(today, 30);
        end = today;
        break;
      case 'custom':
        start = customStart || subDays(today, 7);
        end = customEnd || today;
        break;
    }
    
    // reset hours to cover full days
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }, [period, customStart, customEnd]);

  // Filtramos todas as jobs finalizadas no periodo
  const validJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j => {
      if (j.status !== "done" && j.status !== "delivered") return false;
      const jobDate = parseISO(j.finished_at || j.created_at);
      return isWithinInterval(jobDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [jobs, dateRange]);

  // Cálculos do Bloco 1
  const metrics = useMemo(() => {
    let revenue = 0;
    let totalDiscount = 0;
    
    validJobs.forEach(j => {
      revenue += Number(j.total_price) || 0;
      totalDiscount += Number(j.discount) || 0;
    });

    const totalOs = validJobs.length;
    const ticketMedio = totalOs > 0 ? revenue / totalOs : 0;

    return { revenue, totalDiscount, totalOs, ticketMedio };
  }, [validJobs]);

  // Cálculos do Bloco 2 (Gráfico Faturamento por Dia)
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    
    // Pré-preenchemos as datas válidas se for últimos 30 dias ou menos para manter continuidade visual (opcional)
    // Para simplificar, agruparemos apenas os dias em que houve faturamento, mas ordenados.
    validJobs.forEach(j => {
      const d = parseISO(j.finished_at || j.created_at);
      const dayStr = format(d, 'dd/MM/yyyy');
      map.set(dayStr, (map.get(dayStr) || 0) + (Number(j.total_price) || 0));
    });

    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => {
        // Ordenação simpples de DD/MM/YYYY reconstruindo date
        const [d1, m1, y1] = a.date.split('/');
        const [d2, m2, y2] = b.date.split('/');
        return new Date(+y1, +m1-1, +d1).getTime() - new Date(+y2, +m2-1, +d2).getTime();
      });
  }, [validJobs]);

  // Cálculos do Bloco 3 (Faturamento por Serviço)
  const servicesRank = useMemo(() => {
    const map = new Map<string, number>();
    
    validJobs.forEach(job => {
      const svcs = (job as any).job_services || [];
      svcs.forEach((s: any) => {
        const p = Number(s.price) || 0;
        map.set(s.service_name, (map.get(s.service_name) || 0) + p);
      });
    });

    const rank = Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
      
    // Para renderizar a barra percentual, usamos o maior ou a soma? O prompt diz "% do total". Usaremos metrics.revenue.
    return rank;
  }, [validJobs]);

  // Cálculos do Bloco 4 (Tabela com Paginação)
  const sortedJobs = useMemo(() => {
    return [...validJobs].sort((a, b) => {
      const dA = new Date(a.finished_at || a.created_at).getTime();
      const dB = new Date(b.finished_at || b.created_at).getTime();
      return dB - dA;
    });
  }, [validJobs]);
  
  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage) || 1;
  const currentTableData = sortedJobs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" /> Financeiro
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Análise de fluxo de caixa e faturamento</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
             <Select value={period} onValueChange={(v: PeriodType) => setPeriod(v)}>
               <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl bg-card border-border shadow-sm">
                 <SelectValue placeholder="Período" />
               </SelectTrigger>
               <SelectContent className="rounded-xl">
                 <SelectItem value="this_month">Este mês</SelectItem>
                 <SelectItem value="last_month">Mês passado</SelectItem>
                 <SelectItem value="last_30">Últimos 30 dias</SelectItem>
                 <SelectItem value="custom">Personalizado</SelectItem>
               </SelectContent>
             </Select>
             
             {period === 'custom' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                   <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-10 rounded-xl shadow-sm text-xs gap-1.5 px-3 flex-1 sm:flex-none", !customStart && "text-muted-foreground")}>
                           <CalendarIcon className="h-4 w-4" />
                           {customStart ? format(customStart, "dd/MM/yy") : "Inicio"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={customStart} onSelect={setCustomStart} /></PopoverContent>
                   </Popover>
                   <span className="text-muted-foreground text-xs">até</span>
                   <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-10 rounded-xl shadow-sm text-xs gap-1.5 px-3 flex-1 sm:flex-none", !customEnd && "text-muted-foreground")}>
                           <CalendarIcon className="h-4 w-4" />
                           {customEnd ? format(customEnd, "dd/MM/yy") : "Fim"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} /></PopoverContent>
                   </Popover>
                </div>
             )}
          </div>
        </div>

        {/* BLOCO 1 - 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Faturamento Total */}
           <Card className="border-border bg-primary/5 rounded-xl shadow-none">
              <CardContent className="p-4 flex flex-col justify-center gap-2 h-full">
                 <div className="flex items-center gap-2 text-primary">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Faturamento Total</span>
                 </div>
                 <span className="text-3xl font-black font-mono text-primary truncate">
                    {formatCurrency(metrics.revenue)}
                 </span>
              </CardContent>
           </Card>

           {/* Ticket Médio */}
           <Card className="border-border bg-secondary rounded-xl shadow-none">
              <CardContent className="p-4 flex flex-col justify-center gap-2 h-full">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Ticket Médio</span>
                 </div>
                 <span className="text-2xl font-bold font-mono text-foreground truncate">
                    {formatCurrency(metrics.ticketMedio)}
                 </span>
              </CardContent>
           </Card>

           {/* Total OS */}
           <Card className="border-border bg-secondary rounded-xl shadow-none">
              <CardContent className="p-4 flex flex-col justify-center gap-2 h-full">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-wider">OS Finalizadas</span>
                 </div>
                 <span className="text-2xl font-bold font-mono text-foreground truncate">
                    {metrics.totalOs} concluídas
                 </span>
              </CardContent>
           </Card>

           {/* Descontos Concedidos */}
           <Card className="border-destructive/20 bg-destructive/5 rounded-xl shadow-none">
              <CardContent className="p-4 flex flex-col justify-center gap-2 h-full">
                 <div className="flex items-center gap-2 text-destructive">
                    <TrendingDown className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Descontos Totais</span>
                 </div>
                 <span className="text-2xl font-bold font-mono text-destructive truncate">
                    {formatCurrency(metrics.totalDiscount)}
                 </span>
              </CardContent>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* BLOCO 2 - Gráfico */}
           <Card className="border-border bg-card rounded-xl shadow-none lg:col-span-2">
              <CardContent className="p-6 space-y-6">
                 <div>
                    <h3 className="text-lg font-bold text-foreground">Receita Bruta (Diária)</h3>
                    <p className="text-xs text-muted-foreground">Evolução do faturamento ao longo do período selecionado.</p>
                 </div>
                 
                 {chartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-xl">
                       Nenhum dado para este período
                    </div>
                 ) : (
                    <div className="h-[300px] w-full">
                       <ChartContainer config={{ total: { label: "Faturamento", color: "hsl(var(--primary))" } }} className="h-full w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData}>
                             <CartesianGrid vertical={false} strokeDasharray="3 3" />
                             <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                             <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} width={65} tick={{ fontSize: 10 }} />
                             <ChartTooltip content={<ChartTooltipContent formatter={(v: number) => formatCurrency(v)} />} />
                             <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                           </BarChart>
                         </ResponsiveContainer>
                       </ChartContainer>
                    </div>
                 )}
              </CardContent>
           </Card>

           {/* BLOCO 3 - Ranking de Serviços */}
           <Card className="border-border bg-card rounded-xl shadow-none">
              <CardContent className="p-6 space-y-6 h-[400px] flex flex-col">
                 <div>
                    <h3 className="text-lg font-bold text-foreground">Faturamento por Serviço</h3>
                    <p className="text-xs text-muted-foreground">Serviços que mais geraram caixa.</p>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {servicesRank.length === 0 ? (
                       <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">
                          Nenhum serviço catalogado.<br/>Verifique se suas OS possuem itens atrelados.
                       </div>
                    ) : (
                       servicesRank.map((s, i) => {
                          const percentage = metrics.revenue > 0 ? (s.total / metrics.revenue) * 100 : 0;
                          return (
                             <div key={i} className="space-y-1.5">
                                <div className="flex justify-between items-end text-sm">
                                   <span className="font-semibold text-foreground truncate pr-2">{s.name}</span>
                                   <div className="text-right shrink-0">
                                      <span className="font-mono font-bold text-primary">{formatCurrency(s.total)}</span>
                                      <span className="text-[10px] text-muted-foreground ml-2">{percentage.toFixed(1)}%</span>
                                   </div>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                   <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                                </div>
                             </div>
                          )
                       })
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* BLOCO 4 - Tabela Detalhada */}
        <Card className="border-border bg-card rounded-xl shadow-none overflow-hidden">
           <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
              <div>
                 <h3 className="text-lg font-bold text-foreground">Transações de OS</h3>
                 <p className="text-xs text-muted-foreground">Log individual das Ordens de Serviço finalizadas no período.</p>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              {currentTableData.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground border-t border-border border-dashed">
                    <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma transação fechada no período.</p>
                 </div>
              ) : (
                 <Table>
                    <TableHeader className="bg-muted/30">
                       <TableRow>
                          <TableHead className="w-[120px]">Data</TableHead>
                          <TableHead>Cliente & Veículo</TableHead>
                          <TableHead className="hidden md:table-cell">Serviços Atrelados</TableHead>
                          <TableHead className="text-right text-destructive">Desconto</TableHead>
                          <TableHead className="text-right font-bold text-primary">Total</TableHead>
                          <TableHead className="text-center w-[80px]">Ações</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {currentTableData.map((job) => {
                          const vehicle = (job as any).vehicles;
                          const cName = vehicle?.customers?.name || "Desconhecido";
                          const svcs = ((job as any).job_services || []).map((s: any) => s.service_name).join(", ");
                          
                          return (
                             <TableRow key={job.id} className="hover:bg-muted/30 group">
                                <TableCell className="text-xs text-muted-foreground font-medium">
                                   {format(parseISO(job.finished_at || job.created_at), "dd/MM/yyyy HH:mm")}
                                </TableCell>
                                <TableCell>
                                   <p className="font-semibold text-sm">{cName}</p>
                                   <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{vehicle?.plate} • {vehicle?.model}</p>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate" title={svcs}>
                                   {svcs || "Nenhum mapeado"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-destructive">
                                   {Number(job.discount) > 0 ? `- ${formatCurrency(Number(job.discount))}` : "---"}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                   {formatCurrency(Number(job.total_price))}
                                </TableCell>
                                <TableCell className="text-center">
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-8 w-8 text-muted-foreground hover:text-primary"
                                     onClick={() => navigate(`/jobs?status=${job.status}`)}
                                     title="Ver OS na Tela Principal"
                                   >
                                     <Eye className="h-4 w-4" />
                                   </Button>
                                </TableCell>
                             </TableRow>
                          )
                       })}
                    </TableBody>
                 </Table>
              )}
           </div>
           
           {/* Pagination */}
           {totalPages > 1 && (
             <div className="border-t border-border p-4 flex items-center justify-between bg-muted/10">
                <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 shadow-none rounded-lg">
                     <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                   </Button>
                   <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 shadow-none rounded-lg">
                     Próxima <ChevronRight className="h-4 w-4 ml-1" />
                   </Button>
                </div>
             </div>
           )}
        </Card>

      </div>
    </AppLayout>
  );
}
