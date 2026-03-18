
-- Add phone and whatsapp columns to shops
ALTER TABLE public.shops ADD COLUMN phone TEXT;
ALTER TABLE public.shops ADD COLUMN whatsapp TEXT;

-- Update the handle_new_user trigger to accept shop name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_shop_id UUID;
  user_name TEXT;
  shop_name TEXT;
  shop_phone TEXT;
  shop_whatsapp TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', user_name || '''s Shop');
  shop_phone := NEW.raw_user_meta_data->>'shop_phone';
  shop_whatsapp := NEW.raw_user_meta_data->>'shop_whatsapp';
  
  INSERT INTO public.shops (name, phone, whatsapp) 
  VALUES (shop_name, shop_phone, shop_whatsapp) 
  RETURNING id INTO new_shop_id;
  
  INSERT INTO public.profiles (id, shop_id, full_name)
  VALUES (NEW.id, new_shop_id, user_name);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;
