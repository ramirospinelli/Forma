import { supabase } from "./lib/supabase";

async function checkTss() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("No user logged in");
    return;
  }

  const { data, count, error } = await supabase
    .from("activities")
    .select("tss, name, start_date", { count: "exact" })
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching activities:", error);
    return;
  }

  console.log("Total activities:", count);
  const withTss = data.filter((a) => a.tss > 0);
  console.log("Activities with TSS > 0:", withTss.length);

  if (withTss.length > 0) {
    console.log("Example with TSS:", withTss[0]);
  } else {
    console.log("No activities have TSS. First 5 activities:");
    console.log(data.slice(0, 5));
  }
}

checkTss();
