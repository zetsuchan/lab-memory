import type { Doc, Session } from "./types";

const MAX_CSV_ROWS = 200; // these corpora are small; include generously
const MAX_CHARS = 120_000; // safety bound on total context

/** Render one document into compact, model-friendly text. */
function renderDoc(doc: Doc): string {
  if (doc.kind === "csv" && doc.rows && doc.columns) {
    const head = `FILE: ${doc.name}  (CSV · ${doc.rows.length} rows · columns: ${doc.columns.join(", ")})`;
    const rows = doc.rows.slice(0, MAX_CSV_ROWS).map((r, i) =>
      `${i + 1}. ` + doc.columns!.map((c) => `${c}=${r[c]}`).join(" | ")
    );
    const more = doc.rows.length > MAX_CSV_ROWS ? `\n…(${doc.rows.length - MAX_CSV_ROWS} more rows omitted)` : "";
    return `${head}\n${rows.join("\n")}${more}`;
  }
  return `FILE: ${doc.name}  (${doc.kind})\n${doc.text}`;
}

export function buildContext(session: Session): string {
  let ctx = "";
  for (const doc of session.docs) {
    const block = renderDoc(doc) + "\n\n";
    if (ctx.length + block.length > MAX_CHARS) {
      ctx += `FILE: ${doc.name} — (truncated; corpus exceeds context budget)\n\n`;
      continue;
    }
    ctx += block;
  }
  return ctx.trim();
}

export const SYSTEM_PROMPT = `You are Lab Memory — an institutional-memory analyst for a research team.
You are given a CORPUS: the files this team has uploaded (papers, notebooks, data tables, notes).

Rules:
- Answer ONLY from the corpus. Never invent facts, numbers, names, or sources.
- If the corpus does not contain the answer, say so plainly in the summary and set steps/citations accordingly.
- Ground every claim in a specific source file. Put the exact file name in each citation.
- Prefer concrete figures and named entities from the data over vague generalities.
- "steps" is the evidence chain: each a full sentence a scientist could verify against the corpus.
- "followups" are sharp, specific questions THIS corpus can actually answer — the kind that reveal
  connections, contradictions, or gaps the team may have missed.
- Keep the summary tight and direct. Be precise, not verbose.`;

export function buildPrompt(session: Session, question: string): string {
  return `CORPUS (${session.fileNames.length} files: ${session.fileNames.join(", ")}):

${buildContext(session)}

---
QUESTION: ${question}

Answer strictly from the corpus above, citing the exact source files.`;
}
