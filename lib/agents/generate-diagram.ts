import type { ClaimGraph, DiagramType, GeneratedDiagram } from "@/lib/types";

/**
 * Diagram generation.
 *
 * The grounded concept graph now comes from `extractConceptFlow` (an LLM agent),
 * so this stage is a deterministic layout pass: it turns the graph into a
 * top-down flowchart with connected, labelled arrows.
 */

const NODE_W = 210;
const NODE_H = 66;
const H_GAP = 56;
const V_GAP = 92;
const MARGIN_X = 60;
const TITLE_Y = 20;
const FLOW_TOP = 96;

function tidy(value: string, max: number): string {
  const cleaned = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trim()}…` : cleaned;
}

function titleFor(type: DiagramType): string {
  switch (type) {
    case "comparison":
      return "Concept comparison";
    case "timeline":
      return "Timeline";
    case "tree":
      return "Concept hierarchy";
    case "flowchart":
      return "Concept flow";
    default:
      return "Concept map";
  }
}

/**
 * Longest-path layering: each node sits one row below its deepest predecessor.
 * Cycles and disconnected nodes are pushed to the bottom row rather than looping.
 */
function assignLayers(graph: ClaimGraph): Map<string, number> {
  const ids = graph.nodes.map((node) => node.id);
  const idSet = new Set(ids);
  const edges = (graph.edges ?? []).filter(
    (edge) => idSet.has(edge.from) && idSet.has(edge.to) && edge.from !== edge.to,
  );

  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  ids.forEach((id) => {
    outgoing.set(id, []);
    indegree.set(id, 0);
  });
  edges.forEach((edge) => {
    outgoing.get(edge.from)!.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  });

  const layer = new Map<string, number>();
  let frontier = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  if (frontier.length === 0 && ids.length > 0) frontier = [ids[0]];
  frontier.forEach((id) => layer.set(id, 0));

  const guard = ids.length + 2;
  let current = [...frontier];
  for (let depth = 0; depth < guard && current.length > 0; depth += 1) {
    const next = new Set<string>();
    for (const id of current) {
      const fromLayer = layer.get(id) ?? 0;
      for (const to of outgoing.get(id) ?? []) {
        if (fromLayer + 1 > (layer.get(to) ?? -1)) {
          layer.set(to, fromLayer + 1);
          next.add(to);
        }
      }
    }
    current = [...next];
  }

  const maxLayer = layer.size > 0 ? Math.max(...layer.values()) : 0;
  ids.forEach((id) => {
    if (!layer.has(id)) layer.set(id, maxLayer + 1);
  });
  return layer;
}

function buildFlowchart(graph: ClaimGraph, diagramType: DiagramType): GeneratedDiagram {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  const titleEl = {
    id: "title-box",
    type: "rectangle",
    x: MARGIN_X,
    y: TITLE_Y,
    width: 360,
    height: 46,
    text: titleFor(diagramType),
    strokeColor: "#7c3aed",
    backgroundColor: "#f5f3ff",
    strokeWidth: 2,
    fontSize: 20,
    textAlign: "center",
    verticalAlign: "middle",
  };

  if (nodes.length === 0) {
    return { diagramType, elements: [titleEl] };
  }

  const layerOf = assignLayers(graph);

  const rows = new Map<number, ClaimGraph["nodes"]>();
  for (const node of nodes) {
    const key = layerOf.get(node.id) ?? 0;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key)!.push(node);
  }
  const rowKeys = [...rows.keys()].sort((a, b) => a - b);
  const widestRow = Math.max(...[...rows.values()].map((row) => row.length));
  const canvasWidth = MARGIN_X * 2 + widestRow * NODE_W + Math.max(0, widestRow - 1) * H_GAP;

  const pos = new Map<string, { x: number; y: number; w: number; h: number }>();
  const nodeEls = rowKeys.flatMap((key, rowIndex) => {
    const row = rows.get(key)!;
    const rowWidth = row.length * NODE_W + Math.max(0, row.length - 1) * H_GAP;
    const startX = Math.max(MARGIN_X, (canvasWidth - rowWidth) / 2);
    const y = FLOW_TOP + rowIndex * (NODE_H + V_GAP);

    return row.map((node, colIndex) => {
      const x = startX + colIndex * (NODE_W + H_GAP);
      pos.set(node.id, { x, y, w: NODE_W, h: NODE_H });

      const stroke = node.type === "step" ? "#0891b2" : node.type === "entity" ? "#4f46e5" : "#7c3aed";
      const fill = node.type === "step" ? "#ecfeff" : node.type === "entity" ? "#eef2ff" : "#f5f3ff";

      return {
        id: node.id,
        type: "rectangle",
        x,
        y,
        width: NODE_W,
        height: NODE_H,
        text: tidy(node.label, 46),
        strokeColor: stroke,
        backgroundColor: fill,
        strokeWidth: 2,
        fontSize: 15,
        textAlign: "center",
        verticalAlign: "middle",
      };
    });
  });

  const rightmost = Math.max(...[...pos.values()].map((p) => p.x + p.w));

  const edgeEls = edges.flatMap((edge, index) => {
    const from = pos.get(edge.from);
    const to = pos.get(edge.to);
    if (!from || !to) return [];

    const fromLayer = layerOf.get(edge.from) ?? 0;
    const toLayer = layerOf.get(edge.to) ?? 0;
    const span = Math.abs(toLayer - fromLayer);

    let sx: number;
    let sy: number;
    let ex: number;
    let ey: number;
    let relPoints: number[][];

    if (span > 1) {
      // Skip edge: route down a lane on the right so it does not cross the
      // boxes and arrows sitting between the two layers.
      const lane = rightmost + 40 + Math.min(index, 3) * 24;
      sx = from.x + from.w;
      sy = from.y + from.h / 2;
      ex = to.x + to.w;
      ey = to.y + to.h / 2;
      relPoints = [
        [0, 0],
        [lane - sx, 0],
        [lane - sx, ey - sy],
        [ex - sx, ey - sy],
      ];
    } else if (toLayer > fromLayer) {
      sx = from.x + from.w / 2;
      sy = from.y + from.h;
      ex = to.x + to.w / 2;
      ey = to.y;
      relPoints = [
        [0, 0],
        [ex - sx, ey - sy],
      ];
    } else if (toLayer < fromLayer) {
      sx = from.x + from.w / 2;
      sy = from.y;
      ex = to.x + to.w / 2;
      ey = to.y + to.h;
      relPoints = [
        [0, 0],
        [ex - sx, ey - sy],
      ];
    } else {
      const leftToRight = from.x <= to.x;
      sx = leftToRight ? from.x + from.w : from.x;
      sy = from.y + from.h / 2;
      ex = leftToRight ? to.x : to.x + to.w;
      ey = to.y + to.h / 2;
      relPoints = [
        [0, 0],
        [ex - sx, ey - sy],
      ];
    }

    const xs = relPoints.map((p) => p[0]);
    const ys = relPoints.map((p) => p[1]);

    return [
      {
        id: `edge-${edge.id ?? index}`,
        type: "arrow",
        x: sx,
        y: sy,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        points: relPoints,
        text: tidy(edge.relation, 22),
        strokeColor: "#64748b",
        strokeWidth: 2,
        fontSize: 12,
      },
    ];
  });

  return { diagramType, elements: [titleEl, ...nodeEls, ...edgeEls] };
}

export async function generateDiagram(
  graph: ClaimGraph,
  diagramType: DiagramType,
): Promise<GeneratedDiagram> {
  return buildFlowchart(graph, diagramType);
}
