
-- 1. technicians
CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  specialization text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop technicians" ON public.technicians
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Owners can insert technicians" ON public.technicians
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update technicians" ON public.technicians
  FOR UPDATE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete technicians" ON public.technicians
  FOR DELETE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

-- 2. financial_entries
CREATE TABLE public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'income',
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  category text,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop financial_entries" ON public.financial_entries
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Owners can insert financial_entries" ON public.financial_entries
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update financial_entries" ON public.financial_entries
  FOR UPDATE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete financial_entries" ON public.financial_entries
  FOR DELETE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

-- 3. loyalty_plans
CREATE TABLE public.loyalty_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  services_included text[] NOT NULL DEFAULT '{}',
  max_uses integer NOT NULL DEFAULT 4,
  multi_vehicle boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop loyalty_plans" ON public.loyalty_plans
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Owners can insert loyalty_plans" ON public.loyalty_plans
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update loyalty_plans" ON public.loyalty_plans
  FOR UPDATE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete loyalty_plans" ON public.loyalty_plans
  FOR DELETE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

-- 4. loyalty_subscriptions
CREATE TABLE public.loyalty_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.loyalty_plans(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  uses_this_month integer NOT NULL DEFAULT 0,
  renewal_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop loyalty_subscriptions" ON public.loyalty_subscriptions
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Owners can insert loyalty_subscriptions" ON public.loyalty_subscriptions
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update loyalty_subscriptions" ON public.loyalty_subscriptions
  FOR UPDATE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete loyalty_subscriptions" ON public.loyalty_subscriptions
  FOR DELETE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

-- 5. opportunities
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  service_interest text,
  estimated_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new_lead',
  responsible_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  last_contact_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop opportunities" ON public.opportunities
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Owners can insert opportunities" ON public.opportunities
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update opportunities" ON public.opportunities
  FOR UPDATE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete opportunities" ON public.opportunities
  FOR DELETE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

-- 6. products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Outros',
  quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  supplier text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop products" ON public.products
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Owners can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update products" ON public.products
  FOR UPDATE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete products" ON public.products
  FOR DELETE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

-- 7. stock_movements
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'in',
  quantity integer NOT NULL,
  reason text,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop stock_movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Users can insert stock_movements" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()));

-- 8. messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'outbound',
  content text NOT NULL,
  template_type text,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop messages" ON public.messages
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Users can insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()));

-- 9. reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating integer NOT NULL,
  comment text,
  platform text NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop reviews" ON public.reviews
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
CREATE POLICY "Users can insert reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()));

-- 10. Add missing columns to existing tables
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS year text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS km integer;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
