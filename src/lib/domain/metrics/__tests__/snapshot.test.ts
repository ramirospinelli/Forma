import { generateTrainingSnapshot } from "../snapshot";
import { DailyLoadProfile, WeeklyLoadProfile } from "../types";

describe("Training Snapshot Pure Function", () => {
  it("should assemble a complete Training Snapshot payload", () => {
    const daily: DailyLoadProfile = {
      date: "2026-02-26",
      user_id: "user_123",
      daily_trimp: 120,
      ctl: 45.5,
      atl: 60.1,
      tsb: -14.6,
      formula_version: "1.0",
      calculated_at: "2026-02-26T10:00:00Z",
    };

    const weekly: WeeklyLoadProfile = {
      week_start_date: "2026-02-23",
      user_id: "user_123",
      total_trimp: 450,
      monotony: 1.1,
      strain: 495,
      formula_version: "1.0",
      calculated_at: "2026-02-26T10:00:00Z",
    };

    const planned = [{ id: "workout_1", title: "Tempo Run" }];

    const snapshot = generateTrainingSnapshot(daily, weekly, planned);

    expect(snapshot.currentProfile).toEqual(daily);
    expect(snapshot.recentWeek).toEqual(weekly);
    expect(snapshot.nextWorkouts).toHaveLength(1);
    expect(snapshot.generated_at).toBeDefined();
  });
});
