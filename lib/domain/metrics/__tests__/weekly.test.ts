import { calculateMonotony, calculateStrain } from "../weekly";

describe("Weekly Load Pure Functions (Monotony, Strain)", () => {
  it("should calculate Monotony correctly for a varied training week", () => {
    // 7 days of training load
    const loads = [50, 0, 100, 50, 0, 150, 0];
    // Mean: 350 / 7 = 50
    // Variance:
    // (50-50)^2 + (0-50)^2 + (100-50)^2 + (50-50)^2 + ... = 0 + 2500 + 2500 + 0 + 2500 + 10000 + 2500 = 20000
    // 20000 / 7 = 2857.14
    // StdDev: sqrt(2857.14) = 53.45
    // Monotony: 50 / 53.45 = 0.94

    const monotony = calculateMonotony(loads);
    expect(monotony).toBeCloseTo(0.94, 2);
  });

  it("should calculate Strain correctly", () => {
    const totalLoad = 350;
    const monotony = 0.94;

    // 350 * 0.94 = 329
    const strain = calculateStrain(totalLoad, monotony);
    expect(strain).toBeCloseTo(329, 2);
  });

  it("should handle division by zero (identical loads) safely with a cap", () => {
    const identicalLoads = [50, 50, 50, 50, 50, 50, 50]; // Mean 50, Stddev 0
    const monotony = calculateMonotony(identicalLoads);

    // Our domain rule caps it at 2.0 (High Monotony).
    expect(monotony).toBe(2.0);
  });

  it("should handle a zero load week gracefully", () => {
    const zeroLoads = [0, 0, 0, 0, 0, 0, 0];
    const monotony = calculateMonotony(zeroLoads);

    expect(monotony).toBe(0);
  });
});
