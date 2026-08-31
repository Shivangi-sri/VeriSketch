"use client";

import { useMutation } from "@tanstack/react-query";

export function useStartTopic() {
  return useMutation({
    mutationFn: async (topic: string) => {
      const response = await fetch("/api/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = (await response.json()) as { ok?: boolean; topicRunId?: string; error?: string };

      if (!response.ok || !data.ok || !data.topicRunId) {
        throw new Error(data.error ?? "Unable to start topic generation.");
      }

      return data.topicRunId;
    },
  });
}
