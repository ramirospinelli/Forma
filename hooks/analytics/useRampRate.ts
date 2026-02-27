import { useMemo } from "react";
import { LoadDataPoint } from "../../components/analytics/LoadChart/index";

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

      const currentCtl = Number(current.ctl) || 0;
      const previousCtl = Number(previous.ctl) || 0;
      const delta = currentCtl - previousCtl;

      // Calculate rolling 4-week average (28 days) of deltas
      let sum = 0;
      let count = 0;
      for (let j = Math.max(7, i - 21); j <= i; j++) {
        const d_curr = Number(data[j].ctl) || 0;
        const d_prev = Number(data[j - 7].ctl) || 0;
        sum += d_curr - d_prev;
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
