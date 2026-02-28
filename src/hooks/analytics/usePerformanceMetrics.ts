import { useMemo } from "react";
import { Activity } from "../../lib/types";

export function usePerformanceMetrics(activities: Activity[] | undefined) {
  return useMemo(() => {
    if (!activities || activities.length === 0) {
      return {
        totals: { distance: 0, time: 0, elevation: 0, runs: 0, rides: 0 },
        weeklyHistory: [],
      };
    }

    // 1. Calculate Totals (YTD or Filtered)
    const totals = activities.reduce(
      (acc, a) => ({
        distance: acc.distance + (a.distance ?? 0),
        time: acc.time + (a.moving_time ?? 0),
        elevation: acc.elevation + (a.total_elevation_gain ?? 0),
        runs: acc.runs + (a.type === "Run" ? 1 : 0),
        rides: acc.rides + (a.type === "Ride" ? 1 : 0),
      }),
      { distance: 0, time: 0, elevation: 0, runs: 0, rides: 0 },
    );

    // 2. Calculate fastest run (Speed based records)
    const runs = activities.filter((a) => a.type === "Run" && a.distance > 0);
    const fastestRunPace = runs.length
      ? Math.max(...runs.map((a) => a.average_speed ?? 0))
      : 0;

    return {
      totals,
      records: {
        fastestRunPace,
      },
    };
  }, [activities]);
}
