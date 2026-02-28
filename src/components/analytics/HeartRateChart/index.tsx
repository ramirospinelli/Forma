import { useQuery } from "@tanstack/react-query";
import {
  getValidStravaToken,
  fetchActivityStreams,
} from "../../../lib/services/strava-api";
import type { Activity } from "../../../lib/types";
import styles from "./HeartRateChart.module.css";

interface HeartRateChartProps {
  activity: Activity;
  metrics?: any;
}

export default function HeartRateChart({
  activity,
  metrics: _metrics,
}: HeartRateChartProps) {
  const { data: streams, isLoading } = useQuery({
    queryKey: ["activity_streams", activity.strava_id],
    queryFn: async () => {
      const token = await getValidStravaToken(activity.user_id);
      if (!token) throw new Error("No Strava token");
      return fetchActivityStreams(token, activity.strava_id, [
        "heartrate",
        "time",
      ]);
    },
    enabled: !!activity.strava_id && !!activity.average_heartrate,
  });

  if (isLoading)
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );

  let hrStream: number[] = [];
  if (Array.isArray(streams)) {
    hrStream = streams.find((s: any) => s.type === "heartrate")?.data || [];
  } else if (streams && typeof streams === "object") {
    hrStream = (streams as any).heartrate?.data || [];
  }

  if (hrStream.length === 0) {
    const avgHr = activity.average_heartrate;
    const maxHr = activity.max_heartrate;
    return (
      <div className={styles.simpleStats}>
        {avgHr && (
          <div className={styles.hrStat}>
            <span className={styles.hrValue}>{Math.round(avgHr)}</span>
            <span className={styles.hrLabel}>PROM bpm</span>
          </div>
        )}
        {maxHr && (
          <div className={styles.hrStat}>
            <span className={styles.hrValue} style={{ color: "#FF6B6B" }}>
              {Math.round(maxHr)}
            </span>
            <span className={styles.hrLabel}>MAX bpm</span>
          </div>
        )}
      </div>
    );
  }

  const displayData = hrStream.filter((_, i) =>
    hrStream.length > 200 ? i % Math.ceil(hrStream.length / 200) === 0 : true,
  );
  const maxHr = Math.max(...displayData);
  const minHr = Math.min(...displayData);
  const range = maxHr - minHr || 1;
  const avgHr = Math.round(
    hrStream.reduce((a, b) => a + b, 0) / hrStream.length,
  );

  return (
    <div className={styles.container}>
      <div className={styles.chart}>
        {displayData.map((hr, i) => {
          const pct = ((hr - minHr) / range) * 100;
          const color = pct > 80 ? "#FF6B6B" : pct > 60 ? "#FF9234" : "#FF6B35";
          return (
            <div
              key={i}
              className={styles.bar}
              style={{ height: `${Math.max(pct, 5)}%`, background: color }}
            />
          );
        })}
      </div>
      <div className={styles.stats}>
        <div className={styles.hrStat}>
          <span className={styles.hrLabel}>PROM</span>
          <span className={styles.hrValue}>{avgHr} bpm</span>
        </div>
        <div className={styles.hrStat}>
          <span className={styles.hrLabel}>MAX</span>
          <span className={styles.hrValue} style={{ color: "#FF6B6B" }}>
            {maxHr} bpm
          </span>
        </div>
        <div className={styles.hrStat}>
          <span className={styles.hrLabel}>MIN</span>
          <span className={styles.hrValue}>{minHr} bpm</span>
        </div>
      </div>
    </div>
  );
}
