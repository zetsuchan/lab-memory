"use client";

import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import type { GraphData, GraphNode } from "@/lib/types";

type Pos = GraphNode & { x: number; y: number; r: number; dist: number };

const RADIUS: Record<string, number> = { source: 9, gene: 9, record: 6, category: 7, concept: 7, experiment: 7 };
const kindColor = (k: string) => `var(--k-${k}, var(--park))`;

/** Pre-settle a simple force layout (deterministic, runs once per graph). */
function layout(graph: GraphData, W: number, H: number): { nodes: Pos[]; focalId: string } {
  const nodes: Pos[] = graph.nodes.map((n, i) => ({
    ...n,
    x: W / 2 + Math.cos(i * 2.4) * (60 + i * 6),
    y: H / 2 + Math.sin(i * 2.4) * (48 + i * 5),
    r: RADIUS[n.kind] ?? 6,
    dist: 0,
  }));
  const by = new Map(nodes.map((n) => [n.id, n]));
  const edges = graph.edges.map((e) => ({ s: by.get(e.src), t: by.get(e.dst) })).filter((e) => e.s && e.t) as { s: Pos; t: Pos }[];
  // degree → focal node (most-connected)
  const deg = new Map<string, number>();
  edges.forEach((e) => { deg.set(e.s.id, (deg.get(e.s.id) || 0) + 1); deg.set(e.t.id, (deg.get(e.t.id) || 0) + 1); });
  let focalId = nodes[0]?.id ?? "";
  let best = -1;
  for (const [id, d] of deg) if (d > best) { best = d; focalId = id; }

  for (let k = 0; k < 340; k++) {
    const a = Math.max(0.02, 1 - k / 340);
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const p = nodes[i], q = nodes[j];
        let dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2);
        const f = (2400 / d2) * a;
        p.x += (dx / d) * f; p.y += (dy / d) * f; q.x -= (dx / d) * f; q.y -= (dy / d) * f;
      }
    for (const e of edges) {
      let dx = e.t.x - e.s.x, dy = e.t.y - e.s.y, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const f = (d - 78) * 0.02 * a;
      e.s.x += (dx / d) * f; e.s.y += (dy / d) * f; e.t.x -= (dx / d) * f; e.t.y -= (dy / d) * f;
    }
    for (const n of nodes) { n.x += (W / 2 - n.x) * 0.004 * a; n.y += (H / 2 - n.y) * 0.004 * a; }
  }
  const focal = by.get(focalId)!;
  let maxD = 1;
  for (const n of nodes) { n.dist = Math.hypot(n.x - focal.x, n.y - focal.y); maxD = Math.max(maxD, n.dist); }
  for (const n of nodes) n.dist /= maxD; // 0..1
  return { nodes, focalId };
}

export default function GraphView({ graph, onPick }: { graph: GraphData; onPick: (n: GraphNode) => void }) {
  const W = 780, H = 420;
  const { nodes } = useMemo(() => layout(graph, W, H), [graph]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ id?: string; panning?: boolean; last?: { x: number; y: number }; moved?: boolean }>({});
  const svgRef = useRef<SVGSVGElement>(null);

  const neighbors = useMemo(() => {
    if (!hover) return null;
    const s = new Set<string>([hover]);
    graph.edges.forEach((e) => { if (e.src === hover) s.add(e.dst); if (e.dst === hover) s.add(e.src); });
    return s;
  }, [hover, graph.edges]);

  const kinds = useMemo(() => [...new Set(graph.nodes.map((n) => n.kind))], [graph.nodes]);

  function onDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const id = (e.target as SVGElement).dataset?.id;
    drag.current = { id, panning: !id, last: { x: e.clientX, y: e.clientY }, moved: false };
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.last) return;
    const dx = e.clientX - d.last.x, dy = e.clientY - d.last.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.id) {
      const n = byId.get(d.id);
      if (n) { n.x += dx / view.k; n.y += dy / view.k; setView((v) => ({ ...v })); }
    } else if (d.panning) setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    d.last = { x: e.clientX, y: e.clientY };
  }
  function onUp(e: React.PointerEvent) {
    const d = drag.current;
    if (d.id && !d.moved) { const n = byId.get(d.id); if (n) onPick(n); }
    drag.current = {};
  }
  function onWheel(e: React.WheelEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    setView((v) => {
      const k2 = Math.min(3, Math.max(0.4, v.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      return { x: mx - (mx - v.x) * (k2 / v.k), y: my - (my - v.y) * (k2 / v.k), k: k2 };
    });
  }

  return (
    <div className="graphwrap">
      <div className="graph-bar">
        <span className="title">Knowledge graph</span>
        <div className="legend">
          {kinds.map((k) => (<span key={k}><i style={{ background: kindColor(k) }} />{k}</span>))}
        </div>
      </div>
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="gsvg"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {graph.edges.map((e, i) => {
            const s = byId.get(e.src), t = byId.get(e.dst);
            if (!s || !t) return null;
            const hot = hover && (e.src === hover || e.dst === hover);
            return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} className={"edge" + (hot ? " hl" : "")} />;
          })}
          {nodes.map((n) => {
            const dim = neighbors ? !neighbors.has(n.id) : false;
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: dim ? 0.18 : 1, scale: 1 }}
                transition={{ opacity: { duration: 0.15 }, scale: { type: "spring", stiffness: 220, damping: 18, delay: 0.12 + n.dist * 0.6 } }}
                style={{ originX: "0px", originY: "0px" }}
              >
                <circle
                  data-id={n.id} cx={n.x} cy={n.y} r={n.r} fill={kindColor(n.kind)}
                  className="node"
                  onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)}
                />
                <text x={n.x} y={n.y - n.r - 4} textAnchor="middle" className={"nlabel" + (dim ? " dim" : "")}>
                  {n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}
                </text>
              </motion.g>
            );
          })}
        </g>
      </svg>
      <div className="graph-hint">drag to pan · scroll to zoom · drag a node to move it · click a node to ask about it</div>
    </div>
  );
}
