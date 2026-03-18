ALTER TABLE shops ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS cover_color text DEFAULT '#00c2ff';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS accept_appointments boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS reviews (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid references shops(id) not null,
    customer_name text not null,
    rating int check(rating >= 1 and rating <= 5) not null,
    comment text,
    created_at timestamptz default now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Reviews' AND tablename = 'reviews') THEN
        CREATE POLICY "Public Access Reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert Appointments' AND tablename = 'appointments') THEN
        CREATE POLICY "Public Insert Appointments" ON appointments FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Select Shops' AND tablename = 'shops') THEN
        CREATE POLICY "Public Select Shops" ON shops FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Select Services' AND tablename = 'services') THEN
        CREATE POLICY "Public Select Services" ON services FOR SELECT USING (true);
    END IF;
END $$;
