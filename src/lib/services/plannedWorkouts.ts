import { supabase } from "../supabase";
import { PlannedWorkout, Activity } from "../types";

export const plannedWorkoutService = {
  /**
   * Fetches planned workouts for a specific date range.
   */
  async getWorkoutsForRange(
    userId: string,
    start: string,
    end: string,
  ): Promise<PlannedWorkout[]> {
    const { data, error } = await supabase
      .from("planned_workouts")
      .select("*")
      .eq("user_id", userId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetches a single planned workout by ID.
   */
  async getWorkoutById(id: string): Promise<PlannedWorkout | null> {
    const { data, error } = await supabase
      .from("planned_workouts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Upserts one or more planned workouts.
   * Ensures only one workout exists per day by deleting previous plans for those dates.
   */
  async createWorkouts(workouts: Partial<PlannedWorkout>[]): Promise<void> {
    if (workouts.length === 0) return;
    const userId = workouts[0].user_id;
    const dates = workouts.map((w) => w.date).filter(Boolean) as string[];

    if (userId && dates.length > 0) {
      // First, clean up any existing workouts on these dates to prevent duplicates
      await supabase
        .from("planned_workouts")
        .delete()
        .eq("user_id", userId)
        .in("date", dates);
    }

    const { error } = await supabase.from("planned_workouts").insert(workouts);
    if (error) throw error;
  },

  /**
   * Updates an existing planned workout.
   */
  async updateWorkout(
    id: string,
    updates: Partial<PlannedWorkout>,
  ): Promise<void> {
    const { error } = await supabase
      .from("planned_workouts")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  },

  /**
   * Automatically attempts to link a real activity to a planned workout.
   * Logic: Same day + same type + not already linked.
   */
  async autoLinkActivity(activity: Activity): Promise<void> {
    const activityDate = activity.start_date_local.split("T")[0];

    // Look for a planned workout on the same day and with the same type
    const { data: planned, error } = await supabase
      .from("planned_workouts")
      .select("id")
      .eq("user_id", activity.user_id)
      .eq("date", activityDate)
      .eq("activity_type", activity.type)
      .eq("status", "planned")
      .is("linked_activity_id", null)
      .maybeSingle();

    if (error) {
      console.error("[Linker] Error fetching planned workout:", error);
      return;
    }

    if (planned) {
      await this.updateWorkout(planned.id, {
        linked_activity_id: activity.id,
        status: "completed",
        updated_at: new Date().toISOString(),
      });
      console.log(
        `[Linker] Activity ${activity.id} linked to workout ${planned.id}`,
      );
    }
  },

  /**
   * Deletes a planned workout.
   */
  async deleteWorkout(id: string): Promise<void> {
    const { error } = await supabase
      .from("planned_workouts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  /**
   * Deletes multiple planned workouts by ID or Date.
   */
  async deleteWorkouts(options: {
    ids?: string[];
    dates?: string[];
    userId: string;
  }): Promise<void> {
    let query = supabase
      .from("planned_workouts")
      .delete()
      .eq("user_id", options.userId);

    if (options.ids && options.ids.length > 0) {
      query = query.in("id", options.ids);
    } else if (options.dates && options.dates.length > 0) {
      query = query.in("date", options.dates);
    } else {
      return;
    }

    const { error } = await query;
    if (error) throw error;
  },
};
