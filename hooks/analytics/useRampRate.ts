import { useMemo } from "react";
import { LoadDataPoint } from "../../components/analytics/LoadChart";

export interface RampRatePoint {
  date: string;
  delta: number;
  avg4w: number;
}

export const useRampRate = (data: LoadDataPoint[]) => {
  return useMemo(() => {
    if (data.length < 14) return [];

    const rampData: RampRatePoint[] = [];

    // We calculate weekly delta for each day (Current CTL - CTL from 7 days ago)
    for (let i = 7; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 7];
      const delta = current.ctl - previous.ctl;

      // Calculate rolling 4-week average (28 days) of deltas
      let sum = 0;
      let count = 0;
      for (let j = Math.max(7, i - 21); j <= i; j++) {
        const d = data[j].ctl - data[j - 7].ctl;
        sum += d;
        count++;
      }
      const avg4w = count > 0 ? sum / count : 0;

      rampData.push({
        date: current.date,
        delta,
        avg4w,
      });
    }

    // Only return the last 12 weeks of ramp rate for visibility
    return rampData.slice(-84);
  }, [data]);
};
