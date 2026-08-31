import type { ClaimGraph, DiffResult } from "@/lib/types";

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Compare a ground-truth claim graph against a graph derived from the diagram.
 *
 * Ground-truth edges reference node ids; derived edges may reference ids or
 * labels. Both sides are resolved to node labels before comparison, and edges
 * are matched on connectivity (from → to) rather than the exact relation string,
 * since the renderer shortens relation labels.
 */
export function graphDiff(groundTruth: ClaimGraph, derived: ClaimGraph): DiffResult {
  const truthIdToLabel = new Map(groundTruth.nodes.map((node) => [node.id, node.label]));
  const derivedIdToLabel = new Map(derived.nodes.map((node) => [node.id, node.label]));

  const truthLabels = new Set(groundTruth.nodes.map((node) => normalizeLabel(node.label)));
  const derivedLabels = new Set(derived.nodes.map((node) => normalizeLabel(node.label)));

  const missingNodes = groundTruth.nodes.filter((node) => !derivedLabels.has(normalizeLabel(node.label)));
  const hallucinatedNodeLabels = derived.nodes
    .filter((node) => !truthLabels.has(normalizeLabel(node.label)))
    .map((node) => node.label);

  const resolveTruth = (ref: string) => normalizeLabel(truthIdToLabel.get(ref) ?? ref);
  const resolveDerived = (ref: string) => normalizeLabel(derivedIdToLabel.get(ref) ?? ref);

  const derivedConnections = new Set(
    derived.edges.map((edge) => `${resolveDerived(edge.from)}::${resolveDerived(edge.to)}`),
  );

  const mismatchedEdges: DiffResult["mismatchedEdges"] = [];
  for (const edge of groundTruth.edges) {
    const key = `${resolveTruth(edge.from)}::${resolveTruth(edge.to)}`;
    if (!derivedConnections.has(key)) {
      mismatchedEdges.push({ expected: edge, foundRelation: null });
    }
  }

  const expectedNodes = groundTruth.nodes.length || 1;
  const foundNodes = derived.nodes.length || 1;
  const expectedEdges = groundTruth.edges.length;

  const precision = Number(Math.max(0, 1 - hallucinatedNodeLabels.length / foundNodes).toFixed(3));
  const recall = Number(Math.max(0, 1 - missingNodes.length / expectedNodes).toFixed(3));
  const edgeRecall = expectedEdges === 0 ? 1 : Math.max(0, 1 - mismatchedEdges.length / expectedEdges);
  const confidence = Number(
    Math.min(1, Math.max(0, (precision + recall + edgeRecall) / 3)).toFixed(3),
  );

  return {
    missingNodes,
    hallucinatedNodeLabels,
    mismatchedEdges,
    precision,
    recall,
    confidence,
  };
}
