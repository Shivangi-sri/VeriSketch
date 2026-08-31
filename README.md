# VeriSketch

**Turn a study topic into verified, hand‑drawn‑style concept diagrams.**

VeriSketch is a Next.js + TypeScript app for students and self‑learners who want visual
revision notes without hallucinated relationships. Instead of asking an LLM for a picture
in one shot, it builds a **grounded concept graph** from generated explanations, renders it
as a flowchart, and then **verifies the diagram back against the source** before you keep it.

---

## Demo

📹 **Demo video:** _add a link or embed here_

https://www.loom.com/share/d3f64d504aaf42de9f9f518c7ee92ffa


## How it works

```
Topic
  └─ expand into 3–6 teaching sections            (LLM)
       └─ per section:
            1. extract a grounded concept‑flow graph   (LLM – every node & edge
               keeps the exact source sentence it came from)
            2. render a layered flowchart with labelled arrows   (deterministic)
            3. verify:
                 • reverse‑parse the diagram back into a graph
                 • diff vs. the concept graph  → precision / recall / edge fidelity
                 • grounding check             → are the cited sentences real?
                 • confidence = 0.65·structure + 0.35·grounding
            4. if confidence is low → one feedback‑driven patch retry
  └─ you Verify each section, then export clean printable notes
```

- **Grounding:** no node or edge moves through the pipeline without a `sourceSentence`.
- **Verification:** the diagram is checked independently of how it was generated.
- **Notes export:** once every section is verified, `/topic/[id]/notes` renders a clean
  document (section heading + sentence bullet points + the diagram as SVG) that you can
  **Save as PDF** from the browser. Sections whose diagram failed still appear with their
  heading and text.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js App Router (React 19, TypeScript) |
| Styling | Tailwind CSS v4, dark‑mode‑first |
| Server state | TanStack React Query |
| UI state | Zustand |
| Diagram surface | Excalidraw (editable, hand‑drawn style) |
| LLM access | Server‑only, behind a single provider abstraction (`lib/llm/provider.ts`) |

All LLM calls happen on the server and return schema‑constrained JSON.

## LLM providers

The app uses the **first** provider that has a key configured, in this order:

| Order | Env keys | Notes |
| --- | --- | --- |
| 1 | `OPENAI_API_KEY` (+ `OPENAI_BASE_URL`, `OPENAI_MODEL`) | Any OpenAI‑compatible endpoint. **Free options:** [Groq](https://console.groq.com/keys) (no card) or local [Ollama](https://ollama.com). Also works with OpenRouter, Together, Mistral, etc. |
| 2 | `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`) | Claude. Needs a positive credit balance. |
| 3 | `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`) | Google Gemini. Free tier has a small daily quota. |

---

## Getting started

### Prerequisites

- **Node.js 20+**
- One LLM provider key (Groq's free key is the quickest — no credit card)

### 1. Install

```bash
npm install
```

### 2. Configure a provider

Create `.env.local` in the project root. The fastest path (Groq, free):

```dotenv
# Groq — get a key at https://console.groq.com/keys
OPENAI_API_KEY=gsk_your_key_here
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=openai/gpt-oss-120b
```

<details>
<summary>Other providers</summary>

```dotenv
# Local Ollama (offline, no key) — run `ollama serve` and `ollama pull llama3.1`
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.1

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-haiku-4-5

# Google Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```
</details>

`.env*` is git‑ignored — your keys stay local.

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>, enter a topic (e.g. *"css grid layout"*), and generate.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

---

## Project structure

```
app/
  page.tsx                     topic input
  topic/[id]/page.tsx          per-section review + verification
  topic/[id]/notes/page.tsx    printable notes (Save as PDF)
  api/                         server routes (topic run, verify, …)
components/
  ExcalidrawCanvas.tsx         preview / full editor
  DiagramCard.tsx              one section: diagram + verify + detail modal
  SectionNote.tsx              one section in the printable notes
lib/
  llm/provider.ts              the single LLM abstraction (OpenAI-compat / Claude / Gemini)
  agents/                      expand-topic, extract-concept-flow, generate-diagram,
                               verify-diagram, section-pipeline, …
  skills/                      graph-diff, grounding-check, reverse-parse-diagram, layout, …
  render/excalidraw-elements.ts   shared graph → Excalidraw element conversion
queries/                       React Query hooks
store/useUIStore.ts            Zustand UI state
eval/                          evaluation harness (scaffolded)
docs/                          changelog, screenshots
```

## Status

The topic → concept‑flow → diagram → verification → notes flow is implemented and working.
wired to real runs. See `docs/CHANGELOG.md` for iteration history.
