import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

export interface ZonalData {
  week_start: string;
  zones: number[]; // TRIMP per zone
  totalTrimp: number;
}

export function useZonalDistribution() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["zonal-distribution", user?.id],
    queryFn: async () => {
      // Fetch activity metrics joined with activity date
      const { data, error } = await supabase
        .from("activity_metrics")
        .select(
          `
          trimp_score,
          hr_zones_time,
          activities!inner(start_date_local)
        `,
        )
        .eq("activities.user_id", user!.id)
        .order("activities.start_date_local", { ascending: false })
        .limit(100);

      if (error) throw error;

      const weeks: Record<string, number[]> = {};

      data.forEach((row: any) => {
        const date = new Date(row.activities.start_date_local);
        const dayDiff = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const monday = new Date(date);
        monday.setDate(date.getDate() - dayDiff);
        const weekKey = monday.toISOString().split("T")[0];

        if (!weeks[weekKey]) weeks[weekKey] = [0, 0, 0, 0, 0];

        // hr_zones_time is [s_z1, s_z2, s_z3, s_z4, s_z5]
        const zoneTimes = row.hr_zones_time || [0, 0, 0, 0, 0];
        const multipliers = [1, 2, 3, 4, 5];

        zoneTimes.forEach((seconds: number, i: number) => {
          const zoneTrimp = (seconds / 60) * multipliers[i];
          weeks[weekKey][i] += zoneTrimp;
        });
      });

      return Object.entries(weeks)
        .map(([week_start, zones]) => ({
          week_start,
          zones,
          totalTrimp: zones.reduce((a, b) => a + b, 0),
        }))
        .sort((a, b) => a.week_start.localeCompare(b.week_start));
    },
    enabled: !!user,
  });
}
