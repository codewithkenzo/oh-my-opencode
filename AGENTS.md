# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06T00:00:00+09:00
**Version:** 4.0.0-alpha.1
**Branch:** v4

## OVERVIEW

OpenCode plugin: multi-model agent orchestration (Claude Opus 4-6, Kimi K2P5, Gemini 3 Flash). 7 specialized agents, 35 lifecycle hooks, 27 tool directories (LSP, AST-Grep, delegation, supermemory, ticket, etc.), full OpenCode compatibility. "oh-my-zsh" for OpenCode.

## STRUCTURE

```
oh-my-opencode/
├── src/
│   ├── agents/        # 7 AI agents (8 with boulder mode) - see src/agents/AGENTS.md
│   ├── hooks/         # 35 lifecycle hooks (29 dirs + 6 standalone) - see src/hooks/AGENTS.md
│   ├── tools/         # 27 tool directories - see src/tools/AGENTS.md
│   ├── features/      # Background agents, skill loader, 14 feature modules - see src/features/AGENTS.md
│   ├── shared/        # Cross-cutting utilities - see src/shared/AGENTS.md
│   ├── cli/           # CLI installer, doctor - see src/cli/AGENTS.md
│   ├── mcp/           # Built-in MCPs - see src/mcp/AGENTS.md
│   ├── config/        # Zod schema, TypeScript types
│   └── index.ts       # Main plugin entry (601 lines)
├── script/            # build-schema.ts, build-binaries.ts
├── packages/          # 7 platform-specific binaries
└── dist/              # Build output (ESM + .d.ts)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add agent | `src/agents/` | Create .ts with factory, add to `agentSources` in utils.ts |
| Add hook | `src/hooks/` | Create dir with `createXXXHook()`, register in index.ts |
| Add tool | `src/tools/` | Dir with index/types/constants/tools.ts |
| Add MCP | `src/mcp/` | Create config, add to index.ts |
| Add skill | `src/features/builtin-skills/` | Create dir with SKILL.md |
| Add command | `src/features/builtin-commands/` | Add template + register in commands.ts |
| Config schema | `src/config/schema.ts` | Zod schema, run `bun run build:schema` |
| Background agents | `src/features/background-agent/` | manager.ts (1335 lines) |
| Orchestrator | `src/hooks/atlas/` | Main orchestration hook (773 lines) |

## TDD (Test-Driven Development)

**MANDATORY.** RED-GREEN-REFACTOR:
1. **RED**: Write test → `bun test` → FAIL
2. **GREEN**: Implement minimum → PASS
3. **REFACTOR**: Clean up → stay GREEN

**Rules:**
- NEVER write implementation before test
- NEVER delete failing tests - fix the code
- Test file: `*.test.ts` alongside source
- BDD comments: `#given`, `#when`, `#then`

## CONVENTIONS

- **Package manager**: Bun only (`bun run`, `bun build`, `bunx`)
- **Types**: bun-types (NEVER @types/node)
- **Build**: `bun build` (ESM) + `tsc --emitDeclarationOnly`
- **Exports**: Barrel pattern via index.ts
- **Naming**: kebab-case dirs, `createXXXHook`/`createXXXTool` factories
- **Testing**: BDD comments, 99 test files
- **Temperature**: 0.1 for code agents, max 0.3

## ANTI-PATTERNS

| Category | Forbidden |
|----------|-----------|
| Package Manager | npm, yarn - Bun exclusively |
| Types | @types/node - use bun-types |
| File Ops | mkdir/touch/rm/cp/mv in code - use bash tool |
| Publishing | Direct `bun publish` - GitHub Actions only |
| Versioning | Local version bump - CI manages |
| Type Safety | `as any`, `@ts-ignore`, `@ts-expect-error` |
| Error Handling | Empty catch blocks |
| Testing | Deleting failing tests |
| Agent Calls | Sequential - use `delegate_task` parallel |
| Hook Logic | Heavy PreToolUse - slows every call |
| Commits | Giant (3+ files), separate test from impl |
| Temperature | >0.3 for code agents |
| Trust | Agent self-reports - ALWAYS verify |

## AGENT MODELS

| Agent | Codename | Model | Purpose |
|-------|----------|-------|---------|
| Musashi | Orchestrator | claude-opus-4-6 | Primary orchestrator, delegation, tickets, memory |
| Musashi - boulder | Boulder mode | claude-opus-4-6 | Autonomous execution mode |
| Musashi - plan | Planner | claude-opus-4-6 | Conditional planning for 3+ step tasks |
| K9 - advisor | Consultant | kimi-for-coding/k2p5 | High-IQ consultation, debugging, architecture |
| X1 - explorer | Explorer | gemini-3-flash | Fast contextual grep (read-only) |
| R2 - researcher | Researcher | kimi-for-coding/k2p5 | External docs, repos, web search |
| T4 - frontend builder | Frontend | kimi-for-coding/k2p5 | UI/UX, vision, browser |
| D5 - backend builder | Backend | kimi-for-coding/k2p5 | API, database, server logic |

## COMMANDS

```bash
bun run typecheck      # Type check
bun run build          # ESM + declarations + schema
bun run rebuild        # Clean + Build
bun test               # 99 test files
```

## DEPLOYMENT

**GitHub Actions workflow_dispatch ONLY**
1. Commit & push changes
2. Trigger: `gh workflow run publish -f bump=patch`
3. Never `bun publish` directly, never bump version locally

## COMPLEXITY HOTSPOTS

| File | Lines | Description |
|------|-------|-------------|
| `src/agents/orchestrator-sisyphus.ts` | 1600 | Musashi orchestrator prompt |
| `src/features/background-agent/manager.ts` | 1335 | Task lifecycle, concurrency |
| `src/features/builtin-skills/skills.ts` | 1203 | Skill definitions |
| `src/agents/prometheus-prompt.ts` | 1196 | Planner agent prompt |
| `src/tools/delegate-task/tools.ts` | 1046 | Category-based delegation |
| `src/hooks/atlas/index.ts` | 773 | Orchestrator hook |
| `src/cli/config-manager.ts` | 664 | JSONC config parsing |
| `src/index.ts` | 601 | Main plugin entry |
| `src/tools/lsp/client.ts` | 596 | LSP JSON-RPC client |
| `src/agents/atlas.ts` | 572 | Boulder mode agent |

## MCP ARCHITECTURE

Three-tier system:
1. **Built-in**: websearch (Exa), context7 (docs), grep_app (GitHub)
2. **Claude Code compat**: .mcp.json with `${VAR}` expansion
3. **Skill-embedded**: YAML frontmatter in skills

## CONFIG SYSTEM

- **Zod validation**: `src/config/schema.ts`
- **JSONC support**: Comments, trailing commas
- **Multi-level**: Project (`.opencode/`) → User (`~/.config/opencode/`)

## NOTES

- **OpenCode**: Requires >= 1.0.150
- **Flaky tests**: ralph-loop (CI timeout), session-state (parallel pollution)
- **Trusted deps**: @ast-grep/cli, @ast-grep/napi, @code-yeongyu/comment-checker
- **Legacy agent names auto-mapped via LEGACY_TO_MUSASHI_NAME in agents/utils.ts**
