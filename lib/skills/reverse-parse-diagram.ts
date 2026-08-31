import type { ClaimGraph, GeneratedDiagram } from "@/lib/types";

type Box = { label: string; cx: number; cy: number };

/**
 * Independently reconstruct a claim graph from a rendered diagram: rectangles
 * (minus the title box) become nodes, and each arrow becomes an edge between the
 * boxes nearest its start and end points. This is deliberately geometry-based so
 * it can catch a layout that mis-wires or drops a relationship.
 */
export function reverseParseDiagram(diagram: GeneratedDiagram): ClaimGraph {
  const elements = diagram.elements ?? [];
  const boxes: Box[] = [];

  for (const raw of elements) {
    const el = raw as Record<string, unknown>;
    if (String(el.type) !== "rectangle" || el.id === "title-box") continue;
    const label = typeof el.text === "string" ? el.text.trim() : "";
    if (!label) continue;
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    const w = Number(el.width) || 0;
    const h = Number(el.height) || 0;
    boxes.push({ label, cx: x + w / 2, cy: y + h / 2 });
  }

  const nodes: ClaimGraph["nodes"] = boxes.map((box, index) => ({
    id: `d${index + 1}`,
    label: box.label,
    type: "concept",
    sourceSentence: "diagram",
  }));
  const idByLabel = new Map(nodes.map((node) => [node.label.toLowerCase(), node.id]));

  const nearest = (px: number, py: number): Box | null => {
    let best: Box | null = null;
    let bestDistance = Infinity;
    for (const box of boxes) {
      const distance = (box.cx - px) ** 2 + (box.cy - py) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = box;
      }
    }
    return best;
  };

  const edges: ClaimGraph["edges"] = [];
  let counter = 0;

  for (const raw of elements) {
    const el = raw as Record<string, unknown>;
    if (String(el.type) !== "arrow") continue;

    const ax = Number(el.x) || 0;
    const ay = Number(el.y) || 0;
    const points = Array.isArray(el.points) ? (el.points as unknown[]) : [];
    const last = points.length > 0 ? points[points.length - 1] : [0, 0];
    const [dx, dy] = Array.isArray(last) ? [Number(last[0]) || 0, Number(last[1]) || 0] : [0, 0];

    const from = nearest(ax, ay);
    const to = nearest(ax + dx, ay + dy);
    if (!from || !to || from.label === to.label) continue;

    const relation = typeof el.text === "string" ? el.text.trim() : "";
    edges.push({
      id: `de${++counter}`,
      from: idByLabel.get(from.label.toLowerCase()) ?? from.label,
      to: idByLabel.get(to.label.toLowerCase()) ?? to.label,
      relation: relation || "related",
      sourceSentence: "diagram",
    });
  }

  return { nodes, edges };
}
