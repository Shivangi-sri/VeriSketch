import type { ClaimGraph, DiagramLayout, GeneratedDiagram } from "@/lib/types";

export type ExcalidrawElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  text: string;
  roughness?: number;
  fontFamily?: number;
  strokeStyle?: string;
};

function buildBox(nodeId: string, label: string, x: number, y: number, width: number, height: number, stroke: string, fill: string): ExcalidrawElement {
  return {
    id: nodeId,
    type: "rectangle",
    x,
    y,
    width,
    height,
    text: label,
    strokeColor: stroke,
    backgroundColor: fill,
    roughness: 2,
    fontFamily: 1,
    strokeStyle: "solid",
  };
}

function buildArrow(edgeId: string, points: Array<{ x: number; y: number }>, stroke: string): ExcalidrawElement {
  const [start, end] = points;
  const width = Math.abs((end?.x ?? start.x) - (start?.x ?? end.x));
  const height = Math.abs((end?.y ?? start.y) - (start?.y ?? end.y));

  return {
    id: edgeId,
    type: "arrow",
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width,
    height,
    text: "",
    strokeColor: stroke,
    backgroundColor: "transparent",
    roughness: 2,
    fontFamily: 1,
    strokeStyle: "solid",
  };
}

export function excalidrawAdapter(graph: ClaimGraph, layout: DiagramLayout): GeneratedDiagram {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const palette = ["#8b5cf6", "#38bdf8", "#10b981", "#f472b6", "#f59e0b"];

  const elements = layout.nodes.map((node, index) => {
    const claim = nodeMap.get(node.id);
    const label = claim?.label ?? `Node ${index + 1}`;
    const color = palette[index % palette.length] ?? "#8b5cf6";

    return buildBox(
      node.id,
      label.length > 20 ? `${label.slice(0, 17)}…` : label,
      node.x,
      node.y,
      node.width,
      node.height,
      color,
      "rgba(255,255,255,0.04)",
    );
  });

  const arrowElements = layout.edges.map((edge) => {
    return buildArrow(edge.id, edge.points, "#94a3b8");
  });

  return {
    diagramType: layout.diagramType,
    elements: [...elements, ...arrowElements],
  };
}
