/**
 * Shared conversion from our lightweight diagram element shape (produced by
 * `generateDiagram`) into full Excalidraw scene elements. Used by both the live
 * canvas and the printable notes export so they render identically.
 */

export type Point = [number, number] | { x: number; y: number };

export type DiagramElement = {
  id?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  textColor?: string;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  opacity?: number;
  roughness?: number;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  points?: Point[];
};

let nonceCounter = 1;
const nextNonce = () => nonceCounter++;
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

function toOpacity(value: unknown): number {
  const n = Number(value ?? 1);
  if (!Number.isFinite(n)) return 100;
  return Math.round(n <= 1 ? n * 100 : n);
}

function baseElement(id: string, type: string, item: DiagramElement) {
  return {
    id,
    type,
    x: Number(item.x ?? 0),
    y: Number(item.y ?? 0),
    width: Number(item.width ?? 0),
    height: Number(item.height ?? 0),
    angle: 0,
    strokeColor: item.strokeColor ?? "#4f46e5",
    backgroundColor: item.backgroundColor ?? "transparent",
    fillStyle: "solid",
    strokeWidth: Number(item.strokeWidth ?? 2),
    strokeStyle: "solid",
    roughness: Number(item.roughness ?? 1),
    opacity: toOpacity(item.opacity),
    groupIds: [] as string[],
    frameId: null,
    roundness: null as null | { type: number },
    seed: randomSeed(),
    version: 1,
    versionNonce: nextNonce(),
    isDeleted: false,
    boundElements: null as null | Array<{ type: string; id: string }>,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

function createBoundText(id: string, containerId: string, item: DiagramElement, fallbackColor: string) {
  const width = Math.max(20, Number(item.width ?? 160) - 16);
  const height = Math.max(18, Number(item.height ?? 24) - 16);

  return {
    id,
    type: "text",
    x: Number(item.x ?? 0) + 8,
    y: Number(item.y ?? 0) + 8,
    width,
    height,
    angle: 0,
    strokeColor: item.textColor ?? fallbackColor,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [] as string[],
    frameId: null,
    roundness: null,
    seed: randomSeed(),
    version: 1,
    versionNonce: nextNonce(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    text: String(item.text ?? ""),
    originalText: String(item.text ?? ""),
    fontSize: Number(item.fontSize ?? 16),
    fontFamily: Number(item.fontFamily ?? 1),
    textAlign: "center",
    verticalAlign: "middle",
    containerId,
    autoResize: true,
    lineHeight: 1.25,
  };
}

function createRectangle(item: DiagramElement, index: number) {
  const id = item.id ?? `rect-${index}`;
  const hasText = Boolean(item.text && String(item.text).trim());
  const textId = `${id}-label`;

  const rectangle = {
    ...baseElement(id, "rectangle", item),
    strokeColor: item.strokeColor ?? "#4f46e5",
    backgroundColor: item.backgroundColor ?? "#eef2ff",
    width: Number(item.width ?? 200),
    height: Number(item.height ?? 66),
    roundness: { type: 3 },
    boundElements: hasText ? [{ type: "text", id: textId }] : null,
  };

  const out: Record<string, unknown>[] = [rectangle];
  if (hasText) out.push(createBoundText(textId, id, item, "#1e1b4b"));
  return out;
}

function createArrow(item: DiagramElement, index: number) {
  const id = item.id ?? `arrow-${index}`;
  const dx = Number(item.width ?? 0);
  const dy = Number(item.height ?? 0);

  const rawPoints = Array.isArray(item.points) && item.points.length >= 2 ? item.points : null;
  const points = rawPoints
    ? rawPoints.map((p) =>
        Array.isArray(p)
          ? [Number(p[0]) || 0, Number(p[1]) || 0]
          : [Number(p?.x) || 0, Number(p?.y) || 0],
      )
    : [
        [0, 0],
        [dx, dy],
      ];

  const end = points[points.length - 1];
  const hasText = Boolean(item.text && String(item.text).trim());
  const textId = `${id}-label`;

  const arrow = {
    ...baseElement(id, "arrow", item),
    width: Math.abs(dx) || Math.abs(end[0]),
    height: Math.abs(dy) || Math.abs(end[1]),
    strokeColor: item.strokeColor ?? "#64748b",
    backgroundColor: "transparent",
    roundness: { type: 2 },
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    boundElements: hasText ? [{ type: "text", id: textId }] : null,
  };

  const out: Record<string, unknown>[] = [arrow];
  if (hasText) {
    out.push(createBoundText(textId, id, { ...item, width: 130, height: 24 }, "#475569"));
  }
  return out;
}

function createText(item: DiagramElement, index: number) {
  return {
    ...baseElement(item.id ?? `text-${index}`, "text", item),
    strokeColor: item.textColor ?? item.strokeColor ?? "#1e293b",
    backgroundColor: "transparent",
    strokeWidth: 1,
    roughness: 0,
    text: String(item.text ?? ""),
    originalText: String(item.text ?? ""),
    fontSize: Number(item.fontSize ?? 16),
    fontFamily: Number(item.fontFamily ?? 1),
    textAlign: item.textAlign ?? "left",
    verticalAlign: item.verticalAlign ?? "top",
    containerId: null,
    autoResize: true,
    lineHeight: 1.25,
  };
}

export function convertElements(elements: unknown[]): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  elements.forEach((element, index) => {
    if (!element || typeof element !== "object") return;
    const item = element as DiagramElement;
    const type = String(item.type ?? "rectangle").toLowerCase();

    if (type === "arrow" || type === "line") {
      result.push(...createArrow(item, index));
    } else if (type === "text" || type === "label") {
      result.push(createText(item, index));
    } else {
      result.push(...createRectangle(item, index));
    }
  });

  return result;
}
