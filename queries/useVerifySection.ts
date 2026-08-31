"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export type VerifyDiff = {
  precision?: number;
  recall?: number;
  confidence?: number;
  groundedRatio?: number;
  missingNodes?: unknown[];
  mismatchedEdges?: unknown[];
  groundingErrors?: string[];
};

export function useVerifySection(topicRunId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sectionId: string) => {
      const response = await fetch(
        `/api/topic/${topicRunId}/sections/${sectionId}/verify`,
        { method: "POST" },
      );

      const data = (await response.json()) as { ok?: boolean; diff?: VerifyDiff; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Verification failed.");
      }

      return data.diff ?? {};
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topicRun", topicRunId] });
    },
  });
}
