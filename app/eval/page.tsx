import { EvalTable } from "@/components/EvalTable";

const mockRows = [
  { caseId: "solar-system", baseline: 0.76, solution: 0.92, loops: 1, escalated: false },
  { caseId: "cell-cycle", baseline: 0.68, solution: 0.88, loops: 2, escalated: false },
];

export default function EvalPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="mb-2">
          <p className="text-sm uppercase tracking-[0.2em] text-violet-400">Evaluation</p>
          <h1 className="mt-2 text-3xl font-semibold">Baseline vs solution</h1>
        </header>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-zinc-300">
          <p className="mb-4">
            This dashboard compares the naive baseline against the grounded pipeline on a set of source fixtures.
          </p>
          <EvalTable rows={mockRows} />
        </div>
      </div>
    </main>
  );
}
