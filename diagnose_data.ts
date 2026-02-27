import { supabase } from "./lib/supabase";

async function diagnose() {
  console.log("--- Database Diagnosis ---");

  // 1. Check activities exist
  const { count: actCount, error: actError } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true });

  if (actError) {
    console.error("Error fetching activities:", actError.message);
  } else {
    console.log(`Activities found: ${actCount}`);
  }

  // 2. Check activity_metrics
  const {
    data: metrics,
    count: metCount,
    error: metError,
  } = await supabase
    .from("activity_metrics")
    .select("*", { count: "exact" })
    .limit(5);

  if (metError) {
    console.error("Error fetching metrics:", metError.message);
  } else {
    console.log(`Activity Metrics found: ${metCount}`);
    if (metCount === 0) {
      console.log("ALERT: activity_metrics table is EMPTY.");
    } else {
      console.log("Sample metrics:", metrics);
    }
  }

  // 4. Check load profile details
  const { data: profileSamples, error: sampError } = await supabase
    .from("daily_load_profile")
    .select("date, ctl, atl, tsb, daily_trimp")
    .order("date", { ascending: false })
    .limit(10);

  if (sampError) {
    console.error("Error fetching profile samples:", sampError.message);
  } else {
    console.log("Latest Load Profile Samples:");
    profileSamples.forEach((s) => {
      console.log(
        `${s.date}: CTL=${s.ctl}, ATL=${s.atl}, TSB=${s.tsb}, TRIMP=${s.daily_trimp}`,
      );
    });
  }
}

diagnose();
