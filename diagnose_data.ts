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

  // 3. Check load profile
  const { count: profCount, error: profError } = await supabase
    .from("daily_load_profile")
    .select("*", { count: "exact", head: true });

  if (profError) {
    console.error("Error fetching load profile:", profError.message);
  } else {
    console.log(`Daily Load Profiles found: ${profCount}`);
    if (profCount === 0) {
      console.log("ALERT: daily_load_profile table is EMPTY.");
    }
  }
}

diagnose();
