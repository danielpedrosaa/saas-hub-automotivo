import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMessageTemplate() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["message_template", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("shop_id", shopId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
