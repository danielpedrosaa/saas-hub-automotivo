CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
    service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
    scheduled_at timestamptz NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 60,
    status text NOT NULL CHECK (status IN ('pending','confirmed','in_progress','done','cancelled','no_show')) DEFAULT 'pending',
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view appointments of their shop"
ON public.appointments FOR SELECT
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert appointments for their shop"
ON public.appointments FOR INSERT
WITH CHECK (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update appointments of their shop"
ON public.appointments FOR UPDATE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete appointments of their shop"
ON public.appointments FOR DELETE
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE id = auth.uid()
));
