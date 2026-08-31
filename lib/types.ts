export type ExcalidrawElement = Record<string, unknown>;

export interface ClaimNode {
  id: string;
  label: string;
  type: "entity" | "step" | "concept";
  sourceSentence: string;
}

export interface ClaimEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  sourceSentence: string;
}

export interface ClaimGraph {
  nodes: ClaimNode[];
  edges: ClaimEdge[];
}

export type DiagramType = "flowchart" | "tree" | "comparison" | "timeline" | "concept";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  id: string;
  points: Array<{ x: number; y: number }>;
}

export interface DiagramLayout {
  diagramType: DiagramType;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

export interface GeneratedDiagram {
  diagramType: DiagramType;
  elements: ExcalidrawElement[];
}

export interface DiffMismatch {
  expected: ClaimEdge;
  foundRelation: string | null;
}

export interface DiffResult {
  missingNodes: ClaimNode[];
  hallucinatedNodeLabels: string[];
  mismatchedEdges: DiffMismatch[];
  precision: number;
  recall: number;
  confidence: number;
  /** Share of nodes + edges whose source_sentence was found in the source text (0..1). */
  groundedRatio?: number;
  /** Human-readable grounding problems, e.g. a citation not present in the source. */
  groundingErrors?: string[];
}

export type StageName =
  | "claim_extraction"
  | "diagram_generation"
  | "verification"
  | "patch_loop"
  | "final_diagram";

export type StageStatus = "pending" | "running" | "done" | "failed";

export type RunStatus = "pending" | "running" | "ready_for_review" | "failed";

export interface PipelineRun {
  id: string;
  sourceText: string;
  status: RunStatus;
  currentStage: StageName;
  stages: Record<StageName, StageStatus>;
  retryLoop: number;
  claimGraph: ClaimGraph | null;
  diagram: GeneratedDiagram | null;
  diffResult: DiffResult | null;
  confidence: number | null;
  escalated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TopicSection {
  id: string;
  order: number;
  title: string;
  explanation: string;
}

export interface TopicExpansion {
  topic: string;
  sections: TopicSection[];
}

export interface SectionRun extends PipelineRun {
  sectionId: string;
  order: number;
  title: string;
  explanation: string;
  generationSeconds: number | null;
  /** Set once the user manually accepts the section via the Verify button. */
  verified?: boolean;
}

export interface TopicRun {
  id: string;
  topic: string;
  status: "expanding" | "generating" | "done" | "failed";
  source?: "mock" | "live";
  sections: SectionRun[];
  createdAt: string;
  updatedAt: string;
}

export interface EvalCase {
  id: string;
  sourceText: string;
  groundTruth: ClaimGraph;
}

export interface EvalResult {
  caseId: string;
  baselineConfidence: number;
  solutionConfidence: number;
  loopsToConverge: number;
  escalated: boolean;
}
