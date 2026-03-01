# Agent Platform

An AI agent platform for building, running, and managing autonomous AI agents. Create agents with custom personas and skills, run them from the CLI or browser, stream output in real time, and manage everything through a web portal.

> **Status**: All 9 phases complete + WASM sandbox system. Standalone agent binary, Go API server, React web portal, and community skill registry all operational. 150+ tests passing across repos.

---

## Repositories

| Repository | Language | Description | Status |
|---|---|---|---|
| [**agent-core**](https://github.com/bitop-dev/agent-core) | Go | Standalone CLI binary + `pkg/agent` library | ✅ 100+ files, 15K lines, 130+ tests |
| [**agent-platform-api**](https://github.com/bitop-dev/agent-platform-api) | Go | REST API server with auth, persistence, WebSocket | ✅ 90 handlers, 22 tests |
| [**agent-platform-web**](https://github.com/bitop-dev/agent-platform-web) | TypeScript | Bun + Vite + React web portal | ✅ 13 pages, industrial theme |
| [**agent-platform-skills**](https://github.com/bitop-dev/agent-platform-skills) | Go → WASM | Community skill registry (git-native) | ✅ 10 skills (4 WASM + 6 instruction) |
| [**agent-platform-docs**](https://github.com/bitop-dev/agent-platform-docs) (this repo) | Markdown | Architecture, design docs, planning | ✅ Comprehensive |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          platform-web (Bun + Vite + React)                  │
│    Dashboard · Agents · Runs · Skills · Teams · Keys        │
└────────────────────────────┬────────────────────────────────┘
                             │ REST + WebSocket
┌────────────────────────────▼────────────────────────────────┐
│                platform-api (Go/Fiber)                      │
│  JWT Auth · Agent CRUD · Runs · Skills · Schedules · Teams  │
│  WebSocket Hub · Registry Sync · Health/Metrics             │
└──────┬────────────────────────────┬─────────────────────────┘
       │ imports pkg/agent          │ syncs registry.json
┌──────▼──────────────┐    ┌───────▼──────────────────┐
│    agent-core       │    │   Skill Sources (GitHub)  │
│    (Go binary)      │    │                           │
│                     │    │  bitop-dev/skills (default)│
│  · 3 LLM Providers  │    │  mycorp/skills (custom)   │
│  · 9 Core Tools     │    │  anyone/skills (community)│
│  · WASM Sandbox     │    └───────────────────────────┘
│  · Skill Loader     │
│  · MCP Client       │
│  · Context Mgmt     │
└─────────────────────┘
```

### Tool Execution Model

```
Tool Executor
├── native      — 9 built-in Go tools (bash, read_file, agent_spawn, etc.)
├── wasm        — .wasm modules via Wazero (skill tools, sandboxed)
├── container   — Docker/Podman OCI containers (full isolation)
├── mcp         — MCP server protocol (external tool servers)
└── subprocess  — legacy raw scripts (dev/backward compat)
```

All community skill tools are compiled to **WebAssembly** and run inside Wazero's sandbox:
- **Zero external dependencies** — no Python, no pip, no CLI tools to install
- **Capability-based security** — tools can only access granted filesystem paths and network hosts
- **Portable** — .wasm runs on any OS where agent-core runs

---

## What's Built

### agent-core ✅

Standalone CLI binary that runs AI agents with tool calling, WASM-sandboxed skills, and safety features.

- **3 LLM providers**: OpenAI Chat Completions, Anthropic Messages, OpenAI Responses
- **9 core tools**: `bash` (opt-out), `read_file`, `write_file`, `edit_file`, `list_dir`, `grep`, `http_fetch`, `tasks`, `agent_spawn`
- **WASM sandbox**: Wazero runtime with HTTP host functions, capability-based filesystem + network security
- **Container sandbox**: Docker/Podman support for full OS-level isolation
- **Skill system**: install from GitHub registries, auto-install on run, WASM + subprocess dispatch
- **MCP support**: stdio + HTTP transports for external tool servers
- **ReliableProvider**: 3-level failover, exponential backoff, API key rotation
- **Context compaction**: proactive + reactive LLM-summarize with tool boundary guard
- **Safety**: loop detection, credential scrubbing, approval manager, heartbeat, deferred-action detection
- **`pkg/agent` public API**: Builder pattern for embedding in other Go programs

### agent-platform-api ✅

Go REST API server wrapping agent-core with persistence, auth, and real-time streaming.

- **90 REST endpoints** with JWT auth, rate limiting, request IDs
- **Run execution**: async goroutine pool, WebSocket live streaming
- **Scheduling**: cron/interval/one-shot with overlap policies
- **Teams**: RBAC (owner/admin/member/viewer), invitations
- **API key management**: AES-256-GCM encryption at rest
- **Health**: `/healthz`, `/readyz`, `/metrics` endpoints
- **Graceful shutdown**: drain scheduler → drain runner → timeout

### agent-platform-web ✅

React SPA with "AgentOps Command Center" industrial theme.

- **13 pages**: dashboard, agents, runs, run detail, skills, teams, schedules, API keys, login/register
- **Industrial design**: dark charcoal + amber/gold, LED indicators, scan-line overlays, JetBrains Mono
- **Live streaming**: WebSocket run output with collapsed event timeline
- **Tech**: Bun, Vite, React 19, Tailwind v4, shadcn/ui, React Query, Zustand

### agent-platform-skills ✅

Git-native community skill registry with WASM-sandboxed tools.

**Tool skills (WASM):**
| Skill | Description | Network |
|---|---|---|
| 🔍 `web_search` | DuckDuckGo search | `html.duckduckgo.com` |
| 🌐 `web_fetch` | Fetch URL → markdown | Target host |
| 🐙 `github` | GitHub issues & PRs | `api.github.com` |
| 💬 `slack_notify` | Slack webhook POST | `hooks.slack.com` |

**Instruction-only skills:** `summarize`, `report`, `code_review`, `data_extract`, `write_doc`, `debug_assist`

---

## Quick Start

### Option A: Standalone CLI

```bash
cd agent-core && go build -o bin/agent-core ./cmd/agent-core/
export OPENAI_API_KEY=sk-...

# Install skills
./bin/agent-core skill install web_search
./bin/agent-core skill install summarize

# Run — WASM sandbox auto-initializes
./bin/agent-core run -c examples/research-agent.yaml \
  --mission "Search for Go 1.24 changes and summarize"
```

### Option B: Full Platform

```bash
# 1. Start API
cd agent-platform-api
PORT=8090 JWT_SECRET=dev-secret-change-me-32chars-min \
  DATABASE_URL=sqlite://data/platform.db go run ./cmd/api

# 2. Start Web
cd agent-platform-web
echo "VITE_API_URL=http://localhost:8090" > .env
bun install && bun run dev --port 3002

# 3. Open http://localhost:3002
```

---

## Build Phases

| Phase | Status | What |
|---|---|---|
| **0 — Planning** | ✅ | Architecture docs, deep dives, diagrams |
| **1 — agent-core** | ✅ | CLI binary, 3 providers, 9 tools, skills, MCP, safety |
| **2 — platform-api** | ✅ | REST API, auth, persistence, WebSocket, skill sources |
| **3 — platform-web** | ✅ | 13-page React app, industrial theme, live streaming |
| **4 — Skills** | ✅ | 10 skills (4 WASM + 6 instruction), git-native registry |
| **5 — Scheduler** | ✅ | Cron/interval/one-shot, overlap policies, timezone-aware |
| **6 — Polish** | ✅ | Token counting, pagination, run filtering |
| **7 — Orchestration** | ✅ | agent_spawn, parent/child runs, parallel sub-agents |
| **8 — Hardening** | ✅ | Health checks, metrics, graceful shutdown, audit log |
| **9 — Multi-User** | ✅ | Teams, RBAC, invitations, team-scoped resources |
| **WASM Sandbox** | ✅ | Wazero runtime, HTTP host functions, capability security |

---

## Documentation

All planning and architecture docs: [`BLDER_DOCS/`](BLDER_DOCS/)

| Document | Description |
|---|---|
| [architecture/overview.md](BLDER_DOCS/architecture/overview.md) | System architecture + component map |
| [architecture/agent-core.md](BLDER_DOCS/architecture/agent-core.md) | Agent runtime design |
| [architecture/skill-registry.md](BLDER_DOCS/architecture/skill-registry.md) | Skill discovery and execution |
| [architecture/web-platform.md](BLDER_DOCS/architecture/web-platform.md) | Web portal design |
| [architecture/data-model.md](BLDER_DOCS/architecture/data-model.md) | Database schema |
| [agent-core-deep-dive.md](BLDER_DOCS/agent-core-deep-dive.md) | Full agent runtime reference |
| [skill-registry-deep-dive.md](BLDER_DOCS/skill-registry-deep-dive.md) | Skill system deep dive + WASM migration |
| [tools-deep-dive.md](BLDER_DOCS/tools-deep-dive.md) | Tool system: core, WASM, container, MCP |
| [roadmap.md](BLDER_DOCS/roadmap.md) | Build plan |

---

## License

MIT
