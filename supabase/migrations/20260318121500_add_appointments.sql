CREATE TABLE IF NOT EXISTS appointments (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid not null,
    customer_id uuid not null,
    vehicle_id uuid not null,
    service_id uuid,
    scheduled_at timestamptz not null,
    duration_minutes int default 60,
    status text check(status in ('pending','confirmed','in_progress','done','cancelled','no_show')) default 'confirmed',
    notes text,
    created_by uuid,
    created_at timestamptz default now()
);

-- Habilitando RLS genérico para permitir acesso aos usuários autenticados da aplicação
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'Enable ALL for authenticated users'
    ) THEN
        CREATE POLICY "Enable ALL for authenticated users" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END
$$;
