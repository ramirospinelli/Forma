import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map, Zap, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import {
  useDailyLoadProfile,
  useWeeklyMetricsSummary,
  useEFHistory,
} from "../lib/hooks/useMetrics";
import { formatDistance, speedToPace } from "../lib/utils";

import RampRateChart from "../components/analytics/RampRateChart";
import MonotonyChart from "../components/analytics/MonotonyChart";
import EFChart from "../components/analytics/EFChart";
import Header from "../components/Header";
import PerformanceChart from "../components/analytics/PerformanceChart";
import type { Activity } from "../lib/types";
import stylesMod from "./Stats.module.css";

const TIME_RANGES = [
  { id: "diario", label: "Diario", days: 1 },
  { id: "semanal", label: "Semanal", days: 7 },
  { id: "mensual", label: "Mensual", days: 30 },
  { id: "3m", label: "3 meses", days: 90 },
  { id: "6m", label: "6 meses", days: 180 },
  { id: "anual", label: "Anual", days: 365 },
];

const SPORT_COLORS: Record<string, string> = {
  Run: "#FF6B35",
  Ride: "#4ECDC4",
  EbikeRide: "#FFD93D",
  EBikeRide: "#FFD93D",
  Walk: "#A29BFE",
  Swim: "#0984E3",
  WeightTraining: "#6C5CE7",
  Workout: "#FD79A8",
  Yoga: "#55E6C1",
};

const SPORT_NAMES: Record<string, string> = {
  Run: "Carrera",
  Ride: "Ciclismo",
  WeightTraining: "Gimnasio",
  Walk: "Caminata",
  Swim: "Natación",
  Workout: "Entrenamiento",
  Yoga: "Yoga",
  EbikeRide: "E-Bike",
  EBikeRide: "E-Bike",
};

const DEFAULT_COLORS = [
  "#FF6B35",
  "#4ECDC4",
  "#FFD93D",
  "#A29BFE",
  "#0984E3",
  "#6C5CE7",
  "#FD79A8",
];

export default function Stats() {
  const { user } = useAuthStore();
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES[2]); // Mensual by default

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  const { data: loadProfile = [] } = useDailyLoadProfile(
    user?.id,
    selectedRange.days < 7 ? 7 : selectedRange.days,
  );
  const { data: weeklyMetrics = [] } = useWeeklyMetricsSummary(user?.id, 16);

  const [efType, setEfType] = useState("");
  const { data: efHistory = [], isLoading: efLoading } = useEFHistory(
    user?.id,
    efType || undefined,
  );

  // Filter activities based on date
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - selectedRange.days);
  const filteredActivities = activities.filter(
    (a) => new Date(a.start_date_local || a.start_date) >= cutoff,
  );

  const totals = filteredActivities.reduce(
    (acc, a) => ({
      distance: acc.distance + (a.distance ?? 0),
      time: acc.time + (a.moving_time ?? 0),
      elevation: acc.elevation + (a.total_elevation_gain ?? 0),
      count: acc.count + 1,
    }),
    { distance: 0, time: 0, elevation: 0, count: 0 },
  );

  const typeBreakdown = filteredActivities.reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.type] = (acc[a.type] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const sortedTypes = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]);

  const runs = filteredActivities.filter(
    (a) => a.type === "Run" && a.distance > 0,
  );
  const rides = filteredActivities.filter(
    (a) => a.type === "Ride" && a.distance > 0,
  );

  const fastestRunPace = runs.length
    ? Math.max(...runs.map((a) => a.average_speed ?? 0))
    : 0;
  const longestRun = runs.length ? Math.max(...runs.map((a) => a.distance)) : 0;
  const longestRide = rides.length
    ? Math.max(...rides.map((a) => a.distance))
    : 0;

  return (
    <div className={stylesMod.page}>
      <Header title="Análisis de Rendimiento" />

      <div className={stylesMod.tabs}>
        {TIME_RANGES.map((r) => (
          <button
            key={r.id}
            className={`${stylesMod.tab} ${selectedRange.id === r.id ? stylesMod.tabActive : ""}`}
            onClick={() => setSelectedRange(r)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className={stylesMod.scrollContent}>
        {/* 1. Tendencia de Carga */}
        <div className={stylesMod.section}>
          <h2 className={stylesMod.cardTitle} style={{ marginLeft: 4 }}>
            Tendencia de Carga ({selectedRange.label})
          </h2>
          <div className={stylesMod.card}>
            <PerformanceChart
              activities={activities}
              days={selectedRange.days < 2 ? 7 : selectedRange.days}
            />
          </div>
        </div>

        {/* 3. Ramp rate */}
        <div className={stylesMod.section}>
          <div className={stylesMod.card}>
            <RampRateChart data={loadProfile} />
          </div>
        </div>

        {/* 4. Monotony / Strain */}
        {weeklyMetrics.length > 0 && (
          <div className={stylesMod.section}>
            <div className={stylesMod.card}>
              <MonotonyChart data={weeklyMetrics} />
            </div>
          </div>
        )}

        {/* 5. Eficiencia Aeróbica — always visible when there is any data or filter active */}
        {(efHistory.length > 0 || efLoading || efType !== "") && (
          <div className={stylesMod.section}>
            <div className={stylesMod.card}>
              <EFChart
                data={efHistory}
                activityType={efType}
                onTypeChange={setEfType}
                isLoading={efLoading}
              />
            </div>
          </div>
        )}

        {/* 4. Resumen del año */}
        <div className={stylesMod.section}>
          <h2 className={stylesMod.cardTitle} style={{ marginLeft: 4 }}>
            Resumen ({selectedRange.label})
          </h2>
          <div className={stylesMod.totalsGrid}>
            <div className={stylesMod.totalCard}>
              <div
                className={stylesMod.totalIcon}
                style={{ background: "rgba(255,107,53,0.1)" }}
              >
                <Map size={24} color="var(--color-primary)" />
              </div>
              <span className={stylesMod.totalValue}>
                {(totals.distance / 1000).toFixed(0)}
              </span>
              <span className={stylesMod.totalUnit}>km totales</span>
            </div>
            <div className={stylesMod.totalCard}>
              <div
                className={stylesMod.totalIcon}
                style={{ background: "rgba(78,205,196,0.1)" }}
              >
                <Clock size={24} color="#4ECDC4" />
              </div>
              <span className={stylesMod.totalValue}>
                {Math.round(totals.time / 3600)}
              </span>
              <span className={stylesMod.totalUnit}>horas activo</span>
            </div>
          </div>
        </div>

        {/* 5. Deportes del año */}
        {sortedTypes.length > 0 && (
          <div className={stylesMod.section}>
            <h2 className={stylesMod.cardTitle} style={{ marginLeft: 4 }}>
              Deportes ({selectedRange.label})
            </h2>
            <div className={stylesMod.breakdownCard}>
              {sortedTypes.map(([type, count], index) => {
                const color =
                  SPORT_COLORS[type] ||
                  DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                const pct = Math.round(
                  (count / filteredActivities.length) * 100,
                );
                return (
                  <div key={type} className={stylesMod.breakdownRow}>
                    <div className={stylesMod.breakdownLeft}>
                      <div
                        className={stylesMod.breakdownDot}
                        style={{ background: color }}
                      />
                      <span className={stylesMod.breakdownType}>
                        {SPORT_NAMES[type] || type}
                      </span>
                    </div>
                    <div className={stylesMod.breakdownBarContainer}>
                      <div
                        className={stylesMod.breakdownBar}
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className={stylesMod.breakdownPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Records del año */}
        <div className={stylesMod.section}>
          <h2 className={stylesMod.cardTitle} style={{ marginLeft: 4 }}>
            Records ({selectedRange.label})
          </h2>
          <div className={stylesMod.prGrid}>
            {fastestRunPace > 0 && (
              <PRCard
                label="Ritmo más rápido"
                value={speedToPace(fastestRunPace)}
                icon={<Zap size={18} color="var(--color-warning)" />}
              />
            )}
            {longestRun > 0 && (
              <PRCard
                label="Carrera más larga"
                value={formatDistance(longestRun)}
                icon={<Map size={18} color="var(--color-warning)" />}
              />
            )}
            {longestRide > 0 && (
              <PRCard
                label="Ride más largo"
                value={formatDistance(longestRide)}
                icon={<Zap size={18} color="var(--color-warning)" />}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PRCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={stylesMod.prCard}>
      <div className={stylesMod.prIconBg}>{icon}</div>
      <div className={stylesMod.prContent}>
        <span className={stylesMod.prValue}>{value}</span>
        <span className={stylesMod.prLabel}>{label}</span>
      </div>
    </div>
  );
}
