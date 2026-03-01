# Writing WASM Tool Skills

This guide covers how to write a skill tool in Go, compile it to WebAssembly, and publish it to a skill registry.

## Overview

WASM tools are standalone executables compiled to WebAssembly (WASI). They:
- Read JSON input from stdin
- Write JSON output to stdout
- Make HTTP requests through host functions (sandbox-gated)
- Run inside Wazero with capability-based security

## Quick Start

### 1. Write the tool

```go
// tools/my_tool/main.go
package main

import (
    "encoding/json"
    "fmt"
    "os"

    "github.com/bitop-dev/agent-core/pkg/hostcall"
)

func main() {
    // Read input from stdin
    var input struct {
        Name      string          `json:"name"`
        Arguments json.RawMessage `json:"arguments"`
    }
    if err := json.NewDecoder(os.Stdin).Decode(&input); err != nil {
        fmt.Fprintf(os.Stderr, "decode input: %v\n", err)
        os.Exit(1)
    }

    // Parse arguments
    var args struct {
        Query string `json:"query"`
    }
    json.Unmarshal(input.Arguments, &args)

    // Make HTTP request through host (respects AllowedHosts)
    body, err := hostcall.HTTPGet("https://api.example.com/search?q=" + args.Query)
    if err != nil {
        output := map[string]any{"error": err.Error()}
        json.NewEncoder(os.Stdout).Encode(output)
        return
    }

    // Return result
    output := map[string]any{
        "content": string(body),
    }
    json.NewEncoder(os.Stdout).Encode(output)
}
```

### 2. Compile to WASM

```bash
GOOS=wasip1 GOARCH=wasm go build -o tools/my_tool.wasm ./tools/my_tool/
```

### 3. Create the tool schema

```json
// tools/my_tool.json
{
  "name": "my_tool",
  "description": "Searches an example API",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query"
      }
    },
    "required": ["query"]
  }
}
```

### 4. Create SKILL.md

```markdown
---
name: my_skill
version: 1.0.0
description: Example WASM skill
runtime: wasm
---

# My Skill

Instructions for the agent when this skill is loaded.
```

### 5. Directory structure

```
my_skill/
├── SKILL.md              # Skill metadata + agent instructions
└── tools/
    ├── my_tool.json      # Tool schema (shown to LLM)
    └── my_tool.wasm      # Compiled WASM binary
```

## Host Functions

WASM modules can't do networking directly. The host provides HTTP through the `agent_host` module:

### Basic HTTP

```go
import "github.com/bitop-dev/agent-core/pkg/hostcall"

// GET
body, err := hostcall.HTTPGet("https://api.example.com/data")

// POST
resp, err := hostcall.HTTPPost("https://api.example.com/submit", jsonPayload)

// Any method
resp, err := hostcall.HTTPRequest("DELETE", "https://api.example.com/items/123", nil)
```

### HTTP with Custom Headers

```go
headers := map[string]string{
    "Authorization": "Bearer " + token,
    "Accept":        "application/json",
}
resp, err := hostcall.HTTPRequestWithHeaders("GET", url, headers, nil)
```

### Error Codes

| Code | Meaning |
|------|---------|
| -1   | Host function failed (bad URL, memory error) |
| -2   | Response exceeds 2MB buffer |
| -3   | Host not allowed by sandbox policy |

## Input/Output Protocol

### Input (stdin)

```json
{
  "name": "my_tool",
  "arguments": {
    "query": "user's input"
  },
  "config": {
    "api_key": "optional-skill-config"
  }
}
```

### Output (stdout)

```json
{
  "content": "Result text shown to the agent",
  "metadata": {
    "source": "optional metadata"
  }
}
```

### Error Output

```json
{
  "error": "Description of what went wrong"
}
```

## Sandbox Capabilities

Tools run with capabilities defined by the agent's config:

```yaml
# agent.yaml
sandbox:
  mode: wasm
  allowed_hosts:
    - api.example.com       # exact match
    - "*.github.com"        # subdomain wildcard
    - "*"                   # unrestricted (use carefully)
  allowed_paths:
    - /home/user/project
  read_only_paths:
    - /etc/config
  max_timeout_sec: 30
  max_memory_mb: 256
```

- **Empty `allowed_hosts`** = no network access
- **`["*"]`** = unrestricted network
- File paths are enforced by WASI filesystem mounting

## Publishing to a Registry

Add your skill to a registry repo's `registry.json`:

```json
{
  "version": "2.0.0",
  "skills": {
    "my_skill": {
      "name": "my_skill",
      "description": "Example WASM skill",
      "version": "1.0.0",
      "tier": "tool",
      "runtime": "wasm",
      "requires_bins": [],
      "tags": ["example"]
    }
  }
}
```

Then push the skill directory to the repo under `skills/my_skill/`.

## Tips

- **Binary size**: Typical WASM tools are 3–4MB. Use `-ldflags="-s -w"` to strip debug info.
- **Response buffer**: Host HTTP responses are capped at 2MB. For larger responses, paginate.
- **Testing**: Test your tool locally before compiling to WASM:
  ```bash
  echo '{"name":"my_tool","arguments":{"query":"test"}}' | go run ./tools/my_tool/
  ```
- **No CGO**: WASM tools must be pure Go (no C dependencies). This is usually fine.
- **Module caching**: The runtime caches compiled modules by content hash. First call ~530ms, subsequent ~3ms.
