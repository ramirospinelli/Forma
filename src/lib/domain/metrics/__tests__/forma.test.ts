import { calculateFormaLoad, FormaLoadConfig } from "../forma";

describe("Forma Load Proprietary Model", () => {
  const config: FormaLoadConfig = {
    maxHr: 200,
    restHr: 50,
    gender: "male",
  };

  it("should calculate 0 load for heart rates below rest HR", () => {
    const hrStream = [40, 45, 50];
    const load = calculateFormaLoad(hrStream, config);
    expect(load).toBe(0);
  });

  it("should calculate higher load for higher intensities", () => {
    // 60 minutes at 125 HR (50% HRR)
    const hrStreamLow = Array(3600).fill(125);
    const loadLow = calculateFormaLoad(hrStreamLow, config);

    // 60 minutes at 170 HR (80% HRR)
    const hrStreamHigh = Array(3600).fill(170);
    const loadHigh = calculateFormaLoad(hrStreamHigh, config);

    expect(loadHigh).toBeGreaterThan(loadLow);

    // Exact check for low effort:
    // x = (125-50)/150 = 0.5
    // load_per_min = 0.5 * 0.64 * e^(1.92 * 0.5) = 0.32 * e^0.96 ~= 0.32 * 2.61 ~= 0.835
    // 60 mins -> ~50.1
    expect(loadLow).toBeCloseTo(50.1, 1);
  });

  it("should handle gender differences correctly", () => {
    const hrStream = Array(3600).fill(150);

    const maleLoad = calculateFormaLoad(hrStream, {
      ...config,
      gender: "male",
    });
    const femaleLoad = calculateFormaLoad(hrStream, {
      ...config,
      gender: "female",
    });

    // Male coefficient (1.92) > Female coefficient (1.67)
    expect(maleLoad).toBeGreaterThan(femaleLoad);
  });
});
