import { verifyDiagram } from "@/lib/agents/verify-diagram";
import type { ClaimGraph, GeneratedDiagram } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      claimGraph?: ClaimGraph;
      diagram?: GeneratedDiagram;
      sourceText?: string;
    };

    if (!body.claimGraph || !body.diagram) {
      return Response.json(
        {
          ok: false,
          error: "Both claimGraph and diagram are required.",
        },
        { status: 400 },
      );
    }

    const diff = await verifyDiagram(body.claimGraph, body.diagram, body.sourceText ?? "");
    return Response.json({ ok: true, diff });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to verify diagram.",
      },
      { status: 500 },
    );
  }
}
