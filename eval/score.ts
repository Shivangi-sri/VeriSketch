export type ScoreResult = {
  precision: number;
  recall: number;
  f1: number;
};

export async function scoreOutput(_output: unknown, _groundTruth: unknown[]): Promise<ScoreResult> {
  return { precision: 0, recall: 0, f1: 0 };
}
