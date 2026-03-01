import { supabase } from "../supabase";
import { TargetEvent } from "../types";

export const eventsService = {
  async getEvents(userId: string): Promise<TargetEvent[]> {
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      throw error;
    }

    return events || [];
  },

  async createEvent(
    event: Omit<TargetEvent, "id" | "created_at" | "user_id"> & {
      user_id: string;
    },
  ): Promise<TargetEvent> {
    const { data, error } = await supabase
      .from("events")
      .insert([event])
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      throw error;
    }

    return data;
  },

  async updateEvent(
    id: string,
    updates: Partial<TargetEvent>,
  ): Promise<TargetEvent> {
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating event:", error);
      throw error;
    }

    return data;
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  },
};
