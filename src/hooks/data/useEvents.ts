import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsService } from "../../lib/services/events";
import { TargetEvent } from "../../lib/types";

export const EVENTS_QUERY_KEY = "user_events";

export function useEvents(userId: string | undefined) {
  return useQuery({
    queryKey: [EVENTS_QUERY_KEY, userId],
    queryFn: () => eventsService.getEvents(userId!),
    enabled: !!userId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newEvent: Omit<TargetEvent, "id" | "created_at">) =>
      eventsService.createEvent(newEvent as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [EVENTS_QUERY_KEY, variables.user_id],
      });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<TargetEvent>;
    }) => eventsService.updateEvent(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [EVENTS_QUERY_KEY, data.user_id],
      });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) =>
      eventsService.deleteEvent(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [EVENTS_QUERY_KEY, variables.userId],
      });
    },
  });
}
