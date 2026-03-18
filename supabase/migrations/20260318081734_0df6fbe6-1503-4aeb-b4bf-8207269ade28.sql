
-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', true);

-- Create job_photos table
CREATE TABLE public.job_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL DEFAULT 'before', -- 'before' or 'after'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies (via job's shop_id)
CREATE POLICY "Users can view job photos"
  ON public.job_photos FOR SELECT
  USING (job_id IN (SELECT j.id FROM jobs j WHERE j.shop_id = get_user_shop_id(auth.uid())));

CREATE POLICY "Users can insert job photos"
  ON public.job_photos FOR INSERT
  WITH CHECK (job_id IN (SELECT j.id FROM jobs j WHERE j.shop_id = get_user_shop_id(auth.uid())));

CREATE POLICY "Users can delete job photos"
  ON public.job_photos FOR DELETE
  USING (job_id IN (SELECT j.id FROM jobs j WHERE j.shop_id = get_user_shop_id(auth.uid())));

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload job photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-photos');

CREATE POLICY "Anyone can view job photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos');

CREATE POLICY "Authenticated users can delete job photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'job-photos');
