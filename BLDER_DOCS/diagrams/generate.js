#!/usr/bin/env node
// Generates .excalidraw diagram files for the agent platform docs.
// Run: node generate.js
// Output: *.excalidraw files in this directory — open with https://excalidraw.com

import { writeFileSync } from "fs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 1;
const uid = () => `el-${idCounter++}`;
const seed = () => Math.floor(Math.random() * 999999);

const COLORS = {
  blue:       { bg: "#a5d8ff", stroke: "#1971c2" },
  green:      { bg: "#b2f2bb", stroke: "#2f9e44" },
  purple:     { bg: "#d0bfff", stroke: "#7048e8" },
  orange:     { bg: "#ffd8a8", stroke: "#e8590c" },
  yellow:     { bg: "#ffec99", stroke: "#e67700" },
  pink:       { bg: "#fcc2d7", stroke: "#c2255c" },
  gray:       { bg: "#dee2e6", stroke: "#495057" },
  teal:       { bg: "#99e9f2", stroke: "#0c8599" },
  white:      { bg: "#ffffff", stroke: "#1e1e1e" },
  dark:       { bg: "#343a40", stroke: "#1e1e1e" },
};

function rect({ id, x, y, w, h, label, color = "white", fontSize = 16, bold = false, radius = true, subLabel }) {
  const rectId = id || uid();
  const textId = uid();
  const c = COLORS[color];
  const elements = [];

  elements.push({
    id: rectId,
    type: "rectangle",
    x, y, width: w, height: h,
    angle: 0,
    strokeColor: c.stroke,
    backgroundColor: c.bg,
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: radius ? { type: 3 } : null,
    seed: seed(),
    version: 1, versionNonce: seed(),
    isDeleted: false,
    boundElements: [{ id: textId, type: "text" }],
    updated: Date.now(), link: null, locked: false,
  });

  const textContent = subLabel ? `${label}\n${subLabel}` : label;
  const lineCount = textContent.split("\n").length;
  const lineH = fontSize * 1.25;

  elements.push({
    id: textId,
    type: "text",
    x: x + 8, y: y + (h - lineCount * lineH) / 2,
    width: w - 16, height: lineCount * lineH,
    angle: 0,
    strokeColor: c.stroke,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1, strokeStyle: "solid",
    roughness: 1, opacity: 100,
    groupIds: [], frameId: null, roundness: null,
    seed: seed(), version: 1, versionNonce: seed(),
    isDeleted: false, boundElements: [],
    updated: Date.now(), link: null, locked: false,
    text: textContent,
    fontSize,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    baseline: fontSize,
    containerId: rectId,
    originalText: textContent,
    lineHeight: 1.25,
    ...(bold ? { fontWeight: "bold" } : {}),
  });

  return { elements, id: rectId };
}

function arrow({ from, to, label, color = "#1e1e1e", dash = false }) {
  const arrowId = uid();
  const elements = [];

  elements.push({
    id: arrowId,
    type: "arrow",
    x: from.x, y: from.y,
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
    angle: 0,
    strokeColor: color,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: dash ? "dashed" : "solid",
    roughness: 1, opacity: 100,
    groupIds: [], frameId: null,
    roundness: { type: 2 },
    seed: seed(), version: 1, versionNonce: seed(),
    isDeleted: false, boundElements: [],
    updated: Date.now(), link: null, locked: false,
    points: [[0, 0], [to.x - from.x, to.y - from.y]],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
  });

  if (label) {
    const textId = uid();
    elements.push({
      id: textId,
      type: "text",
      x: (from.x + to.x) / 2 - 60,
      y: (from.y + to.y) / 2 - 12,
      width: 120, height: 24,
      angle: 0,
      strokeColor: "#555",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1, strokeStyle: "solid",
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: null,
      seed: seed(), version: 1, versionNonce: seed(),
      isDeleted: false, boundElements: [],
      updated: Date.now(), link: null, locked: false,
      text: label, fontSize: 12, fontFamily: 1,
      textAlign: "center", verticalAlign: "middle",
      baseline: 12, containerId: null,
      originalText: label, lineHeight: 1.25,
    });
  }

  return { elements, id: arrowId };
}

function label({ x, y, w = 200, text, fontSize = 13, color = "#555", bold = false }) {
  const id = uid();
  return {
    elements: [{
      id, type: "text",
      x, y, width: w, height: fontSize * 1.5,
      angle: 0,
      strokeColor: color,
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1, strokeStyle: "solid",
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: null,
      seed: seed(), version: 1, versionNonce: seed(),
      isDeleted: false, boundElements: [],
      updated: Date.now(), link: null, locked: false,
      text, fontSize, fontFamily: 1,
      textAlign: "center", verticalAlign: "middle",
      baseline: fontSize, containerId: null,
      originalText: text, lineHeight: 1.25,
    }],
    id,
  };
}

function excalidraw(elements) {
  return JSON.stringify({
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements,
    appState: {
      gridSize: 20,
      viewBackgroundColor: "#f8f9fa",
    },
    files: {},
  }, null, 2);
}

// ─── Diagram 1: System Architecture Overview ─────────────────────────────────

function diagramSystemArchitecture() {
  idCounter = 1;
  const all = [];

  // Title
  all.push(...label({ x: 250, y: 10, w: 600, text: "Agent Platform — System Architecture", fontSize: 20, color: "#1e1e1e", bold: true }).elements);

  // Web Portal (top center)
  const web = rect({ x: 380, y: 50, w: 340, h: 70, label: "platform-web\n(React + Vite + shadcn/ui)", color: "blue" });
  all.push(...web.elements);

  // Platform API (middle center)
  const api = rect({ x: 380, y: 190, w: 340, h: 80, label: "platform-api (Go/Fiber)\nJWT Auth · OAuth · RBAC\nScheduler · Audit · Metrics", color: "green" });
  all.push(...api.elements);

  // Agent Core (left)
  const core = rect({ x: 40, y: 340, w: 300, h: 80, label: "agent-core\n(Go binary + pkg/agent)\n3 providers · 9 tools · MCP", color: "purple" });
  all.push(...core.elements);

  // Sandbox runtimes (center)
  const sandbox = rect({ x: 380, y: 340, w: 340, h: 80, label: "Sandbox Runtimes\nWASM (Wazero) · Container (Docker)\nCapability-based security", color: "teal" });
  all.push(...sandbox.elements);

  // Scheduler (right)
  const sched = rect({ x: 760, y: 190, w: 220, h: 80, label: "Scheduler\ncron · interval · one-shot\noverlap policies", color: "orange" });
  all.push(...sched.elements);

  // Skills repo (right)
  const skills = rect({ x: 760, y: 340, w: 220, h: 80, label: "Skill Sources (GitHub)\n4 WASM + 6 instruction\ngit-native registry", color: "teal" });
  all.push(...skills.elements);

  // Storage (bottom left)
  const storage = rect({ x: 380, y: 490, w: 220, h: 70, label: "SQLite / PostgreSQL\n13 tables · 8 migrations", color: "gray" });
  all.push(...storage.elements);

  // LLM Providers (bottom center-left)
  const llm = rect({ x: 40, y: 490, w: 300, h: 70, label: "LLM Providers\nAnthropic · OpenAI · Ollama\nReliableProvider (failover)", color: "yellow" });
  all.push(...llm.elements);

  // MCP Servers (bottom right)
  const mcp = rect({ x: 640, y: 490, w: 200, h: 70, label: "MCP Servers\nstdio + HTTP/SSE\nexternal tool servers", color: "pink" });
  all.push(...mcp.elements);

  // Docker
  const docker = rect({ x: 870, y: 490, w: 110, h: 70, label: "Docker /\nPodman", color: "gray" });
  all.push(...docker.elements);

  // Arrows
  all.push(...arrow({ from: { x: 550, y: 120 }, to: { x: 550, y: 190 }, label: "REST + WS" }).elements);
  all.push(...arrow({ from: { x: 440, y: 270 }, to: { x: 200, y: 340 }, label: "imports pkg/agent" }).elements);
  all.push(...arrow({ from: { x: 550, y: 270 }, to: { x: 550, y: 340 }, label: "dispatches tools" }).elements);
  all.push(...arrow({ from: { x: 720, y: 230 }, to: { x: 760, y: 230 }, label: "" }).elements);
  all.push(...arrow({ from: { x: 340, y: 380 }, to: { x: 380, y: 380 }, label: "" }).elements);
  all.push(...arrow({ from: { x: 720, y: 380 }, to: { x: 760, y: 380 }, label: "installs skills" }).elements);
  all.push(...arrow({ from: { x: 490, y: 420 }, to: { x: 490, y: 490 }, label: "" }).elements);
  all.push(...arrow({ from: { x: 190, y: 420 }, to: { x: 190, y: 490 }, label: "streaming API" }).elements);
  all.push(...arrow({ from: { x: 340, y: 400 }, to: { x: 640, y: 525 }, dash: true, label: "MCP" }).elements);
  all.push(...arrow({ from: { x: 600, y: 420 }, to: { x: 925, y: 490 }, label: "" }).elements);

  return excalidraw(all);
}

// ─── Diagram 2: Tool Execution Model ─────────────────────────────────────────

function diagramToolTiers() {
  idCounter = 1;
  const all = [];

  all.push(...label({ x: 200, y: 20, w: 700, text: "Tool Execution Model", fontSize: 20, color: "#1e1e1e", bold: true }).elements);

  // LLM box (top)
  const llm = rect({ x: 350, y: 70, w: 300, h: 60, label: "LLM (Claude / GPT / Llama)", color: "yellow" });
  all.push(...llm.elements);

  // ToolEngine box
  const engine = rect({ x: 350, y: 200, w: 300, h: 60, label: "ToolEngine\n(dispatch + parallel exec)", color: "gray" });
  all.push(...engine.elements);

  // Arrow LLM → engine
  all.push(...arrow({ from: { x: 480, y: 130 }, to: { x: 480, y: 200 }, label: "tool_call" }).elements);
  all.push(...arrow({ from: { x: 520, y: 200 }, to: { x: 520, y: 130 }, label: "result" }).elements);

  // Native tools
  const core = rect({ x: 30, y: 340, w: 220, h: 210, label: "", color: "purple" });
  all.push(...core.elements);
  all.push(...label({ x: 50, y: 350, w: 180, text: "Native Tools", fontSize: 15, color: "#7048e8", bold: true }).elements);
  all.push(...label({ x: 50, y: 378, w: 180, text: "bash (opt-out)", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 50, y: 398, w: 180, text: "read · write · edit", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 50, y: 418, w: 180, text: "list_dir · grep", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 50, y: 438, w: 180, text: "http_fetch · tasks", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 50, y: 458, w: 180, text: "agent_spawn", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 50, y: 490, w: 180, text: "Compiled into binary.", fontSize: 11, color: "#7048e8" }).elements);
  all.push(...label({ x: 50, y: 508, w: 180, text: "In-process. Always on.", fontSize: 11, color: "#7048e8" }).elements);

  // WASM tools
  const wasmBox = rect({ x: 290, y: 340, w: 220, h: 210, label: "", color: "teal" });
  all.push(...wasmBox.elements);
  all.push(...label({ x: 310, y: 350, w: 180, text: "WASM Tools", fontSize: 15, color: "#0c8599", bold: true }).elements);
  all.push(...label({ x: 310, y: 378, w: 180, text: "web_search · web_fetch", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 310, y: 398, w: 180, text: "github · slack_notify", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 310, y: 430, w: 180, text: "Wazero (pure Go, no CGO)", fontSize: 11, color: "#0c8599" }).elements);
  all.push(...label({ x: 310, y: 448, w: 180, text: "530ms first · 3ms cached", fontSize: 11, color: "#0c8599" }).elements);
  all.push(...label({ x: 310, y: 466, w: 180, text: "HTTP via host functions", fontSize: 11, color: "#0c8599" }).elements);
  all.push(...label({ x: 310, y: 484, w: 180, text: "Zero dependencies", fontSize: 11, color: "#0c8599" }).elements);
  all.push(...label({ x: 310, y: 508, w: 180, text: "Capability-based security", fontSize: 11, color: "#0c8599" }).elements);

  // Container tools
  const containerBox = rect({ x: 550, y: 340, w: 220, h: 210, label: "", color: "orange" });
  all.push(...containerBox.elements);
  all.push(...label({ x: 570, y: 350, w: 180, text: "Container Tools", fontSize: 15, color: "#e8590c", bold: true }).elements);
  all.push(...label({ x: 570, y: 378, w: 180, text: "Any Docker/Podman image", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 570, y: 398, w: 180, text: "Custom Dockerfiles", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 570, y: 430, w: 180, text: "Full OS isolation", fontSize: 11, color: "#e8590c" }).elements);
  all.push(...label({ x: 570, y: 448, w: 180, text: "--read-only --rm", fontSize: 11, color: "#e8590c" }).elements);
  all.push(...label({ x: 570, y: 466, w: 180, text: "--memory=256m --cpus=1", fontSize: 11, color: "#e8590c" }).elements);
  all.push(...label({ x: 570, y: 484, w: 180, text: "--network=none (default)", fontSize: 11, color: "#e8590c" }).elements);
  all.push(...label({ x: 570, y: 508, w: 180, text: "~123ms per call", fontSize: 11, color: "#e8590c" }).elements);

  // MCP tools
  const mcpBox = rect({ x: 810, y: 340, w: 220, h: 210, label: "", color: "pink" });
  all.push(...mcpBox.elements);
  all.push(...label({ x: 830, y: 350, w: 180, text: "MCP Tools", fontSize: 15, color: "#c2255c", bold: true }).elements);
  all.push(...label({ x: 830, y: 378, w: 180, text: "External servers", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 830, y: 398, w: 180, text: "stdio + HTTP/SSE", fontSize: 12, color: "#495057" }).elements);
  all.push(...label({ x: 830, y: 430, w: 180, text: "JSON-RPC protocol", fontSize: 11, color: "#c2255c" }).elements);
  all.push(...label({ x: 830, y: 448, w: 180, text: "Persistent connection", fontSize: 11, color: "#c2255c" }).elements);
  all.push(...label({ x: 830, y: 466, w: 180, text: "Server-managed state", fontSize: 11, color: "#c2255c" }).elements);
  all.push(...label({ x: 830, y: 484, w: 180, text: "Community ecosystem", fontSize: 11, color: "#c2255c" }).elements);

  // Arrows from engine to each tier
  all.push(...arrow({ from: { x: 400, y: 260 }, to: { x: 140, y: 340 } }).elements);
  all.push(...arrow({ from: { x: 460, y: 260 }, to: { x: 400, y: 340 } }).elements);
  all.push(...arrow({ from: { x: 540, y: 260 }, to: { x: 660, y: 340 } }).elements);
  all.push(...arrow({ from: { x: 600, y: 260 }, to: { x: 920, y: 340 } }).elements);

  return excalidraw(all);
}

// ─── Diagram 3: Agent Turn Loop ───────────────────────────────────────────────

function diagramTurnLoop() {
  idCounter = 1;
  const all = [];

  all.push(...label({ x: 150, y: 20, w: 400, text: "Agent Turn Loop", fontSize: 20, color: "#1e1e1e", bold: true }).elements);

  const cx = 350;
  const bw = 260, bh = 54;

  const start    = rect({ x: cx - bw/2, y:  70, w: bw, h: bh, label: "START\nReceive mission / user message", color: "green" });
  const context  = rect({ x: cx - bw/2, y: 180, w: bw, h: bh, label: "Build context\n(system prompt + skills + history)", color: "blue" });
  const llmCall  = rect({ x: cx - bw/2, y: 290, w: bw, h: bh, label: "LLM call\n(streaming response)", color: "purple" });
  const hasTools = rect({ x: cx - bw/2, y: 400, w: bw, h: bh, label: "Tool calls in response?", color: "yellow", radius: false });
  const execTools = rect({ x: cx - bw/2, y: 510, w: bw, h: bh, label: "Execute tools\n(parallel · WASM / container / native)", color: "teal" });
  const limitCheck = rect({ x: cx - bw/2, y: 620, w: bw, h: bh, label: "Check limits\n(turns · tokens · loops)", color: "yellow", radius: false });
  const compact  = rect({ x: cx + 200, y: 620, w: 220, h: bh, label: "Compact history\n(LLM summarize)", color: "orange" });
  const done     = rect({ x: cx - bw/2, y: 730, w: bw, h: bh, label: "DONE\nEmit agent_end event", color: "green" });

  for (const b of [start, context, llmCall, hasTools, execTools, limitCheck, compact, done]) {
    all.push(...b.elements);
  }

  all.push(...arrow({ from: { x: cx, y: 124 }, to: { x: cx, y: 180 } }).elements);
  all.push(...arrow({ from: { x: cx, y: 234 }, to: { x: cx, y: 290 } }).elements);
  all.push(...arrow({ from: { x: cx, y: 344 }, to: { x: cx, y: 400 } }).elements);
  all.push(...arrow({ from: { x: cx, y: 454 }, to: { x: cx, y: 510 }, label: "Yes" }).elements);
  all.push(...arrow({ from: { x: cx, y: 564 }, to: { x: cx, y: 620 } }).elements);
  all.push(...arrow({ from: { x: cx + bw/2, y: 427 }, to: { x: cx + bw/2 + 80, y: 757 }, label: "No" }).elements);
  all.push(...arrow({ from: { x: cx + bw/2, y: 647 }, to: { x: cx + 200, y: 647 }, label: "context full" }).elements);
  all.push(...arrow({ from: { x: cx + 200, y: 620 }, to: { x: cx + 480, y: 207 }, label: "retry" }).elements);
  all.push(...arrow({ from: { x: cx, y: 674 }, to: { x: cx, y: 730 }, label: "ok / max turns" }).elements);
  all.push(...arrow({ from: { x: cx - bw/2, y: 537 }, to: { x: cx - bw/2 - 80, y: 207 }, label: "append results" }).elements);

  return excalidraw(all);
}

// ─── Diagram 4: WASM Sandbox Architecture ─────────────────────────────────────

function diagramWASMSandbox() {
  idCounter = 1;
  const all = [];

  all.push(...label({ x: 150, y: 10, w: 700, text: "WASM Sandbox Architecture", fontSize: 20, color: "#1e1e1e", bold: true }).elements);

  // Agent core host
  const host = rect({ x: 60, y: 60, w: 400, h: 340, label: "", color: "purple" });
  all.push(...host.elements);
  all.push(...label({ x: 80, y: 70, w: 360, text: "agent-core (Host Process)", fontSize: 16, color: "#7048e8", bold: true }).elements);

  // Wazero runtime
  const runtime = rect({ x: 80, y: 100, w: 360, h: 60, label: "Wazero Runtime (pure Go, no CGO)\nModule cache: SHA-256 → compiled", color: "teal" });
  all.push(...runtime.elements);

  // Host functions
  const hostFns = rect({ x: 80, y: 180, w: 360, h: 80, label: "Host Functions (agent_host)\nhttp_request(method, url, body)\nhttp_request_headers(method, url, hdrs, body)\n→ enforces AllowedHosts", color: "green" });
  all.push(...hostFns.elements);

  // Capabilities
  const caps = rect({ x: 80, y: 280, w: 360, h: 100, label: "Capabilities Policy\nAllowedPaths · ReadOnlyPaths\nAllowedHosts · EnvVars\nMaxMemoryMB · MaxTimeoutSec\nMaxOutputBytes", color: "yellow" });
  all.push(...caps.elements);

  // WASM guest module
  const guest = rect({ x: 540, y: 60, w: 340, h: 200, label: "", color: "teal" });
  all.push(...guest.elements);
  all.push(...label({ x: 560, y: 70, w: 300, text: "WASM Guest Module (.wasm)", fontSize: 16, color: "#0c8599", bold: true }).elements);

  const guestCode = rect({ x: 560, y: 100, w: 300, h: 50, label: "Tool logic (Go → wasip1)\npkg/hostcall bindings", color: "white" });
  all.push(...guestCode.elements);

  const guestIO = rect({ x: 560, y: 165, w: 300, h: 80, label: "stdin: JSON input\nstdout: JSON output\n//go:wasmimport agent_host\nHTTPGet · HTTPPost · HTTPRequestWithHeaders", color: "white" });
  all.push(...guestIO.elements);

  // External services
  const ext = rect({ x: 540, y: 310, w: 340, h: 80, label: "External Services\nhtml.duckduckgo.com (search)\napi.github.com (GitHub API)\nhooks.slack.com (Slack)", color: "orange" });
  all.push(...ext.elements);

  // Arrows
  all.push(...arrow({ from: { x: 440, y: 140 }, to: { x: 540, y: 140 }, label: "loads .wasm" }).elements);
  all.push(...arrow({ from: { x: 540, y: 210 }, to: { x: 440, y: 210 }, label: "wasmimport calls" }).elements);
  all.push(...arrow({ from: { x: 260, y: 260 }, to: { x: 710, y: 310 }, label: "proxied HTTP" }).elements);

  // Performance callout
  const perf = rect({ x: 540, y: 420, w: 340, h: 50, label: "Performance: 530ms first call · 3ms cached (160×)\nModule cached by SHA-256 content hash", color: "gray" });
  all.push(...perf.elements);

  return excalidraw(all);
}

// ─── Diagram 5: Skill Loading Flow ────────────────────────────────────────────

function diagramSkillLoading() {
  idCounter = 1;
  const all = [];

  all.push(...label({ x: 100, y: 10, w: 700, text: "Skill Install & Loading Flow", fontSize: 20, color: "#1e1e1e", bold: true }).elements);

  // Sources column
  all.push(...label({ x: 60, y: 55, w: 220, text: "Install Sources", fontSize: 14, color: "#7048e8", bold: true }).elements);

  const local    = rect({ x: 60, y: 80, w: 220, h: 45, label: "Local path\n./my-skill/", color: "purple" });
  const gitSrc   = rect({ x: 60, y: 140, w: 220, h: 45, label: "Git URL\ngithub.com/org/skill", color: "purple" });
  const registry = rect({ x: 60, y: 200, w: 220, h: 45, label: "Registry\ncommunity/web_search@2.0", color: "purple" });
  for (const b of [local, gitSrc, registry]) all.push(...b.elements);

  // Install pipeline
  const fetch = rect({ x: 340, y: 80, w: 200, h: 45, label: "Fetch SKILL.md\n+ tools/*.wasm", color: "orange" });
  const install = rect({ x: 340, y: 150, w: 200, h: 45, label: "Install to\n~/.agent-core/skills/", color: "orange" });
  for (const b of [fetch, install]) all.push(...b.elements);

  // Runtime loading
  all.push(...label({ x: 620, y: 55, w: 240, text: "Agent Run Time", fontSize: 14, color: "#1971c2", bold: true }).elements);

  const loader = rect({ x: 610, y: 80, w: 260, h: 60, label: "Skill Loader\nparse SKILL.md frontmatter\ndetect runtime: wasm | container", color: "teal" });
  const register = rect({ x: 610, y: 160, w: 260, h: 60, label: "Register Tools\nWASM → Wazero sandbox\nContainer → Docker image\nInstructions → system prompt", color: "teal" });
  const run = rect({ x: 610, y: 260, w: 260, h: 50, label: "Agent Loop\ntools dispatched per-runtime", color: "green" });
  for (const b of [loader, register, run]) all.push(...b.elements);

  // Arrows
  for (const b of [local, gitSrc, registry]) {
    all.push(...arrow({ from: { x: 280, y: b.elements[0].y + 22 }, to: { x: 340, y: 102 } }).elements);
  }
  all.push(...arrow({ from: { x: 440, y: 125 }, to: { x: 440, y: 150 } }).elements);
  all.push(...arrow({ from: { x: 540, y: 172 }, to: { x: 610, y: 110 }, label: "run time" }).elements);
  all.push(...arrow({ from: { x: 740, y: 140 }, to: { x: 740, y: 160 } }).elements);
  all.push(...arrow({ from: { x: 740, y: 220 }, to: { x: 740, y: 260 } }).elements);

  return excalidraw(all);
}

// ─── Diagram 6: Multi-Repo Architecture ───────────────────────────────────────

function diagramRepos() {
  idCounter = 1;
  const all = [];

  all.push(...label({ x: 100, y: 10, w: 700, text: "Multi-Repo Architecture", fontSize: 20, color: "#1e1e1e", bold: true }).elements);

  const agentCore = rect({ x: 280, y: 60, w: 320, h: 80,
    label: "agent-core\nGo binary + pkg/agent library\n171 tests · 45 commits", color: "purple" });

  const skills = rect({ x: 680, y: 60, w: 260, h: 80,
    label: "agent-platform-skills\n4 WASM + 6 instruction skills\ngit-native registry", color: "teal" });

  const platformApi = rect({ x: 280, y: 220, w: 320, h: 80,
    label: "agent-platform-api\nGo/Fiber REST API\n62 endpoints · 22 tests", color: "green" });

  const platformWeb = rect({ x: 280, y: 380, w: 320, h: 80,
    label: "agent-platform-web\nReact + Vite SPA\n14 pages · industrial theme", color: "blue" });

  const docs = rect({ x: 680, y: 220, w: 260, h: 80,
    label: "agent-platform-docs\nArchitecture · diagrams\nWASM tool guide", color: "gray" });

  for (const b of [agentCore, skills, platformApi, platformWeb, docs]) all.push(...b.elements);

  // Arrows
  all.push(...arrow({ from: { x: 600, y: 100 }, to: { x: 680, y: 100 }, label: "installs / loads" }).elements);
  all.push(...arrow({ from: { x: 440, y: 220 }, to: { x: 440, y: 140 }, label: "imports pkg/agent" }).elements);
  all.push(...arrow({ from: { x: 440, y: 380 }, to: { x: 440, y: 300 }, label: "REST + WebSocket" }).elements);
  all.push(...arrow({ from: { x: 600, y: 260 }, to: { x: 810, y: 140 }, label: "syncs registry", dash: true }).elements);

  // Boundary labels
  all.push(...label({ x: 40, y: 80, w: 200, text: "Standalone binary\n(no platform needed)", fontSize: 12, color: "#7048e8" }).elements);
  all.push(...label({ x: 40, y: 240, w: 200, text: "Platform layer\n(imports agent-core)", fontSize: 12, color: "#2f9e44" }).elements);
  all.push(...label({ x: 40, y: 400, w: 200, text: "Web layer\n(HTTP only, no Go)", fontSize: 12, color: "#1971c2" }).elements);

  return excalidraw(all);
}

// ─── Write files ─────────────────────────────────────────────────────────────

const diagrams = {
  "01-system-architecture.excalidraw":  diagramSystemArchitecture(),
  "02-tool-execution-model.excalidraw": diagramToolTiers(),
  "03-agent-turn-loop.excalidraw":      diagramTurnLoop(),
  "04-wasm-sandbox.excalidraw":         diagramWASMSandbox(),
  "05-skill-loading.excalidraw":        diagramSkillLoading(),
  "06-multi-repo.excalidraw":           diagramRepos(),
};

for (const [filename, content] of Object.entries(diagrams)) {
  writeFileSync(new URL(filename, import.meta.url), content);
  console.log(`✓ ${filename}`);
}

console.log("\nOpen any .excalidraw file at https://excalidraw.com (File → Open)");
console.log("Then run: node export-images.js  to generate PNGs");
