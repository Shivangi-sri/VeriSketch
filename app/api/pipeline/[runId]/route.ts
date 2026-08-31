import { getRun } from "@/lib/run-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const run = getRun(runId);

  if (!run) {
    return Response.json(
      {
        ok: false,
        error: "Run not found.",
      },
      { status: 404 },
    );
  }

  return Response.json({
    ok: true,
    run,
  });
}
