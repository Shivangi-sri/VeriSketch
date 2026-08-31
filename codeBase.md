# VeriSketch Codebase Guide

## Overview
VeriSketch is a Next.js + TypeScript application that generates verified, hand-drawn-style diagrams from source text. The app focuses on grounding diagram claims in the original source, validating the generated diagram against the source, and patching hallucinated or incorrect relationships.

## Product goal
The project is intended for students and self-learners preparing for exams or interviews from dense source material. Instead of creating a generic visual summary, the system attempts to build diagrams that are factually faithful to the source text.

## Primary architecture
- Next.js App Router for frontend + backend in one project.
- Route handlers under app/api/ are used for server-side LLM orchestration.
- React Query handles async server data fetching and mutation state.
- Zustand handles lightweight client-side UI state such as view selection and loop counters.
- Gemini API is the provider of record, with a single abstraction layer in lib/llm/provider.ts.

## Core workflow
1. Extract a grounded claim graph from source text.
2. Choose a diagram type from the graph structure.
3. Generate a diagram from the claim graph.
4. Reverse-parse the diagram into a claim graph.
5. Diff against the original graph.
6. Patch mismatches only where needed.
7. Repeat up to a capped retry loop.
8. Escalate to human review when unresolved issues remain.

## Key folder roles
### app/
- app/page.tsx: main input screen
- app/run/[id]/page.tsx: live pipeline and canvas view
- app/eval/page.tsx: eval dashboard
- app/api/*/route.ts: server-side endpoints for each backend stage

### components/
- PipelineProgress.tsx: stage/progress indicator
- ExcalidrawCanvas.tsx: editable drawing surface
- EvalTable.tsx: comparison table for eval results

### store/
- useUIStore.ts: Zustand store for active view, retry loop count, canvas toggles

### queries/
- usePipelineRun.ts: pipeline mutation hook
- useEvalResults.ts: eval dashboard hook

### lib/
- llm/provider.ts: Gemini abstraction layer and structured generation helper
- agents/: LLM-based agent implementations
- skills/: deterministic logic that should not be LLM calls
- render/excalidraw-adapter.ts: graph-to-drawing conversion adapter

### baseline/
- direct-prompt.ts: naive single-shot generation baseline

### eval/
- cases/: source fixtures and ground truth claims
- score.ts: scoring logic
- run-eval.ts: batch evaluation runner

### docs/
- README.md: project and run instructions
- CHANGELOG.md: build progression and iteration notes

## Key business rules
- No LLM call should happen in the browser.
- Response schema enforcement is required for structured outputs.
- Every claim graph node and edge must include a source_sentence citation.
- Verification must check structure, coverage, and relationship validity before accepting output.
- The app must behave like a polished product, not a bare admin dashboard.

## Current status
This repo is in an early scaffold stage. The basic app shell, pages, and folder structure are present. The real agent logic, verification loop, and evaluation harness are still pending implementation.

## Development order
The project should be built in the following order:
1. Baseline single-prompt implementation
2. Eval harness with fixtures and semantic scoring
3. Claim extraction + grounding
4. Diagram type selection + generation
5. Verification + patching + retry loop
6. Handwriting rendering layer
7. Frontend polish

## Important naming
Project name: VeriSketch
Keep this consistent in UI, README, package metadata, and the project documentation.
