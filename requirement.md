# VeriSketch Requirements

## Problem statement
Students and self-learners preparing for exams or interviews consume dense source material and want visual revision notes, but they do not have the time or skill to hand-draw diagrams. Existing AI note generation and diagram tools often produce plausible visuals without checking whether the content is factually faithful to the source.

## User pain
- Dense source material is hard to convert into meaningful revision diagrams.
- Generic AI-generated diagrams may invent relationships or labels.
- A false diagram can be memorized as fact and harm exam or interview performance.

## Product solution
Build an agent pipeline that generates hand-drawn-style diagrams from source text and verifies the diagram against the original source using a grounded claim graph and a diff-and-patch loop.

## Non-negotiable technical constraints
- Next.js App Router with TypeScript.
- Gemini API for all LLM calls.
- All LLM calls must happen on the server side.
- Structured JSON output via responseSchema for critical agent stages.
- Keep all LLM calls behind a single provider abstraction.
- Use React Query for server state and Zustand for client-side UI state.
- No Redux.
- Use Excalidraw as the editable diagram surface.
- Use dark-mode-first polish in the interface.

## Required high-level architecture
### Agents
1. Claim Extraction Agent
2. Diagram Generation Agent
3. Verification/Diff Agent
4. Patch Agent
5. Orchestrator Agent
6. Scoring/Judge Agent

### Skills
- Grounding/citation validation
- Diagram type classification
- Graph diffing
- Excalidraw validation
- Rate-limit/retry handling

## Grounding requirement
Every node and edge in the claim graph must retain the exact source sentence it came from. No node or edge may move through the pipeline without this citation.

## Verification requirement
The system should compare the generated diagram’s claim graph to the original claim graph, identify missing nodes, extra nodes, and mismatched edges, and only accept verified output.

## Retry-loop requirement
The orchestrator must keep run-scoped memory across retries for one run. It must remember the original graph, the previous diagram, and the last flagged mismatches so it does not reintroduce earlier issues.

## Evaluation requirement
The project includes an eval harness over labeled source-text fixtures and ground-truth claim lists. It should compare a naive baseline against the solution and log metrics like:
- baseline claim accuracy
- solution claim accuracy
- loops needed to converge
- whether escalation was required

## Frontend requirement
- Input screen for source text
- Pipeline progress screen to show stage status and verification loop count
- Excalidraw canvas with editable diagram
- Eval dashboard comparing baseline vs solution

## Quality bar
- Real loading and error states
- Smooth UI performance for eval case sets
- Professional dark UI design with a consistent accent color
- No silent failures

## Delivery expectation
The project should be built in clear iterations, with changelog updates at each major milestone. It should remain reproducible and easy to run with a local Gemini API key.

## Current repository state
This repository is still in its initial scaffold stage. The app shell, routes, folders, and placeholders are in place, but the real agent flow and production logic still need to be implemented.
