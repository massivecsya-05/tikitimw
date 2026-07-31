import { useQuery } from "@tanstack/react-query";
import { fetchPublishedEvents, fetchAllPublishedEvents, filterEvents, fetchHomeStats, type EventFilters } from "@/lib/api";
import { useMemo } from "react";

export function useHomeStats() {
  return useQuery({
    queryKey: ["home-stats"],
    queryFn: fetchHomeStats,
    staleTime: 5 * 60_000,
  });
}

export function usePublishedEvents(limit?: number) {
  return useQuery({
    queryKey: ["events", "published", limit],
    queryFn: () => fetchPublishedEvents(limit),
    staleTime: 60_000,
  });
}

export function useFilteredEvents(filters: EventFilters) {
  const query = useQuery({
    queryKey: ["events", "all-published"],
    queryFn: fetchAllPublishedEvents,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!query.data) return [];
    return filterEvents(query.data, filters);
  }, [query.data, filters]);

  return { ...query, filtered, count: filtered.length };
}
