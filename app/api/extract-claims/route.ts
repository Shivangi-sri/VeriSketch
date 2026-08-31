import { extractClaims } from "@/lib/agents/extract-claims";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { sourceText?: string };
    const sourceText = body.sourceText?.trim() ?? "";

    if (!sourceText) {
      return Response.json(
        {
          ok: false,
          error: "Source text is required.",
        },
        { status: 400 },
      );
    }

    const graph = await extractClaims(sourceText);
    return Response.json({ ok: true, graph });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to extract claims.",
      },
      { status: 500 },
    );
  }
}
