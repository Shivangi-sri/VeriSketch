"use client";

import { useQuery } from "@tanstack/react-query";
import type { TopicRun } from "@/lib/types";

export function useTopicRun(topicRunId: string) {
  return useQuery({
    queryKey: ["topicRun", topicRunId],
    queryFn: async () => {
      const response = await fetch(`/api/topic/${topicRunId}`);
      const data = (await response.json()) as { ok?: boolean; run?: TopicRun; error?: string };

      if (!response.ok || !data.ok || !data.run) {
        throw new Error(data.error ?? "Unable to load topic run.");
      }

      return data.run;
    },
    enabled: Boolean(topicRunId),
    staleTime: 10000,
    gcTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => {
      const run = query.state.data;
      if (!run) return false;

      if (run.source === "mock") {
        return false;
      }

      if (run.status === "done" || run.status === "failed") {
        return false;
      }

      const hasReadyDiagram = run.sections.some(
        (section) => section.status === "ready_for_review" && Boolean(section.diagram),
      );

      const hasInFlightSection = run.sections.some(
        (section) => section.status === "pending" || section.status === "running",
      );

      if (hasReadyDiagram) {
        return false;
      }

      return hasInFlightSection ? 15000 : false;
    },
  });
}
