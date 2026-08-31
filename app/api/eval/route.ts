export async function GET() {
  return Response.json({
    ok: true,
    message: "Eval data endpoint is available.",
    data: [
      {
        caseId: "solar-system",
        baseline: 0.72,
        solution: 0.94,
        loops: 2,
        escalated: false,
      },
    ],
  });
}

export async function POST() {
  return Response.json({
    ok: true,
    message: "Eval route initialized.",
    data: [],
  });
}
