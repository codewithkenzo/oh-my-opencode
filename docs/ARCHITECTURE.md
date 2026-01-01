# oh-my-opencode Architecture

**Generated:** 2026-01-01
**Branch:** dev

## Overview

oh-my-opencode is an OpenCode plugin implementing Claude Code/AmpCode features with multi-model agent orchestration, LSP tools, AST-Grep search, and MCP integrations. It follows an "oh-my-zsh for OpenCode" philosophy.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OpenCode Plugin Host                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                     src/index.ts (Entry Point)                   │ │
│  │  - Config loading & validation                                   │ │
│  │  - Hook registration                                             │ │
│  │  - Agent registration                                            │ │
│  │  - Tool registration                                             │ │
│  │  - MCP registration                                              │ │
│  │  - Event routing                                                 │ │
│  └───────────────┬─────────────────┬─────────────────┬─────────────┘ │
│                  │                 │                 │               │
│  ┌───────────────▼───┐ ┌───────────▼───┐ ┌──────────▼──────┐        │
│  │     Agents (15)    │ │   Hooks (27)   │ │   Tools (54+)   │        │
│  │   src/agents/      │ │  src/hooks/    │ │   src/tools/    │        │
│  └───────────────────┘ └───────────────┘ └─────────────────┘        │
│                  │                 │                 │               │
│  ┌───────────────▼───┐ ┌───────────▼───┐ ┌──────────▼──────┐        │
│  │   Features (7)     │ │    MCPs (3)    │ │   Auth (1)      │        │
│  │  src/features/     │ │   src/mcp/     │ │   src/auth/     │        │
│  └───────────────────┘ └───────────────┘ └─────────────────┘        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                  Shared Utilities (17 modules)                   │ │
│  │                       src/shared/                                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Config Schema (Zod)                           │ │
│  │                       src/config/                                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
oh-my-opencode/
├── src/
│   ├── index.ts           # Plugin entry point (701 lines)
│   ├── agents/            # 15 AI agents + utilities
│   │   ├── index.ts       # Exports builtinAgents, createBuiltinAgents
│   │   ├── types.ts       # BuiltinAgentName, AgentOverrideConfig
│   │   ├── utils.ts       # Factory pattern, config merging
│   │   ├── musashi.ts     # Primary orchestrator (Opus 4.5)
│   │   ├── kenja-advisor.ts        # Strategic advisor (GLM 4.7)
│   │   ├── shisho-researcher.ts    # External research (Gemini Flash)
│   │   ├── ninja-explorer.ts       # Codebase exploration (Grok)
│   │   ├── shokunin-designer.ts    # UI design (Gemini Pro High)
│   │   ├── takumi-builder.ts       # Frontend (MiniMax M2.1)
│   │   ├── builder.ts              # Backend/Daiku (GLM 4.7)
│   │   ├── hayai-builder.ts        # Fast bulk edits (Grok)
│   │   ├── tantei-debugger.ts      # Visual debug (Gemini Flash)
│   │   ├── koji-debugger.ts        # Backend debug (Gemini Flash)
│   │   ├── sakka-writer.ts         # Docs (Gemini Flash Preview)
│   │   ├── miru-observer.ts        # PDF/image analysis (Gemini Flash)
│   │   ├── seichou-growth.ts       # Growth marketing
│   │   ├── senshi-distributor.ts   # Distribution
│   │   ├── tsunagi-networker.ts    # Networking
│   │   ├── build-prompt.ts         # Shared builder prompts
│   │   └── plan-prompt.ts          # Shared planner prompts
│   │
│   ├── hooks/             # 27 lifecycle hooks
│   │   ├── index.ts       # Exports all hook creators
│   │   ├── AGENTS.md      # Hook documentation
│   │   ├── [22 directories]  # Hook implementations
│   │   └── [5 standalone .ts files]
│   │
│   ├── tools/             # 54+ tools across 23 directories
│   │   ├── index.ts       # Exports builtinTools
│   │   ├── AGENTS.md      # Tool documentation
│   │   ├── lsp/           # 11 LSP tools
│   │   ├── ast-grep/      # 2 AST tools
│   │   ├── grep/          # Content search
│   │   ├── glob/          # File pattern matching
│   │   └── [19 more tool directories]
│   │
│   ├── features/          # Claude Code compatibility
│   │   ├── background-agent/           # Task management
│   │   ├── claude-code-agent-loader/   # Load agents
│   │   ├── claude-code-command-loader/ # Load commands
│   │   ├── claude-code-mcp-loader/     # Load MCPs
│   │   ├── claude-code-session-state/  # Session persistence
│   │   ├── claude-code-skill-loader/   # Load skills
│   │   └── hook-message-injector/      # Message injection
│   │
│   ├── mcp/               # 3 MCP servers
│   │   ├── index.ts       # createBuiltinMcps factory
│   │   ├── types.ts       # McpNameSchema
│   │   ├── context7.ts    # Documentation lookup
│   │   ├── websearch-exa.ts  # Web search
│   │   └── grep-app.ts    # GitHub code search
│   │
│   ├── auth/              # Authentication
│   │   └── antigravity/   # Google OAuth (14 files)
│   │
│   ├── config/            # Configuration
│   │   ├── schema.ts      # Zod schemas (227 lines)
│   │   └── index.ts       # Type exports
│   │
│   └── shared/            # 17 utility modules
│       ├── deep-merge.ts     # Config merging (13 uses)
│       ├── logger.ts         # Logging (46 uses)
│       ├── toast.ts          # Notifications (16 uses)
│       ├── dynamic-truncator.ts  # Output truncation
│       └── [13 more utilities]
│
├── assets/
│   └── oh-my-opencode.schema.json  # Generated JSON schema
│
├── script/
│   ├── build-schema.ts    # JSON schema generator
│   ├── publish.ts         # Publishing script
│   └── generate-changelog.ts
│
└── dist/                  # Build output (ESM + .d.ts)
```

## Services/Modules

### 1. Agent System

| Agent | Model | Purpose | Mode |
|-------|-------|---------|------|
| Musashi | google/claude-opus-4-5-thinking | Primary orchestrator | primary |
| Kenja - advisor | zai-coding-plan/glm-4.7 | Architecture, code review | subagent |
| Shisho - researcher | google/gemini-3-flash | Multi-repo analysis, docs | subagent |
| Ninja - explorer | opencode/grok-code | Fast codebase exploration | subagent |
| Daiku - builder | zai-coding-plan/glm-4.7 | Backend/APIs/databases | subagent |
| Shokunin - designer | google/gemini-3-pro-high | UI design language | subagent |
| Takumi - builder | minimax/MiniMax-M2.1 | Frontend components | subagent |
| Hayai - builder | opencode/grok-code | Fast bulk edits | subagent |
| Tantei - debugger | google/gemini-3-flash | Visual debugging | subagent |
| Koji - debugger | google/gemini-3-flash | Backend debugging | subagent |
| Sakka - writer | google/gemini-3-flash-preview | Technical docs | subagent |
| Miru - observer | google/gemini-3-flash | PDF/image analysis | subagent |
| Seichou - growth | - | Growth marketing | subagent |
| Senshi - distributor | - | Distribution | subagent |
| Tsunagi - networker | - | Networking | subagent |

**Registration**: Factory pattern via `createBuiltinAgents()` with override support.

### 2. Hook System

| Category | Hooks | Purpose |
|----------|-------|---------|
| Context Injection | directory-agents-injector, directory-readme-injector, rules-injector, compaction-context-injector, skill-enforcer, agents-md-enforcer | Auto-inject relevant context |
| Session Management | session-recovery, anthropic-auto-compact, preemptive-compaction, empty-message-sanitizer, thinking-block-validator | Handle session lifecycle |
| Output Control | comment-checker, tool-output-truncator | Control agent output quality |
| Notifications | session-notification, background-notification, auto-update-checker | OS/user notifications |
| Behavior Enforcement | todo-continuation-enforcer, keyword-detector, think-mode, agent-usage-reminder | Enforce agent behavior |
| Environment | non-interactive-env, interactive-bash-session, context-window-monitor, browser-relay | Adapt to runtime environment |
| Compatibility | claude-code-hooks | Claude Code settings.json support |

**Hook Events**: PreToolUse, PostToolUse, UserPromptSubmit, Stop, onSummarize

### 3. Tool System

| Category | Count | Examples |
|----------|-------|----------|
| LSP | 11 | hover, goto_definition, find_references, rename, code_actions |
| AST | 2 | ast_grep_search, ast_grep_replace |
| File Search | 2 | grep, glob |
| Session | 4 | session_list, session_read, session_search, session_info |
| Background | 3 | background_task, background_output, background_cancel |
| External APIs | 30+ | context7, exa, runware, civitai, raindrop, beads, glare |

### 4. MCP Servers

| MCP | URL | Purpose |
|-----|-----|---------|
| context7 | mcp.context7.com/mcp | Official documentation lookup |
| websearch_exa | mcp.exa.ai/mcp | Real-time web search |
| grep_app | mcp.grep.app | GitHub code search |

## Shared Contracts (Types/Schemas)

### Zod Schemas (src/config/schema.ts)

```typescript
// Agent names - SINGLE SOURCE OF TRUTH
BuiltinAgentNameSchema = z.enum([
  "Musashi", "Kenja - advisor", "Shisho - researcher", "Ninja - explorer",
  "Shokunin - designer", "Takumi - builder", "Daiku - builder", "Hayai - builder",
  "Tantei - debugger", "Koji - debugger", "Sakka - writer", "Miru - observer",
  "Senshi - distributor", "Seichou - growth", "Tsunagi - networker"
])

// Hook names - SINGLE SOURCE OF TRUTH  
HookNameSchema = z.enum([27 hook names...])

// MCP names - SINGLE SOURCE OF TRUTH
McpNameSchema = z.enum(["websearch_exa", "context7", "grep_app"])

// Main config schema
OhMyOpenCodeConfigSchema = z.object({
  disabled_mcps, disabled_agents, disabled_hooks,
  agents, claude_code, google_auth, musashi_agent,
  skills, experimental, auto_update
})
```

### TypeScript Types (src/agents/types.ts)

```typescript
// Mirrors Zod schema - DUPLICATED
type BuiltinAgentName = 
  | "Musashi" | "Kenja - advisor" | ... 

type AgentOverrideConfig = Partial<AgentConfig> & { prompt_append?: string }
```

## API Routes / Entry Points

### Plugin Lifecycle Hooks

| Hook | Purpose | Handler Location |
|------|---------|-----------------|
| `config` | Modify OpenCode config | index.ts:402 |
| `event` | Handle lifecycle events | index.ts:583 |
| `chat.message` | Process messages | index.ts:381 |
| `prompt.submit` | Handle prompt submission | index.ts:386 |
| `tool.execute.before` | Pre-tool processing | index.ts:648 |
| `tool.execute.after` | Post-tool processing | index.ts:669 |
| `experimental.chat.messages.transform` | Transform messages | index.ts:392 |

### Config Loading Priority

1. User: `~/.config/opencode/oh-my-opencode.json`
2. Project: `.opencode/oh-my-opencode.json`

Project config overrides user config via `mergeConfigs()`.

## Inconsistencies Found

### P0 - Critical

*None currently - all critical issues fixed*

### P1 - High

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **Deprecated hooks still exported** | hooks/memory-capture/, hooks/memory-injector/ | Dead code in bundle | Remove directories, update exports |
| **Type duplication** | schema.ts vs types.ts | Drift risk | Use Zod infer only, remove manual types |

### P2 - Medium

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **Tool structure inconsistency** | 7 tools have minimal structure | Inconsistent patterns | Standardize all tools |
| **Missing constants.ts** | slashcommand/, beads/, raindrop/ | No TOOL_NAME constant | Add missing files |
| **Standalone hook files** | 5 .ts files in hooks/ root | Mixed patterns | Move to directories |

### P3 - Low

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **Export pattern varies** | Various tool index.ts | Minor confusion | Standardize exports |

## Tool Directory Structure Patterns

### Full Structure (16 tools)
```
tool-name/
├── constants.ts   # TOOL_NAME, TOOL_DESCRIPTION
├── types.ts       # Zod schemas, interfaces
├── tools.ts       # Tool implementation
├── index.ts       # Barrel exports
└── utils.ts       # Helpers (optional)
```

### Minimal Structure (7 tools)
```
tool-name/
└── index.ts       # Everything in one file
```

**Minimal tools**: context7, exa, codesearch, grep-app, webfetch + partial: beads, raindrop

## Hook Structure Patterns

### Directory-based (22 hooks)
```
hook-name/
├── constants.ts   # Hook name
├── index.ts       # createXXXHook function
└── types.ts       # Optional
```

### Standalone files (5 hooks)
- `context-window-monitor.ts`
- `empty-task-response-detector.ts`
- `session-notification.ts`
- `todo-continuation-enforcer.ts`
- `tool-output-truncator.ts`

## Recommendations

### Immediate (P0/P1)

1. **Fix disabled_mcps bug** - Filter before merge in index.ts
2. **Remove deprecated hooks** - Delete memory-capture/, memory-injector/
3. **Consolidate types** - Use Zod infer, remove manual type definitions

### Short-term (P2)

4. **Standardize tool structure** - Add missing constants.ts files
5. **Migrate standalone hooks** - Move 5 standalone files to directories
6. **Document minimal tools** - Add AGENTS.md or comments explaining why minimal

### Long-term (P3)

7. **Schema validation in CI** - Add test ensuring Zod schema matches JSON schema
8. **Tool generator script** - Scaffold new tools with correct structure
9. **Hook generator script** - Scaffold new hooks with correct structure

## Build & Deploy

```bash
bun run typecheck      # Type check
bun run build          # ESM + declarations + schema
bun run build:schema   # Schema only
bun test               # Run tests
```

**Deployment**: GitHub Actions workflow_dispatch only
```bash
gh workflow run publish -f bump=patch
```

## Dependencies

- **Runtime**: @opencode-ai/plugin, @opencode-ai/sdk, zod, @ast-grep/napi
- **Build**: bun, typescript
- **Trusted**: @ast-grep/cli, @code-yeongyu/comment-checker
