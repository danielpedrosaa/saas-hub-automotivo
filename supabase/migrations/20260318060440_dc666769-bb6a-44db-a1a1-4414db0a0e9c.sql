
-- Checklist items linked to jobs (both visual markers and structured items)
CREATE TABLE public.job_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL DEFAULT 'structured', -- 'visual' or 'structured'
  label text NOT NULL,
  notes text,
  -- For visual markers on car diagram
  position_x numeric,
  position_y numeric,
  car_view text, -- 'top', 'left_side', 'right_side'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job checklist"
  ON public.job_checklist FOR SELECT
  USING (job_id IN (SELECT j.id FROM jobs j WHERE j.shop_id = get_user_shop_id(auth.uid())));

CREATE POLICY "Users can insert job checklist"
  ON public.job_checklist FOR INSERT
  WITH CHECK (job_id IN (SELECT j.id FROM jobs j WHERE j.shop_id = get_user_shop_id(auth.uid())));

CREATE POLICY "Users can update job checklist"
  ON public.job_checklist FOR UPDATE
  USING (job_id IN (SELECT j.id FROM jobs j WHERE j.shop_id = get_user_shop_id(auth.uid())));

CREATE POLICY "Users can delete job checklist"
  ON public.job_checklist FOR DELETE
  USING (job_id IN (SELECT j.id FROM jobs j WHERE j.shop_id = get_user_shop_id(auth.uid())));
