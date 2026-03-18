import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon, Loader2, Star, Instagram,
  Store, CheckCircle2, MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function VitrinePage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Booking form
  const [date, setDate] = useState<Date>();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review form
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);

  // ── Fetch shop by slug ──────────────────────────────────────────────────────
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["vitrine", shopSlug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shops")
        .select("*")
        .eq("slug", shopSlug)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!shopSlug,
  });

  // ── Fetch active services for this shop ────────────────────────────────────
  const { data: services = [] } = useQuery({
    queryKey: ["vitrine_services", shop?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("services")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("active", true);
      return (data || []) as any[];
    },
    enabled: !!shop?.id,
  });

  // ── Fetch reviews ───────────────────────────────────────────────────────────
  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["vitrine_reviews", shop?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("reviews")
        .select("*")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!shop?.id,
  });

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id || !customerName || !customerPhone || !selectedService || !date) {
      toast({ title: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      // Create temp customer + vehicle so we can insert appointment
      const { data: newCust, error: custErr } = await (supabase as any)
        .from("customers")
        .insert({ shop_id: shop.id, name: customerName, whatsapp: customerPhone, phone: customerPhone })
        .select()
        .single();
      if (custErr) throw custErr;

      const { data: newVeh, error: vehErr } = await (supabase as any)
        .from("vehicles")
        .insert({ shop_id: shop.id, customer_id: newCust.id, plate: "VITRINE", model: "A Definir" })
        .select()
        .single();
      if (vehErr) throw vehErr;

      const { error } = await (supabase as any)
        .from("appointments")
        .insert({
          shop_id: shop.id,
          customer_id: newCust.id,
          vehicle_id: newVeh.id,
          service_id: selectedService,
          scheduled_at: date.toISOString(),
          status: "pending",
          notes: notes ? `Vitrine: ${notes}` : "Solicitado via Vitrine Digital",
        });
      if (error) throw error;

      toast({ title: "✅ Agendamento solicitado! Entraremos em contato." });
      setCustomerName("");
      setCustomerPhone("");
      setSelectedService("");
      setNotes("");
      setDate(undefined);
    } catch (err: any) {
      toast({ title: "Erro ao solicitar", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id || !reviewName.trim()) return;
    try {
      const { error } = await (supabase as any).from("reviews").insert({
        shop_id: shop.id,
        customer_name: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      if (error) throw error;
      toast({ title: "⭐ Avaliação enviada! Obrigado." });
      setIsReviewOpen(false);
      setReviewName("");
      setReviewComment("");
      setReviewRating(5);
      refetchReviews();
    } catch (err: any) {
      toast({ title: "Erro ao enviar avaliação", description: err.message, variant: "destructive" });
    }
  };

  // ── Loading / Not Found ─────────────────────────────────────────────────────
  if (shopLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-8 gap-4">
        <Store className="h-20 w-20 text-slate-300" />
        <h1 className="text-3xl font-black text-slate-800">Vitrine não encontrada</h1>
        <p className="text-slate-500 max-w-sm">
          O link pode estar desativado ou incorreto. Verifique com o estabelecimento.
        </p>
      </div>
    );
  }

  const cover: string = shop.cover_color || "#00c2ff";
  const isOpen = new Date().getHours() >= 8 && new Date().getHours() < 18;
  const shopInitial = shop.name?.substring(0, 1).toUpperCase() ?? "L";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">

      {/* ── HERO BANNER ───────────────────────────────────────────────────────── */}
      <div className="relative">
        <div
          className="h-52 w-full"
          style={{ backgroundColor: cover, backgroundImage: `linear-gradient(135deg, ${cover}dd, ${cover}88)` }}
        />

        <div className="max-w-3xl mx-auto px-5">
          {/* Avatar */}
          <div className="relative -top-14 flex flex-col sm:flex-row sm:items-end gap-4">
            <Avatar className="h-28 w-28 ring-4 ring-white shadow-xl shrink-0">
              <AvatarFallback className="text-4xl font-black bg-white text-slate-700">
                {shopInitial}
              </AvatarFallback>
            </Avatar>

            <div className="pb-2 flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight truncate">
                {shop.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {/* Open / Closed badge */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
                    isOpen ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", isOpen ? "bg-emerald-500" : "bg-rose-500")} />
                  {isOpen ? "Aberto agora" : "Fechado"}
                </span>

                {shop.instagram && (
                  <a
                    href={`https://instagram.com/${shop.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-pink-600 transition-colors"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    {shop.instagram}
                  </a>
                )}
              </div>
            </div>

            {shop.accept_appointments && (
              <button
                onClick={() => document.getElementById("agendamento")?.scrollIntoView({ behavior: "smooth" })}
                className="shrink-0 mb-2 px-6 py-2.5 rounded-full text-white text-sm font-bold shadow-lg transition-all hover:opacity-90 hover:shadow-xl active:scale-95"
                style={{ backgroundColor: cover }}
              >
                Agendar Horário
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA ──────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-5 -mt-8 space-y-8">

        {/* Bio */}
        {shop.bio && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{shop.bio}</p>
          </div>
        )}

        {/* ── REVIEWS ─────────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 min-w-[70px]">
                <span className="text-2xl font-black text-slate-900">{averageRating}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={cn(
                        "h-2.5 w-2.5",
                        reviews.length > 0 && Math.round(parseFloat(averageRating as string)) >= s
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Avaliações</h2>
                <p className="text-xs text-slate-400">{reviews.length} avaliação{reviews.length !== 1 ? "ões" : ""}</p>
              </div>
            </div>

            {/* Review modal trigger */}
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full border-slate-200 font-semibold text-slate-700">
                  ⭐ Avaliar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Sua avaliação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleReview} className="space-y-5 pt-2">
                  <div className="space-y-1.5">
                    <Label>Seu nome *</Label>
                    <Input
                      required
                      value={reviewName}
                      onChange={e => setReviewName(e.target.value)}
                      placeholder="Como quer ser identificado?"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nota</Label>
                    <div className="flex gap-2 items-center">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onMouseEnter={() => setHoverStar(star)}
                          onMouseLeave={() => setHoverStar(0)}
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none transition-transform hover:scale-110 active:scale-90"
                        >
                          <Star
                            className={cn(
                              "h-9 w-9 transition-colors",
                              (hoverStar || reviewRating) >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                            )}
                          />
                        </button>
                      ))}
                      <span className="text-sm text-slate-400 ml-2">
                        {["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"][hoverStar || reviewRating]}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Comentário (opcional)</Label>
                    <Textarea
                      rows={3}
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Conte como foi sua experiência..."
                      className="rounded-xl resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold">
                    Enviar Avaliação
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Review list */}
          <div className="divide-y divide-slate-50">
            {reviews.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm italic">
                Nenhuma avaliação ainda — seja o primeiro! 🌟
              </div>
            ) : (
              reviews.map((r: any) => (
                <div key={r.id} className="p-5 flex items-start gap-4 hover:bg-slate-50/60">
                  <Avatar className="h-10 w-10 shrink-0 border border-slate-100">
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
                      {r.customer_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-sm truncate">{r.customer_name}</span>
                      <div className="flex gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={cn("h-3 w-3", r.rating >= s ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-slate-500 mt-1 italic">"{r.comment}"</p>}
                    <p className="text-[10px] text-slate-300 mt-1.5">
                      {format(new Date(r.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── BOOKING FORM (only if accept_appointments) ────────────────────── */}
        {shop.accept_appointments && (
          <section
            id="agendamento"
            className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden"
          >
            {/* Colored top bar */}
            <div className="h-2 w-full" style={{ backgroundColor: cover }} />

            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-black text-slate-900 mb-1.5">
                Solicitar Agendamento
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Preencha e entraremos em contato para confirmar.
              </p>

              <form onSubmit={handleBook} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label>Nome completo *</Label>
                    <Input
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Seu nome"
                      className="h-11 rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp *</Label>
                    <Input
                      required
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="h-11 rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label>Serviço desejado *</Label>
                    <Select required value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {services.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.price ? ` — R$ ${Number(s.price).toFixed(2)}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Data preferida *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-11 rounded-xl bg-slate-50 border-slate-200 justify-start font-normal",
                            !date && "text-slate-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "P", { locale: ptBR }) : "Escolha uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl">
                        <Calendar mode="single" selected={date} onSelect={setDate} disabled={{ before: new Date() }} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Observações do veículo</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Riscos, lataria, interior, etc."
                    rows={3}
                    className="rounded-xl bg-slate-50 border-slate-200 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-xl text-[15px] font-bold text-white shadow-lg hover:opacity-90 hover:shadow-xl transition-all active:scale-[0.98]"
                  style={{ backgroundColor: cover }}
                >
                  {isSubmitting
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <><CheckCircle2 className="mr-2 h-5 w-5" /> Enviar Solicitação</>
                  }
                </Button>
              </form>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="mt-14 text-center">
        <p className="text-xs text-slate-300 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5">
          <Store className="h-3 w-3" /> Powered by HubAuto
        </p>
      </div>
    </div>
  );
}
