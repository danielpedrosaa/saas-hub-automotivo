import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useShop } from "@/hooks/useShopData";
import { useMessageTemplate } from "@/hooks/useMessageTemplate";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, Store, User, Loader2, MessageCircle,
  Save, Info, Globe, Link, Copy, ExternalLink, Instagram,
  Building2, Palette, Upload, AlertCircle, Check, MapPin,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Colour swatches predefined ─────────────────────────────────────────────
const PRESET_COLORS = [
  { hex: "#C8FF00", label: "Lima (padrão)" },
  { hex: "#FF5300", label: "Laranja Signal" },
  { hex: "#3b82f6", label: "Azul" },
  { hex: "#8b5cf6", label: "Violeta" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#14b8a6", label: "Teal" },
  { hex: "#f59e0b", label: "Âmbar" },
  { hex: "#ef4444", label: "Vermelho" },
  { hex: "#22c55e", label: "Verde" },
  { hex: "#f97316", label: "Laranja" },
];

// ── Luminosity check (0–255 scale) ────────────────────────────────────────
function hexLuminosity(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ── Apply primary CSS variable globally ───────────────────────────────────
function applyPrimary(hex: string | null) {
  if (!hex) {
    // Reset to CSS defaults (monochromatic)
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--primary-foreground");
    return;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  document.documentElement.style.setProperty("--primary", hsl);
  const fg = l > 0.5 ? "0 0% 0%" : "0 0% 100%";
  document.documentElement.style.setProperty("--primary-foreground", fg);
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Minha Empresa
// ═══════════════════════════════════════════════════════════════════════════
function MinhaEmpresaTab({ shopId }: { shopId: string }) {
  const { data: shop, isLoading } = useShop();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shopAny = shop as any;

  // ── Form state ────────────────────────────────────────────────────────
  const [name, setName]         = useState("");
  const [cnpj, setCnpj]         = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail]       = useState("");
  const [cep, setCep]           = useState("");
  const [estado, setEstado]     = useState("");
  const [cidade, setCidade]     = useState("");
  const [bairro, setBairro]     = useState("");
  const [rua, setRua]           = useState("");
  const [numero, setNumero]     = useState("");
  const [complemento, setComplemento] = useState("");
  const [saving, setSaving]     = useState(false);

  // ── Logo state ────────────────────────────────────────────────────────
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // ── Color state ───────────────────────────────────────────────────────
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [hexInput, setHexInput]         = useState("");
  const [colorError, setColorError]     = useState("");

  // Populate form from shop data
  useEffect(() => {
    if (!shopAny) return;
    setName(shopAny.name || "");
    setCnpj(shopAny.cnpj || "");
    setWhatsapp(shopAny.whatsapp || "");
    setEmail(shopAny.email || "");
    setCep(shopAny.cep || "");
    setEstado(shopAny.state || "");
    setCidade(shopAny.city || "");
    setBairro(shopAny.neighborhood || "");
    setRua(shopAny.street || "");
    setNumero(shopAny.number || "");
    setComplemento(shopAny.complement || "");

    const savedColor = shopAny.primary_color || null;
    setPrimaryColor(savedColor);
    setHexInput(savedColor || "");
    applyPrimary(savedColor);

    if (shopAny.logo_url) setLogoPreview(shopAny.logo_url);
  }, [shop]);

  // ── ViaCEP fetch ──────────────────────────────────────────────────────
  const fetchCep = useCallback(async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast({ title: "CEP não encontrado.", variant: "destructive" }); return; }
      setEstado(data.uf || "");
      setCidade(data.localidade || "");
      setBairro(data.bairro || "");
      setRua(data.logradouro || "");
    } catch {
      toast({ title: "Erro ao buscar CEP.", variant: "destructive" });
    }
  }, [toast]);

  const handleCepChange = (v: string) => {
    const formatted = v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
    setCep(formatted);
    if (formatted.replace(/\D/g, "").length === 8) fetchCep(formatted);
  };

  // ── Logo handling ─────────────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      toast({ title: "Apenas arquivos PNG são aceitos.", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return logoPreview;
    setUploadingLogo(true);
    try {
      const ext = "png";
      const path = `${shopId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, logoFile, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`; // cache-bust
    } catch (err: any) {
      toast({ title: "Erro ao fazer upload da logo", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Color selection ───────────────────────────────────────────────────
  const selectColor = (hex: string) => {
    const lum = hexLuminosity(hex);
    if (lum < 38) { // ~15% of 255
      setColorError("Cor muito escura. Escolha uma cor com mais luminosidade.");
      return;
    }
    setColorError("");
    setPrimaryColor(hex);
    setHexInput(hex);
    applyPrimary(hex);
  };

  const handleHexInput = (v: string) => {
    setHexInput(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) selectColor(v);
  };

  // ── Save all ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome da empresa é obrigatório.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const logoUrl = await uploadLogo();
      const { error } = await (supabase as any)
        .from("shops")
        .update({
          name: name.trim(),
          cnpj: cnpj.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          cep: cep.replace(/\D/g, "") || null,
          state: estado || null,
          city: cidade || null,
          neighborhood: bairro || null,
          street: rua || null,
          number: numero || null,
          complement: complemento || null,
          primary_color: primaryColor,
          logo_url: logoUrl || null,
        })
        .eq("id", shopId);
      if (error) throw error;
      toast({ title: "✅ Empresa atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["shop"] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Logo ─────────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Logo da empresa
        </p>

        <div className="flex items-center gap-4">
          {/* Preview */}
          <div
            className="h-20 w-20 rounded-full border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Upload className="h-7 w-7 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {logoPreview ? "Logo carregada" : "Nenhuma logo carregada"}
            </p>
            <p className="text-xs text-muted-foreground">
              Apenas arquivos .PNG. Recomendado: 256×256px mínimo.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={handleLogoChange}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs border-border hover:border-primary/40 gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              {logoPreview ? "Alterar logo" : "Escolher logo"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Cor principal ─────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Cor principal do sistema
        </p>

        {/* Swatches grid */}
        <div className="grid grid-cols-10 gap-2">
          {PRESET_COLORS.map(({ hex, label }) => {
            const active = primaryColor.toUpperCase() === hex.toUpperCase();
            return (
              <button
                key={hex}
                title={label}
                onClick={() => selectColor(hex)}
                className={cn(
                  "h-8 w-full rounded-lg border-2 transition-all ring-offset-2",
                  active ? "border-foreground scale-110 ring-2 ring-foreground ring-offset-background" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: hex }}
              >
                {active && <Check className="h-3.5 w-3.5 mx-auto text-black opacity-70" style={{ mixBlendMode: "multiply" }} />}
              </button>
            );
          })}
        </div>

        {/* HEX input + reset */}
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 shrink-0 rounded-lg border border-border"
            style={{ backgroundColor: hexInput }}
          />
          <Input
            value={hexInput}
            onChange={e => handleHexInput(e.target.value)}
            placeholder="#C8FF00"
            maxLength={7}
            className="font-mono text-sm h-9 w-36"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-foreground h-9 px-3 shrink-0"
            onClick={() => selectColor("#C8FF00")}
          >
            Restaurar padrão
          </Button>
          {colorError && (
            <p className="flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {colorError}
            </p>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          A cor é aplicada em tempo real. Cores muito escuras (luminosidade {'<'} 15%) serão rejeitadas.
        </p>
      </section>

      {/* ── Dados da empresa ──────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> Dados da empresa
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome da empresa *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Auto Center Premium"
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CNPJ</Label>
            <Input
              value={cnpj}
              onChange={e => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">WhatsApp</Label>
            <Input
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-0000"
              className="text-sm"
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">E-mail</Label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="contato@empresa.com.br"
              type="email"
              className="text-sm"
            />
          </div>
        </div>
      </section>

      {/* ── Endereço ──────────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Endereço
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* CEP */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CEP</Label>
            <Input
              value={cep}
              onChange={e => handleCepChange(e.target.value)}
              placeholder="00000-000"
              className="text-sm"
              maxLength={9}
            />
            <p className="text-[10px] text-muted-foreground">Preenche os campos automaticamente.</p>
          </div>

          {/* Estado */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Input value={estado} onChange={e => setEstado(e.target.value)} placeholder="SP" className="text-sm" maxLength={2} />
          </div>

          {/* Cidade */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cidade</Label>
            <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="São Paulo" className="text-sm" />
          </div>

          {/* Bairro */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Bairro</Label>
            <Input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Centro" className="text-sm" />
          </div>

          {/* Rua */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Rua / Logradouro</Label>
            <Input value={rua} onChange={e => setRua(e.target.value)} placeholder="Rua das Flores" className="text-sm" />
          </div>

          {/* Número */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Número</Label>
            <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="123" className="text-sm" />
          </div>

          {/* Complemento */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Complemento</Label>
            <Input value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Sala 2, Galpão A..." className="text-sm" />
          </div>
        </div>
      </section>

      {/* ── Save button ───────────────────────────────────────── */}
      <Button
        onClick={handleSave}
        disabled={saving || uploadingLogo}
        className="h-11 w-full gap-2 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 rounded-xl"
      >
        {(saving || uploadingLogo)
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Save className="h-4 w-4" />}
        {uploadingLogo ? "Enviando logo..." : saving ? "Salvando..." : "Salvar alterações"}
      </Button>

      <div className="pb-8" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Template WhatsApp (mantido do original)
// ═══════════════════════════════════════════════════════════════════════════
const VARIABLE_HINTS = [
  { var: "{{nome_cliente}}", desc: "Nome do cliente" },
  { var: "{{placa}}", desc: "Placa do veículo" },
  { var: "{{modelo}}", desc: "Modelo do veículo" },
  { var: "{{valor}}", desc: "Valor total" },
  { var: "{{loja}}", desc: "Nome da loja" },
];

function MessageTemplateEditor({ shopId }: { shopId: string }) {
  const { data: template, isLoading } = useMessageTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [greeting, setGreeting] = useState("Olá, {{nome_cliente}}! 👋");
  const [mainText, setMainText] = useState("Seu veículo *{{placa}}* foi finalizado com sucesso! ✅");
  const [thanksMessage, setThanksMessage] = useState("Agradecemos a preferência! 🙏");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    if (template && Array.isArray(template) && template.length > 0) {
      const t = template[0] as any;
      if (t.greeting) setGreeting(t.greeting);
      if (t.main_text) setMainText(t.main_text);
      if (t.thanks_message) setThanksMessage(t.thanks_message);
      if (t.signature) setSignature(t.signature);
    }
  }, [template]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("message_templates").upsert({
        shop_id: shopId,
        greeting,
        main_text: mainText,
        thanks_message: thanksMessage,
        signature,
        updated_at: new Date().toISOString(),
      } as any);
      toast({ title: "✅ Template salvo!" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_templates"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3 w-3" /> Variáveis disponíveis
        </p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLE_HINTS.map((v) => (
            <span key={v.var} className="text-[10px] bg-secondary text-foreground rounded px-2 py-1 font-mono" title={v.desc}>
              {v.var}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {[
          { label: "Saudação", value: greeting, set: setGreeting, placeholder: "Olá, {{nome_cliente}}! 👋" },
          { label: "Assinatura da empresa", value: signature, set: setSignature, placeholder: "Auto Center Premium — (11) 99999-0000" },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} className="text-sm" />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Texto principal</Label>
          <Textarea value={mainText} onChange={(e) => setMainText(e.target.value)} placeholder="Seu veículo *{{placa}}* foi finalizado com sucesso! ✅" className="text-sm min-h-[60px] resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mensagem de agradecimento</Label>
          <Input value={thanksMessage} onChange={(e) => setThanksMessage(e.target.value)} placeholder="Agradecemos a preferência! 🙏" className="text-sm" />
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-emerald-600/20 bg-emerald-600/5 p-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Prévia</p>
        <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
          {greeting.replace(/\{\{nome_cliente\}\}/g, "João")}{"\n\n"}
          {mainText.replace(/\{\{placa\}\}/g, "ABC-1234").replace(/\{\{modelo\}\}/g, "Civic")}{"\n\n"}
          *Serviços:*{"\n"}• Lavagem detalhada{"\n"}• Polimento{"\n\n"}
          💲 *Valor total: R$ 150,00*{"\n\n"}
          {thanksMessage}{"\n"}
          *{signature || "{{loja}}"}*
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-11 gap-2 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Template
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Vitrine Digital (mantido do original)
// ═══════════════════════════════════════════════════════════════════════════
function VitrineEditor({ shopId }: { shopId: string }) {
  const { data: shop, isLoading } = useShop();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const shopAny = shop as any;

  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [coverColor, setCoverColor] = useState("#00c2ff");
  const [instagram, setInstagram] = useState("");
  const [acceptAppointments, setAcceptAppointments] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shopAny) {
      setSlug(shopAny.slug || "");
      setBio(shopAny.bio || "");
      setCoverColor(shopAny.cover_color || "#00c2ff");
      setInstagram(shopAny.instagram || "");
      setAcceptAppointments(shopAny.accept_appointments || false);
    }
  }, [shop]);

  const vitrineUrl = `${window.location.origin}/vitrine/${slug}`;

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(vitrineUrl); toast({ title: "🔗 Link copiado!" }); }
    catch { toast({ title: "Não foi possível copiar.", variant: "destructive" }); }
  };

  const handleSave = async () => {
    if (!slug.trim()) { toast({ title: "Defina um slug para a vitrine.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("shops").update({
        slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
        bio: bio.trim() || null,
        cover_color: coverColor,
        instagram: instagram.trim() || null,
        accept_appointments: acceptAppointments,
      }).eq("id", shopId);
      if (error) throw error;
      toast({ title: "✅ Vitrine atualizada!" });
      queryClient.invalidateQueries({ queryKey: ["shop"] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Slug da URL *</Label>
        <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground select-none shrink-0">/vitrine/</span>
          <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="minha-oficina" className="border-0 bg-transparent h-auto p-0 text-sm focus-visible:ring-0 shadow-none" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Bio / Apresentação</Label>
        <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Descreva brevemente sua oficina..." className="text-sm min-h-[80px] resize-none" rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cor da faixa de capa</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={coverColor} onChange={e => setCoverColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-background p-0.5" />
            <Input value={coverColor} onChange={e => setCoverColor(e.target.value)} className="text-sm font-mono h-10" maxLength={7} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram</Label>
          <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@suaoficina" className="text-sm h-10" />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
        <div>
          <p className="text-sm font-semibold text-foreground">Aceitar agendamentos públicos</p>
          <p className="text-xs text-muted-foreground mt-0.5">Habilita o formulário de agendamento na vitrine.</p>
        </div>
        <Switch checked={acceptAppointments} onCheckedChange={setAcceptAppointments} />
      </div>

      {slug && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1"><Link className="h-3 w-3" /> Link da vitrine</p>
          <p className="text-xs font-mono text-foreground break-all">{vitrineUrl}</p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs rounded-lg" onClick={handleCopyLink}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-lg" onClick={() => navigate(`/vitrine/${slug}`)}><ExternalLink className="h-3.5 w-3.5" /> Ver vitrine</Button>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full h-11 gap-2 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Vitrine
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Meu Perfil
// ═══════════════════════════════════════════════════════════════════════════
function ProfileTab({ onLogout }: { onLogout: () => void }) {
  const { profile, role } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      toast({ title: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", profile?.id!);
      if (error) throw error;
      toast({ title: "✅ Nome atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> Informações do perfil
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nome completo</Label>
          <Input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Seu nome"
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground capitalize">
            Cargo: {role === "owner" ? "Proprietário" : "Funcionário"}
          </p>
        </div>
        <Button
          onClick={handleSaveName}
          disabled={saving}
          className="h-10 w-full gap-2 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 rounded-xl"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar nome"}
        </Button>
      </div>

      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          variant="destructive"
          onClick={onLogout}
          className="h-12 w-full font-bold uppercase tracking-wider rounded-xl"
        >
          <LogOut className="mr-2 h-5 w-5" /> Sair da conta
        </Button>
      </motion.div>

      <div className="pb-8" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT: Settings page
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "company",  label: "Minha Empresa", icon: Building2,     ownerOnly: false },
  { id: "vitrine",  label: "Vitrine Digital", icon: Globe,        ownerOnly: true  },
  { id: "whatsapp", label: "WhatsApp",       icon: MessageCircle, ownerOnly: true  },
  { id: "profile",  label: "Meu Perfil",     icon: User,          ownerOnly: false },
];

export default function Settings() {
  const { profile, role, signOut, shopId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Support ?tab=company navigation from Index.tsx
  const defaultTab = searchParams.get("tab") || "company";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const visibleTabs = TABS.filter(t => !t.ownerOnly || role === "owner");

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie sua empresa, visual e preferências</p>
        </div>

        {/* Tab bar */}
        <div className="flex items-stretch gap-1 border-b border-border overflow-x-auto scrollbar-none -mx-1 px-1">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                  active
                    ? "text-primary border-primary font-semibold"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "company" && shopId && (
            <MinhaEmpresaTab shopId={shopId} />
          )}

          {activeTab === "vitrine" && role === "owner" && shopId && (
            <VitrineEditor shopId={shopId} />
          )}

          {activeTab === "whatsapp" && role === "owner" && shopId && (
            <MessageTemplateEditor shopId={shopId} />
          )}

          {activeTab === "profile" && (
            <ProfileTab onLogout={handleLogout} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
