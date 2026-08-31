import { verifyDiagram } from "@/lib/agents/verify-diagram";
import { getTopicRun, updateTopicRun } from "@/lib/topic-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ topicRunId: string; sectionId: string }> },
) {
  const { topicRunId, sectionId } = await params;
  const run = getTopicRun(topicRunId);

  if (!run) {
    return Response.json({ ok: false, error: "Topic run not found." }, { status: 404 });
  }

  const target = run.sections.find((section) => section.sectionId === sectionId);
  if (!target) {
    return Response.json({ ok: false, error: "Section not found." }, { status: 404 });
  }
  if (!target.claimGraph || !target.diagram) {
    return Response.json(
      { ok: false, error: "This section has no diagram to verify." },
      { status: 400 },
    );
  }

  const diff = await verifyDiagram(target.claimGraph, target.diagram, target.explanation);

  const nextSections = run.sections.map((section) =>
    section.sectionId === sectionId
      ? {
          ...section,
          verified: true,
          diffResult: diff,
          confidence: diff.confidence,
          escalated: diff.confidence < 0.6,
          updatedAt: new Date().toISOString(),
        }
      : section,
  );

  updateTopicRun(topicRunId, { sections: nextSections });

  return Response.json({ ok: true, diff });
}
