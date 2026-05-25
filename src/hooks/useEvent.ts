import { useQuery } from "@tanstack/react-query";
import { fetchEventById, fetchEventTiers } from "@/lib/api";

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEventById(id!),
    enabled: !!id,
  });
}

export function useEventTiers(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-tiers", eventId],
    queryFn: () => fetchEventTiers(eventId!),
    enabled: !!eventId,
  });
}
