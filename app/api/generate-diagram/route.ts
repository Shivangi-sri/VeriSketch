import { generateDiagram } from "@/lib/agents/generate-diagram";
import { selectDiagramType } from "@/lib/skills/select-diagram-type";
import type { ClaimGraph } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { claimGraph?: ClaimGraph };
    const claimGraph = body.claimGraph;

    if (!claimGraph || !Array.isArray(claimGraph.nodes) || !Array.isArray(claimGraph.edges)) {
      return Response.json(
        {
          ok: false,
          error: "A valid claimGraph is required.",
        },
        { status: 400 },
      );
    }

    const diagramType = selectDiagramType(claimGraph);
    const diagram = await generateDiagram(claimGraph, diagramType);
    return Response.json({ ok: true, diagramType, diagram });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to generate diagram.",
      },
      { status: 500 },
    );
  }
}
