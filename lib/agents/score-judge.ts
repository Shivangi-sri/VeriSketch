import { generateStructured } from "@/lib/llm/provider";

export type EqualityCheck = {
  equivalent: boolean;
  reason: string;
};

const equalitySchema = {
  type: "OBJECT",
  properties: {
    equivalent: { type: "BOOLEAN" },
    reason: { type: "STRING" },
  },
  required: ["equivalent", "reason"],
} as const;

/**
 * Judge whether two claim strings assert the same fact, tolerating wording
 * differences. Used by the eval harness to score claim coverage semantically
 * rather than by exact string match.
 */
export async function scoreJudge(a: string, b: string): Promise<EqualityCheck> {
  const claimA = a.trim();
  const claimB = b.trim();

  if (!claimA || !claimB) {
    return { equivalent: false, reason: "One or both claims are empty." };
  }
  if (claimA.toLowerCase() === claimB.toLowerCase()) {
    return { equivalent: true, reason: "Exact match." };
  }

  return generateStructured<EqualityCheck>(
    `Decide whether these two study claims state the same underlying fact.
Ignore wording, order, and phrasing differences. Answer JSON only.

Claim A: ${claimA}
Claim B: ${claimB}`,
    equalitySchema as Record<string, unknown>,
  );
}
