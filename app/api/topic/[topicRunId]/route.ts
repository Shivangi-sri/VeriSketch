import { getTopicRun } from "@/lib/topic-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ topicRunId: string }> },
) {
  const { topicRunId } = await params;
  const run = getTopicRun(topicRunId);

  if (!run) {
    return Response.json(
      {
        ok: false,
        error: "Topic run not found.",
      },
      { status: 404 },
    );
  }

  return Response.json({ ok: true, run });
}
