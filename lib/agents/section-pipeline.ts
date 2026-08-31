import { extractConceptFlow } from "@/lib/agents/extract-concept-flow";
import { generateDiagram } from "@/lib/agents/generate-diagram";
import { verifyDiagram } from "@/lib/agents/verify-diagram";
import { selectDiagramType } from "@/lib/skills/select-diagram-type";
import type { ClaimGraph, DiffResult, GeneratedDiagram } from "@/lib/types";

export type SectionPipelineResult = {
  claimGraph: ClaimGraph;
  diagram: GeneratedDiagram;
  diffResult: DiffResult;
  confidence: number;
  retryLoop: number;
  escalated: boolean;
};

const ACCEPT_CONFIDENCE = 0.75;
const ESCALATE_CONFIDENCE = 0.6;
const MAX_PATCHES = 1;

function buildFeedback(claimGraph: ClaimGraph, diff: DiffResult): string {
  const idToLabel = new Map(claimGraph.nodes.map((node) => [node.id, node.label]));
  const lines: string[] = [];

  if (diff.missingNodes.length > 0) {
    lines.push(`- Keep these concepts as nodes: ${diff.missingNodes.map((node) => node.label).join(", ")}.`);
  }
  if (diff.mismatchedEdges.length > 0) {
    const rels = diff.mismatchedEdges
      .map((mismatch) => {
        const from = idToLabel.get(mismatch.expected.from) ?? mismatch.expected.from;
        const to = idToLabel.get(mismatch.expected.to) ?? mismatch.expected.to;
        return `${from} → ${to}`;
      })
      .join("; ");
    lines.push(`- Preserve these relationships as directed edges: ${rels}.`);
  }
  if ((diff.groundingErrors ?? []).length > 0) {
    lines.push(
      "- Every sourceSentence must be copied verbatim from the explanation; some citations were not found in the source.",
    );
  }

  return lines.join("\n");
}

/**
 * Full per-section flow: extract a grounded concept graph, render it, verify it,
 * and — if verification is weak — patch the graph once using the mismatch
 * feedback before re-verifying.
 */
export async function runSectionPipeline(
  title: string,
  explanation: string,
): Promise<SectionPipelineResult> {
  let claimGraph = await extractConceptFlow(title, explanation);
  let diagram = await generateDiagram(claimGraph, selectDiagramType(claimGraph));
  let diffResult = await verifyDiagram(claimGraph, diagram, explanation);
  let retryLoop = 0;

  while (diffResult.confidence < ACCEPT_CONFIDENCE && retryLoop < MAX_PATCHES) {
    retryLoop += 1;
    const feedback = buildFeedback(claimGraph, diffResult);
    const patchedGraph = await extractConceptFlow(title, explanation, feedback);
    const patchedDiagram = await generateDiagram(patchedGraph, selectDiagramType(patchedGraph));
    const patchedDiff = await verifyDiagram(patchedGraph, patchedDiagram, explanation);

    // keep the patch only if it did not make things worse
    if (patchedDiff.confidence >= diffResult.confidence) {
      claimGraph = patchedGraph;
      diagram = patchedDiagram;
      diffResult = patchedDiff;
    } else {
      break;
    }
  }

  return {
    claimGraph,
    diagram,
    diffResult,
    confidence: diffResult.confidence,
    retryLoop,
    escalated: diffResult.confidence < ESCALATE_CONFIDENCE,
  };
}
