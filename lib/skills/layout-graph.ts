import type { ClaimGraph, DiagramLayout, DiagramType, LayoutEdge, LayoutNode } from "@/lib/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function layoutGraph(graph: ClaimGraph, diagramType: DiagramType): DiagramLayout {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  if (diagramType === "concept") {
    const centerX = 420;
    const centerY = 220;
    const nodeLayouts: LayoutNode[] = [];
    const derivedEdges: LayoutEdge[] = [];

    const focusNode = nodes[0] ?? { id: "n1", label: "Concept", sourceSentence: "" };
    const satellites = nodes.filter((node) => node.id !== focusNode.id);

    const angleStep = satellites.length > 1 ? (Math.PI * 2) / satellites.length : 0;

    nodeLayouts.push({ id: focusNode.id, x: centerX - 100, y: centerY - 40, width: 180, height: 80 });

    satellites.forEach((node, index) => {
      const angle = index * angleStep;
      const x = centerX + Math.cos(angle) * 240 - 80;
      const y = centerY + Math.sin(angle) * 180 - 35;
      nodeLayouts.push({ id: node.id, x: clamp(x, 40, 820), y: clamp(y, 40, 480), width: 170, height: 70 });
    });

    edges.forEach((edge) => {
      const from = nodeLayouts.find((layout) => layout.id === edge.from) ?? { x: centerX - 100, y: centerY - 40, width: 180, height: 80 };
      const to = nodeLayouts.find((layout) => layout.id === edge.to) ?? { x: centerX - 100, y: centerY - 40, width: 180, height: 80 };
      const startX = from.x + from.width / 2;
      const startY = from.y + from.height / 2;
      const endX = to.x + to.width / 2;
      const endY = to.y + to.height / 2;
      derivedEdges.push({
        id: edge.id,
        points: [
          { x: startX, y: startY },
          { x: (startX + endX) / 2, y: (startY + endY) / 2 },
          { x: endX, y: endY },
        ],
      });
    });

    return { diagramType, nodes: nodeLayouts, edges: derivedEdges };
  }

  if (diagramType === "comparison") {
    const leftNodes = nodes.filter((_, index) => index % 2 === 0);
    const rightNodes = nodes.filter((_, index) => index % 2 === 1);

    const left = leftNodes.map((node, index) => ({
      id: node.id,
      x: 80,
      y: 110 + index * 120,
      width: 220,
      height: 72,
    }));

    const right = rightNodes.map((node, index) => ({
      id: node.id,
      x: 420,
      y: 110 + index * 120,
      width: 220,
      height: 72,
    }));

    const mapped = [...left, ...right];
    const derivedEdges: LayoutEdge[] = edges.map((edge) => {
      const from = mapped.find((node) => node.id === edge.from) ?? { x: 80, y: 120, width: 220, height: 72 };
      const to = mapped.find((node) => node.id === edge.to) ?? { x: 420, y: 120, width: 220, height: 72 };
      return {
        id: edge.id,
        points: [
          { x: from.x + from.width, y: from.y + from.height / 2 },
          { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
          { x: to.x, y: to.y + to.height / 2 },
        ],
      };
    });

    return { diagramType, nodes: mapped, edges: derivedEdges };
  }

  const layoutNodes: LayoutNode[] = nodes.map((node, index) => ({
    id: node.id,
    x: 80 + (index % 2) * 270,
    y: 120 + Math.floor(index / 2) * 120,
    width: 200,
    height: 72,
  }));

  const layoutEdges: LayoutEdge[] = edges.map((edge) => {
    const from = layoutNodes.find((node) => node.id === edge.from) ?? { x: 80, y: 120, width: 200, height: 72 };
    const to = layoutNodes.find((node) => node.id === edge.to) ?? { x: 350, y: 120, width: 200, height: 72 };

    return {
      id: edge.id,
      points: [
        { x: from.x + from.width, y: from.y + from.height / 2 },
        { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
        { x: to.x, y: to.y + to.height / 2 },
      ],
    };
  });

  return { diagramType, nodes: layoutNodes, edges: layoutEdges };
}
