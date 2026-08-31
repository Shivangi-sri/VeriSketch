import type { ClaimGraph } from "@/lib/types";

export type GroundingCheckResult = {
  valid: boolean;
  /** grounded items / total items, 0..1 */
  groundedRatio: number;
  errors: string[];
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A citation counts as grounded when the source text contains it verbatim
 * (after normalisation) or shares a strong majority of its meaningful words.
 */
function isGrounded(citation: string, haystack: string): boolean {
  const needle = normalize(citation);
  if (!needle) return false;
  if (haystack.includes(needle)) return true;

  const words = needle.split(" ").filter((word) => word.length > 3);
  if (words.length === 0) return haystack.includes(needle);

  const hits = words.filter((word) => haystack.includes(word)).length;
  return hits / words.length >= 0.6;
}

export function groundingCheck(graph: ClaimGraph, sourceText: string): GroundingCheckResult {
  const haystack = normalize(sourceText ?? "");
  const errors: string[] = [];

  const items: Array<{ kind: "node" | "edge"; name: string; citation: string }> = [
    ...graph.nodes.map((node) => ({ kind: "node" as const, name: node.label, citation: node.sourceSentence })),
    ...graph.edges.map((edge) => ({
      kind: "edge" as const,
      name: `${edge.from} → ${edge.to}`,
      citation: edge.sourceSentence,
    })),
  ];

  if (items.length === 0) {
    return { valid: false, groundedRatio: 0, errors: ["Graph has no nodes or edges to ground."] };
  }

  if (!haystack) {
    return { valid: false, groundedRatio: 0, errors: ["No source text supplied for grounding."] };
  }

  let grounded = 0;
  for (const item of items) {
    const citation = String(item.citation ?? "").trim();
    if (!citation) {
      errors.push(`${item.kind} "${item.name}" has no source sentence`);
      continue;
    }
    if (isGrounded(citation, haystack)) {
      grounded += 1;
    } else {
      errors.push(`${item.kind} "${item.name}" cites text not found in the source`);
    }
  }

  return {
    valid: errors.length === 0,
    groundedRatio: Number((grounded / items.length).toFixed(3)),
    errors,
  };
}
