
-- Create whatsapp_templates table
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'job_done',
  message_template TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop whatsapp_templates" ON public.whatsapp_templates
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Owners can insert whatsapp_templates" ON public.whatsapp_templates
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update whatsapp_templates" ON public.whatsapp_templates
  FOR UPDATE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete whatsapp_templates" ON public.whatsapp_templates
  FOR DELETE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'owner'));

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shop appointments" ON public.appointments
  FOR SELECT TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Users can insert appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Users can update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Users can delete appointments" ON public.appointments
  FOR DELETE TO authenticated USING (shop_id = get_user_shop_id(auth.uid()));
