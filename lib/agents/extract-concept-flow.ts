import { generateStructured } from "@/lib/llm/provider";
import type { ClaimGraph } from "@/lib/types";

/**
 * Concept-flow extraction agent.
 *
 * Turns one section explanation into a small directed graph of real concepts
 * (not sentence fragments) connected by short, labelled relationships that
 * describe how the idea actually works. Every node and edge keeps the exact
 * sentence it came from in `sourceSentence` so the diagram stays grounded.
 */

const conceptFlowSchema = {
  type: "OBJECT",
  properties: {
    nodes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          label: { type: "STRING" },
          role: { type: "STRING", enum: ["entity", "step", "concept"] },
          sourceSentence: { type: "STRING" },
        },
        required: ["id", "label", "role", "sourceSentence"],
      },
    },
    edges: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          from: { type: "STRING" },
          to: { type: "STRING" },
          relation: { type: "STRING" },
          sourceSentence: { type: "STRING" },
        },
        required: ["from", "to", "relation", "sourceSentence"],
      },
    },
  },
  required: ["nodes", "edges"],
} as const;

type RawNode = { id?: unknown; label?: unknown; role?: unknown; sourceSentence?: unknown };
type RawEdge = { from?: unknown; to?: unknown; relation?: unknown; sourceSentence?: unknown };
type RawGraph = { nodes?: RawNode[]; edges?: RawEdge[] };

const MAX_NODES = 8;

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampLabel(value: string, max: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trim()}…` : cleaned;
}

export async function extractConceptFlow(
  title: string,
  explanation: string,
  feedback?: string,
): Promise<ClaimGraph> {
  const sectionTitle = title.trim();
  const sectionText = explanation.trim();

  if (!sectionText) {
    throw new Error("Section explanation is required to build a concept flow.");
  }

  const fix = feedback?.trim()
    ? `\n\nA previous attempt was rejected during verification. Fix these problems:\n${feedback.trim()}\n`
    : "";

  const prompt = `You are building a STUDY FLOWCHART for a single concept section.${fix}

Return JSON only. Extract the 4 to 8 most important concepts from the explanation and
connect them into a directed flow that shows how the idea actually works: cause to
effect, general to specific, or step to next step.

Rules:
- Every node "label" is a real concept, term, or short noun phrase of 1 to 4 words.
  Never a stray word like "to", "allow", "the", and never a chopped-up sentence fragment.
- Every edge "relation" is a SHORT verb phrase of 1 to 3 words, e.g. "defines",
  "assigned via", "produces", "then", "controls", "maps to".
- Edges point in the direction a learner should read the flow.
- "from" and "to" must reference node "id" values you defined.
- Prefer a single connected flow. Do not leave isolated nodes.
- "id" is a short unique lowercase slug.
- Every node and every edge must include, in "sourceSentence", the exact sentence
  from the explanation it was derived from.

Section title: ${sectionTitle || "(untitled)"}

Explanation:
${sectionText}`;

  const raw = await generateStructured<RawGraph>(prompt, conceptFlowSchema as Record<string, unknown>);

  const rawNodes = Array.isArray(raw?.nodes) ? raw.nodes : [];
  const usedIds = new Set<string>();
  const nodes: ClaimGraph["nodes"] = [];

  for (const [index, rawNode] of rawNodes.entries()) {
    if (nodes.length >= MAX_NODES) break;

    const label = clampLabel(String(rawNode?.label ?? ""), 48);
    if (!label) continue;

    let id = slug(String(rawNode?.id ?? ""));
    if (!id || usedIds.has(id)) id = `concept-${index + 1}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);

    const role = rawNode?.role;
    const type: ClaimGraph["nodes"][number]["type"] =
      role === "entity" || role === "step" || role === "concept" ? role : "concept";

    nodes.push({
      id,
      label,
      type,
      sourceSentence: String(rawNode?.sourceSentence ?? "").trim() || sectionText,
    });
  }

  if (nodes.length === 0) {
    throw new Error("The concept-flow model did not return any usable concepts for this section.");
  }

  const idByLabel = new Map(nodes.map((node) => [node.label.toLowerCase(), node.id]));
  const resolve = (value: unknown): string | null => {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const asSlug = slug(text);
    if (usedIds.has(asSlug)) return asSlug;
    return idByLabel.get(text.toLowerCase()) ?? null;
  };

  const rawEdges = Array.isArray(raw?.edges) ? raw.edges : [];
  const edgeKeys = new Set<string>();
  const edges: ClaimGraph["edges"] = [];

  for (const [index, rawEdge] of rawEdges.entries()) {
    const from = resolve(rawEdge?.from);
    const to = resolve(rawEdge?.to);
    if (!from || !to || from === to) continue;

    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);

    edges.push({
      id: `edge-${index + 1}`,
      from,
      to,
      relation: clampLabel(String(rawEdge?.relation ?? ""), 24) || "leads to",
      sourceSentence: String(rawEdge?.sourceSentence ?? "").trim() || sectionText,
    });
  }

  // Keep the graph connected: chain any node the model left dangling onto the
  // previous node so the flowchart never renders orphan boxes.
  if (nodes.length > 1) {
    const connected = new Set<string>();
    for (const edge of edges) {
      connected.add(edge.from);
      connected.add(edge.to);
    }

    nodes.forEach((node, index) => {
      if (index === 0 || connected.has(node.id)) return;
      const previous = nodes[index - 1];
      edges.push({
        id: `edge-auto-${index}`,
        from: previous.id,
        to: node.id,
        relation: "related to",
        sourceSentence: node.sourceSentence,
      });
      connected.add(node.id);
    });
  }

  return { nodes, edges };
}
