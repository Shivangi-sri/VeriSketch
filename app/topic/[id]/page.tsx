"use client";

import { use } from "react";
import Link from "next/link";
import { DiagramCard } from "@/components/DiagramCard";
import { useTopicRun } from "@/queries/useTopicRun";

export default function TopicRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useTopicRun(id);

  if (isLoading && !data) {
    return <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">Loading topic summary...</main>;
  }

  if (isError || !data) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-red-200">Topic run unavailable</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Unable to load the topic diagram feed</h1>
          <p className="mt-3 text-sm text-red-100">{error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </main>
    );
  }

  const generatedSections = data.sections.filter(
    (section) => section.status === "ready_for_review" && Boolean(section.diagram),
  );
  const failedCount = data.sections.filter((section) => section.status === "failed").length;

  const hasAnyReadyDiagram = generatedSections.length > 0;
  const isRunPending = data.status === "expanding" && data.sections.length === 0;
  const shouldShowGeneratingState = !hasAnyReadyDiagram && data.sections.length > 0 && data.status !== "failed";

  const verifiedCount = generatedSections.filter((section) => section.verified).length;
  const allVerified = generatedSections.length > 0 && verifiedCount === generatedSections.length;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-400">Topic summary</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{data.topic}</h1>
            </div>
            <div className="flex items-center gap-3">
              {allVerified ? (
                <Link
                  href={`/topic/${id}/notes`}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-emerald-200 transition hover:border-emerald-400"
                >
                  Download notes
                </Link>
              ) : null}
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-200">
                {data.status}
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            {generatedSections.length} diagram{generatedSections.length === 1 ? "" : "s"} · {verifiedCount}/
            {generatedSections.length} verified
            {failedCount > 0 ? ` · ${failedCount} unavailable` : ""}
          </p>
          {!allVerified && generatedSections.length > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              Verify every diagram to unlock the notes export.
            </p>
          ) : null}
        </header>

        <div className="space-y-4">
          {isRunPending ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center text-zinc-300">
              Expanding the topic into diagram-ready sections...
            </div>
          ) : shouldShowGeneratingState ? (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-8 text-center text-violet-100">
              Diagram generation is still in progress.
            </div>
          ) : data.sections.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center text-zinc-300">
              No summary sections are available yet.
            </div>
          ) : (
            data.sections.map((section) => (
              <DiagramCard key={section.sectionId} section={section} topicRunId={id} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
