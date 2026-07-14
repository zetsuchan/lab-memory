# Hackathon submission — Lab Memory

**Track:** Builder — *Build Beyond the Bench*

## Written summary (≈190 words)

Lab Memory is institutional memory for a research team. A translational-research
coordinator's knowledge is scattered across a dozen ClinicalTrials.gov CSVs, FDA therapy
tables, markdown reports, and notes — the answers are in there, but re-deriving them by hand
takes an afternoon. Lab Memory turns that pile into a queryable, cited memory: upload any
files and Claude answers questions grounded **only** in them, citing the exact source for
every claim, with a verifiable reasoning chain, an auto-built knowledge graph, and the
follow-up questions worth asking next. Each corpus becomes a saved session, so it outlasts the
week.

Built with Next.js 16, React 19, and the Vercel AI SDK, Claude (Sonnet 5) is the reasoning
engine — handed the corpus and a strict "answer only from these files, cite everything, never
invent" contract, returning a schema-validated, streaming answer. We tested it on public
sickle-cell-disease trial and therapy data: it correctly identified a withdrawn drug,
cross-referenced trial counts across files, and — notably — flagged when a figure was a
*derived estimate* rather than a stated fact. Working software a scientist could use without
us in the room.

## 3-minute demo script (mapped to the judging criteria)

| Time | Beat | Criterion it hits |
|---|---|---|
| 0:00–0:20 | The user: a research coordinator buried in scattered trial/therapy files. | Impact |
| 0:20–0:50 | Drag the 4 SCD files in → a session is created, the knowledge graph springs to life. | Demo |
| 0:50–1:50 | Ask "Which FDA therapies exist, which was withdrawn & when, how many trials recruiting?" → streamed, **cited** answer; point out it caught the withdrawn drug and cross-checked the 170-trial count across two files. | Claude Use, Demo |
| 1:50–2:20 | Ask the gene-therapy follow-up → Claude **flags that "~30" is a derived estimate, not a stated fact.** Trust. | Depth, Claude Use |
| 2:20–2:45 | Click a graph node to ask about it; show the sessions sidebar (it outlasts the week); flip the theme; note it's deployed on Vercel. | Demo, Depth |
| 2:45–3:00 | Close: strict grounding + citations + proactive questions = a tool a scientist uses without us in the room. *Build Beyond the Bench.* | Impact |

## Checklist
- [ ] 3-min demo video (YouTube/Loom)
- [x] Public GitHub repo
- [x] Written summary (above)
- [ ] Rotate the Anthropic API key before/after submitting
