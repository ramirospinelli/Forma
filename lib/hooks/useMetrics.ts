import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export function useDailyLoadProfile(
  userId: string | undefined,
  days: number = 28,
) {
  return useQuery({
    queryKey: ["daily_load_profile", userId, days],
    queryFn: async () => {
      if (!userId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("daily_load_profile")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDateStr)
        .order("date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useActivityMetrics(activityId: string | undefined) {
  return useQuery({
    queryKey: ["activity_metrics", activityId],
    queryFn: async () => {
      if (!activityId) return null;

      const { data, error } = await supabase
        .from("activity_metrics")
        .select("*")
        .eq("activity_id", activityId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!activityId,
  });
}

export function useWeeklyMetricsSummary(
  userId: string | undefined,
  limit: number = 4,
) {
  return useQuery({
    queryKey: ["weekly_load_metrics", userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("weekly_load_metrics")
        .select("*")
        .eq("user_id", userId)
        .order("week_start_date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
