import type { ReactNode } from "react";

/* =====================================================================
   LOGO REGISTRY — inline SVG marks, offline-safe.
   A node can render one of these instead of a generic emoji by setting
   `logo: "<key>"`. Each entry is { vb: "<viewBox>", glyph: <jsx> }.
   Add your own: draw a compact SVG (or paste an official brand path) and
   register it here. Keys included below are neutral, illustrative shapes —
   replace/extend freely. Prefer a real brand mark when depicting a real
   product; keep glyphs simple so they read at 28px.
   ===================================================================== */
export const LOGOS: Record<string, { vb: string; glyph: ReactNode }> = {
  database: { vb: "0 0 24 24", glyph: (
    <g fill="none" stroke="#0176D3" strokeWidth="1.8">
      <ellipse cx="12" cy="6" rx="7" ry="2.6" />
      <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
      <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </g>
  )},
  cloud: { vb: "0 0 24 24", glyph: (
    <path d="M7 18a4 4 0 01-.5-8A5 5 0 0116 9.5a3.5 3.5 0 01.5 8.5H7z" fill="#0176D3" />
  )},
  gear: { vb: "0 0 24 24", glyph: (
    <g fill="#7526e3"><circle cx="12" cy="12" r="3.2" fill="#fff" stroke="#7526e3" strokeWidth="1.6"/>
    <path d="M12 2l1.2 2.6 2.8-.6.4 2.8 2.6 1.2-1.4 2.5 1.4 2.5-2.6 1.2-.4 2.8-2.8-.6L12 22l-1.2-2.6-2.8.6-.4-2.8-2.6-1.2 1.4-2.5L5 9.8l2.6-1.2.4-2.8 2.8.6z" fillOpacity=".25"/></g>
  )},
  person: { vb: "0 0 24 24", glyph: (
    <g fill="#2563eb"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0116 0z"/></g>
  )},
  // Salesforce cloud mark (simplified, generic — not official brand)
  sfcloud: { vb: "0 0 32 32", glyph: (
    <g>
      <path d="M13.2 7.4a5.6 5.6 0 0110.4 2.9 4.4 4.4 0 01-.3 8.7H9.2a4 4 0 01-.2-8 5.6 5.6 0 014.2-3.6z" fill="#0176D3"/>
    </g>
  )},
  // Stack of tool cards — represents a flat list of many tools
  toolstack: { vb: "0 0 24 24", glyph: (
    <g fill="none" stroke="#c2410c" strokeWidth="1.6">
      <rect x="3" y="15" width="18" height="4" rx="1.5" fill="#fef3c7" stroke="#c2410c"/>
      <rect x="3" y="10" width="18" height="4" rx="1.5" fill="#fed7aa" stroke="#c2410c"/>
      <rect x="3" y="5" width="18" height="4" rx="1.5" fill="#fca5a5" stroke="#c2410c"/>
    </g>
  )},
  // Magnifying glass — represents semantic search / Discover
  search: { vb: "0 0 24 24", glyph: (
    <g fill="none" stroke="#0a8a6f" strokeWidth="2" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l4.5 4.5" />
    </g>
  )},
  // Context window — a progress bar shape
  ctxbar: { vb: "0 0 24 24", glyph: (
    <g>
      <rect x="2" y="8" width="20" height="8" rx="3" fill="none" stroke="#7526e3" strokeWidth="1.6"/>
      <rect x="3.5" y="9.5" width="17" height="5" rx="2" fill="#e9d5ff"/>
    </g>
  )},
};

export function Logo({ name, size = 26 }: { name: string; size?: number }) {
  const l = LOGOS[name];
  if (!l) return null;
  return <svg width={size} height={size} viewBox={l.vb} aria-label={name} role="img">{l.glyph}</svg>;
}
