type EvalRow = {
  caseId: string;
  baseline: number;
  solution: number;
  loops: number;
  escalated: boolean;
};

type EvalTableProps = {
  rows: EvalRow[];
};

export function EvalTable({ rows }: EvalTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <table className="min-w-full text-left text-sm text-zinc-200">
        <thead className="bg-zinc-800/80 text-zinc-300">
          <tr>
            <th className="px-4 py-3">Case</th>
            <th className="px-4 py-3">Baseline</th>
            <th className="px-4 py-3">Solution</th>
            <th className="px-4 py-3">Loops</th>
            <th className="px-4 py-3">Escalated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.caseId} className="border-t border-zinc-800">
              <td className="px-4 py-3">{row.caseId}</td>
              <td className="px-4 py-3">{row.baseline}</td>
              <td className="px-4 py-3">{row.solution}</td>
              <td className="px-4 py-3">{row.loops}</td>
              <td className="px-4 py-3">{row.escalated ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
