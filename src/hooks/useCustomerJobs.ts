import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCustomerJobs(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-jobs", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      // Get all vehicles for this customer
      const { data: vehicles, error: vErr } = await supabase
        .from("vehicles")
        .select("id")
        .eq("customer_id", customerId!);
      if (vErr) throw vErr;
      if (!vehicles || vehicles.length === 0) return [];

      const vehicleIds = vehicles.map((v) => v.id);

      const { data, error } = await supabase
        .from("jobs")
        .select("*, vehicles(plate, model, color), job_services(id, service_name, price), job_checklist(id), job_photos(id, photo_type)")
        .in("vehicle_id", vehicleIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
