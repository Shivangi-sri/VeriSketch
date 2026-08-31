"use client";

import { useState } from "react";
import type { SectionRun } from "@/lib/types";
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas";
import { useVerifySection } from "@/queries/useVerifySection";

interface DiagramCardProps {
  section: SectionRun;
  topicRunId: string;
}

const METRIC_HELP = {
  confidence:
    "Overall quality score = 65% structure fidelity + 35% citation grounding. ≥ 75% auto-accepts during generation, < 60% is escalated.",
  recall: "Concept-graph nodes that reached the diagram: 1 − (missing nodes ÷ total nodes).",
  precision: "Diagram boxes that map to a real concept-graph node: 1 − (invented boxes ÷ boxes drawn).",
  edges: "Concept-graph relationships that were drawn as an arrow between the correct two boxes.",
  grounded:
    "Nodes + edges whose source sentence is actually found in the section text (verbatim or ≥ 60% word overlap).",
} as const;

export function DiagramCard({ section, topicRunId }: DiagramCardProps) {
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const verifyMutation = useVerifySection(topicRunId);

  const verified = Boolean(section.verified);
  const isReady = section.status === "ready_for_review" && Boolean(section.diagram);
  const isLoading = !isReady && section.status !== "failed";

  const diff = section.diffResult;
  const confidence = section.confidence ?? diff?.confidence ?? 0;
  const precision = diff?.precision ?? 0;
  const recall = diff?.recall ?? 0;
  const groundedRatio = diff?.groundedRatio ?? 0;
  const missingNodes = diff?.missingNodes?.length ?? 0;
  const mismatchedEdges = diff?.mismatchedEdges?.length ?? 0;
  const drawnEdges = Math.max(0, (section.claimGraph?.edges.length ?? 0) - mismatchedEdges);
  const groundingErrors = diff?.groundingErrors ?? [];
  const lowConfidence = confidence > 0 && confidence < 0.6;

  const pct = (value: number) => `${Math.round(value * 100)}%`;

  const handleVerify = () => {
    if (!section.diagram || verified || verifyMutation.isPending) return;
    verifyMutation.mutate(section.sectionId);
  };

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-lg shadow-black/10">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
          {section.order}. {section.title}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMatrixOpen(true)}
            disabled={!diff}
            className="rounded-full border border-zinc-700 bg-zinc-950 p-2 text-zinc-200 transition hover:border-violet-400 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="View verification details"
            title="Verification details"
          >
            ◫
          </button>

          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            disabled={!section.diagram}
            className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isEditing
                ? "border-violet-400 bg-violet-500/15 text-violet-100"
                : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-violet-400 hover:text-violet-200"
            }`}
            title="Toggle the full Excalidraw editor"
          >
            {isEditing ? "Done editing" : "Edit diagram"}
          </button>

          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyMutation.isPending || !section.diagram || verified}
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-200 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            title="Mark this section reviewed and accepted"
          >
            {verified ? "✓ Verified" : verifyMutation.isPending ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm leading-6 text-zinc-300">{section.explanation}</p>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 text-sm text-zinc-400">
            Generating diagram...
          </div>
        ) : section.status === "failed" ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 text-center text-sm text-amber-200">
            <span className="font-medium">Diagram unavailable for this section</span>
            <span className="text-xs text-amber-200/80">
              The concept flow could not be built reliably. This section is skipped in the exported notes.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {section.diagram ? (
              <ExcalidrawCanvas
                elements={section.diagram.elements}
                mode={isEditing ? "editor" : "preview"}
                height={isEditing ? 560 : 380}
              />
            ) : null}

            {isEditing ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-[11px] leading-5 text-zinc-400">
                Full editor enabled — drag, restyle, and relabel nodes. Edits stay on this device and
                are not saved back to the run yet.
              </p>
            ) : null}

            {lowConfidence && !verified ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-5 text-amber-200">
                Low confidence ({pct(confidence)}). Open the details, review the diagram, then Verify.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {section.status !== "failed" ? (
        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          <span>{section.generationSeconds != null ? `Generated in ${section.generationSeconds}s` : "Pending"}</span>
          <button
            type="button"
            onClick={() => diff && setIsMatrixOpen(true)}
            className="tracking-[0.18em] text-zinc-400 underline-offset-2 hover:text-violet-200 hover:underline"
            title={METRIC_HELP.confidence}
          >
            Confidence {pct(confidence)}
          </button>
        </div>
      ) : null}

      {isMatrixOpen && diff ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-violet-300">Verification detail</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{section.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMatrixOpen(false)}
                className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Confidence</p>
                <p className="text-2xl font-semibold text-emerald-200">{pct(confidence)}</p>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-zinc-400">{METRIC_HELP.confidence}</p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Recall</p>
                  <p className="text-sm font-medium text-cyan-200">{pct(recall)}</p>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">{METRIC_HELP.recall}</p>
                <p className="mt-1 text-[11px] text-zinc-400">{missingNodes} node(s) missing</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Precision</p>
                  <p className="text-sm font-medium text-emerald-200">{pct(precision)}</p>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">{METRIC_HELP.precision}</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Edge fidelity</p>
                  <p className="text-sm font-medium text-yellow-200">
                    {drawnEdges}/{drawnEdges + mismatchedEdges}
                  </p>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">{METRIC_HELP.edges}</p>
                <p className="mt-1 text-[11px] text-zinc-400">{mismatchedEdges} relationship(s) not drawn</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Grounded citations</p>
                  <p className="text-sm font-medium text-emerald-200">{pct(groundedRatio)}</p>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">{METRIC_HELP.grounded}</p>
              </div>
            </div>

            {groundingErrors.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-300">Grounding notes</p>
                <ul className="space-y-1 text-xs text-amber-100">
                  {groundingErrors.slice(0, 6).map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-4 text-[11px] leading-5 text-zinc-500">
              These numbers are computed automatically after generation. &ldquo;Verify&rdquo; is your
              manual sign-off that the diagram is correct enough to keep.
            </p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
