"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { AnimatePresence, motion } from "motion/react";
import { animate } from "motion";
import { useCallback, useEffect, useRef, useState } from "react";
import GraphView from "@/components/GraphView";
import { answerSchema, type Answer, type GraphNode, type Session, type SessionMeta } from "@/lib/types";

/** Animated count-up using open-source core motion (replaces Motion+ AnimateNumber). */
function Num({ value }: { value: number }) {
  const [d, setD] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.6, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setD(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <>{d}</>;
}

const CITE_ICON: Record<string, string> = { md: "📓", markdown: "📓", csv: "📊", txt: "🗒️", json: "🧾" };
const iconFor = (name: string) => CITE_ICON[(name.split(".").pop() || "").toLowerCase()] || "📄";

export default function Page() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [storage, setStorage] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Session | null>(null);
  const [staged, setStaged] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { submit, isLoading, error } = useObject({ api: "/api/ask", schema: answerSchema });

  const loadSessions = useCallback(async () => {
    const r = await fetch("/api/sessions").then((x) => x.json());
    setSessions(r.sessions || []);
    setStorage(r.storage || "");
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (!activeId) { setActive(null); return; }
    fetch(`/api/sessions/${activeId}`).then((x) => x.json()).then((s) => { if (!s.error) setActive(s); });
  }, [activeId]);

  // finalize a streamed answer: refetch the (now-persisted) session
  const wasLoading = useRef(false);
  useEffect(() => {
    if (wasLoading.current && !isLoading && pendingQ && activeId) {
      fetch(`/api/sessions/${activeId}`).then((x) => x.json()).then((s) => {
        if (!s.error) setActive(s);
        setPendingQ(null);
        loadSessions();
      });
    }
    wasLoading.current = isLoading;
  }, [isLoading, pendingQ, activeId, loadSessions]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [pendingQ, isLoading, active?.messages.length]);

  useEffect(() => { if (error) { setErr(error.message || "Reasoning failed"); setPendingQ(null); } }, [error]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setStaged((prev) => [...prev, ...Array.from(list)]);
  }

  async function doUpload() {
    if (!staged.length) return;
    setUploading(true); setErr(null);
    try {
      const fd = new FormData();
      staged.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const raw = await res.text();
      let data: { id?: string; error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON error page */ }
      if (!res.ok || !data.id) throw new Error(data.error || `Upload failed (HTTP ${res.status})`);
      setStaged([]);
      await loadSessions();
      setActiveId(data.id);
    } catch (e) { setErr((e as Error).message); }
    finally { setUploading(false); }
  }

  function ask(question: string) {
    const text = question.trim();
    if (!text || !activeId || isLoading) return;
    setErr(null); setQ(""); setPendingQ(text);
    submit({ sessionId: activeId, question: text });
  }

  function askNode(n: GraphNode) {
    const label = n.label.replace(/…$/, "");
    ask(n.kind === "source" ? `What does ${label} contain, and what are its key findings?` : `Tell me about ${label}.`);
  }

  function newSession() { setActiveId(null); setStaged([]); setErr(null); setShowGraph(false); }

  async function removeSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (activeId === id) setActiveId(null);
    loadSessions();
  }

  function toggleTheme() {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("lm_theme", next); } catch {}
  }

  const streaming = pendingQ !== null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="side-head">
          <div className="brand"><b>🧠 Lab Memory</b></div>
          <button className="new-btn" onClick={newSession}>＋ New session</button>
        </div>
        <div className="side-label">Sessions</div>
        <div className="sessions">
          {sessions.length === 0 && <div style={{ padding: "8px 12px", color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>No sessions yet — upload files to start.</div>}
          {sessions.map((s) => (
            <button key={s.id} className={"session" + (s.id === activeId ? " active" : "")} onClick={() => setActiveId(s.id)}>
              <div className="s-title">{s.title}</div>
              <div className="s-meta">
                {s.fileNames.length} file{s.fileNames.length === 1 ? "" : "s"} · {s.messageCount} msg
                <span onClick={(e) => removeSession(s.id, e)} style={{ float: "right", cursor: "pointer" }} title="Delete">✕</span>
              </div>
            </button>
          ))}
        </div>
        <div className="side-foot">
          <span>{storage ? `store: ${storage}` : ""}</span>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle light / dark" aria-label="Toggle theme">☾</button>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">
          {!activeId ? (
            <UploadView
              staged={staged} over={over} uploading={uploading} err={err}
              onOver={setOver} onFiles={addFiles} onUpload={doUpload}
              onClear={() => setStaged([])} pick={() => fileInput.current?.click()}
            />
          ) : (
            <>
              <h1 className="headline">{active?.title || "…"}</h1>
              <p className="sub">
                {active ? active.fileNames.join(" · ") : "Loading…"}
              </p>

              {active && (
                <div className="metrics">
                  <div className="metric"><span className="n"><Num value={active.fileNames.length} /></span><span className="l">files</span></div>
                  <div className="metric"><span className="n"><Num value={active.graph.nodes.length} /></span><span className="l">entities</span></div>
                  <div className="metric"><span className="n"><Num value={active.messages.filter((m) => m.role === "assistant").length} /></span><span className="l">answers</span></div>
                  <button className="icon-btn" style={{ marginLeft: "auto", width: "auto", padding: "0 14px", gap: 6 }} onClick={() => setShowGraph((g) => !g)}>
                    ⊙ {showGraph ? "Hide graph" : "Graph"}
                  </button>
                </div>
              )}

              <AnimatePresence initial={false}>
                {showGraph && active && (
                  <motion.div key="graph" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                    <GraphView graph={active.graph} onPick={askNode} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="ask-row">
                <div className="field">
                  <span className="glyph">⌕</span>
                  <input
                    value={q} disabled={isLoading}
                    placeholder="Ask what this data knows…"
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") ask(q); }}
                  />
                </div>
                <button className="go" disabled={isLoading || !q.trim()} onClick={() => ask(q)}>Ask</button>
              </div>

              <div className={"badge " + (streaming ? "working" : active?.messages.length ? "done" : "")}>
                <span className="dot" />
                {streaming ? "Reasoning over the corpus…"
                  : active?.messages.length ? `${active.messages.filter(m => m.role === "assistant").length} answered`
                  : "Ready · ask a question or tap a suggestion"}
              </div>

              {err && <div className="err">{err}</div>}

              <div className="msgs">
                {active?.messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="you"><span className="lbl">Asked</span>{m.question}</div>
                  ) : m.answer ? (
                    <AnswerCard key={m.id} answer={m.answer} onFollow={ask} />
                  ) : null
                )}

                {streaming && (
                  <>
                    <div className="you"><span className="lbl">Asked</span>{pendingQ}</div>
                    <SkeletonCard />
                  </>
                )}

                {!active?.messages.length && !streaming && active && (
                  <StarterQuestions onPick={ask} />
                )}
              </div>
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </main>

      <input ref={fileInput} type="file" multiple accept=".csv,.md,.markdown,.txt,.json,.tsv" hidden
        onChange={(e) => addFiles(e.target.files)} />
    </div>
  );
}

function UploadView(props: {
  staged: File[]; over: boolean; uploading: boolean; err: string | null;
  onOver: (v: boolean) => void; onFiles: (l: FileList | null) => void;
  onUpload: () => void; onClear: () => void; pick: () => void;
}) {
  const { staged, over, uploading, err } = props;
  return (
    <>
      <h1 className="headline">Upload your data. Ask what it knows.</h1>
      <p className="sub">Drop in papers, notebooks, CSVs, or notes. Lab Memory reads them, builds a
        session, and answers questions with citations back to your files — powered by Claude.</p>

      <div
        className={"drop" + (over ? " over" : "")}
        onDragOver={(e) => { e.preventDefault(); props.onOver(true); }}
        onDragLeave={() => props.onOver(false)}
        onDrop={(e) => { e.preventDefault(); props.onOver(false); props.onFiles(e.dataTransfer.files); }}
      >
        <div className="big">📥</div>
        <h3>Drop files here</h3>
        <p>or</p>
        <button className="pick" onClick={props.pick}>Choose files</button>
        <div className="accepted">accepts .csv · .md · .txt · .json · .tsv</div>
        {staged.length > 0 && (
          <div className="filelist">
            {staged.map((f, i) => (
              <span className="filepill" key={i}>{iconFor(f.name)} {f.name} <b>{(f.size / 1024).toFixed(0)}kb</b></span>
            ))}
          </div>
        )}
      </div>

      {staged.length > 0 && (
        <div className="ask-row" style={{ marginTop: 16 }}>
          <button className="go" style={{ flex: 1 }} disabled={uploading} onClick={props.onUpload}>
            {uploading ? <><span className="spin" /> Ingesting…</> : `Create session from ${staged.length} file${staged.length === 1 ? "" : "s"}`}
          </button>
          <button className="icon-btn" style={{ width: "auto", padding: "0 14px" }} onClick={props.onClear}>Clear</button>
        </div>
      )}
      {err && <div className="err">{err}</div>}
    </>
  );
}

function AnswerCard({ answer, onFollow }: { answer: Answer; onFollow: (q: string) => void }) {
  return (
    <div className="card">
      {answer.intent && <span className="intent">{answer.intent}</span>}
      <p className="summary">{answer.summary}</p>
      {answer.steps?.length > 0 && (
        <ol className="chain">
          {answer.steps.map((s, i) => (
            <li key={i}><span className="step">{String(i + 1).padStart(2, "0")}</span>{s}</li>
          ))}
        </ol>
      )}
      {answer.recommendation && (
        <div className="rec"><span className="k">Recommended next step</span>{answer.recommendation}</div>
      )}
      {answer.citations?.length > 0 && (
        <div className="cites">
          <h4>Evidence · {answer.citations.length} source{answer.citations.length === 1 ? "" : "s"}</h4>
          {answer.citations.map((c, i) => (
            <div className="cite" key={i}>
              <span className="tag">{iconFor(c.source)}</span>
              <span><span className="src">{c.source}</span> — <span className="det">{c.detail}</span></span>
            </div>
          ))}
        </div>
      )}
      {answer.followups?.length > 0 && (
        <div className="followups">
          <div className="rail-label">Follow up</div>
          <div className="chips">
            {answer.followups.map((f, i) => <button className="chip" key={i} onClick={() => onFollow(f)}>{f}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

// Skeleton shown while Claude reasons; it swaps to the real answer when done
// (spatial continuity via a shared background/shape rather than a typewriter).
function SkeletonCard() {
  const widths = ["92%", "78%"];
  return (
    <div className="card" aria-label="Reasoning">
      <div className="skel skel-pill" style={{ marginBottom: 16 }} />
      {widths.map((w, i) => <div key={i} className="skel skel-line" style={{ width: w, height: 18 }} />)}
      <div style={{ height: 8 }} />
      {["70%", "88%", "64%"].map((w, i) => <div key={i} className="skel skel-line" style={{ width: w, marginLeft: 30 }} />)}
      <div className="skel" style={{ height: 54, borderRadius: 11, marginTop: 18 }} />
    </div>
  );
}

function StarterQuestions({ onPick }: { onPick: (q: string) => void }) {
  const qs = [
    "What is this data about? Give me the big picture.",
    "What are the most important findings or entities here?",
    "What contradictions, gaps, or surprises are in this data?",
    "What should we look into next?",
  ];
  return (
    <div className="followups">
      <div className="rail-label">Try asking</div>
      <div className="chips">{qs.map((q, i) => <button className="chip" key={i} onClick={() => onPick(q)}>{q}</button>)}</div>
    </div>
  );
}
