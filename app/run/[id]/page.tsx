"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { PipelineProgress } from "@/components/PipelineProgress";

const pipelineStages = [
  { name: "claim_extraction", label: "Claim extraction" },
  { name: "diagram_generation", label: "Diagram generation" },
  { name: "verification", label: "Verification" },
  { name: "patch_loop", label: "Patch loop" },
  { name: "final_diagram", label: "Final diagram" },
] as const;

type RunResponse = {
  ok: boolean;
  run?: {
    id: string;
    status: string;
    currentStage: string;
    stages: Record<string, string>;
    retryLoop: number;
    confidence: number | null;
    sourceText?: string;
    claimGraph?: { nodes?: Array<{ label?: string }> } | null;
    diagram?: {
      diagramType?: string;
      elements?: unknown[];
    } | null;
    diffResult?: { confidence?: number; missingNodes?: unknown[] } | null;
  };
  error?: string;
};

type ConceptCard = {
  title: string;
  accent: string;
  summary: string;
  tags: string[];
  items: string[];
};

function buildConceptCards(claimGraph?: { nodes?: Array<{ label?: string }> } | null): ConceptCard[] {
  const labels = (claimGraph?.nodes ?? [])
    .map((node) => node.label ?? "")
    .filter(Boolean)
    .map((label) => label.replace(/\s+/g, " ").trim());

  const groups: ConceptCard[] = [
    {
      title: "Core concept",
      accent: "from-violet-500/30 to-purple-500/20",
      summary: "The main idea and purpose of the topic.",
      tags: ["Overview", "Foundation"],
      items: labels.slice(0, 3),
    },
    {
      title: "Component model",
      accent: "from-sky-500/30 to-cyan-500/20",
      summary: "The structures and reusable building blocks.",
      tags: ["Architecture", "Parts"],
      items: labels.filter((label) => /component|props|state|hook|context|module|class|function/i.test(label)).slice(0, 3),
    },
    {
      title: "Render flow",
      accent: "from-emerald-500/30 to-teal-500/20",
      summary: "How the system updates and displays output.",
      tags: ["Flow", "UI"],
      items: labels.filter((label) => /render|dom|view|ui|screen|browser|output|update|display/i.test(label)).slice(0, 3),
    },
  ];

  return groups.map((group) => ({
    ...group,
    items: group.items.length ? group.items : ["Concept map generated", "Structure inferred from source text", "Verified by the pipeline"],
  }));
}

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [runData, setRunData] = useState<RunResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let ignore = false;
    let intervalId: number | undefined;

    const stopPolling = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const load = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/pipeline/${id}`);
        const data = (await response.json()) as RunResponse;

        if (!ignore) {
          setRunData(data);

          if (!response.ok || !data.ok || !data.run || ["ready_for_review", "failed"].includes(data.run.status)) {
            stopPolling();
          }
        }
      } catch {
        if (!ignore) {
          setRunData({ ok: false, error: "Unable to load run state." });
        }
        stopPolling();
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void load();

    intervalId = window.setInterval(() => {
      void load();
    }, 2000);

    return () => {
      ignore = true;
      stopPolling();
    };
  }, [id]);

  if (!runData) {
    return <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">Loading run...</main>;
  }

  if (!runData.ok || !runData.run) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-red-200">Run unavailable</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">No valid pipeline data was found</h1>
          <p className="mt-3 text-sm text-red-100">{runData?.error ?? "The run was not created successfully."}</p>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="mt-6 rounded-full bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-400"
          >
            Go back and retry
          </button>
        </div>
      </main>
    );
  }

  const { run } = runData;
  const activeStageName = run.currentStage ?? "final_diagram";
  const stageIndex = pipelineStages.findIndex((stage) => stage.name === activeStageName);
  const resolvedStageIndex = stageIndex >= 0 ? stageIndex : pipelineStages.length - 1;
  const activeStage = pipelineStages[resolvedStageIndex] ?? pipelineStages[pipelineStages.length - 1];
  const retryLoop = run.retryLoop ?? 0;
  const claims = run.claimGraph?.nodes?.length ?? 0;
  const confidence = run.confidence ?? run.diffResult?.confidence ?? 0;
  const progress = Math.min(100, ((resolvedStageIndex + 1) / pipelineStages.length) * 100);
  const ideaHeadlines = buildConceptCards(run.claimGraph);
  const sourcePreview = run.sourceText?.trim() || "Prompt is being processed to generate the diagram.";

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-violet-400">Open pipeline</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Concept generation flow</h1>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-violet-100 md:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {run.status}
          </div>
        </header>

        <PipelineProgress stage={activeStage.label} retryLoop={retryLoop} />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.75fr]">
          <aside className="space-y-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Prompt</p>
              <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-sm leading-6 text-zinc-200">
                {sourcePreview}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Chat output</p>

              <div className="mt-4 space-y-3">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-500/20 px-4 py-3 text-sm text-violet-100">
                  Can you turn this into a concept diagram?
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-zinc-950 px-4 py-3 text-sm leading-6 text-zinc-200">
                  I’ve extracted the grounded ideas and I’m visually organizing the key blocks into a study-friendly concept map.
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-zinc-950 px-4 py-3 text-sm leading-6 text-zinc-200">
                  {run.diagram
                    ? "The diagram is ready. I’ve grouped the concept clusters so the structure is easier to edit and review."
                    : "The system is validating the concept groups and preparing the final diagram for editing."}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Pipeline status</p>
                <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-200">
                  {activeStage.label}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {pipelineStages.map((stage, index) => {
                  const isCurrent = index === resolvedStageIndex;
                  const isDone = index < resolvedStageIndex || (run.status === "ready_for_review" && index === pipelineStages.length - 1);

                  return (
                    <div key={stage.name} className="flex items-center justify-between rounded-xl bg-zinc-950 px-3 py-2 text-sm">
                      <span className={isCurrent || isDone ? "text-zinc-100" : "text-zinc-500"}>{stage.label}</span>
                      <span className={isDone ? "text-emerald-400" : isCurrent ? "text-violet-300" : "text-zinc-500"}>
                        {isDone ? "Done" : isCurrent ? "Running" : "Queued"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Generated output</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {run.diagram?.diagramType ? `${run.diagram.diagramType} concept map` : "Concept map preview"}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-200">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                    {claims} claims
                  </span>
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-violet-200">
                    {retryLoop} loop{retryLoop === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                    {confidence > 0 ? `${confidence.toFixed(2)} confidence` : "Pending"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                  <ExcalidrawCanvas diagram={run.diagram ?? undefined} editable />
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Action</p>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-full bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400"
                    >
                      Regenerate concept map
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-violet-400 hover:text-violet-200"
                    >
                      Open in Excalidraw
                    </button>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Review</p>
                    <div className="mt-4 space-y-3 text-sm text-zinc-300">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">Grounded facts: {claims}</div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">Status: {run.status}</div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">Stage: {activeStage.label}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {ideaHeadlines.map((card) => (
                <div key={card.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className={`rounded-xl bg-gradient-to-r ${card.accent} p-3`}>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-200">{card.title}</p>
                  </div>

                  <p className="mt-3 text-sm text-zinc-300">{card.summary}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-300">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-zinc-200">
                    {card.items.map((item) => (
                      <li key={item} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
