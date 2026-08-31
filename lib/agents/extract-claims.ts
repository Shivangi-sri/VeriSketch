import { generateStructured } from "@/lib/llm/provider";
import type { ClaimGraph } from "@/lib/types";

const claimGraphSchema = {
  type: "OBJECT",
  properties: {
    nodes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          label: { type: "STRING" },
          type: { type: "STRING", enum: ["entity", "step", "concept"] },
          sourceSentence: { type: "STRING" },
        },
        required: ["id", "label", "type", "sourceSentence"],
      },
    },
    edges: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          from: { type: "STRING" },
          to: { type: "STRING" },
          relation: { type: "STRING" },
          sourceSentence: { type: "STRING" },
        },
        required: ["id", "from", "to", "relation", "sourceSentence"],
      },
    },
  },
  required: ["nodes", "edges"],
} as const;

function toId(value: string, index: number): string {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "node"}-${index + 1}`;
}

export async function extractClaims(sourceText: string): Promise<ClaimGraph> {
  const text = sourceText.trim();

  if (!text) {
    throw new Error("Source text is required.");
  }

  const prompt = `Extract a grounded claim graph from the following source text.
Return JSON only. Keep every node and edge tied to a sourceSentence taken from the source text.
The graph should represent factual relationships and causal/structural links.
Do not invent facts.

Source text:
${text}`;

  return await generateStructured<ClaimGraph>(prompt, claimGraphSchema as Record<string, unknown>);
}
