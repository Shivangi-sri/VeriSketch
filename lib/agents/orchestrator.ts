import { extractClaims } from "@/lib/agents/extract-claims";
import { generateDiagram } from "@/lib/agents/generate-diagram";
import { verifyDiagram } from "@/lib/agents/verify-diagram";
import { createRun, getRun, updateRun } from "@/lib/run-store";
import { selectDiagramType } from "@/lib/skills/select-diagram-type";
import type { PipelineRun, StageName } from "@/lib/types";

export type OrchestratorRunResult = {
  run: PipelineRun;
  status: "ok" | "needs-review";
};

async function setStage(runId: string, stage: StageName, status: PipelineRun["stages"][StageName]) {
  const run = getRun(runId);
  if (!run) return;

  updateRun(runId, {
    currentStage: stage,
    stages: {
      ...run.stages,
      [stage]: status,
    },
    updatedAt: new Date().toISOString(),
  });
}

export async function orchestrateRun(sourceText: string, runId?: string): Promise<OrchestratorRunResult> {
  const run = runId ? getRun(runId) ?? createRun(sourceText) : createRun(sourceText);

  try {
    await setStage(run.id, "claim_extraction", "running");
    const claimGraph = await extractClaims(sourceText);

    updateRun(run.id, {
      claimGraph,
      status: "running",
      currentStage: "diagram_generation",
      stages: { ...run.stages, claim_extraction: "done", diagram_generation: "running" },
      updatedAt: new Date().toISOString(),
    });

    const diagramType = selectDiagramType(claimGraph);
    const diagram = await generateDiagram(claimGraph, diagramType);

    updateRun(run.id, {
      diagram: { ...diagram, diagramType },
      stages: { ...getRun(run.id)!.stages, diagram_generation: "done", verification: "running" },
      currentStage: "verification",
      updatedAt: new Date().toISOString(),
    });

    let workingGraph = claimGraph;
    let workingDiagram = diagram;
    let diffResult = await verifyDiagram(workingGraph, workingDiagram, sourceText);
    let loopCount = 0;

    updateRun(run.id, {
      diffResult,
      currentStage: "verification",
      stages: { ...getRun(run.id)!.stages, verification: "done" },
      updatedAt: new Date().toISOString(),
    });

    while (loopCount < 2 && diffResult.confidence < 0.75) {
      loopCount += 1;
      updateRun(run.id, {
        retryLoop: loopCount,
        diffResult,
        currentStage: "patch_loop",
        stages: { ...getRun(run.id)!.stages, patch_loop: "running" },
        updatedAt: new Date().toISOString(),
      });

      // patch: re-extract the claim graph, then re-render and re-verify
      const patchedGraph = await extractClaims(sourceText);
      const patchedType = selectDiagramType(patchedGraph);
      const patchedDiagram = await generateDiagram(patchedGraph, patchedType);
      const patchedDiff = await verifyDiagram(patchedGraph, patchedDiagram, sourceText);

      if (patchedDiff.confidence >= diffResult.confidence) {
        workingGraph = patchedGraph;
        workingDiagram = { ...patchedDiagram, diagramType: patchedType };
        diffResult = patchedDiff;
      }

      updateRun(run.id, {
        claimGraph: workingGraph,
        diagram: workingDiagram,
        diffResult,
        currentStage: "verification",
        stages: { ...getRun(run.id)!.stages, patch_loop: "done", verification: "done" },
        updatedAt: new Date().toISOString(),
      });
    }

    const finalConfidence = diffResult.confidence;
    const reviewable = finalConfidence >= 0.7;
    const nextStatus = reviewable ? "ready_for_review" : "failed";

    updateRun(run.id, {
      status: nextStatus,
      currentStage: "final_diagram",
      stages: {
        ...getRun(run.id)!.stages,
        final_diagram: reviewable ? "done" : "failed",
      },
      confidence: finalConfidence,
      diffResult,
      escalated: !reviewable,
      updatedAt: new Date().toISOString(),
    });

    return {
      run: getRun(run.id)!,
      status: reviewable ? "ok" : "needs-review",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed";
    updateRun(run.id, {
      status: "failed",
      currentStage: "final_diagram",
      stages: {
        ...run.stages,
        final_diagram: "failed",
      },
      confidence: 0,
      updatedAt: new Date().toISOString(),
      diffResult: {
        missingNodes: [],
        hallucinatedNodeLabels: [],
        mismatchedEdges: [],
        precision: 0,
        recall: 0,
        confidence: 0,
        groundedRatio: 0,
        groundingErrors: [message],
      },
    });

    return {
      run: getRun(run.id)!,
      status: "needs-review",
    };
  }
}
