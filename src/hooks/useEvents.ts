import { useQuery } from "@tanstack/react-query";
import { fetchPublishedEvents, fetchAllPublishedEvents, filterEvents, type EventFilters } from "@/lib/api";
import { useMemo } from "react";

export function usePublishedEvents(limit?: number) {
  return useQuery({
    queryKey: ["events", "published", limit],
    queryFn: () => fetchPublishedEvents(limit),
  });
}

export function useFilteredEvents(filters: EventFilters) {
  const query = useQuery({
    queryKey: ["events", "all-published"],
    queryFn: fetchAllPublishedEvents,
  });

  const filtered = useMemo(() => {
    if (!query.data) return [];
    return filterEvents(query.data, filters);
  }, [query.data, filters]);

  return { ...query, filtered, count: filtered.length };
}
