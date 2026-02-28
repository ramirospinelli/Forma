import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from("activity_metrics")
    .select("activity_id, hr_zones_time")
    .not('hr_zones_time', 'is', null)
    .limit(5);

  if (error) console.error(error);
  else console.log(data);
}

check();
