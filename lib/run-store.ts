import type { PipelineRun, StageName, StageStatus } from "@/lib/types";

const runs = new Map<string, PipelineRun>();

export function createInitialStageMap(): Record<StageName, StageStatus> {
  return {
    claim_extraction: "pending",
    diagram_generation: "pending",
    verification: "pending",
    patch_loop: "pending",
    final_diagram: "pending",
  };
}

export function createRun(sourceText: string): PipelineRun {
  const now = new Date().toISOString();
  const id = `run-${Date.now()}`;
  const run: PipelineRun = {
    id,
    sourceText,
    status: "pending",
    currentStage: "claim_extraction",
    stages: createInitialStageMap(),
    retryLoop: 0,
    claimGraph: null,
    diagram: null,
    diffResult: null,
    confidence: null,
    escalated: false,
    createdAt: now,
    updatedAt: now,
  };

  runs.set(id, run);
  return run;
}

export function getRun(id: string): PipelineRun | undefined {
  return runs.get(id);
}

export function updateRun(id: string, patch: Partial<PipelineRun>): PipelineRun | undefined {
  const existing = runs.get(id);
  if (!existing) {
    return undefined;
  }

  const next: PipelineRun = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  runs.set(id, next);
  return next;
}

export function listRuns(): PipelineRun[] {
  return Array.from(runs.values());
}
