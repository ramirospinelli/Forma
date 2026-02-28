import { Profile } from "../../types";

export interface HrZone {
  zone: number;
  min: number;
  max: number;
  label: string;
}

export type ZoneModelType = "LTHR_FRIEL" | "HRMAX_AGE" | "STATIC";

export interface ZoneModelResult {
  zones: HrZone[];
  type: ZoneModelType;
  sourceValue: number; // The LTHR or HRmax used
  estimatedMaxHr: number;
}

/**
 * Calculates user-specific heart rate zones.
 * Priority: 1. LTHR (Friel Model) -> 2. Age-based HRmax -> 3. Static Default
 */
export function calculateDynamicZones(
  profile: Partial<Profile> | null,
): ZoneModelResult {
  // 1. LTHR Priority (Joe Friel Model)
  if (profile?.lthr && profile.lthr > 0) {
    const lthr = profile.lthr;
    return {
      type: "LTHR_FRIEL",
      sourceValue: lthr,
      estimatedMaxHr: Math.round(lthr / 0.9), // Conservative estimate for Banister formula
      zones: [
        {
          zone: 1,
          min: 0,
          max: Math.floor(lthr * 0.85),
          label: "Recuperación",
        },
        {
          zone: 2,
          min: Math.floor(lthr * 0.85) + 1,
          max: Math.floor(lthr * 0.89),
          label: "Resistencia",
        },
        {
          zone: 3,
          min: Math.floor(lthr * 0.89) + 1,
          max: Math.floor(lthr * 0.94),
          label: "Tempo",
        },
        {
          zone: 4,
          min: Math.floor(lthr * 0.94) + 1,
          max: Math.floor(lthr * 0.99),
          label: "Umbral",
        },
        {
          zone: 5,
          min: Math.floor(lthr * 0.99) + 1,
          max: 250,
          label: "Anaeróbico",
        },
      ],
    };
  }

  // 2. Age-based fallback (220 - age)
  if (profile?.birth_date) {
    const birthDate = new Date(profile.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const hrMax = 220 - age;
    return {
      type: "HRMAX_AGE",
      sourceValue: hrMax,
      estimatedMaxHr: hrMax,
      zones: [
        {
          zone: 1,
          min: 0,
          max: Math.floor(hrMax * 0.6),
          label: "Z1",
        },
        {
          zone: 2,
          min: Math.floor(hrMax * 0.6) + 1,
          max: Math.floor(hrMax * 0.7),
          label: "Z2",
        },
        {
          zone: 3,
          min: Math.floor(hrMax * 0.7) + 1,
          max: Math.floor(hrMax * 0.8),
          label: "Z3",
        },
        {
          zone: 4,
          min: Math.floor(hrMax * 0.8) + 1,
          max: Math.floor(hrMax * 0.9),
          label: "Z4",
        },
        { zone: 5, min: Math.floor(hrMax * 0.9) + 1, max: 250, label: "Z5" },
      ],
    };
  }

  // 3. Static Default Fallback
  const defaultMax = 190;
  return {
    type: "STATIC",
    sourceValue: defaultMax,
    estimatedMaxHr: defaultMax,
    zones: [
      { zone: 1, min: 0, max: 120, label: "Z1" },
      { zone: 2, min: 121, max: 140, label: "Z2" },
      { zone: 3, min: 141, max: 160, label: "Z3" },
      { zone: 4, min: 161, max: 180, label: "Z4" },
      { zone: 5, min: 181, max: 250, label: "Z5" },
    ],
  };
}

/**
 * Maps a single HR value to its zone based on the provided model.
 */
export function getZoneForHr(hr: number, zones: HrZone[]): number {
  const found = zones.find((z) => hr >= z.min && hr <= z.max);
  return found
    ? found.zone
    : hr > zones[zones.length - 1].max
      ? zones.length
      : 1;
}

/**
 * Returns TRIMP weighting for a given zone index (1-5)
 */
export function getTrimpWeightForZone(zone: number): number {
  const weights: Record<number, number> = {
    1: 1.0,
    2: 1.1,
    3: 1.2,
    4: 1.3,
    5: 1.5,
  };
  return weights[zone] || 1.0;
}
