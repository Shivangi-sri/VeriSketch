# VeriSketch

## Problem

Students and self-learners need accurate, hand-drawn-style revision diagrams from dense source material without introducing factual mistakes.

## Bottleneck

Single-pass AI diagram tools often produce plausible but ungrounded outputs that can reinforce misconceptions.

## How to run

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add your Gemini API key.
3. Run `npm run dev`.
4. Open the local app in your browser.

## Architecture

The project is organized around a grounded claim-graph pipeline with a verification and patch loop. The orchestration layer coordinates the stages and surfaces progress and unresolved issues. 
