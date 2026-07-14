# 🧠 Lab Memory

**Institutional memory for a research team. Upload your files — ask what your data knows.**

Lab Memory turns a scattered pile of a lab's files (papers, notebooks, protocols,
ClinicalTrials.gov exports, CSVs, notes) into a **queryable, cited memory**. Drop files in,
and Claude answers questions grounded *only* in those files — with a citation to the exact
source for every claim, a reasoning chain you can verify, an auto-built knowledge graph, and
the sharp follow-up questions worth asking next.

Built for the **Anthropic Virtual Hackathon — Builder Track: "Build Beyond the Bench."**

---

## The user we built for

**A translational-research coordinator / lab data lead** who is drowning in files. Their
knowledge lives across a dozen CSVs pulled from ClinicalTrials.gov, a markdown landscape
report, FDA therapy tables, and half-remembered notes. The answer to "which therapies were
withdrawn?" or "how many trials are actually recruiting, and where?" is *in there* — but
nobody can hold it all in their head, and re-deriving it by hand takes an afternoon.

Lab Memory is the tool they're missing: **working software they can use without us in the
room.** Upload the files, ask in plain English, get a cited answer in seconds. Sessions
persist, so it outlasts the week — every corpus they load stays in the sidebar to revisit.

This maps directly to the track's example prompts (a clinical-trial matcher for a research
coordinator; a lab-notebook companion for a wet-lab scientist) — generalized into one tool
that works on *whatever* a team uploads.

## What it does

- **Upload any files** (`.csv .md .txt .json .tsv`) → they become a **session**.
- **Ask questions** → Claude streams a structured answer: a direct summary, a numbered
  reasoning/evidence chain, a recommended next step, **citations to the exact source files**,
  and **follow-up questions** that surface gaps and contradictions.
- **Knowledge graph** — every session auto-builds a graph of its entities (files, records,
  categories, concepts); drag/zoom it and click a node to ask about it.
- **Sessions sidebar** — every corpus you load is saved and revisitable.
- Light/dark theme, keyboard-friendly, responsive.

## How Claude is used

Claude (via the **Vercel AI SDK** `streamObject`) is the reasoning engine. It's given the
session's corpus and a strict system prompt: **answer only from the corpus, cite the exact
source file for every claim, never invent.** The response is a typed, schema-validated object
(`summary / steps / recommendation / citations / followups`) that streams into the UI. The
"follow-up questions" are Claude proactively finding the threads a busy scientist would miss —
contradictions, gaps, and cross-file connections.

## Quickstart

```bash
npm install
cp .env.example .env.local          # add your ANTHROPIC_API_KEY
npm run dev                          # http://localhost:3000  (use localhost, not 127.0.0.1)
```

Upload a few files → ask "What is this data about?" → follow the suggested questions.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 · React 19 (App Router) |
| Reasoning | Claude (Sonnet 5) via Vercel AI SDK 7 (`streamObject`, structured output) |
| Motion | `motion` (open-source) — spring graph entrance, layout, count-ups |
| Storage | Local file store in dev · **Vercel Postgres (Neon)** in prod (auto-switch) |
| Ingestion | Dependency-free CSV/markdown parser → docs + knowledge graph |

Deploy: see [`DEPLOY.md`](./DEPLOY.md).

## Notes

- Every line of this project was written during the hackathon.
- The corpus is whatever *you* upload — the demo uses public sickle-cell-disease trial/therapy
  data exported from ClinicalTrials.gov + FDA.
