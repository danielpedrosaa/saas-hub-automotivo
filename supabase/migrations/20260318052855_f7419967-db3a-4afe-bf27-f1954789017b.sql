
-- Enums
CREATE TYPE public.app_role AS ENUM ('owner', 'employee');
CREATE TYPE public.job_status AS ENUM ('waiting', 'in_progress', 'done');

-- Shops
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles (separate table per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  plate TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  status job_status NOT NULL DEFAULT 'waiting',
  entry_photo_url TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user shop_id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_shop_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM public.profiles WHERE id = _user_id
$$;

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies

-- shops: users can see their own shop
CREATE POLICY "Users can view own shop" ON public.shops
  FOR SELECT USING (id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Owners can update own shop" ON public.shops
  FOR UPDATE USING (id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

-- profiles: users can see profiles in their shop
CREATE POLICY "Users can view shop profiles" ON public.profiles
  FOR SELECT USING (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- user_roles: users can view roles in their shop
CREATE POLICY "Users can view roles" ON public.user_roles
  FOR SELECT USING (
    user_id IN (SELECT p.id FROM public.profiles p WHERE p.shop_id = public.get_user_shop_id(auth.uid()))
  );

CREATE POLICY "Owners can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'owner'));

-- services: shop-scoped
CREATE POLICY "Users can view shop services" ON public.services
  FOR SELECT USING (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Owners can insert services" ON public.services
  FOR INSERT WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update services" ON public.services
  FOR UPDATE USING (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete services" ON public.services
  FOR DELETE USING (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

-- customers: shop-scoped
CREATE POLICY "Users can view shop customers" ON public.customers
  FOR SELECT USING (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can insert customers" ON public.customers
  FOR INSERT WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can update customers" ON public.customers
  FOR UPDATE USING (shop_id = public.get_user_shop_id(auth.uid()));

-- vehicles: shop-scoped
CREATE POLICY "Users can view shop vehicles" ON public.vehicles
  FOR SELECT USING (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can insert vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can update vehicles" ON public.vehicles
  FOR UPDATE USING (shop_id = public.get_user_shop_id(auth.uid()));

-- jobs: shop-scoped
CREATE POLICY "Users can view shop jobs" ON public.jobs
  FOR SELECT USING (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can insert jobs" ON public.jobs
  FOR INSERT WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can update jobs" ON public.jobs
  FOR UPDATE USING (shop_id = public.get_user_shop_id(auth.uid()));

-- Trigger: auto-create profile + shop on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_shop_id UUID;
  user_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  
  INSERT INTO public.shops (name) VALUES (user_name || '''s Shop') RETURNING id INTO new_shop_id;
  
  INSERT INTO public.profiles (id, shop_id, full_name)
  VALUES (NEW.id, new_shop_id, user_name);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
