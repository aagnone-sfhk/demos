/* =====================================================================
   EDITABLE COPY — everything text-shaped for the diagram lives here.
   ---------------------------------------------------------------------
   You should NEVER need to open the app components to change words. Edit
   this file, refresh the browser.

   Structure:
     GLOSSARY          jargon tooltips (chip → term + short definition)
     helpHTML(id)      helper for inline chips; used inside template strings
     SCENARIO_COPY     keyed by scenario id (matches layout.ts layout id)
       ├─ nav          side-rail label
       ├─ eyebrow      small caps kicker above the h1
       ├─ title        h1
       ├─ headline     intro prose (currently unrendered but kept for future use)
       ├─ nodes        { <nodeId>: { label, sub } }  — text on each card
       └─ steps[]      per-step { narration, hood, nodeOverrides?: { <nodeId>: { sub } } }
                       narration/hood: HTML ok, ${helpHTML("key")} chips ok
                       nodeOverrides.sub: change a card's subtitle for that step

   Any string may contain HTML tags and ${helpHTML("glossaryKey")} chips.
   The chip system no-ops on unknown keys, so removing an entry from
   GLOSSARY doesn't crash anything.
   ===================================================================== */

export interface GlossaryEntry {
  term: string;
  short: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  mcp: {
    term: "MCP",
    short: "Model Context Protocol — the standard that lets an AI agent call external tools via a typed request/response contract.",
  },
  toolslist: {
    term: "tools/list",
    short: "The MCP primitive that returns every tool schema the server exposes. Classic servers call it once at connect-time; the full schema payload is loaded into the agent's context window.",
  },
  ctx: {
    term: "context window",
    short: "The fixed-size memory an LLM can reason over in one turn. Every tool schema loaded upfront consumes that space — leaving less room for actual work.",
  },
  discover: {
    term: "Discover",
    short: "Semantic search over the indexed Salesforce API corpus. Returns ranked matches (name + description) without loading full schemas — keeps the context window lean.",
  },
  describe: {
    term: "Describe",
    short: "Fetches the full OAS spec for one action by ID. Only called after Discover identifies the right action — so only the needed spec hits the context window.",
  },
  dispatch: {
    term: "Dispatch",
    short: "Invokes a Salesforce API by passing the HTTP method + path verbatim from a Discover/Describe result. The agent never holds the full schema corpus — just the one path it needs.",
  },
};

// Emits an inert help-chip trigger. A single document-level listener in the
// app (HelpOverlay) reads data-help-term and shows the shared popup.
export function helpHTML(id: string): string {
  const g = GLOSSARY[id];
  if (!g) return id;
  return `<span class="help-chip" tabindex="0" data-help-term="${id}">${g.term}<span class="qm">?</span></span>`;
}

export interface NodeCopy {
  label?: string;
  sub?: string;
}

export interface StepCopy {
  narration?: string;
  hood?: string;
  nodeOverrides?: Record<string, NodeCopy>;
}

export interface ScenarioCopy {
  nav?: string;
  eyebrow?: string;
  title?: string;
  headline?: string;
  nodes?: Record<string, NodeCopy>;
  steps?: StepCopy[];
}

export const SCENARIO_COPY: Record<string, ScenarioCopy> = {
  comparison: {
    nav: "Classic vs. Headless 360 MCP",
    eyebrow: "Salesforce MCP Context Efficiency",
    title: "Standard MCP vs. Headless 360 MCP",
    headline: `Both routes front the <b>2,000+ Salesforce actions</b> over ${helpHTML("mcp")}. A standard server dumps every schema into the ${helpHTML("ctx")} at startup. The four ${helpHTML("discover")} / ${helpHTML("describe")} / ${helpHTML("dispatch")} tools act as an intermediary — keeping context lean by fetching only what's needed, on demand.`,

    nodes: {
      // Classic lane
      "c-agent":       { label: "MCP Agent",           sub: "Usage: heavy" },
      "c-server":      { label: "Standard MCP",       sub: "Returns entire catalog" },

      // Shared corpus (Salesforce Resources column)
      "corp-1":        { label: "getAccount",         sub: "Sales" },
      "corp-2":        { label: "queryDataCloud",     sub: "Data 360" },
      "corp-3":        { label: "getQuoteLines",      sub: "Revenue" },
      "corp-4":        { label: "createCase",         sub: "Service" },
      "corp-5":        { label: "sendCampaignEmail",  sub: "Marketing" },
      "corp-6":        { label: "getContactSegment",  sub: "Data 360" },
      "corp-7":        { label: "createOpportunity",  sub: "Sales" },
      "corp-8":        { label: "resolveCase",        sub: "Service" },
      "corp-x":        { label: "+ 2,000 more",       sub: "" },

      // Headless lane
      "h-agent":       { label: "MCP Agent",           sub: "Usage: light" },
      "h-server":      { label: "Headless 360",       sub: "Exactly 4 tools" },
      "h-discover":    { label: "Discover",           sub: "Semantic search" },
      "h-describe":    { label: "Describe",           sub: "Fetch one OAS spec" },
      "h-dispatch":    { label: "Dispatch",           sub: "Read and write use cases" },
      "h-dispatch-ro": { label: "Dispatch Read-Only", sub: "Read-only use cases" },
    },

    steps: [
      // 1 — intro
      {
        narration: "Both agents below use MCP to access Salesforce data. The <b>same 2,000+ resources</b> are exposed to the agents, but differently, according to the MCP approach used. Note what happens to each agent's context window.",
      },
      // 2 — Standard MCP connects and floods context
      {
        narration: `The top agent connects to a <b>Standard MCP server</b>. The server dumps every resource's info (2,000+) into the agent's ${helpHTML("ctx")} upfront. The agent's attention is flooded before it has reasoned about anything.`,
        hood: "Standard MCP servers load the full schema of every resource upfront into the model's context window. The model then suffers from lost-in-the-middle syndrome for every interaction of the session as it tries to plan and execute tasks.",
      },
      // 3 — Headless 360 connects, gets 4 tools
      {
        narration: `The bottom agent connects to the <b>Headless 360 MCP server</b> and receives exactly <b>4 tools</b>. All of Salesforce's resources are accessible through them — they just are not loaded upfront.`,
      },
      // 4 — Discover queries selectively
      {
        narration: `The ${helpHTML("discover")} tool queries an index of the Salesforce resources using natural language from the agent, returning a ranked shortlist. This keeps the agent focused and avoids bloating its attention.`,
        hood: "The agent's natural language search forms a contextual lookup of the relevant MCP resources needed for this part of the agent session. The extra upfront discovery step saves precious context window space (a worthy tradeoff).",
      },
      // 5 — Describe fetches the OAS spec for createCase
      {
        narration: `The ${helpHTML("describe")} tool fetches the full information for the relevant resource (e.g. <code>createCase</code>). This provides the focused information the agent needs to correctly use the tool.`,
        hood: "The agent only needs the schema for the tool it's using — not the entire catalog. The schema is used to correctly invoke the tool with the right syntax and parameters.",
        nodeOverrides: { "h-agent": { sub: "Usage: light" } },
      },
      // 6 — Dispatch invokes createCase
      {
        narration: `The ${helpHTML("dispatch")} tool actually takes the desired action (e.g. <code>createCase</code>) and returns the result.`,
        nodeOverrides: { "h-agent": { sub: "Usage: light" } },
      },
      // 7 — the verdict
      {
        narration: `Before either agent has done a single thing — Standard MCP has already consumed nearly the entire context window just loading tool definitions. <b>Headless 360 starts at near zero.</b> Same 2,000+ actions. One approach scales.`,
        hood: "Context window capacity consumed by tool schemas is <b>capacity unavailable for agent reasoning</b>. At 2,000+ tools, Standard MCP doesn't leave room to think. Headless 360 loads only what's asked for, one spec at a time, so the agent's working memory stays available for valuable work.",
        nodeOverrides: {
          "c-agent": { sub: "Usage: heavy" },
          "h-agent": { sub: "Usage: light" },
        },
      },
    ],
  },
};
