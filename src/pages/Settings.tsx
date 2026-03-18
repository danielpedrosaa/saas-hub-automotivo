import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useShop } from "@/hooks/useShopData";
import { useMessageTemplate } from "@/hooks/useMessageTemplate";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LogOut, Store, User, Loader2, MessageCircle, Save, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

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
    if (template) {
      setGreeting(template.greeting);
      setMainText(template.main_text);
      setThanksMessage(template.thanks_message);
      setSignature(template.signature);
    }
  }, [template]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (template) {
        const { error } = await supabase
          .from("message_templates")
          .update({
            greeting,
            main_text: mainText,
            thanks_message: thanksMessage,
            signature,
            updated_at: new Date().toISOString(),
          })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("message_templates")
          .insert({
            shop_id: shopId,
            greeting,
            main_text: mainText,
            thanks_message: thanksMessage,
            signature,
          });
        if (error) throw error;
      }
      toast({ title: "✅ Template salvo!" });
      queryClient.invalidateQueries({ queryKey: ["message_template"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="space-y-4">
      {/* Variable hints */}
      <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3 w-3" /> Variáveis disponíveis
        </p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLE_HINTS.map((v) => (
            <span
              key={v.var}
              className="text-[10px] bg-secondary text-foreground rounded px-2 py-1 font-mono"
              title={v.desc}
            >
              {v.var}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Saudação</Label>
          <Input
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="Olá, {{nome_cliente}}! 👋"
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Texto principal</Label>
          <Textarea
            value={mainText}
            onChange={(e) => setMainText(e.target.value)}
            placeholder="Seu veículo *{{placa}}* foi finalizado com sucesso! ✅"
            className="text-sm min-h-[60px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mensagem de agradecimento</Label>
          <Input
            value={thanksMessage}
            onChange={(e) => setThanksMessage(e.target.value)}
            placeholder="Agradecemos a preferência! 🙏"
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Assinatura da empresa</Label>
          <Input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Ex: Auto Center Premium — Tel: (11) 99999-0000"
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">Se vazio, usa o nome da loja.</p>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-whatsapp/20 bg-whatsapp/5 p-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-whatsapp font-semibold">Prévia da mensagem</p>
        <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
          {greeting.replace(/\{\{nome_cliente\}\}/g, "João")}
          {"\n\n"}
          {mainText.replace(/\{\{placa\}\}/g, "ABC-1234").replace(/\{\{modelo\}\}/g, "Civic")}
          {"\n\n"}
          *Serviços realizados:*{"\n"}• Lavagem detalhada{"\n"}• Polimento
          {"\n\n"}
          💲 *Valor total: R$ 150,00*
          {"\n\n"}
          {thanksMessage}
          {"\n"}
          *{signature || "{{loja}}"}*
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full h-11 gap-2 font-semibold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Template
      </Button>
    </div>
  );
}

export default function Settings() {
  const { profile, role, signOut, shopId } = useAuth();
  const { data: shop, isLoading } = useShop();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Configurações</h1>

        <Card className="border-border bg-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-foreground">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {role === "owner" ? "Proprietário" : "Funcionário"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4 text-primary" />
              Loja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="text-sm text-foreground">{shop?.name}</p>
                {shop?.phone && (
                  <p className="text-xs text-muted-foreground">Tel: {shop.phone}</p>
                )}
                {shop?.whatsapp && (
                  <p className="text-xs text-muted-foreground">WhatsApp: {shop.whatsapp}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Template - only for owners */}
        {role === "owner" && shopId && (
          <Card className="border-border bg-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-4 w-4 text-whatsapp" />
                Template WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MessageTemplateEditor shopId={shopId} />
            </CardContent>
          </Card>
        )}

        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="h-12 w-full font-bold uppercase tracking-wider"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sair
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
