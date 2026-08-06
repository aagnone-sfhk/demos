import { useState, useEffect, useMemo } from "react";
import { GLOSSARY } from "./copy";
import { Logo } from "./logos";
import {
  SCENARIOS,
  ICON,
  TYPE_LABEL,
  EDGE_LABEL,
  EDGE_LABEL_TERM,
  edgeGeo,
  lintAll,
  nw,
  nh,
  CW,
  CH,
  CORPUS_X,
  NPAD,
  RIDER_LOGO,
  type Scenario,
  type LayoutNode,
  type LayoutEdge,
  type EdgeGeo,
} from "./layout";

/* GLOSSARY lives in copy.ts. Chips are inert triggers only; the shared
   <HelpOverlay/> below owns the popup so it can't get trapped inside an SVG
   foreignObject. */
function Help({ id, compact }: { id: string; compact?: boolean }) {
  const g = GLOSSARY[id];
  if (!g) return null;
  // compact: just the "?" bubble (no term word). Used inline next to a node
  // label that already names the term, so the card doesn't read "Discover
  // Discover?". The full term still appears in the hover popup.
  return (
    <span className="help-chip" tabIndex={0} data-help-term={id}>
      {compact ? null : g.term}<span className="qm">?</span>
    </span>
  );
}

// Single popup for the whole app — a sibling of every diagram, never inside a
// foreignObject — so it always escapes to real screen space.
function HelpOverlay() {
  const [termId, setTermId] = useState<string | null>(null);
  useEffect(() => {
    const onOver = (ev: Event) => {
      const target = ev.target as Element | null;
      const chip = target && target.closest && target.closest<HTMLElement>(".help-chip");
      if (chip) setTermId(chip.dataset.helpTerm ?? null);
    };
    // Only clear when the pointer/focus leaves the chip entirely — moving
    // between a chip's own children must not flicker the popup shut.
    const onOut = (ev: Event) => {
      const target = ev.target as Element | null;
      const leavingChip = target && target.closest && target.closest<HTMLElement>(".help-chip");
      if (!leavingChip) return;
      const related = (ev as MouseEvent | FocusEvent).relatedTarget as Element | null;
      const stillInside = related && related.closest && related.closest(".help-chip") === leavingChip;
      if (!stillInside) setTermId(null);
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("focusin", onOver);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("focusin", onOver);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  const g = termId ? GLOSSARY[termId] : null;
  return (
    <div className={"help-overlay" + (g ? " show" : "")}>
      {g ? <span className="ho-term">{g.term}</span> : null}
      {g ? <span className="ho-body">{g.short}</span> : null}
    </div>
  );
}

interface EdgeInfo {
  e: LayoutEdge;
  i: number;
  on: boolean;
  ret: boolean;
  g: EdgeGeo;
  lbl: string;
  helpTerm: string | null;
  mk: string;
}

function GraphCanvas({ scenario, step }: { scenario: Scenario; step: number }) {
  const active = scenario.steps[step];
  const byId = useMemo(
    () => Object.fromEntries(scenario.nodes.map((n) => [n.id, n])) as Record<string, LayoutNode>,
    [scenario],
  );

  const edgeInfo: EdgeInfo[] = scenario.edges.map((e, i) => {
    const eid = e.from + "-" + e.to;
    const on = active.activeEdges.includes(eid);
    const ret = e.kind === "ret";
    const g = edgeGeo(byId, e);
    const lbl = e.label != null ? e.label : EDGE_LABEL[e.kind];
    // A custom label (a specific action) stays plain text; only a bare
    // protocol label doubles as a glossary chip.
    const helpTerm = (e.label == null && !e.skipHelp) ? EDGE_LABEL_TERM[e.kind] : null;
    const mk = on ? (ret ? "url(#arrow-r)" : "url(#arrow-a)") : "url(#arrow)";
    return { e, i, on, ret, g, lbl, helpTerm, mk };
  });

  return (
    <div className="canvas-wrap">
      {/* aspectRatio matches the viewBox so the SVG element sizes to its own
          content — no letterboxing possible. The wrap is a bare flex-centering
          container. See styles.css `.canvas-wrap`/`.canvas-svg` comments. */}
      <svg className="canvas-svg" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="xMidYMid meet"
           style={{ aspectRatio: `${CW} / ${CH}` }}
           role="img" aria-label={scenario.title + " diagram"}>
        {/* Swim-lane + corpus backgrounds. The SVG keeps its native aspect ratio
            (the .canvas-wrap is locked to CW/CH in CSS), so uniform scaling never
            letterboxes: every rect below spans its exact viewBox bounds and each
            label centres in its own true rect via flexbox — no overscan, no
            measured re-centering. */}
        {(scenario.lanes || []).map((ln, i) => {
          const LABEL_W = 82;
          const laneH = ln.y2 - ln.y1;
          return (
            <g key={"ln" + i}>
              {/* tinted field (only up to corpus column) */}
              <rect x={LABEL_W} y={ln.y1} width={CORPUS_X - LABEL_W} height={laneH} fill={ln.fill} />
              {/* label strip */}
              <rect x={0} y={ln.y1} width={LABEL_W} height={laneH} fill={ln.color ? ln.color.replace(/[\d.]+\)$/, "0.15)") : "rgba(0,0,0,.08)"} />
              <foreignObject x={0} y={ln.y1} width={LABEL_W} height={laneH}>
                <div style={{
                  width: LABEL_W + "px", height: laneH + "px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 10px", boxSizing: "border-box",
                }}>
                  <span style={{
                    fontSize: "13.5px", fontWeight: 800, letterSpacing: "0.8px",
                    color: ln.color || "rgba(0,0,0,.5)", fontFamily: "var(--font)",
                    textTransform: "uppercase", textAlign: "center", lineHeight: 1.4,
                    overflowWrap: "break-word", wordBreak: "normal",
                  }}>{ln.label}</span>
                </div>
              </foreignObject>
              {/* divider (only in the lane zone, not the corpus) */}
              {i > 0 && <line x1={LABEL_W} y1={ln.y1} x2={CORPUS_X} y2={ln.y1} stroke="rgba(0,0,0,.12)" strokeWidth="1" strokeDasharray="6 4" />}
            </g>
          );
        })}
        {/* Salesforce Resources corpus panel — full height, shared by both lanes */}
        {(() => {
          const CORP_W = CW - CORPUS_X;
          const HDR_H = 32;
          return (<g>
            {/* Body fill below header */}
            <rect x={CORPUS_X} y={HDR_H} width={CORP_W} height={CH - HDR_H} fill="rgba(1,118,211,.05)" />
            {/* Header strip across the top */}
            <rect x={CORPUS_X} y={0} width={CORP_W} height={HDR_H} fill="rgba(1,118,211,.15)" />
            {/* Bottom edge of header strip */}
            <line x1={CORPUS_X} y1={HDR_H} x2={CW} y2={HDR_H} stroke="rgba(1,118,211,.20)" strokeWidth="1" />
            {/* Left separator */}
            <line x1={CORPUS_X} y1={0} x2={CORPUS_X} y2={CH} stroke="rgba(1,118,211,.25)" strokeWidth="1" />
            <foreignObject x={CORPUS_X} y={0} width={CORP_W} height={HDR_H}>
              <div style={{ width: CORP_W+"px", height: HDR_H+"px", display:"flex", alignItems:"center", justifyContent:"center", boxSizing:"border-box" }}>
                <span style={{ fontSize:"13.5px", fontWeight:800, letterSpacing:"0.8px", color:"rgba(1,118,211,.80)", fontFamily:"var(--font)", textTransform:"uppercase" }}>Salesforce Resources</span>
              </div>
            </foreignObject>
          </g>);
        })()}
        <defs>
          {/* Spotlight cone gradient — brightest near the source, dissipating
              as it reaches the far edge of the corpus column. Reads as a
              searchlight/flashlight beam: "these resources are in scope for
              semantic search", NOT "all this data flows into the tool". */}
          <linearGradient id="spotlight-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0"   stopColor="#0a8a6f" stopOpacity="0.06" />
            <stop offset="0.6" stopColor="#0a8a6f" stopOpacity="0.20" />
            <stop offset="1"   stopColor="#0a8a6f" stopOpacity="0.34" />
          </linearGradient>
        </defs>
        {/* SPOTLIGHTS — draw before edges/nodes so they sit under everything.
            A spotlight edge doesn't render as a line; instead a NARROW beam
            fans from the source and SWEEPS through the corpus one card at a
            time (SMIL animate on the polygon's points). This reads as
            "scanning / reading each item" rather than "ingesting them all",
            which is the whole point of Discover vs. tools/list. */}
        {edgeInfo.filter(({ e, on }) => e.spotlight && on).map(({ e, i }) => {
          const src = byId[e.from];
          const sx = src.x + nw(src);            // right edge of source card
          const sy = src.y + nh(src) / 2;        // vertical middle of card
          // Every card in the corpus column is a scan target. Ping-pong the
          // beam through them (0→N-1→0) so the sweep reverses at each end
          // and feels like an active back-and-forth scan rather than a
          // conveyor belt.
          const targets = scenario.nodes.filter((n) => n.x >= CORPUS_X - 10);
          const pad = 6;
          const frameFor = (t: LayoutNode) => {
            const tx = t.x - pad;
            const t1 = t.y - pad, t2 = t.y + nh(t) + pad;
            // 4-point wedge: narrow at Discover → card-height at the target
            return `${sx},${sy - 5} ${sx},${sy + 5} ${tx},${t2} ${tx},${t1}`;
          };
          // Final (summary) step: the sweep is distracting once the walkthrough
          // is just recapping, so freeze the beam static and pointed at
          // createCase — the one resource the example actually invoked. Every
          // other step keeps the animated back-and-forth scan.
          const isFinalStep = step === scenario.steps.length - 1;
          if (isFinalStep) {
            const frozen = byId["corp-4"] ?? targets[0];
            return (
              <g key={"sp" + i} className="spotlight" style={{ pointerEvents: "none" }}>
                <polygon points={frameFor(frozen)} fill="url(#spotlight-grad)" />
              </g>
            );
          }
          const sweep = [...targets, ...[...targets].reverse().slice(1, -1)];
          const values = sweep.map(frameFor).join(";") + ";" + frameFor(sweep[0]);
          const dur = (targets.length * 0.6) + "s";
          return (
            <g key={"sp" + i} className="spotlight" style={{ pointerEvents: "none" }}>
              <polygon points={frameFor(targets[0])} fill="url(#spotlight-grad)">
                <animate attributeName="points" values={values} dur={dur} repeatCount="indefinite" calcMode="linear" />
              </polygon>
            </g>
          );
        })}
        {/* edge paths (under nodes) */}
        {edgeInfo.map(({ e, i, ret, g, on }) => {
          // An edge tagged hideWhenInactive is only drawn on the step that
          // activates it — keeps the diagram uncluttered until it's relevant.
          if (e.hideWhenInactive && !on) return null;
          // A spotlight edge is drawn as a wedge above, not a line.
          if (e.spotlight) return null;
          return <path key={i} className={"edge" + (ret ? " ret" : "") + (on ? " active flow" : "")} d={g.d} />;
        })}
        {/* rider — a small logo that travels the path while its edge is active */}
        {edgeInfo.filter(({ e, on }) => e.pokeballRide && on).map(({ i, g }) => (
          <g key={"pb" + i} className="rider" transform="translate(-9,-9)">
            <Logo name={RIDER_LOGO} size={18} />
            <animateMotion dur="1.1s" repeatCount="indefinite" path={g.d} rotate="auto" />
          </g>
        ))}
        {/* nodes (over edges) via foreignObject for real text wrapping */}
        {scenario.nodes.map((n) => {
          const overrides = (active.nodeOverrides && active.nodeOverrides[n.id]) || {};
          const nn = { ...n, ...overrides } as LayoutNode & { label?: string; sub?: string };
          const on = active.activeNodes.includes(n.id);
          const anyOn = active.activeNodes.length > 0;
          const dim = anyOn && !on;
          const isSec = scenario.security && (n.type === "gateway" || n.type === "broker");
          const isFinalStep = step === scenario.steps.length - 1;
          const logo = (nn.finalLogo && isFinalStep && on) ? nn.finalLogo : nn.logo;
          return (
            <foreignObject key={n.id} x={n.x} y={n.y - NPAD / 2} width={nw(n)} height={nh(n) + NPAD} style={{ overflow: "visible" }}>
              <div className="node-slot">
                <div className={"node" + (on ? " active" : "") + (dim ? " dim" : "") + (isSec ? " sec" : "")} style={{ position: "relative", height: nn.h ? (nn.h - 12) + "px" : undefined }}>
                  {isSec ? <span className="zt">🔒 zero-trust</span> : null}
                  <div className="nlogo">{logo ? <Logo name={logo} size={nn.h ? 36 : 28} /> : <span className={"nemoji n-" + nn.type} style={nn.h ? { fontSize: "26px" } : undefined}>{ICON[nn.type]}</span>}</div>
                  <div className="ntext">
                    <div className={"ntype n-" + nn.type}>{TYPE_LABEL[nn.type]}</div>
                    <div className="nlabel" style={nn.h ? { fontSize: "16px" } : undefined}>{nn.label}{nn.helpTerm ? <Help id={nn.helpTerm} compact /> : null}</div>
                    {nn.sub ? <div className="nsub" style={nn.h ? { fontSize: "12.5px" } : undefined}>{nn.sub}</div> : null}
                {nn.ctxFill != null && (
                  <div style={{ marginTop: "6px" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase", lineHeight: 1, marginBottom: "3px",
                      color: nn.ctxFill >= 0.85 ? "var(--danger)" : "var(--slate)" }}>
                      Context Window{nn.ctxFill >= 0.85 ? " — FLOODED" : ""}
                    </div>
                    <div style={{ height: "8px", borderRadius: "4px", background: "rgba(0,0,0,.10)", overflow: "hidden",
                      boxShadow: nn.ctxFill >= 0.85 ? "0 0 0 1.5px var(--danger)" : "none" }}>
                      <div style={{ height: "100%", width: Math.round(nn.ctxFill * 100) + "%", borderRadius: "4px",
                        background: nn.ctxFill >= 0.85 ? "var(--danger)" : nn.ctxFill > 0.5 ? "var(--warn)" : "var(--good)",
                        transition: "width .4s ease, background .4s ease" }} />
                    </div>
                  </div>
                )}
                  </div>
                </div>
              </div>
            </foreignObject>
          );
        })}
        {/* edge labels (top layer, so nodes never paint over them) */}
        {edgeInfo.map(({ e, i, on, ret, g, lbl, helpTerm }) => {
          if (!lbl) return null;
          if (e.hideWhenInactive && !on) return null;
          if (e.spotlight) return null;
          if (helpTerm) {
            return (
              <foreignObject key={"l" + i} x={g.lx - 55} y={g.ly - 12} width={110} height={22} style={{ overflow: "visible" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span className={"edge-label-chip" + (on ? " active" : "")}><Help id={helpTerm} /></span>
                </div>
              </foreignObject>
            );
          }
          // Plain label: an opaque pill on the top layer. The pill background
          // means that even where a label sits close to a neighboring card, the
          // text stays legible (no ambiguous overlap of ink on ink). The linter
          // still enforces a hard clearance so labels don't crowd cards.
          return (
            <foreignObject key={"l" + i} x={g.lx - 60} y={g.ly - 15} width={120} height={22} style={{ overflow: "visible" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span className={"edge-label-pill" + (ret ? " ret" : "") + (on ? " active" : "")}>{lbl}</span>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

/* =====================================================================
   NARRATOR + SHELL — the walkthrough controls and page chrome.
   ===================================================================== */
function ScenarioView({ scenario, step }: { scenario: Scenario; step: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="scene-head">
        <div className="eyebrow">{scenario.eyebrow}</div>
        <h1>{scenario.title}</h1>
      </div>
      <GraphCanvas scenario={scenario} step={step} />
    </div>
  );
}

/* Review mode: one canvas per step, stacked, no controls — the "contact sheet"
   a screenshot can capture in a single shot for visual self-review. Renders
   every scenario so multi-scenario files are reviewed in one pass. */
function ReviewSheet() {
  // Run the geometry linter once and surface it: a banner at the top of the
  // contact sheet (so the screenshot shows it) plus a hidden #geometry-lint
  // node review.sh reads as text. Green banner = the known overlap classes are
  // provably absent; you still eyeball the render for judgment calls.
  const lint = useMemo(() => lintAll(), []);
  return (
    <div className="main">
      <div className={"lint-banner" + (lint.length ? " bad" : " ok")}>
        {lint.length
          ? <><b>⚠ geometry linter: {lint.length} issue{lint.length > 1 ? "s" : ""}</b>
              <ul>{lint.map((x, k) => <li key={k}><code>[{x.scenario}]</code> {x.msg}</li>)}</ul></>
          : <b>✓ geometry linter clean — no overlapping cards, boxed-through edges, buried arrowheads, or crowded labels</b>}
      </div>
      {SCENARIOS.map((scenario) => (
        <div key={scenario.id}>
          <div className="scene-head">
            <div className="eyebrow">{scenario.eyebrow}</div>
            <h1>{scenario.title}</h1>
          </div>
          {scenario.steps.map((s, i) => (
            <div className="review-step" key={i}>
              <div className="review-cap">
                <span className="rn">Step {i + 1}/{scenario.steps.length}</span>
                <span dangerouslySetInnerHTML={{ __html: s.narration }} />
              </div>
              <GraphCanvas scenario={scenario} step={i} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* Topbar: brand lockup + optional status chip. Edit the text/logos. */
function TopBar() {
  return (
    <div className="topbar">
      <div className="brandlogos">
        <Logo name="sfcloud" size={24} />
      </div>
      <div className="lockup">
        <span className="title">Headless 360 MCP Server</span>
        <span className="from">Efficient Context Management → Agent Quality</span>
      </div>
      <div className="spacer" />
      <a
        className="badge-chip"
        href="https://developer.salesforce.com/blogs/2026/07/announcing-the-headless-360-mcp-server-beta"
        target="_blank"
        rel="noopener noreferrer"
        title="Announcing the Headless 360 MCP Server Beta"
      >
        <span className="dot" />
        Developer Blog
        <svg className="ext-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 4h6v6" />
          <path d="M10 14 20 4" />
          <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
        </svg>
      </a>
    </div>
  );
}

function SideRail({ scenario, step, setStep }: { scenario: Scenario; step: number; setStep: (n: number) => void }) {
  const total = scenario.steps.length;
  const s = scenario.steps[step];
  return (
    <nav className="rail">
      <div className="rail-steps">
        <div className="rail-step-dots">
          {scenario.steps.map((_, i) => (
            <div key={i}
              className={"rail-step-dot" + (i === step ? " active" : i < step ? " done" : "")}
              onClick={() => setStep(i)}
              title={"Step " + (i + 1)}
            />
          ))}
        </div>
      </div>
      <div className="rail-narrator">
        <div>
          <div className="rail-section-label">Summary</div>
          <div className="rail-narration" dangerouslySetInnerHTML={{ __html: s.narration }} />
        </div>
        {s.analogy ? (
          <div>
            <div className="rail-section-label">Analogy</div>
            <div className="rail-analogy-body" dangerouslySetInnerHTML={{ __html: s.analogy }} />
          </div>
        ) : null}
        {s.hood ? (
          <div>
            <div className="rail-section-label">Under the hood</div>
            <div className="rail-hood-body" dangerouslySetInnerHTML={{ __html: s.hood }} />
          </div>
        ) : null}
      </div>
      <div className="rail-nav">
        <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
        <button className="btn primary" disabled={step === total - 1} onClick={() => setStep(step + 1)}>Next →</button>
      </div>
    </nav>
  );
}

export default function App() {
  const [active] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === active)!;
  const total = scenario.steps.length;
  // ?step=N deep-links to a specific frame (1-based, clamped). Enables direct
  // links / screenshots of any step without clicking through from step 1.
  const initialStep = (() => {
    if (typeof location === "undefined") return 0;
    const m = /[?&]step=(\d+)/.exec(location.search);
    if (!m) return 0;
    return Math.max(0, Math.min(total - 1, parseInt(m[1], 10) - 1));
  })();
  const [step, setStep] = useState(initialStep);

  useEffect(() => { setStep(initialStep); }, [active, initialStep]);

  // Keyboard nav: ← / → arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setStep((s) => Math.min(s + 1, total - 1));
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  const review = typeof location !== "undefined" && /[?&]review\b/.test(location.search);
  if (review) {
    return (
      <div className="app review">
        <TopBar />
        <ReviewSheet />
        <HelpOverlay />
      </div>
    );
  }
  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <SideRail scenario={scenario} step={step} setStep={setStep} />
        <main className="main">
          <ScenarioView key={scenario.id} scenario={scenario} step={step} />
        </main>
      </div>
      <HelpOverlay />
    </div>
  );
}
