import { graphDiff } from "@/lib/skills/graph-diff";
import { groundingCheck } from "@/lib/skills/grounding-check";
import { reverseParseDiagram } from "@/lib/skills/reverse-parse-diagram";
import type { ClaimGraph, DiffResult, GeneratedDiagram } from "@/lib/types";

/**
 * Verification / diff stage.
 *
 * 1. Structure: reverse-parse the rendered diagram and diff it against the
 *    claim graph (missing nodes, extra nodes, missing relationships).
 * 2. Grounding: check that every node/edge source_sentence is actually present
 *    in the source text.
 *
 * Confidence blends both; grounding is only applied when source text is given.
 */
export async function verifyDiagram(
  claimGraph: ClaimGraph,
  diagram: GeneratedDiagram,
  sourceText = "",
): Promise<DiffResult> {
  const derived = reverseParseDiagram(diagram);
  const structure = graphDiff(claimGraph, derived);

  if (!sourceText.trim()) {
    return structure;
  }

  const grounding = groundingCheck(claimGraph, sourceText);
  const confidence = Number(
    Math.min(1, Math.max(0, structure.confidence * 0.65 + grounding.groundedRatio * 0.35)).toFixed(3),
  );

  return {
    ...structure,
    confidence,
    groundedRatio: grounding.groundedRatio,
    groundingErrors: grounding.errors,
  };
}
