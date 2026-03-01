# Agent Platform — Planning Repository

This repository contains the architecture, design documentation, and reference implementations for an **AI agent platform** — a system for building, running, and orchestrating autonomous AI agents.

> **Status**: Planning & design phase. No production code yet — this repo contains only documentation, reference specs, diagrams, and design artifacts. The design is thorough enough to begin implementation.

---

## Table of Contents

- [Vision](#vision)
- [Architecture Overview](#architecture-overview)
  - [System Diagram](#system-diagram)
  - [Four Repositories](#four-repositories)
  - [Dependency Rules](#dependency-rules)
- [agent-core — The Standalone Binary](#agent-core--the-standalone-binary)
  - [What It Does](#what-it-does)
  - [Agent Turn Loop](#agent-turn-loop)
  - [CLI Interface](#cli-interface)
  - [Agent Configuration](#agent-configuration)
  - [LLM Providers](#llm-providers)
- [Tools — Three-Tier System](#tools--three-tier-system)
  - [Core Tools (Built-In)](#core-tools-built-in)
  - [Skill Tools (Subprocess)](#skill-tools-subprocess)
  - [MCP Tools (External Servers)](#mcp-tools-external-servers)
- [Skills — The Extension Mechanism](#skills--the-extension-mechanism)
  - [What Is a Skill?](#what-is-a-skill)
  - [Bundled Skills](#bundled-skills)
  - [Skill Tiers](#skill-tiers)
  - [Skill Configuration](#skill-configuration)
  - [Skill Testing](#skill-testing)
  - [Community Registry](#community-registry)
- [Platform Layers](#platform-layers)
  - [platform-api (Go API Server)](#platform-api-go-api-server)
  - [platform-web (Next.js Portal)](#platform-web-nextjs-portal)
  - [Scheduler](#scheduler)
  - [Multi-Agent Orchestration](#multi-agent-orchestration)
- [Build Roadmap](#build-roadmap)
- [Key Design Decisions](#key-design-decisions)
- [Reference Projects](#reference-projects)
- [Documentation Index](#documentation-index)
- [Diagrams](#diagrams)

---

## Vision

A platform where users can:

- **Create agents** with a name, persona, model, and mission
- **Equip agents with skills** — searchable, installable capability packages
- **Run agents** from the CLI (standalone) or the web portal (platform)
- **Schedule agents** to run on cron schedules or event triggers
- **Monitor agents** in real-time — streaming output, tool calls, cost tracking
- **Orchestrate multiple agents** for complex multi-step workflows

The core agent runtime works as a **standalone CLI binary** with no infrastructure required. The web platform adds persistence, scheduling, multi-user support, and a browser UI — but the binary works on its own, today, from your terminal.

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   platform-web (Next.js)                    │
│          Create Agents · Browse Skills · Monitor Runs       │
└────────────────────────────┬────────────────────────────────┘
                             │ REST + WebSocket
┌────────────────────────────▼────────────────────────────────┐
│                   platform-api (Go)                         │
│       Auth · Agent CRUD · Scheduler · Run Persistence       │
└──────┬─────────────────────────────────────┬────────────────┘
       │ imports pkg/agent (Go library)      │ manages jobs
┌──────▼──────────────┐             ┌────────▼────────┐
│    agent-core       │             │   Scheduler     │
│    (Go binary)      │             │  (cron engine)  │
│                     │             └─────────────────┘
│  · LLM Providers    │
│  · Tool Engine      │───────────── skills repo
│  · Skill Loader     │           (community registry)
│  · Session Manager  │
│  · MCP Client       │
└──────┬──────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│                    LLM Providers                            │
│     Anthropic · OpenAI · Google · Ollama · Compatible       │
└─────────────────────────────────────────────────────────────┘
```

### Four Repositories

| Repository | Language | What it is | Depends on |
|---|---|---|---|
| **`agent-core`** | Go | Standalone CLI binary + `pkg/agent` library | skills repo (optional) |
| **`skills`** | Any | Community skill registry (Git repo with SKILL.md files) | nothing |
| **`platform-api`** | Go | HTTP API server with auth, persistence, scheduling | imports `agent-core/pkg/agent` |
| **`platform-web`** | TypeScript | Next.js web portal | calls `platform-api` over HTTP |

### Dependency Rules

These rules keep the system clean and each repo independently useful:

- **`platform-web`** knows nothing about Go. It talks to `platform-api` over HTTP only.
- **`platform-api`** imports `agent-core` as a Go library (`pkg/agent`), never as a subprocess.
- **`agent-core`** works standalone. It never imports or calls the platform.
- **`skills`** is a data repo. No code depends on it — agent-core reads it at install/load time.

---

## agent-core — The Standalone Binary

### What It Does

`agent-core` is a Go binary that takes an agent config (YAML), a mission (text), and runs an autonomous agent loop — calling an LLM, executing tools, managing context, and streaming results to the terminal.

```bash
# Run a one-shot mission
agent-core run --config research-agent.yaml --mission "What are the top Go testing frameworks in 2026?"

# Interactive multi-turn chat
agent-core chat --config dev-agent.yaml

# Pipe input
echo "Summarize this quarter's GitHub issues" | agent-core run --config standup-bot.yaml

# List available tools and skills
agent-core tools --config dev-agent.yaml
agent-core skill list
```

No database. No web server. No Docker. Just a binary, a YAML file, and an API key.

### Agent Turn Loop

The core loop that every agent runs:

```
START (receive mission)
  │
  ▼
Build context (system prompt + skills + conversation history)
  │
  ▼
LLM call (streaming response)
  │
  ▼
Tool calls in response? ──No──► DONE (emit final answer)
  │
  Yes
  │
  ▼
Execute tools (parallel, sandboxed)
  │
  ▼
Append results to history
  │
  ▼
Check limits (max turns · max tokens · loop detection)
  │
  ├── Context full? ──► Compact history (LLM summarize) ──► retry
  ├── Max turns? ──► DONE
  └── OK ──► loop back to "Build context"
```

**Key features in the loop:**
- **Streaming** — text arrives token-by-token, not all at once
- **Parallel tool execution** — independent tool calls run concurrently
- **Context compaction** — when conversation history fills the context window, older turns are LLM-summarized to make room
- **Loop detection** — catches agents stuck in no-progress loops, ping-pong patterns, or repeated failures
- **Tool boundary guard** — never trims history in the middle of a tool call/result sequence
- **Credential scrubbing** — strips API keys and secrets from tool output before feeding back to the LLM

### CLI Interface

```
agent-core [command] [flags]

Commands:
  run          Run an agent with a mission (non-interactive)
  chat         Interactive multi-turn chat
  tools        List tools configured for an agent
  skill        Skill management (list, install, remove, new, test, audit)
  mcp          MCP server management
  sessions     Session management (list, show, clear)
  models       List available models and costs
  validate     Validate agent config file
  providers    List available LLM providers
  version      Show version info
```

### Agent Configuration

Agents are defined in YAML:

```yaml
name: research-agent
description: "Researches topics and produces summaries"

# LLM provider + model
provider: anthropic
model: claude-sonnet-4-20250514

# System prompt — the agent's personality and instructions
system_prompt: |
  You are a research assistant. When given a topic, search the web,
  read relevant sources, and produce a clear, cited summary.

# Skills (bundled, local, or community)
skills:
  - web_search:
      backend: ddg
      max_results: 10
  - web_fetch
  - summarize

# Core tools enabled for this agent
tools:
  core:
    read_file: {}
    list_dir: {}
    grep: {}
    http_fetch: {}
    # bash: not listed = disabled (bash is opt-out)

# Runtime limits
max_turns: 20
timeout_seconds: 300
```

### LLM Providers

Built-in provider support, prioritized by implementation order:

| Priority | Provider | Models | Notes |
|---|---|---|---|
| 1 | **Anthropic** | Claude Sonnet, Opus, Haiku | Best tool use, extended thinking |
| 2 | **OpenAI** | GPT-4o, o3 | Largest user base |
| 3 | **Ollama** | Any local model | Zero cost, offline, privacy |
| 4 | **Google** | Gemini | Long context, multimodal |
| 5 | **OpenAI-compatible** | Groq, Together, OpenRouter | One implementation covers many |

All providers include:
- **Retry with backoff** on transient errors (429, 5xx)
- **API key rotation** — multiple keys cycled on rate limit
- **Model fallback chains** — if the primary model fails, try the backup
- **Error classification** — non-retryable (4xx), retryable (429/5xx), context-exceeded (compact + retry)

---

## Tools — Three-Tier System

Tools are how agents take action. The LLM decides to call a tool; agent-core executes it and feeds the result back. All three tiers present the same interface to the LLM — it doesn't know where a tool comes from.

### Core Tools (Built-In)

Compiled into the binary. Zero install, zero subprocess overhead. Always available.

| Tool | Description | Default |
|---|---|---|
| `bash` | Run shell commands | **Opt-out** (on by default, disable explicitly) |
| `read_file` | Read file contents with offset/limit | On |
| `write_file` | Write or overwrite a file | On |
| `edit_file` | Surgical text replacement in a file | On |
| `list_dir` | List directory contents with metadata | On |
| `grep` | Regex search with context lines | On |
| `http_fetch` | Raw HTTP GET/POST requests | On |
| `tasks` | Session-scoped task checklist for tracking multi-step work | On |

### Skill Tools (Subprocess)

Installed via skill packages. Communicate over stdin/stdout JSON. Written in any language.

```
agent-core spawns process → writes JSON to stdin → reads JSON from stdout
```

**stdin** (what agent-core sends):
```json
{
  "tool_call_id": "tc_001",
  "name": "web_search",
  "arguments": { "query": "Go testing frameworks 2026" },
  "config": { "backend": "ddg", "max_results": 10 }
}
```

**stdout** (what the tool returns):
```json
{
  "content": "1. Go Test Framework Comparison...\n   https://...",
  "is_error": false
}
```

**Sandboxing**: timeout (30s default), output cap (1MB), env var allowlist, locked working directory.

### MCP Tools (External Servers)

Model Context Protocol servers expose tools over stdio or HTTP/SSE. Good for tools needing persistent state (database connections, browser sessions).

```yaml
# In agent config
mcp:
  servers:
    - name: postgres
      transport: stdio
      command: ["uvx", "mcp-server-postgres", "postgresql://localhost/mydb"]
```

MCP is Phase 2 — after core tools and skills are working.

---

## Skills — The Extension Mechanism

### What Is a Skill?

A skill is a self-contained package with two parts:

1. **`SKILL.md`** — YAML frontmatter (metadata) + markdown body (instructions injected into the LLM's system prompt)
2. **`tools/`** — Optional tool schemas (JSON) + implementations (bash/python/binary) that the LLM can call

```
skills/web_search/
├── SKILL.md                    ← metadata + agent instructions
├── tools/
│   ├── web_search.json         ← tool schema (what the LLM sees)
│   └── web_search.py           ← tool implementation (what runs)
└── tests/
    ├── web_search.basic.json           ← test input
    └── web_search.basic.expected.json  ← expected output pattern
```

The SKILL.md frontmatter declares everything about the skill:

```yaml
---
name: web_search
version: 0.1.0
description: "Search the web. Use when: you need current facts. NOT for: questions you can answer from training data."
author: platform-team
tags: [web, search, research]
emoji: 🔍
requires:
  bins: [python3]
config:
  backend:
    type: string
    default: ddg
    enum: [ddg, brave, serper, tavily, searxng]
---
```

### Bundled Skills

Seven skills ship with `agent-core`:

| Skill | What it does | Dependencies |
|---|---|---|
| **`web_search`** | Search via DuckDuckGo (pluggable: Brave, Serper, Tavily, SearXNG) | `python3` |
| **`web_fetch`** | Fetch URL → extract readable markdown content | `python3` |
| **`summarize`** | Condense long text (instruction-only — uses the agent's own LLM) | none |
| **`github`** | Issues, PRs, CI via `gh` CLI | `gh` |
| **`gitlab`** | Issues, MRs, pipelines via `glab` CLI | `glab` |
| **`report`** | Structure output as formatted markdown documents (instruction-only) | none |
| **`send_email`** | Send email via SMTP | SMTP env vars |

Reference implementations with full SKILL.md, tool schemas, and test fixtures: [`BLDER_DOCS/skills/`](BLDER_DOCS/skills/)

### Skill Tiers

| Tier | Where it lives | Versioning |
|---|---|---|
| **Bundled** | Compiled into the `agent-core` binary | Versions with the binary release |
| **Local** | `~/.agent-core/skills/<name>/` | User-managed, no versioning |
| **Community** | Installed from Git URL or registry | Semver via git tags |

**Resolution order**: bundled → local → not found. Local skills can override bundled ones.

### Skill Configuration

Skills accept per-agent configuration from the YAML config. The LLM controls `arguments` (what to do); the human controls `config` (how).

```yaml
skills:
  - github                    # default config
  - web_search:               # custom config
      backend: brave           # use Brave instead of DDG
      max_results: 5
```

Config is passed to the tool subprocess on stdin as a separate `config` field. The LLM never sees it.

### Skill Testing

Three levels of testing, with auto-discovery of test fixtures:

```bash
agent-core skill test ./my-skill/                  # full: validate + eligibility + fixtures
agent-core skill test ./my-skill/ --validate-only   # structure only
agent-core skill test ./my-skill/ --tool web_search  # specific tool
```

Test fixtures use pattern matching for assertions (not exact match):
```json
{
  "is_error": false,
  "content_contains": ["http"],
  "content_not_empty": true
}
```

### Community Registry

The `skills` repo is a Git repository with a static `registry.json` index. **Git-native model** — no hosted registry service needed.

**Publishing**: Submit a PR. Pass CI checks (frontmatter validation, security audit, structure check). Get one maintainer approval. Merge.

**Installing**:
```bash
agent-core skill install web_search              # from registry (short name)
agent-core skill install web_search@1.2.0        # pinned version
agent-core skill install github.com/you/my-skill  # from any Git URL
agent-core skill install ./local-skill/           # from local directory
```

**Install flags**: `--yes` (auto-accept deps for CI/CD), `--skip-deps` (files only), `--from-config agent.yaml` (bulk install).

Full contribution guide: [`BLDER_DOCS/skills/CONTRIBUTING.md`](BLDER_DOCS/skills/CONTRIBUTING.md)

---

## Platform Layers

The platform layers are built **after** agent-core is proven. They add persistence, scheduling, multi-user support, and a web UI — but never replace the core binary.

### platform-api (Go API Server)

Imports `agent-core/pkg/agent` as a library. Wraps it with:

- **REST API** — Agent CRUD, Run management, Skills sync, Auth
- **WebSocket streaming** — Real-time run events (token-by-token, tool calls, cost)
- **Persistence** — PostgreSQL for agents, runs, jobs, users. Object storage for run logs.
- **JWT auth** — Login, token refresh, API key management

### platform-web (Next.js Portal)

Talks to `platform-api` over HTTP only. No Go, no direct database access.

Key pages:
- **Agent Builder** — Multi-step wizard (Identity → Mission → Skills → Schedule → Review)
- **Run Monitor** — Live streaming view of agent execution
- **Skill Hub** — Browse, search, and install skills
- **Dashboard** — Recent runs, active agents, cost tracking
- **Schedule Manager** — Visual cron builder, job list, run history

### Scheduler

Cron engine built into `platform-api`. Supports:

| Trigger type | Example | Description |
|---|---|---|
| `every` | `every 30m` | Interval-based |
| `cron` | `0 9 * * 1-5` | Standard cron expression |
| `at` | `2026-03-15T09:00:00Z` | One-time future execution |
| `webhook` | POST to `/api/v1/webhooks/:id` | Event-triggered |

Built on `robfig/cron` for parsing and `riverqueue/river` for reliable job queuing.

### Multi-Agent Orchestration

Agents can spawn sub-agents for complex tasks via the `agent_spawn` tool:

```
Orchestrator Agent
├── Research Agent 1 (parallel)
├── Research Agent 2 (parallel)
├── Research Agent 3 (parallel)
└── Compiler Agent (waits for all research to finish)
```

Depth-limited (max 3 levels). Sub-runs tracked via `parent_run_id`. Visible as a live tree in the Run Monitor.

---

## Build Roadmap

The project is built in phases. Each phase produces something usable.

| Phase | Repo(s) | Timeline | What's delivered |
|---|---|---|---|
| **0 — Core Runtime** | `agent-core` | Week 1–2 | Agent runs from CLI, streams to terminal |
| **1 — Tools + Skills** | `agent-core` | Week 3–4 | Tool execution, skill loading, full CLI feature set |
| **2 — API Foundation** | `platform-api` | Week 5–7 | REST API, persistent runs, WebSocket streaming |
| **3 — First UI** | `platform-web` | Week 8–9 | Browser-based agent creation + live run monitor |
| **4 — Skill Hub** | `skills` + platform | Week 10–11 | Skill registry live, UI skill picker |
| **5 — Scheduler** | `platform-api` + web | Week 12–13 | Agents run on cron schedules |
| **6 — Skill Library** | `skills` | Week 14–15 | 15+ production skills |
| **7 — Orchestration** | all repos | Week 16–18 | Multi-agent workflows |
| **8 — Hardening** | all repos | Week 19–20 | Production ready (containers, metrics, failover) |
| **9 — Multi-User** | all repos | Future | Teams, roles, OAuth, billing |

**Current status**: Planning complete for Phases 0–1. Ready to begin building `agent-core`.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Standalone-first** | `agent-core` works with no platform | Validates the core loop before building around it. `platform-api` imports it later as a library — no rewrite. |
| **Skills as SKILL.md** | Metadata in frontmatter, instructions in body | One file per skill. Metadata travels with instructions. Follows the pattern proven by openclaw (50+ skills) and zeroclaw. |
| **Subprocess tools** | stdin/stdout JSON protocol | Language-agnostic. Bash, Python, Go, anything. Sandboxed with timeouts, output caps, and env var filtering. |
| **No WASM** | Subprocess sandboxing instead | Go's WASM story is rough (TinyGo limitations, 10-20MB binaries). Subprocess constraints are sufficient for user-installed skills. |
| **Git-native registry** | `registry.json` + Git URLs | No hosted service needed. Homebrew model: PR to publish, clone to install. |
| **DuckDuckGo default** | `web_search` uses DDG with no API key | Zero-friction day one. Pluggable to Brave/Serper/Tavily/SearXNG via config. |
| **bash is opt-out** | Enabled by default, agents can disable | Most agents need shell access. Read-only agents explicitly disable it. |
| **Per-skill config** | Agent YAML → tool subprocess stdin | Human controls `config` (which backend, which server). LLM controls `arguments` (what to search). They never mix. |
| **Hybrid versioning** | Bundled skills version with binary; community skills use semver | Bundled skills don't need independent updates. Community skills do. |
| **Prompted dep install** | Default prompts, `--yes` for CI, `--skip-deps` for power users | Safe for interactive use, automatable for pipelines, skippable for experts. |

---

## Reference Projects

The design is informed by studying four open-source agent systems:

| Project | Language | What we learned |
|---|---|---|
| **[gastown](https://github.com/steveyegge/gastown)** | Go | Multi-agent orchestration patterns, Go project structure |
| **[openclaw](https://github.com/openclaw/openclaw)** | TypeScript | Production skill system (50+ skills), context compaction, tool sandboxing |
| **[zeroclaw](https://github.com/zeroclaw-labs/zeroclaw)** | Rust | ReliableProvider (retry/failover), security audit, loop detection, SKILL.toml manifest |
| **[pi-mono](https://github.com/badlogic/pi-mono)** | TypeScript | Clean event model, turn loop algorithm, multi-provider abstraction |

Detailed analysis: [`BLDER_DOCS/reference-projects.md`](BLDER_DOCS/reference-projects.md)

---

## Documentation Index

All planning documentation lives in [`BLDER_DOCS/`](BLDER_DOCS/).

### Architecture Documents
| Document | Description |
|---|---|
| [architecture/overview.md](BLDER_DOCS/architecture/overview.md) | System-wide architecture diagram and component map |
| [architecture/agent-core.md](BLDER_DOCS/architecture/agent-core.md) | Agent runtime engine — turn loop, providers, events |
| [architecture/skill-registry.md](BLDER_DOCS/architecture/skill-registry.md) | Skill discovery, loading, injection, and execution |
| [architecture/scheduler.md](BLDER_DOCS/architecture/scheduler.md) | Cron-based and event-driven job scheduling |
| [architecture/web-platform.md](BLDER_DOCS/architecture/web-platform.md) | Web portal routes, API endpoints, UI components |
| [architecture/orchestration.md](BLDER_DOCS/architecture/orchestration.md) | Multi-agent coordination — spawn, registry, depth limits |
| [architecture/data-model.md](BLDER_DOCS/architecture/data-model.md) | Full PostgreSQL schema for all entities |

### Deep Dive Documents
| Document | Description |
|---|---|
| [agent-core-deep-dive.md](BLDER_DOCS/agent-core-deep-dive.md) | 920+ lines — Go code samples, YAML config, CLI design, directory structure, 4-week build order |
| [agent-core-gaps.md](BLDER_DOCS/agent-core-gaps.md) | Gap analysis from second-pass reference project review |
| [skill-registry-deep-dive.md](BLDER_DOCS/skill-registry-deep-dive.md) | 800+ lines — 8 gaps analyzed, dependency install flow, testing spec, build order |
| [tools-deep-dive.md](BLDER_DOCS/tools-deep-dive.md) | Three-tier tool system — core tools, subprocess protocol, sandboxing, agent-level config |

### Planning Documents
| Document | Description |
|---|---|
| [tech-stack.md](BLDER_DOCS/tech-stack.md) | Technology choices with rationale per repo |
| [roadmap.md](BLDER_DOCS/roadmap.md) | 9-phase build plan with deliverables and success criteria |
| [repository-structure.md](BLDER_DOCS/repository-structure.md) | Multi-repo boundaries, dependency graph, dev workflow |
| [reference-projects.md](BLDER_DOCS/reference-projects.md) | Analysis of 4 open-source agent projects |

### Skills & Community
| Document | Description |
|---|---|
| [skills/README.md](BLDER_DOCS/skills/README.md) | Index of 7 bundled skill reference implementations |
| [skills/CONTRIBUTING.md](BLDER_DOCS/skills/CONTRIBUTING.md) | Community skill submission guide — requirements, naming, PR process |

Skill reference implementations (SKILL.md + tool schemas + test fixtures):
[`web_search`](BLDER_DOCS/skills/web_search/) ·
[`web_fetch`](BLDER_DOCS/skills/web_fetch/) ·
[`summarize`](BLDER_DOCS/skills/summarize/) ·
[`github`](BLDER_DOCS/skills/github/) ·
[`gitlab`](BLDER_DOCS/skills/gitlab/) ·
[`report`](BLDER_DOCS/skills/report/) ·
[`send_email`](BLDER_DOCS/skills/send_email/)

---

## Diagrams

Architecture diagrams in Excalidraw format (editable) and PNG (viewable). Located in [`BLDER_DOCS/diagrams/`](BLDER_DOCS/diagrams/).

| Diagram | Description |
|---|---|
| [System Architecture](BLDER_DOCS/diagrams/01-system-architecture.png) | All 4 repos + providers + storage + MCP connections |
| [Tool Tiers](BLDER_DOCS/diagrams/02-tool-tiers.png) | Three-tier tool system: core → skill → MCP |
| [Agent Turn Loop](BLDER_DOCS/diagrams/03-agent-turn-loop.png) | The main loop as a flowchart |
| [Skill Install & Loading](BLDER_DOCS/diagrams/04-skill-loading.png) | Install pipeline + runtime loading flow |
| [Multi-Repo Architecture](BLDER_DOCS/diagrams/05-multi-repo.png) | 4-repo dependency graph with layering rules |

To edit: open any `.excalidraw` file at [excalidraw.com](https://excalidraw.com) → File → Open.

To regenerate all diagrams:
```bash
cd BLDER_DOCS/diagrams
node generate.js        # regenerate .excalidraw files from code
node export-images.js   # export to PNG (requires Playwright)
```
