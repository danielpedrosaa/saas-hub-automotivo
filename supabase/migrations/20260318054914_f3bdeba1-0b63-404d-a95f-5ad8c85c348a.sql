
-- Junction table for multiple services per job
CREATE TABLE public.job_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_services ENABLE ROW LEVEL SECURITY;

-- RLS: inherit access from parent job's shop
CREATE POLICY "Users can view job services" ON public.job_services
  FOR SELECT USING (
    job_id IN (SELECT j.id FROM public.jobs j WHERE j.shop_id = public.get_user_shop_id(auth.uid()))
  );

CREATE POLICY "Users can insert job services" ON public.job_services
  FOR INSERT WITH CHECK (
    job_id IN (SELECT j.id FROM public.jobs j WHERE j.shop_id = public.get_user_shop_id(auth.uid()))
  );

CREATE POLICY "Users can update job services" ON public.job_services
  FOR UPDATE USING (
    job_id IN (SELECT j.id FROM public.jobs j WHERE j.shop_id = public.get_user_shop_id(auth.uid()))
  );

CREATE POLICY "Users can delete job services" ON public.job_services
  FOR DELETE USING (
    job_id IN (SELECT j.id FROM public.jobs j WHERE j.shop_id = public.get_user_shop_id(auth.uid()))
  );

-- Add total_price to jobs
ALTER TABLE public.jobs ADD COLUMN total_price NUMERIC(10,2) NOT NULL DEFAULT 0;
