import {
  calculateHrZones,
  calculateTimeInZones,
  calculateEdwardsTRIMP,
} from "../trimp";

describe("Edwards TRIMP Pure Functions", () => {
  it("should calculate correct HR zones based on Max HR", () => {
    const maxHr = 190;
    const zones = calculateHrZones(maxHr);

    expect(zones.z1_min).toBe(95); // 50%
    expect(zones.z1_max).toBe(113); // 59.9%
    expect(zones.z2_min).toBe(114); // 60%
    expect(zones.z2_max).toBe(132); // 69.9%
    expect(zones.z3_min).toBe(133); // 70%
    expect(zones.z3_max).toBe(151); // 79.9%
    expect(zones.z4_min).toBe(152); // 80%
    expect(zones.z4_max).toBe(170); // 89.9%
    expect(zones.z5_min).toBe(171); // 90%
  });

  it("should calculate time in zones correctly from a stream", () => {
    const zones = {
      z1_min: 100,
      z1_max: 119,
      z2_min: 120,
      z2_max: 139,
      z3_min: 140,
      z3_max: 159,
      z4_min: 160,
      z4_max: 179,
      z5_min: 180,
      z5_max: 200,
    };

    // 2s in Z1, 1s in Z2, 3s in Z3, 1s in Z4, 2s in Z5, 1s below Z1
    const stream = [90, 105, 110, 125, 145, 150, 155, 175, 185, 190];
    const timeInZones = calculateTimeInZones(stream, zones);

    expect(timeInZones).toEqual([2, 1, 3, 1, 2]);
  });

  it("should calculate Edwards TRIMP correctly", () => {
    // 60s in Z1 (1m) = 1 point
    // 120s in Z2 (2m) = 4 points
    // 180s in Z3 (3m) = 9 points
    // 60s in Z4 (1m) = 4 points
    // 60s in Z5 (1m) = 5 points
    // Total TRIMP = 1 + 4 + 9 + 4 + 5 = 23
    const timeInZones = [60, 120, 180, 60, 60];
    const trimp = calculateEdwardsTRIMP(timeInZones);

    expect(trimp).toBe(23);
  });

  it("should throw an error if array is not exactly 5 elements", () => {
    expect(() => calculateEdwardsTRIMP([60, 120, 180, 60])).toThrow();
  });
});
