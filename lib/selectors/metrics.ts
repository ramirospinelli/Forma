import { LoadDataPoint } from "../../components/analytics/LoadChart";

/**
 * Downsamples data to a specific resolution using bucketed averages.
 * Ensures the chart remains performant even with 3+ years of data.
 */
export const downsampleData = (
  data: LoadDataPoint[],
  targetPoints: number = 100,
): LoadDataPoint[] => {
  if (data.length <= targetPoints) return data;

  const bucketSize = Math.floor(data.length / targetPoints);
  const result: LoadDataPoint[] = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);
    if (bucket.length === 0) continue;

    const avg = bucket.reduce(
      (acc, curr) => ({
        ctl: acc.ctl + curr.ctl,
        atl: acc.atl + curr.atl,
        tsb: acc.tsb + curr.tsb,
      }),
      { ctl: 0, atl: 0, tsb: 0 },
    );

    result.push({
      date: bucket[Math.floor(bucket.length / 2)].date,
      ctl: avg.ctl / bucket.length,
      atl: avg.atl / bucket.length,
      tsb: avg.tsb / bucket.length,
    });
  }

  return result;
};

/**
 * Filter data by window (e.g., 90d, 180d, all)
 */
export const filterDataByWindow = (
  data: LoadDataPoint[],
  days: number | "all",
): LoadDataPoint[] => {
  if (days === "all") return data;
  return data.slice(-days);
};
