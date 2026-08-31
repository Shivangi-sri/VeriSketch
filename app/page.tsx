"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/useUIStore";

export default function HomePage() {
  const router = useRouter();
  const { setActiveView } = useUIStore();
  const [topic, setTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasTopic = useMemo(() => topic.trim().length > 0, [topic]);

  const handleGenerate = async () => {
    if (!hasTopic) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setActiveView("run");

    try {
      const response = await fetch("/api/topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        topicRunId?: string;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.topicRunId) {
        setErrorMessage(data.error ?? "The topic pipeline could not be started. Please retry with a valid prompt.");
        return;
      }

      router.push(`/topic/${data.topicRunId}`);
    } catch (error) {
      console.error(error);
      setErrorMessage("The AI pipeline is unavailable right now. Please retry in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showKeyHint =
    !!errorMessage &&
    /quota|billing|rate limit|api key|credit|not configured/i.test(errorMessage);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-violet-400">VeriSketch</p>
          <h1 className="mt-2 text-3xl font-semibold">Topic-to-diagram generation</h1>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/20">
            <label htmlFor="topic" className="mb-3 block text-sm font-medium text-zinc-300">
              Topic
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="min-h-[160px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-violet-400"
              placeholder="Try: react js concepts, html forms, css grid layout, python async programming"
            />

            {errorMessage ? (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                <p>{errorMessage}</p>
                {showKeyHint ? (
                  <p className="mt-2 text-xs text-red-100">
                    Check your LLM provider key and limits in <code>.env.local</code> (
                    <code>OPENAI_API_KEY</code> / <code>ANTHROPIC_API_KEY</code> / <code>GEMINI_API_KEY</code>).
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!hasTopic || isSubmitting}
                className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {isSubmitting ? "Generating..." : "Generate diagram"}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Status</p>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between rounded-lg bg-zinc-950 px-3 py-2">
                <span>Topic ready</span>
                <span className={hasTopic ? "text-emerald-400" : "text-zinc-400"}>{hasTopic ? "Ready" : "Waiting"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-950 px-3 py-2">
                <span>Verification loop</span>
                <span className="text-violet-300">Active</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-950 px-3 py-2">
                <span>Model</span>
                <span className="text-zinc-100">Auto (env)</span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
