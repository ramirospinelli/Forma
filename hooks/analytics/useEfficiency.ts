import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { calculateEfficiencyTrend } from "../../lib/selectors/performance";

export function useEfficiency(userId: string | undefined) {
  return useQuery({
    queryKey: ["efficiency_trend", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("activities")
        .select(
          `
          id,
          start_date_local,
          type,
          activity_metrics (
            aerobic_efficiency
          )
        `,
        )
        .eq("user_id", userId)
        .order("start_date_local", { ascending: false })
        .limit(60);

      if (error) throw error;

      const sessionData = data
        .filter(
          (a) =>
            a.activity_metrics &&
            (a.activity_metrics as any).aerobic_efficiency > 0,
        )
        .map((a) => ({
          date: a.start_date_local,
          ef: (a.activity_metrics as any).aerobic_efficiency,
        }));

      if (sessionData.length < 2) return { current: 0, trend: 0, history: [] };

      const currentEf =
        sessionData.slice(0, 5).reduce((acc, d) => acc + d.ef, 0) / 5;
      const prevEf =
        sessionData.slice(5, 10).reduce((acc, d) => acc + d.ef, 0) / 5;
      const trend = calculateEfficiencyTrend(currentEf, prevEf);

      return {
        current: currentEf,
        trend,
        history: sessionData.reverse(),
      };
    },
    enabled: !!userId,
  });
}
