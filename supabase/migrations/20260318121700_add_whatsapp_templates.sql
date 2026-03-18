CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid not null,
    trigger_type text check(trigger_type in ('job_done','job_reminder','reactivation','birthday')) not null,
    name text not null,
    message_template text not null,
    active boolean default true,
    created_at timestamptz default now()
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_templates' AND policyname = 'Enable ALL for authenticated users'
    ) THEN
        CREATE POLICY "Enable ALL for authenticated users" ON whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END
$$;
