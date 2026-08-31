"use client";

import { use } from "react";
import Link from "next/link";
import { SectionNote } from "@/components/SectionNote";
import { useTopicRun } from "@/queries/useTopicRun";

export default function TopicNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useTopicRun(id);

  if (isLoading && !data) {
    return <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">Preparing notes...</main>;
  }

  if (isError || !data) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-semibold">Unable to load these notes</h1>
          <p className="mt-3 text-sm text-red-700">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </main>
    );
  }

  // Every section with written content goes into the notes. A section whose
  // diagram failed still contributes its heading + explanation.
  const sections = [...data.sections]
    .filter((section) => section.explanation.trim().length > 0)
    .sort((a, b) => a.order - b.order);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <style>{`@media print { body { background: #fff !important; } @page { margin: 16mm; } }`}</style>

      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Link href={`/topic/${id}`} className="text-sm text-zinc-500 transition hover:text-zinc-900">
            ← Back to review
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Print / Save as PDF
          </button>
        </div>

        <header className="border-b border-zinc-200 pb-4">
          <h1 className="text-3xl font-bold">{data.topic}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Revision notes · {sections.length} section{sections.length === 1 ? "" : "s"}
          </p>
        </header>

        {sections.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">No sections are available for this topic.</p>
        ) : (
          <div className="mt-8 space-y-10">
            {sections.map((section, i) => (
              <SectionNote key={section.sectionId} index={i + 1} section={section} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
