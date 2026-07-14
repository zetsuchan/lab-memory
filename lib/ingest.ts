import type { Doc, DocKind, GraphData, GraphEdge, GraphNode } from "./types";

/** Minimal, dependency-free CSV parser (handles quoted fields + commas). */
export function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = splitRecords(text);
  if (lines.length === 0) return { columns: [], rows: [] };
  const columns = splitRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitRow(lines[i]);
    const row: Record<string, string> = {};
    columns.forEach((c, j) => (row[c] = (cells[j] ?? "").trim()));
    rows.push(row);
  }
  return { columns, rows };
}

// Split into records, respecting quotes that may contain newlines.
function splitRecords(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  let q = false;
  for (const ch of text.replace(/\r\n/g, "\n")) {
    if (ch === '"') q = !q;
    if (ch === "\n" && !q) {
      out.push(buf);
      buf = "";
    } else buf += ch;
  }
  if (buf.length) out.push(buf);
  return out;
}
function splitRow(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        buf += '"';
        i++;
      } else q = !q;
    } else if (ch === "," && !q) {
      out.push(buf);
      buf = "";
    } else buf += ch;
  }
  out.push(buf);
  return out;
}

function kindFor(name: string): DocKind {
  const n = name.toLowerCase();
  if (n.endsWith(".csv")) return "csv";
  if (n.endsWith(".md") || n.endsWith(".markdown")) return "markdown";
  return "text";
}

export function makeDoc(name: string, text: string): Doc {
  const kind = kindFor(name);
  if (kind === "csv") {
    const { columns, rows } = parseCsv(text);
    return { name, kind, text, columns, rows };
  }
  return { name, kind, text };
}

/** Pick the most "label-like" column for a CSV (name/title/id-ish). */
function labelColumn(columns: string[]): string | null {
  const pref = ["name", "title", "brand", "generic", "label", "nct_id", "id", "gene"];
  for (const p of pref) {
    const hit = columns.find((c) => c.toLowerCase().includes(p));
    if (hit) return hit;
  }
  return columns[0] ?? null;
}

/** Categorical columns worth turning into shared hub nodes. */
function categoryColumns(columns: string[], rows: Record<string, string>[]): string[] {
  const cats: string[] = [];
  for (const c of columns) {
    const lc = c.toLowerCase();
    if (["status", "phase", "sponsor", "type", "study_type", "mechanism", "kind"].some((k) => lc.includes(k))) {
      const distinct = new Set(rows.map((r) => r[c]).filter(Boolean));
      if (distinct.size > 1 && distinct.size <= 18) cats.push(c);
    }
  }
  return cats.slice(0, 2);
}

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40).toLowerCase();

/** Build a compact, generic knowledge graph from arbitrary uploaded docs. */
export function buildGraph(docs: Doc[]): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const add = (n: GraphNode) => {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      nodes.push(n);
    }
  };
  const perFileRecordCap = Math.max(4, Math.floor(28 / Math.max(1, docs.length)));

  for (const doc of docs) {
    const fileId = `file:${slug(doc.name)}`;
    add({ id: fileId, label: doc.name, kind: "source" });

    if (doc.kind === "csv" && doc.rows && doc.columns) {
      const labelCol = labelColumn(doc.columns);
      const cats = categoryColumns(doc.columns, doc.rows);
      const rows = doc.rows.slice(0, perFileRecordCap);
      rows.forEach((r, i) => {
        const raw = (labelCol && r[labelCol]) || `row ${i + 1}`;
        const label = raw.length > 42 ? raw.slice(0, 41) + "…" : raw;
        const rid = `rec:${slug(doc.name)}:${i}`;
        add({ id: rid, label, kind: "record" });
        edges.push({ src: rid, dst: fileId, rel: "in" });
        for (const cat of cats) {
          const val = r[cat];
          if (!val) continue;
          const cid = `cat:${slug(cat)}:${slug(val)}`;
          add({ id: cid, label: val, kind: "category" });
          edges.push({ src: rid, dst: cid, rel: cat });
        }
      });
    } else {
      // markdown/text: pull section headings as concept nodes
      const heads = (doc.text.match(/^#{1,3}\s+(.+)$/gm) || [])
        .map((h) => h.replace(/^#{1,3}\s+/, "").trim())
        .slice(0, perFileRecordCap);
      heads.forEach((h, i) => {
        const hid = `sec:${slug(doc.name)}:${i}`;
        add({ id: hid, label: h.length > 42 ? h.slice(0, 41) + "…" : h, kind: "concept" });
        edges.push({ src: hid, dst: fileId, rel: "section" });
      });
    }
  }
  return { nodes, edges };
}

/** Suggest a session title from the uploaded file names. */
export function titleFromFiles(names: string[]): string {
  if (names.length === 0) return "Untitled session";
  const stem = names[0].replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  const common = stem.split(" ").slice(0, 3).join(" ");
  return names.length === 1
    ? capitalize(stem)
    : `${capitalize(common)} (${names.length} files)`;
}
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
