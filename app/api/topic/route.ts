import { expandTopic } from "@/lib/agents/expand-topic";
import { runSectionPipeline, type SectionPipelineResult } from "@/lib/agents/section-pipeline";
import { createTopicRun, updateTopicRun } from "@/lib/topic-store";
import type { SectionRun, StageName, StageStatus } from "@/lib/types";

async function runSectionWithRetry(
  title: string,
  explanation: string,
  attempts = 2,
): Promise<SectionPipelineResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runSectionPipeline(title, explanation);
    } catch (error) {
      lastError = error;
      console.warn(`Section "${title}" attempt ${attempt}/${attempts} failed:`, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Section generation failed.");
}

const DONE_STAGES: Record<StageName, StageStatus> = {
  claim_extraction: "done",
  diagram_generation: "done",
  verification: "done",
  patch_loop: "done",
  final_diagram: "done",
};

const FAILED_STAGES: Record<StageName, StageStatus> = {
  claim_extraction: "failed",
  diagram_generation: "pending",
  verification: "pending",
  patch_loop: "pending",
  final_diagram: "failed",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { topic?: string };
    const topic = body.topic?.trim() ?? "";

    if (!topic) {
      return Response.json(
        { ok: false, error: "A topic is required before generating a diagram set." },
        { status: 400 },
      );
    }

    const expanded = await expandTopic(topic);
    const run = createTopicRun(topic);

    const sections = await Promise.all(
      expanded.sections.map(async (section, index): Promise<SectionRun> => {
        const now = new Date().toISOString();
        const shared = {
          id: `run-${run.id}-${section.id}`,
          sectionId: section.id,
          sourceText: section.explanation,
          order: index + 1,
          title: section.title,
          explanation: section.explanation,
          createdAt: now,
          updatedAt: now,
        };

        try {
          const startedAt = Date.now();
          const result = await runSectionWithRetry(section.title, section.explanation);

          return {
            ...shared,
            status: "ready_for_review",
            currentStage: "final_diagram",
            stages: {
              ...DONE_STAGES,
              patch_loop: result.retryLoop > 0 ? "done" : "pending",
            },
            retryLoop: result.retryLoop,
            claimGraph: result.claimGraph,
            diagram: result.diagram,
            diffResult: result.diffResult,
            confidence: result.confidence,
            escalated: result.escalated,
            verified: false,
            generationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
          };
        } catch (error) {
          console.error(`Section "${section.title}" failed to generate:`, error);
          return {
            ...shared,
            status: "failed",
            currentStage: "claim_extraction",
            stages: FAILED_STAGES,
            retryLoop: 0,
            claimGraph: null,
            diagram: null,
            diffResult: null,
            confidence: null,
            escalated: true,
            verified: false,
            generationSeconds: null,
          };
        }
      }),
    );

    updateTopicRun(run.id, {
      status: sections.every((section) => section.status === "failed") ? "failed" : "done",
      source: "live",
      sections,
    });

    return Response.json({ ok: true, topicRunId: run.id });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to expand topic." },
      { status: 500 },
    );
  }
}
