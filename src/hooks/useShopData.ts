import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useJobs() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["jobs", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, vehicles(*, customers(name, phone, whatsapp)), job_services(*), job_checklist(*), job_photos(*)")
        .eq("shop_id", shopId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useServices() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["services", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("shop_id", shopId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomers() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["customers", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("shop_id", shopId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomersWithStats() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["customers_stats", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          vehicles (*, jobs(status, total_price, created_at))
        `)
        .eq("shop_id", shopId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useVehicles(customerId?: string) {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["vehicles", shopId, customerId],
    enabled: !!shopId,
    queryFn: async () => {
      let query = supabase
        .from("vehicles")
        .select("*, customers(name)")
        .eq("shop_id", shopId!)
        .order("created_at", { ascending: false });
      if (customerId) query = query.eq("customer_id", customerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTeam() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["team", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("shop_id", shopId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useShop() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["shop", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useAppointments() {
  const { shopId } = useAuth();
  return useQuery({
    queryKey: ["appointments", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, customers(*), vehicles(*), services(*)")
        .eq("shop_id", shopId!)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
