import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { getACWRStatus } from "../../lib/selectors/performance";

export function useACWR(userId: string | undefined) {
  return useQuery({
    queryKey: ["acwr", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("daily_load_profile")
        .select("date, acwr, ctl, atl")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const current = data[0];
      const status = getACWRStatus(current.acwr || 1.0);

      // Calculate trend (last 7 days average vs previous 7 days)
      const last7 =
        data.slice(0, 7).reduce((acc, d) => acc + (d.acwr || 0), 0) / 7;
      const prev7 =
        data.slice(7, 14).reduce((acc, d) => acc + (d.acwr || 0), 0) / 7;
      const trend = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0;

      return {
        current: current.acwr || 1.0,
        status,
        trend,
        history: data.reverse(),
      };
    },
    enabled: !!userId,
  });
}
