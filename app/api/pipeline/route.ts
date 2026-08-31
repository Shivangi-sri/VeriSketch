import { orchestrateRun } from "@/lib/agents/orchestrator";
import { createRun } from "@/lib/run-store";

type PipelineBody = {
  sourceText?: string;
};

export async function GET() {
  return Response.json({
    ok: true,
    message: "Pipeline endpoint is available.",
    data: null,
  });
}

export async function POST(request: Request) {
  try {
    const demoMode = request.headers.get("x-demo-mode") === "true";
    if (demoMode) {
      process.env.USE_MOCK_GEMINI = "true";
    }

    const body = (await request.json()) as PipelineBody;
    const sourceText = body.sourceText?.trim() ?? "";

    if (!sourceText) {
      return Response.json(
        {
          ok: false,
          error: "Source text is required before generating a diagram.",
          retryable: true,
          code: "EMPTY_SOURCE",
        },
        { status: 400 },
      );
    }

    const run = createRun(sourceText);
    void orchestrateRun(sourceText, run.id).catch((error) => {
      console.error("Pipeline orchestration failed:", error);
    });

    return Response.json({
      ok: true,
      runId: run.id,
      message: "Pipeline started successfully.",
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Invalid request payload.",
        retryable: true,
        code: "INVALID_REQUEST",
      },
      { status: 400 },
    );
  }
}
