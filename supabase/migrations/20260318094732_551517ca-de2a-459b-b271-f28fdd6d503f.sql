CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  greeting text NOT NULL DEFAULT 'Olá, {{nome_cliente}}! 👋',
  main_text text NOT NULL DEFAULT 'Seu veículo *{{placa}}* foi finalizado com sucesso! ✅',
  thanks_message text NOT NULL DEFAULT 'Agradecemos a preferência! 🙏',
  signature text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shop template"
ON public.message_templates FOR SELECT TO authenticated
USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Owners can insert template"
ON public.message_templates FOR INSERT TO authenticated
WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update template"
ON public.message_templates FOR UPDATE TO authenticated
USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));