export type EvalCaseResult = {
  caseId: string;
  baselineScore: number;
  solutionScore: number;
  loopsNeeded: number;
  neededEscalation: boolean;
};

export async function runEval(): Promise<EvalCaseResult[]> {
  return [];
}
