---
description: Map oh-my-opencode plugin structure
---

# Map OMO Codebase

Quick orientation for oh-my-opencode plugin development.

## Structure

```
oh-my-opencode/
├── src/
│   ├── index.ts           # Plugin entry (config, events, tools)
│   ├── agents/            # 15 AI agents (Musashi, Ninja, Daiku, etc.)
│   ├── hooks/             # 27 lifecycle hooks
│   ├── tools/             # 54+ tools (LSP, AST, grep, etc.)
│   ├── features/          # Claude Code compatibility loaders
│   ├── mcp/               # 3 MCP servers (context7, exa, grep_app)
│   ├── auth/antigravity/  # Google OAuth
│   ├── config/            # Zod schemas
│   └── shared/            # Utilities
├── .opencode/
│   ├── command/           # Slash commands
│   └── skill/             # Skills
└── docs/ARCHITECTURE.md   # Full architecture doc
```

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Plugin entry, registers all hooks/tools/agents |
| `src/agents/musashi.ts` | Primary orchestrator prompt |
| `src/config/schema.ts` | Zod schemas (single source of truth) |
| `docs/ARCHITECTURE.md` | Full architecture documentation |
| `AGENTS.md` | Project knowledge base |

## Agent Models

| Agent | Model | Purpose |
|-------|-------|---------|
| Musashi | google/claude-opus-4-5-thinking | Orchestrator |
| Daiku | zai-coding-plan/glm-4.7 | Backend builder |
| Takumi | minimax/MiniMax-M2.1 | Frontend builder |
| Ninja | opencode/grok-code | Fast codebase exploration |

## Quick Commands

```bash
bun run typecheck    # Type check
bun run build        # Build + schema
bun test             # Run tests
```

## Adding Features

- **Agent**: `src/agents/` + register in `index.ts`
- **Hook**: `src/hooks/[name]/` + export from `index.ts`
- **Tool**: `src/tools/[name]/` + add to `builtinTools`
- **Command**: `.opencode/command/[name].md`
- **Skill**: `.opencode/skill/[name]/SKILL.md`
