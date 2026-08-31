import type { ClaimGraph, DiagramType } from "@/lib/types";

export function selectDiagramType(graph: ClaimGraph): DiagramType {
  const nodeLabels = graph.nodes.map((node) => node.label.toLowerCase());
  const edgeRelations = graph.edges.map((edge) => edge.relation.toLowerCase());

  const hasConceptShape =
    graph.nodes.length > 0 &&
    graph.edges.length > 0 &&
    graph.nodes.filter((node) => graph.edges.some((edge) => edge.from === node.id || edge.to === node.id)).length <= 3 &&
    graph.edges.every((edge) => {
      const from = graph.nodes.find((node) => node.id === edge.from);
      const to = graph.nodes.find((node) => node.id === edge.to);
      return Boolean(from && to && from.label.toLowerCase() !== to.label.toLowerCase());
    });

  const hasHierarchy = edgeRelations.some((value) => /part of|contains|includes|subclass|parent of|belongs to/i.test(value));
  const hasComparison = edgeRelations.some((value) => /vs|compares|contrast|difference|versus|better than|worse than/i.test(value));
  const hasTimeline = nodeLabels.some((label) => /year|step|phase|before|after|sequence|first|second|next|then|later/i.test(label));

  if (hasComparison) return "comparison";
  if (hasTimeline) return "timeline";
  if (hasHierarchy) return "tree";
  if (hasConceptShape || nodeLabels.length <= 6 || graph.edges.length <= 2) return "concept";
  return "flowchart";
}
