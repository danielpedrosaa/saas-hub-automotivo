import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMessageTemplate() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["whatsapp_templates", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("shop_id", shopId!);
      if (error) throw error;
      return data || [];
    },
  });
}
