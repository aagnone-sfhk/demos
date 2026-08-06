import { SCENARIO_COPY, type NodeCopy } from "./copy";

/* =====================================================================
   NODE TYPES — the vocabulary of node roles.
   `type` drives the card's accent color (see .n-* CSS), the TYPE eyebrow
   text (TYPE_LABEL), and the fallback emoji (ICON) when no logo is set.
   Add/rename types by editing all three maps + a matching .n-<type> CSS rule.
   ===================================================================== */
export const ICON: Record<string, string> = { human: "🧑", agent: "🤖", broker: "🔀", mcp: "🔌", llm: "✨", gateway: "🛡️", system: "📦", resource: "📄" };
export const TYPE_LABEL: Record<string, string> = { human: "human", agent: "agent", broker: "broker", mcp: "service", llm: "reasoning", gateway: "gateway", system: "system", resource: "resource" };

/* =====================================================================
   EDGE LABELS — default text + optional glossary chip per edge `kind`.
   An edge shows EDGE_LABEL[kind] unless it sets its own `label`. A bare
   protocol label (no custom label) can double as a glossary chip via
   EDGE_LABEL_TERM. Set an edge's `label: ""` to show no label at all.
   ===================================================================== */
export const EDGE_LABEL: Record<string, string> = { query: "Query", a2a: "Call", mcp: "Tool", api: "API", event: "Event", sync: "", ret: "Response" };
export const EDGE_LABEL_TERM: Record<string, string> = { api: "api" }; // e.g. the "API" label becomes a "?" chip

export interface LayoutNode {
  id: string;
  type: string;
  logo?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  helpTerm?: string;
  ctxFill?: number;
  finalLogo?: string;
}

export interface LayoutEdge {
  from: string;
  to: string;
  kind: string;
  label?: string;
  skipHelp?: boolean;
  pokeballRide?: boolean;
  hideWhenInactive?: boolean;
  spotlight?: boolean;
}

export interface StepNodeOverride {
  ctxFill?: number;
  sub?: string;
  [key: string]: unknown;
}

export interface LayoutStep {
  activeNodes: string[];
  activeEdges: string[];
  nodeOverrides?: Record<string, StepNodeOverride>;
}

export interface Lane {
  y1: number;
  y2: number;
  fill: string;
  color: string;
  label: string;
}

export interface LayoutScenario {
  id: string;
  lanes?: Lane[];
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  steps: LayoutStep[];
  security?: string;
}

/* =====================================================================
   SCENARIO LAYOUT — the STRUCTURAL bits only.
   ---------------------------------------------------------------------
   All prose (title, eyebrow, headline, node labels/subtitles, step
   narration/hood, sub-overrides per step) lives in copy.ts.
   Merge happens at the bottom of this block.

   Coordinate system: an SVG viewBox of CW x CH. A node's (x, y) is its
   TOP-LEFT corner; every node card is NW x NH. Usable field for top-left
   corners is x ∈ [0, CW-NW], y ∈ [0, CH-NH]. Loose grid — columns by
   pipeline stage (left→right), rows to separate parallel branches.

   Each SCENARIO_LAYOUT entry:
     id       unique string (matches SCENARIO_COPY key)
     lanes    optional swim-lane backgrounds
     nodes[]  { id, type, logo?, x, y, w?, h?, helpTerm?, ctxFill?, finalLogo? }
     edges[]  { from, to, kind, label?, skipHelp?, pokeballRide? }
              kind "ret" = a return edge (dashed/green, baseline lane).
     steps[]  the walkthrough:
              { activeNodes:[ids], activeEdges:["from-to", ...],
                nodeOverrides?: { <id>: { ctxFill?, ... } } }
              An edge id is literally `${from}-${to}`.
     security optional callout string shown under every step (HTML ok).

   The rider (`pokeballRide: true`) puts a small logo that travels the
   path via SVG <animateMotion> when that edge is active. RIDER_LOGO is
   any LOGOS key. Omit if you don't want a rider.
   ===================================================================== */
export const NW = 164, NH = 64, CW = 1400, CH = 830, RET_Y = 815, NPAD = 24;
export const CORPUS_X = 992;   // x where the neutral corpus panel begins; lanes stop here
export const RIDER_LOGO = "sfcloud";

// ── Layout ─────────────────────────────────────────────────────────────────
// Classic path: agent → c-server → corpus (all) → c-ctx (floods)
// Headless path: agent → h-server → 4 tools → corpus (selective) → h-ctx (lean)

const SCENARIO_LAYOUT: LayoutScenario[] = [
  {
    id: "comparison",
    // Two swim-lane backgrounds + divider. y split: midpoint between corpus
    // bottom (374) and headless label top (490) = 432.
    lanes: [
      { y1: 0,   y2: 410, fill: "rgba(194,65,12,.055)",  color: "rgba(194,65,12,.55)",  label: "STANDARD MCP" },
      { y1: 410, y2: 830, fill: "rgba(10,138,111,.065)", color: "rgba(10,138,111,.55)", label: "HEADLESS 360 MCP" },
    ],
    nodes: [
      // ── Classic lane ──────────────────────────────────────────────────────
      { id: "c-agent",       type: "agent",    x: 106,  y: 155, w: 204, h: 104, ctxFill: 0 },
      // Service cards widened so bumped title + long subtitle ("Returns entire catalog") fit without ellipsis.
      { id: "c-server",      type: "mcp",      logo: "toolstack", x: 328,  y: 80, w: 224 },

      // ── Shared corpus (Salesforce Resources column) ───────────────────────
      // 9 cards × 72px step = 648; start y=(830-648)/2=91, step=72.
      // w:212 widens the cards so long action names show in full (no ellipsis).
      { id: "corp-1",        type: "resource",                                  x: 1088, y: 91,  w: 212 },
      { id: "corp-2",        type: "resource",                                  x: 1088, y: 163, w: 212 },
      { id: "corp-3",        type: "resource",                                  x: 1088, y: 235, w: 212 },
      { id: "corp-4",        type: "resource",                                  x: 1088, y: 307, w: 212 },
      { id: "corp-5",        type: "resource",                                  x: 1088, y: 379, w: 212 },
      { id: "corp-6",        type: "resource",                                  x: 1088, y: 451, w: 212 },
      { id: "corp-7",        type: "resource",                                  x: 1088, y: 523, w: 212 },
      { id: "corp-8",        type: "resource",                                  x: 1088, y: 595, w: 212 },
      { id: "corp-x",        type: "resource", logo: "database",                x: 1088, y: 667, w: 212 },

      // ── Headless lane ─────────────────────────────────────────────────────
      // Tool cards use w:224 so bumped label font keeps "Dispatch Read-Only" un-truncated.
      { id: "h-agent",       type: "agent",    x: 106,  y: 570, w: 204, h: 104, ctxFill: 0 },
      { id: "h-server",      type: "mcp",      logo: "sfcloud",                 x: 328,  y: 530, w: 224 },
      { id: "h-discover",    type: "resource", logo: "search",  helpTerm: "discover", x: 580, y: 460, w: 224 },
      { id: "h-describe",    type: "resource",                  helpTerm: "describe", x: 580, y: 544, w: 224 },
      { id: "h-dispatch",    type: "resource",                  helpTerm: "dispatch", x: 580, y: 628, w: 224 },
      { id: "h-dispatch-ro", type: "resource",                  helpTerm: "dispatch", x: 580, y: 712, w: 224 },
    ],
    edges: [
      // ── Classic ───────────────────────────────────────────────────────────
      { from: "c-agent",  to: "c-server", kind: "mcp",  label: "" },
      { from: "c-server", to: "corp-1",   kind: "sync", label: "" },
      { from: "c-server", to: "corp-2",   kind: "sync", label: "" },
      { from: "c-server", to: "corp-3",   kind: "sync", label: "" },
      { from: "c-server", to: "corp-4",   kind: "sync", label: "" },
      { from: "c-server", to: "corp-5",   kind: "sync", label: "" },
      { from: "c-server", to: "corp-6",   kind: "sync", label: "" },
      { from: "c-server", to: "corp-7",   kind: "sync", label: "" },
      { from: "c-server", to: "corp-8",   kind: "sync", label: "" },
      { from: "c-server", to: "corp-x",   kind: "sync", label: "" },

      // ── Headless 360 ──────────────────────────────────────────────────────
      { from: "h-agent",      to: "h-server",      kind: "mcp",   label: "" },
      { from: "h-server",     to: "h-discover",    kind: "sync",  label: "" },
      { from: "h-server",     to: "h-describe",    kind: "sync",  label: "" },
      { from: "h-server",     to: "h-dispatch",    kind: "sync",  label: "" },
      { from: "h-server",     to: "h-dispatch-ro", kind: "sync",  label: "" },
      // Tool → corpus edges. hideWhenInactive: only drawn on the step that
      // activates them, so the diagram stays clean until a call is happening.
      // spotlight: render a translucent searchlight cone across the corpus
      // instead of a line — signals "search purview" without implying that
      // every schema is being loaded into Discover.
      { from: "h-discover",   to: "corp-x",        kind: "query", label: "", hideWhenInactive: true, spotlight: true },
      { from: "h-describe",   to: "corp-4",        kind: "query", label: "", hideWhenInactive: true },
      { from: "h-dispatch",   to: "corp-4",        kind: "query", label: "", hideWhenInactive: true },
    ],
    steps: [
      // 1 — intro
      {
        activeNodes: ["c-agent","h-agent","corp-1","corp-2","corp-3","corp-4","corp-5","corp-6","corp-7","corp-8","corp-x"],
        activeEdges: [],
        nodeOverrides: { "c-agent": { ctxFill: 0 }, "h-agent": { ctxFill: 0 } },
      },
      // 2 — Standard MCP connects and floods context
      {
        activeNodes: ["c-agent","c-server","corp-1","corp-2","corp-3","corp-4","corp-5","corp-6","corp-7","corp-8","corp-x"],
        activeEdges: ["c-agent-c-server","c-server-corp-1","c-server-corp-2","c-server-corp-3","c-server-corp-4","c-server-corp-5","c-server-corp-6","c-server-corp-7","c-server-corp-8","c-server-corp-x"],
        nodeOverrides: { "c-agent": { ctxFill: 0.95 } },
      },
      // 3 — Headless 360 connects, gets 4 tools
      {
        activeNodes: ["h-agent","h-server","h-discover","h-describe","h-dispatch","h-dispatch-ro"],
        activeEdges: ["h-agent-h-server","h-server-h-discover","h-server-h-describe","h-server-h-dispatch","h-server-h-dispatch-ro"],
        nodeOverrides: { "h-agent": { ctxFill: 0 } },
      },
      // 4 — Discover queries selectively (corpus nodes lit to show scope;
      // the h-discover→corp-x edge is a spotlight cone, not a line)
      {
        activeNodes: ["h-agent","h-server","h-discover","corp-1","corp-2","corp-3","corp-4","corp-5","corp-6","corp-7","corp-8","corp-x"],
        activeEdges: ["h-agent-h-server","h-server-h-discover","h-discover-corp-x"],
        nodeOverrides: { "h-agent": { ctxFill: 0.05 } },
      },
      // 5 — Describe fetches the OAS spec for createCase
      {
        activeNodes: ["h-agent","h-server","h-describe","corp-4"],
        activeEdges: ["h-agent-h-server","h-server-h-describe","h-describe-corp-4"],
        nodeOverrides: { "h-agent": { ctxFill: 0.10 } },
      },
      // 6 — Dispatch invokes createCase
      {
        activeNodes: ["h-agent","h-server","h-dispatch","corp-4"],
        activeEdges: ["h-agent-h-server","h-server-h-dispatch","h-dispatch-corp-4"],
        nodeOverrides: { "h-agent": { ctxFill: 0.12 } },
      },
      // 7 — the verdict
      {
        activeNodes: ["c-agent","c-server","h-agent","h-server","h-discover","h-describe","h-dispatch","h-dispatch-ro","corp-1","corp-2","corp-3","corp-4","corp-5","corp-6","corp-7","corp-8","corp-x"],
        activeEdges: ["c-agent-c-server","c-server-corp-1","c-server-corp-2","c-server-corp-3","c-server-corp-4","c-server-corp-5","c-server-corp-6","c-server-corp-7","c-server-corp-8","c-server-corp-x","h-agent-h-server","h-server-h-discover","h-server-h-describe","h-server-h-dispatch","h-server-h-dispatch-ro","h-discover-corp-x"],
        nodeOverrides: { "c-agent": { ctxFill: 0.95 }, "h-agent": { ctxFill: 0.12 } },
      },
    ],
  },
];

export interface Scenario extends LayoutScenario {
  nav: string;
  eyebrow: string;
  title: string;
  headline: string;
  nodes: (LayoutNode & NodeCopy)[];
  steps: (LayoutStep & { narration: string; hood: string; analogy: string })[];
}

/* Merge editable copy (copy.ts → SCENARIO_COPY) into the structural layout
   above. This is what the app renders. If a copy key is missing, we fall
   back to the id so the diagram still renders (labels just look terse).
   Per-node copy: { label, sub }
   Per-step copy: { narration, hood, nodeOverrides: { <id>: { sub } } } */
const _COPY = SCENARIO_COPY;
function _mergeOverrides(
  base?: Record<string, StepNodeOverride>,
  extra?: Record<string, NodeCopy>,
): Record<string, StepNodeOverride> | undefined {
  if (!base && !extra) return undefined;
  const out: Record<string, StepNodeOverride> = { ...(base || {}) };
  for (const k of Object.keys(extra || {})) out[k] = { ...(out[k] || {}), ...extra![k] };
  return Object.keys(out).length ? out : undefined;
}

export const SCENARIOS: Scenario[] = SCENARIO_LAYOUT.map((s) => {
  const c = _COPY[s.id] || {};
  return {
    ...s,
    nav:      c.nav      ?? s.id,
    eyebrow:  c.eyebrow  ?? "",
    title:    c.title    ?? s.id,
    headline: c.headline ?? "",
    nodes: s.nodes.map((n) => ({ ...n, ...((c.nodes && c.nodes[n.id]) || {}) })),
    steps: s.steps.map((st, i) => {
      const sc = (c.steps && c.steps[i]) || {};
      return {
        ...st,
        narration: sc.narration ?? "",
        hood:      sc.hood      ?? "",
        analogy:   sc.analogy   ?? "",
        nodeOverrides: _mergeOverrides(st.nodeOverrides, sc.nodeOverrides),
      };
    }),
  };
});

/* =====================================================================
   GRAPH ENGINE — you rarely need to touch anything below this line.
   It computes edge geometry, lays out node cards, and renders the SVG.
   ===================================================================== */

/* ---- edge geometry (pure functions; also consumed by the geometry linter) ----
   Kept at module scope so the linter can recompute the exact same paths the
   renderer draws, without a browser layout pass. */
const ARROW_GAP = 10;  // px to pull the arrow endpoint back off the target card,
                       // so the arrowhead tip meets the border cleanly instead of
                       // biting into it (the marker tip extends past the endpoint).
export const nw = (n: LayoutNode) => n.w ?? NW;
export const nh = (n: LayoutNode) => n.h ?? NH;
const nodeCenter = (n: LayoutNode) => ({ x: n.x + nw(n) / 2, y: n.y + nh(n) / 2 });

interface Pt { x: number; y: number; }
interface Anchor extends Pt { h: boolean; }
export interface EdgeGeo { d: string; lx: number; ly: number; pts: Pt[]; tip: Pt; }

// Anchor on the box edge facing the connection's dominant axis: horizontal edges
// exit left/right at center height; vertical edges exit top/bottom at center
// width. The Bézier tangent then matches, so arrowheads meet the box edge cleanly
// instead of stabbing a corner.
function anchor(a: LayoutNode, b: LayoutNode): Anchor {
  const ac = nodeCenter(a), bc = nodeCenter(b);
  const dx = bc.x - ac.x, dy = bc.y - ac.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: ac.x + (dx >= 0 ? nw(a) / 2 : -nw(a) / 2), y: ac.y, h: true };
  }
  return { x: ac.x, y: ac.y + (dy >= 0 ? nh(a) / 2 : -nh(a) / 2), h: false };
}

// Sample a cubic Bézier into points so the linter can test box-crossing.
function sampleCubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt, n = 24): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u*u*u*p0.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*p3.y,
    });
  }
  return pts;
}

export function edgeGeo(byId: Record<string, LayoutNode>, e: LayoutEdge): EdgeGeo {
  const a = byId[e.from], b = byId[e.to];
  if (e.kind === "ret") {
    // Return edges drop to a flat baseline LANE and run along it: down the
    // source column, across the lane at RET_Y, up the target column, with
    // rounded corners. Because the whole span sits at RET_Y (below the field),
    // it clears any box above it — unlike a single sagging curve, whose
    // mid-span rides up and can cut straight through a node.
    const p1 = { x: a.x + nw(a) / 2, y: a.y + nh(a) };
    const p2 = { x: b.x + nw(b) / 2, y: b.y + nh(b) };
    const dir = p2.x >= p1.x ? 1 : -1;
    const CR = 16;   // corner radius where the verticals meet the lane
    const d = `M ${p1.x} ${p1.y} V ${RET_Y - CR} Q ${p1.x} ${RET_Y} ${p1.x + dir*CR} ${RET_Y} `
            + `H ${p2.x - dir*CR} Q ${p2.x} ${RET_Y} ${p2.x} ${RET_Y - CR} V ${p2.y}`;
    // Linter samples: the two verticals and the flat run (corners are negligible).
    const pts = [
      { x: p1.x, y: p1.y }, { x: p1.x, y: RET_Y },
      { x: p2.x, y: RET_Y }, { x: p2.x, y: p2.y },
    ];
    return { d, lx: (p1.x + p2.x) / 2, ly: RET_Y + 2, pts, tip: p2 };
  }
  const p1 = anchor(a, b);
  let p2: Anchor = anchor(b, a);
  // Inset the target endpoint off the card edge so the arrowhead clears it.
  const ac = nodeCenter(a), bc = nodeCenter(b);
  if (p2.h) p2 = { x: p2.x + Math.sign(ac.x - bc.x) * ARROW_GAP, y: p2.y, h: true };
  else      p2 = { x: p2.x, y: p2.y + Math.sign(ac.y - bc.y) * ARROW_GAP, h: false };
  let c1: Pt, c2: Pt;
  if (p1.h) {
    // Pull each control point 40% of the horizontal gap from its own endpoint.
    // This keeps the tangent horizontal at both ends and distributes the Y
    // transition across the middle of the curve — no S-kink at the midpoint.
    const pull = Math.abs(p2.x - p1.x) * 0.4;
    const dir  = Math.sign(p2.x - p1.x);
    c1 = { x: p1.x + dir * pull, y: p1.y };
    c2 = { x: p2.x - dir * pull, y: p2.y };
  } else {
    const pull = Math.abs(p2.y - p1.y) * 0.4;
    const dir  = Math.sign(p2.y - p1.y);
    c1 = { x: p1.x, y: p1.y + dir * pull };
    c2 = { x: p2.x, y: p2.y - dir * pull };
  }
  const d = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  return { d, lx: (p1.x + p2.x) / 2, ly: (p1.y + p2.y) / 2 - 7,
    pts: sampleCubic(p1, c1, c2, p2), tip: p2 };
}

/* ---- GEOMETRY LINTER ----------------------------------------------------
   A deterministic pass over every scenario's node/edge geometry that catches
   the visual defects a human spots instantly but data-reading can't: an edge
   that cuts through a box it doesn't connect to, an arrowhead landing inside a
   card, an edge label crowding a neighbor, or two node cards overlapping.
   It's math on the same coordinates the renderer uses (no browser layout), so
   it runs headlessly and reproducibly. review.sh dumps its output as text;
   review mode also paints it as a banner. This is the "table-stakes" gate:
   green here means the classes of overlap we know about are provably absent. */
const LABEL_CLEARANCE = 8;   // min px between a label's box and any non-endpoint card
interface Rect { x1: number; y1: number; x2: number; y2: number; }
const rectOf = (n: LayoutNode): Rect => ({ x1: n.x, y1: n.y, x2: n.x + nw(n), y2: n.y + nh(n) });
function segHitsRect(a: Pt, b: Pt, r: Rect, pad = 0): boolean {   // does segment a→b enter rect r (padded)?
  const R = { x1: r.x1 - pad, y1: r.y1 - pad, x2: r.x2 + pad, y2: r.y2 + pad };
  // Sample the segment; cheap and robust for our scale (paths are pre-sampled).
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    if (x >= R.x1 && x <= R.x2 && y >= R.y1 && y <= R.y2) return true;
  }
  return false;
}
function ptInRect(p: Pt, r: Rect, pad = 0): boolean {
  return p.x >= r.x1 - pad && p.x <= r.x2 + pad && p.y >= r.y1 - pad && p.y <= r.y2 + pad;
}
function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return a.x1 < b.x2 + pad && a.x2 + pad > b.x1 && a.y1 < b.y2 + pad && a.y2 + pad > b.y1;
}
/* True rendered half-width of an edge-label pill. The pill draws its text in the
   body font at 10px/700 with .3px letter-spacing, plus a 3px --canvas halo on
   each side (box-shadow spread). A per-character guess underestimates real font
   metrics — which once let an 8-char label read "clean" while visibly crowding
   the cards it sits between. So measure the actual text with a canvas 2d context
   (same font the pill uses) and add the halo, so the verdict matches the pixels.
   Falls back to a conservative estimate only if no DOM exists. */
let _measureCtx: CanvasRenderingContext2D | null = null;
function labelHalfWidth(lbl: string | number): number {
  const HALO = 3, PAD = 2;                 // box-shadow spread each side + AA slack
  if (typeof document !== "undefined") {
    if (!_measureCtx) {
      _measureCtx = document.createElement("canvas").getContext("2d");
      if (_measureCtx) {
        _measureCtx.font = '700 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        try { (_measureCtx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0.3px"; } catch { /* not supported */ }
      }
    }
    if (_measureCtx) return _measureCtx.measureText(String(lbl)).width / 2 + HALO + PAD;
  }
  return 3.6 * String(lbl).length + HALO + PAD;
}

export interface LintIssue { scenario: string; msg: string; }

export function lintScenario(scenario: Scenario): string[] {
  const byId = Object.fromEntries(scenario.nodes.map((n) => [n.id, n])) as Record<string, LayoutNode>;
  const issues: string[] = [];
  // 1. Node cards overlapping each other.
  for (let i = 0; i < scenario.nodes.length; i++)
    for (let j = i + 1; j < scenario.nodes.length; j++) {
      const a = scenario.nodes[i], b = scenario.nodes[j];
      if (rectsOverlap(rectOf(a), rectOf(b)))
        issues.push(`nodes "${a.id}" and "${b.id}" overlap — spread them apart`);
    }
  for (const e of scenario.edges) {
    // Spotlight edges aren't rendered as paths — they're a translucent wedge
    // over the corpus column. Overlap checks don't apply.
    if (e.spotlight) continue;
    const g = edgeGeo(byId, e);
    // 2. Edge path crossing a box that is neither endpoint.
    for (const n of scenario.nodes) {
      if (n.id === e.from || n.id === e.to) continue;
      const r = rectOf(n);
      let hit = false;
      for (let k = 0; k < g.pts.length - 1 && !hit; k++)
        if (segHitsRect(g.pts[k], g.pts[k + 1], r)) hit = true;
      if (hit) issues.push(`edge ${e.from}→${e.to} passes through node "${n.id}"`);
    }
    // 3. Arrowhead tip landing inside the target card (should sit on its edge).
    const tgt = byId[e.to];
    if (tgt && e.kind !== "ret" && ptInRect(g.tip, rectOf(tgt), -1))
      issues.push(`arrowhead of ${e.from}→${e.to} lands inside "${e.to}"`);
    // 4. Edge label crowding a card — INCLUDING its own endpoints. A label is
    //    centered in the gap between the two boxes it connects, so the most
    //    common real defect is a label too wide for that gap, overrunning the
    //    very cards it joins (an earlier version skipped endpoints and so went
    //    blind to exactly this). Measure the pill's true rendered width and
    //    require LABEL_CLEARANCE of daylight from every card, endpoints too.
    const lbl = e.label != null ? e.label : EDGE_LABEL[e.kind];
    if (lbl) {
      const halfW = labelHalfWidth(lbl), halfH = 9;
      const box = { x1: g.lx - halfW, y1: g.ly - halfH, x2: g.lx + halfW, y2: g.ly + halfH };
      for (const n of scenario.nodes) {
        if (!rectsOverlap(box, rectOf(n), LABEL_CLEARANCE)) continue;
        const endpoint = n.id === e.from || n.id === e.to;
        issues.push(endpoint
          ? `label "${lbl}" (${e.from}→${e.to}) doesn't fit the gap between its own cards — it's within ${LABEL_CLEARANCE}px of "${n.id}". Shorten the label or spread ${e.from} and ${e.to} apart.`
          : `label "${lbl}" (${e.from}→${e.to}) is within ${LABEL_CLEARANCE}px of card "${n.id}" — shorten it or spread the nodes`);
      }
    }
  }
  return issues;
}

export function lintAll(): LintIssue[] {
  const all: LintIssue[] = [];
  for (const s of SCENARIOS)
    for (const msg of lintScenario(s)) all.push({ scenario: s.id, msg });
  // Expose for the headless reviewer to read out of the DOM as plain text.
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.id = "geometry-lint";
    el.setAttribute("data-clean", all.length === 0 ? "1" : "0");
    el.style.display = "none";
    el.textContent = all.length
      ? all.map((x) => `[${x.scenario}] ${x.msg}`).join("\n")
      : "clean";
    document.body.appendChild(el);
  }
  return all;
}
