# Hackathon submission — Lab Memory

**Track:** Builder — *Build Beyond the Bench* · **Live:** https://lab-memory.vercel.app

## Written summary (≈190 words)

Lab Memory is institutional memory for a research team. A lab's hardest-won knowledge — why an
experiment failed, what was never tried, how a result connects to a paper published months
later — is scattered across notebooks, spreadsheets, protocols, and PDFs where nobody can
reconstruct it. Lab Memory turns that pile into a queryable, cited memory: upload any files and
Claude answers questions grounded **only** in them, citing the exact source for every claim,
with a verifiable reasoning chain, an auto-built knowledge graph, and the follow-up questions
worth asking next. Each corpus becomes a saved session, so it outlasts the week.

Built with Next.js 16, React 19, and the Vercel AI SDK, Claude (Sonnet) is the reasoning engine
— handed the corpus and a strict "answer only from these files, cite everything, never invent"
contract, returning a schema-validated, streaming answer. In our demo it reads a neuroscience
lab's 20 scattered files and, unprompted, reconstructs a buried story: a gene program abandoned
for toxicity, **independently confirmed by an outside paper six months later**, with the one
safer experiment the lab never ran — every step cited to the exact file. Working software a
scientist could use without us in the room.

## The demo corpus

`~/Downloads/meridian-lab/` — 20 files (10 papers, 5 lab notebooks, 3 data CSVs, 1 protocol,
1 running experiment-notes log) from a synthetic neuroscience lab studying TDP-43 / STMN2 in
ALS. The "answer key" README is deliberately **excluded** so Claude derives the story from raw
sources.

## 3-minute demo script (validated live)

| Time | What you do / say | Criterion |
|---|---|---|
| 0:00–0:20 | Empty screen. "A lab's hardest-won knowledge — why something failed, what was never tried, how a result connects to a paper months later — is scattered where nobody can reconstruct it. This is Lab Memory." | Impact |
| 0:20–0:45 | **Drag all 20 files** from `~/Downloads/meridian-lab` into the dropzone → **Create session**. "A neuroscience lab's entire memory — papers, notebooks, raw data, protocols, messy notes." Metrics count up; graph builds. | Demo |
| 0:45–1:50 | Ask **"Why did we abandon Gene A? Walk me through the evidence and cite the files."** Narrate as it streams: "It reconstructs the whole story — the knockout raised the target but killed the cells at ~35% viability; it resolved the codename *Gene A → AXR1* from a data table; and the kicker: an outside paper **confirmed it six months later**, and the one experiment that might have worked — CRISPRi — was **never tried.** Every claim cited to the exact file." | Claude Use, Demo |
| 1:50–2:20 | Ask **"What's the single most promising experiment we never ran, and what's the evidence it would work?"** → CRISPRi titration, cited to the methods paper. "It surfaces the *next* experiment, grounded in the lab's own data plus the literature." | Depth, Claude Use |
| 2:20–2:40 | Toggle the **knowledge graph**, drag it, click a node to ask about it; show the **sessions sidebar** and theme toggle. "Every corpus becomes an explorable graph and a saved session — it outlasts the week." | Demo, Depth |
| 2:40–3:00 | "Built with Claude + the Vercel AI SDK — strict grounding, every claim cited, and it proactively finds the gaps a scientist would miss. Working software a lab could use without us in the room. *Build Beyond the Bench.*" | Impact |

## Prompt library (all validated on this corpus)

**The star (use this one):**
> Why did we abandon Gene A? Walk me through the evidence and cite the files.

**Openers / big picture:**
> What is this lab trying to achieve, and where does each gene program — STMN2, AXR1, AXR2, AXR3 — stand right now?

**Forward-looking payoff:**
> What's the single most promising experiment we never ran, and what's the evidence it would actually work?

**Cross-time synthesis (shows multi-file reasoning):**
> Did anything we discovered ourselves later get confirmed by an outside paper? And what did we leave untested?

**Contradiction / gap probe:**
> Where do our own results agree or disagree with the published literature?

**Precision / grounding (shows it uses real numbers):**
> Exactly what happened to cell viability when we knocked out AXR1, in which experiment, and across how many guides?

**Cross-program comparison:**
> How does the AXR2 overexpression + STMN2 ASO combo compare to the abandoned AXR1 approach, in efficacy and safety?

### What makes prompts land well
- Ask it to **"walk me through the evidence and cite the files"** → it shows its work with sources.
- Ask **"what did we *never try* / what's the gap"** → surfaces the untried experiment (the wow).
- Ask for **cross-source connections** ("did an outside paper confirm…") → showcases multi-file synthesis.
- Ask for **a recommendation with evidence** → forward-looking, not just lookup.

## Recording tips
- Use the live URL **https://lab-memory.vercel.app**.
- The first Claude answer takes ~15–20s to stream — do a dry run first (models warm), and/or
  trim the wait slightly in editing. Delete the session between takes for a clean slate (✕ in
  the sidebar).
- Have `~/Downloads/meridian-lab` open in Finder so the drag is one motion.

## Checklist
- [ ] 3-min demo video (YouTube/Loom)
- [x] Public repo — https://github.com/zetsuchan/lab-memory
- [x] Deployed & working — https://lab-memory.vercel.app
- [x] Written summary (above)
- [ ] Rotate the Anthropic API key before/after submitting
