import { calculateCTL, calculateATL, calculateTSB } from "../load";

describe("Load Smoothing Pure Functions (CTL, ATL, TSB)", () => {
  it("should calculate correct initial CTL and ATL from 0", () => {
    // Day 1 with a TRIMP of 100
    const trimp = 100;
    const ctl = calculateCTL(trimp, 0);
    const atl = calculateATL(trimp, 0);

    // Alpha for CTL (42) ~= 0.0235... -> 100 * 0.0235 + 0 = 2.35
    expect(ctl).toBeCloseTo(2.35, 2);

    // Alpha for ATL (7) ~= 0.1331... -> 100 * 0.1331 + 0 = 13.31
    expect(atl).toBeCloseTo(13.31, 2);
  });

  it("should incrementally build load and fatigue over a block", () => {
    let currentCTL = 0;
    let currentATL = 0;

    // Train 100 TRIMP every day for 5 days
    for (let i = 0; i < 5; i++) {
      currentCTL = calculateCTL(100, currentCTL);
      currentATL = calculateATL(100, currentATL);
    }

    // After 5 days, ATL should be much higher than CTL (fast reacting)
    expect(currentATL).toBeGreaterThan(currentCTL);

    // Exact values (approx)
    expect(currentCTL).toBeCloseTo(11.22, 2);
    expect(currentATL).toBeCloseTo(51.05, 2);
  });

  it("should calculate correct TSB (Form)", () => {
    // TSB is YesterdayCTL - YesterdayATL
    const yesterdayCTL = 40;
    const yesterdayATL = 60;

    const tsb = calculateTSB(yesterdayCTL, yesterdayATL);

    // -20 denotes a fatigued state
    expect(tsb).toBe(-20);
  });

  it("should decay load when TRIMP is 0 (rest day)", () => {
    const startCTL = 50;
    const startATL = 50;

    const currentCTL = calculateCTL(0, startCTL);
    const currentATL = calculateATL(0, startATL);

    // Both should go down, but ATL drops much faster
    expect(currentCTL).toBeLessThan(startCTL);
    expect(currentATL).toBeLessThan(startATL);

    // 50 * (1 - 0.0235) ~= 48.82
    expect(currentCTL).toBeCloseTo(48.82, 2);

    // 50 * (1 - 0.1331) ~= 43.34
    expect(currentATL).toBeCloseTo(43.34, 2);
  });
});
