type PipelineProgressProps = {
  stage: string;
  retryLoop: number;
};

export function PipelineProgress({ stage, retryLoop }: PipelineProgressProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-100">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Pipeline</p>
      <h3 className="mt-2 text-lg font-semibold">{stage}</h3>
      <p className="mt-2 text-sm text-zinc-300">Retry loop: {retryLoop}</p>
    </div>
  );
}
