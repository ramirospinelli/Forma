export const SMOOTHING_VERSION = "1.0.0";

/**
 * Generic Exponential Moving Average (EMA) calculation.
 * Formula: Today_Load * (1 - e^(-1/Time_Constant)) + Yesterday_EMA * e^(-1/Time_Constant)
 *
 * @param todayLoad TRIMP score for today (0 if rest day).
 * @param yesterdaySmoothed The previous day's EMA value (CTL or ATL).
 * @param timeConstant Usually 42 for CTL, 7 for ATL.
 */
export function calculateExponentialSmoothing(
  todayLoad: number,
  yesterdaySmoothed: number,
  timeConstant: number,
): number {
  if (timeConstant <= 0) {
    throw new Error("timeConstant must be strictly positive.");
  }

  const alpha = 1 - Math.exp(-1 / timeConstant);
  return todayLoad * alpha + yesterdaySmoothed * (1 - alpha);
}

/**
 * Calculates Chronic Training Load (CTL) using a 42-day time constant.
 */
export function calculateCTL(todayLoad: number, yesterdayCTL: number): number {
  return calculateExponentialSmoothing(todayLoad, yesterdayCTL, 42);
}

/**
 * Calculates Acute Training Load (ATL) using a 7-day time constant.
 */
export function calculateATL(todayLoad: number, yesterdayATL: number): number {
  return calculateExponentialSmoothing(todayLoad, yesterdayATL, 7);
}

/**
 * Calculates Training Stress Balance (TSB) aka Form.
 * Formula: Yesterday's CTL - Yesterday's ATL.
 *
 * NOTE: TSB for "today" is calculated looking at the exhaustion/fitness built UP TO *yesterday*.
 * This tells you your form starting the current day.
 */
export function calculateTSB(
  yesterdayCTL: number,
  yesterdayATL: number,
): number {
  return yesterdayCTL - yesterdayATL;
}
