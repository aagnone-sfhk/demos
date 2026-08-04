/* =====================================================================
   EDITABLE COPY — everything text-shaped for the diagram lives here.
   ---------------------------------------------------------------------
   You should NEVER need to open index.html to change words. Edit this
   file, refresh the browser.

   Structure:
     GLOSSARY          jargon tooltips (chip → term + short definition)
     helpHTML(id)      helper for inline chips; used inside template strings
     SCENARIO_COPY     keyed by scenario id (matches index.html layout id)
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

const GLOSSARY = {
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
function helpHTML(id) {
  const g = GLOSSARY[id];
  if (!g) return id;
  return `<span class="help-chip" tabindex="0" data-help-term="${id}">${g.term}<span class="qm">?</span></span>`;
}

const SCENARIO_COPY = {
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
      "h-dispatch":    { label: "Dispatch",           sub: "Invoke the API" },
      "h-dispatch-ro": { label: "Dispatch Read-Only", sub: "Read-only HTTP GET" },
    },

    steps: [
      // 1 — intro
      {
        narration: "Two agents, one goal -- access Salesforce data. The <b>same 2,000+ actions</b> sit in the corpus on the right. Watch what happens to each agent's context window.",
        hood: "The corpus is identical either way. The only difference is the interface in front of it — and how much gets loaded into the agent's context window before any work begins.",
      },
      // 2 — Standard MCP connects and floods context
      {
        narration: `The top agent connects to a <b>Standard MCP server</b>. The protocol dumps every tool's full schema into the agent's ${helpHTML("ctx")} upfront — all 2,000+ of them. The window floods full before it has reasoned about a single task.`,
        hood: "MCP's tools/list call is a full dump: every schema, every parameter definition, every description. There's no partial or lazy loading — a flooded context window is the baseline behavior. The model then has to attend to thousands of irrelevant parameter definitions while trying to plan, a leading cause of hallucination and degraded accuracy on large MCP servers.",
      },
      // 3 — Headless 360 connects, gets 4 tools
      {
        narration: `The bottom agent connects to <b>Headless 360</b> and receives just <b>4 tools</b>. The full corpus is still there — it just hasn't been loaded yet.`,
        hood: "Headless 360 decouples the interface (4 fixed tools) from the corpus (2,000+ actions behind them). The agent's context window stays empty until it asks for something specific.",
      },
      // 4 — Discover queries selectively
      {
        narration: `${helpHTML("discover")} queries the corpus with natural language — returning only a ranked shortlist. No full schemas. The context window barely moves.`,
        hood: "Tool RAG: the 2,000+ action corpus is indexed by embedding. The agent's query matches against action descriptions; only top hits return as compact text. The agent learns what exists without loading a single full schema.",
      },
      // 5 — Describe fetches the OAS spec for createCase
      {
        narration: `${helpHTML("describe")} fetches the full OAS spec for <code>createCase</code>. Only that <b>one</b> spec enters the ${helpHTML("ctx")} — the rest of the 2,000+ corpus never touches it.`,
        hood: "Describe returns the full OpenAPI spec for one operation — parameters, request body, response shape. That's enough for the agent to construct a valid call, without ever holding the whole catalog.",
        nodeOverrides: { "h-agent": { sub: "Usage: light" } },
      },
      // 6 — Dispatch invokes createCase
      {
        narration: `${helpHTML("dispatch")} invokes <code>createCase</code>, passing the HTTP method and path verbatim from the Describe result. The rest of the 2,000+ corpus stayed on the server.`,
        hood: "Dispatch is a thin proxy: hand it a method + path from Describe and it forwards to Salesforce. The agent never held the full schema corpus — just the one operation it needed to call.",
        nodeOverrides: { "h-agent": { sub: "Usage: light" } },
      },
      // 7 — the verdict
      {
        narration: `Before either agent has done a single thing — Standard MCP has already consumed nearly the entire context window just loading tool definitions. <b>Headless 360 starts at near zero.</b> Same 2,000+ actions. One approach scales.`,
        hood: "Context window capacity consumed by tool schemas is capacity unavailable for reasoning, memory, and output. At 2,000+ tools, Standard MCP doesn't leave room to think. Headless 360 loads only what's asked for — one spec at a time — so the agent's working memory stays available for actual work.",
        nodeOverrides: {
          "c-agent": { sub: "Usage: heavy" },
          "h-agent": { sub: "Usage: light" },
        },
      },
    ],
  },
};

// Expose to the app (which runs in a separate transformed <script> block).
window.GLOSSARY = GLOSSARY;
window.helpHTML = helpHTML;
window.SCENARIO_COPY = SCENARIO_COPY;
