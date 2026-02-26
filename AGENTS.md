# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-08
**Commit:** 7671cacd
**Branch:** sprint5-cleanup

## OVERVIEW

OpenCode plugin implementing multi-model agent orchestration (Claude Opus 4.5, GPT-5.2, Gemini 3, GLM-4.7). 41 hook directories (38 configurable in `HookNameSchema`), 107 tools grouped into 7 lazy-loaded profiles, 8 specialized agents, Claude Code compatibility layer. "oh-my-zsh" for OpenCode.

## STRUCTURE

```
oh-my-opencode/
├── src/
│   ├── agents/        # 8 AI agents (Musashi, K9, X1, R2, T4, D5) - see src/agents/AGENTS.md
│   ├── hooks/         # 41 hook directories (38 configurable + internal hooks) - see src/hooks/AGENTS.md
│   ├── tools/         # 34 tool directories, 107 tools with lazy-loaded profiles and routing - see src/tools/AGENTS.md
│   ├── features/      # Background agents, Claude Code compat layer - see src/features/AGENTS.md
│   ├── shared/        # 42 cross-cutting utilities - see src/shared/AGENTS.md
│   ├── cli/           # CLI installer, doctor, run - see src/cli/AGENTS.md
│   ├── mcp/           # Built-in MCPs: websearch, context7, grep_app
│   ├── config/        # Zod schema, TypeScript types
│   └── index.ts       # Main plugin entry (779 lines)
├── script/            # build-schema.ts, publish.ts, build-binaries.ts
├── packages/          # 7 platform-specific binaries
└── dist/              # Build output (ESM + .d.ts)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add agent | `src/agents/` | Create factory and register in `agentSources` in `src/agents/utils.ts` |
| Add hook | `src/hooks/` | Create dir with `createXXXHook()`, register in index.ts |
| Add tool | `src/tools/` | Dir with index/types/constants/tools.ts, add to `builtinTools` |
| Hashline edit tool | `src/tools/hashline-edit/` | Line-addressed Edit workflow + hashline parsing |
| Add MCP | `src/mcp/` | Create config, add to index.ts |
| Add skill | `src/features/builtin-skills/` | Create dir with SKILL.md |
| Builtin commands | `src/features/builtin-commands/templates/` | 11 templates: brainstorm, debug, finish, handoff, init-deep, ralph-loop, refactor, review, start-work, verify, worktree |
| `/handoff` command | `src/features/builtin-commands/templates/handoff.ts` | Session continuity summary template |
| LSP behavior | `src/tools/lsp/` | client.ts (connection), tools.ts (handlers) |
| AST-Grep | `src/tools/ast-grep/` | cli.ts + tools.ts wrap @ast-grep binaries |
| Config schema | `src/config/schema.ts` | Zod schema, run `bun run build:schema` after changes |
| Claude Code compat | `src/features/claude-code-*-loader/` | Agent/command/mcp/plugin loaders (plus `src/features/opencode-skill-loader/`) |
| Background agents | `src/features/background-agent/` | manager.ts (1385 lines) for task lifecycle |
| Skill MCP | `src/features/skill-mcp-manager/` | MCP servers embedded in skills |
| CLI installer | `src/cli/install.ts` | Interactive TUI (462 lines) |
| Doctor checks | `src/cli/doctor/checks/` | 9 check modules (`auth`, `config`, `dependencies`, `gh`, `lsp`, `mcp`, `opencode`, `plugin`, `version`) |
| Orchestrator | `src/hooks/atlas/` | Main orchestration hook (785 lines) |

## TDD (Test-Driven Development)

**MANDATORY for new features and bug fixes.** Follow RED-GREEN-REFACTOR:

| Phase | Action | Verification |
|-------|--------|--------------|
| **RED** | Write test describing expected behavior | `bun test` -> FAIL (expected) |
| **GREEN** | Implement minimum code to pass | `bun test` -> PASS |
| **REFACTOR** | Improve code quality, remove duplication | `bun test` -> PASS (must stay green) |

**Rules:**
- NEVER write implementation before test
- NEVER delete failing tests to "pass" - fix the code
- Test file naming: `*.test.ts` alongside source
- BDD comments: `#given`, `#when`, `#then` (same as AAA)

## CONVENTIONS

- **Package manager**: Bun only (`bun run`, `bun build`, `bunx`)
- **Types**: bun-types (not @types/node)
- **Build**: `bun build` (ESM) + `tsc --emitDeclarationOnly`
- **Exports**: Barrel pattern in index.ts; explicit named exports
- **Naming**: kebab-case directories, `createXXXHook`/`createXXXTool` factories
- **Testing**: BDD comments `#given/#when/#then`, 132 test files
- **Temperature**: 0.1 for code agents, max 0.3

## ANTI-PATTERNS (THIS PROJECT)

| Category | Forbidden |
|----------|-----------|
| **Package Manager** | npm, yarn - use Bun exclusively |
| **Types** | @types/node - use bun-types |
| **File Ops** | mkdir/touch/rm/cp/mv in code - agents use bash tool |
| **Publishing** | Direct `bun publish` - use GitHub Actions workflow_dispatch |
| **Versioning** | Local version bump - managed by CI |
| **Date References** | Year 2024 - use current year |
| **Type Safety** | `as any`, `@ts-ignore`, `@ts-expect-error` |
| **Error Handling** | Empty catch blocks `catch(e) {}` |
| **Testing** | Deleting failing tests to "pass" |
| **Agent Calls** | Sequential agent calls - use `delegate_task` for parallel |
| **Tool Access** | Broad tool access - prefer explicit `include` |
| **Hook Logic** | Heavy PreToolUse computation - slows every tool call |
| **Commits** | Giant commits (3+ files = 2+ commits), separate test from impl |
| **Temperature** | >0.3 for code agents |
| **Trust** | Trust agent self-reports - ALWAYS verify independently |

## UNIQUE STYLES

- **Platform**: Union type `"darwin" | "linux" | "win32" | "unsupported"`
- **Optional props**: Extensive `?` for optional interface properties
- **Flexible objects**: `Record<string, unknown>` for dynamic configs
- **Agent tools**: `tools: { include: [...] }` or `tools: { exclude: [...] }`
- **Hook naming**: `createXXXHook` function convention
- **Factory pattern**: Components created via `createXXX()` functions

## AGENT MODELS

| Agent | Default Model | Purpose |
|-------|---------------|---------|
| Musashi | anthropic/claude-opus-4-5 | Primary orchestrator |
| Musashi - boulder | anthropic/claude-sonnet-4-5 | Master orchestrator via delegate_task() |
| Musashi - plan | anthropic/claude-opus-4-5 | Planning mode (Prometheus) |
| K9 - advisor | openai/gpt-5.2 | Read-only strategic consultant |
| X1 - explorer | anthropic/claude-haiku-4-5 | Fast codebase exploration |
| R2 - researcher | opencode/glm-4.7 | Multi-repo analysis, docs, GitHub search |
| T4 - frontend builder | (user config) | Frontend implementation (UI, components, styles, client logic) |
| D5 - backend builder | (user config) | Backend implementation (APIs, data layers, tooling, server logic) |

Agent metadata skills are resolved at boot and prepended to each agent's system prompt. See `src/agents/AGENTS.md` for the full skill assignment table.

## COMMANDS

```bash
bun run typecheck      # Type check
bun run build          # ESM + declarations + schema
bun run rebuild        # Clean + Build
bun run build:schema   # Schema only
bun test               # Run tests (132 files, 1642 pass, 1 skip, 4662 expect() calls)
```

## TOOL PROFILES

7 profiles for lazy-loaded tool groups:

| Profile | Tools | Purpose |
|---------|-------|---------|
| core | LSP, grep, glob, session, tickets | Always loaded |
| research | Exa, Context7, grep_app, zread | Web/docs search |
| browser | Playwright browser tools | Browser automation |
| native-search | AST-Grep search/replace | Structural code search |
| external-api | Runware, Civitai, Ripple | External service APIs |
| local-service | Syncthing tools | Local service integration |
| orchestration | delegate_task, background, skills | Agent coordination |

## CATEGORY ROUTING

`delegate_task(category=...)` routes to agents with auto-injected skills:

| Category | Agent | Auto Skills |
|----------|-------|-------------|
| visual-engineering | T4 - frontend builder | frontend-ui-ux, frontend-stack, component-stack, ... |
| ultrabrain | D5 - backend builder | blueprint-architect, effect-ts-expert, ... |
| quick | D5 - backend builder | git-master, git-workflow |
| most-capable | D5 - backend builder | blueprint-architect, testing-stack, ... |
| writing | D5 - backend builder | kenzo-agents-md, research-tools, ... |
| general | D5 - backend builder | linearis, git-workflow, research-tools, ... |

Config: `src/tools/delegate-task/constants.ts` (`CATEGORY_AGENTS`, `CATEGORY_SKILLS`)

## DEPLOYMENT

**GitHub Actions workflow_dispatch only**

1. Never modify package.json version locally
2. Commit & push changes
3. Trigger `publish` workflow: `gh workflow run publish -f bump=patch`

**Critical**: Never `bun publish` directly. Never bump version locally.

## CI PIPELINE

- **ci.yml**: Parallel test/typecheck -> build -> auto-commit schema on master -> rolling `next` draft release
- **publish.yml**: Manual workflow_dispatch -> version bump -> changelog -> 8-package OIDC npm publish -> force-push master

## COMPLEXITY HOTSPOTS

| File | Lines | Description |
|------|-------|-------------|
| `src/agents/atlas/` | 480 (6 files) | Master orchestrator module (boulder flow) |
| `src/features/builtin-skills/skills/git-master.ts` | 1108 | Git operations policy, commit/PR workflow rules |
| `src/agents/prometheus-prompt.ts` | 1195 | Planning agent, interview mode, Momus loop |
| `src/features/background-agent/manager.ts` | 1385 | Task lifecycle, concurrency, notification batching |
| `src/hooks/atlas/index.ts` | 785 | Atlas orchestration hook implementation |
| `src/hooks/runtime-fallback/` | 3518 (13 files) | Model fallback/retry orchestration with error classification |
| `src/tools/delegate-task/tools.ts` | 801 | Category-based task delegation |
| `src/cli/config-manager.ts` | 608 | JSONC parsing, multi-level config |
| `src/agents/sisyphus.ts` | 320 | Main Musashi agent prompt |
| `src/features/builtin-commands/templates/refactor.ts` | 619 | Refactoring command template |
| `src/tools/lsp/client.ts` | 599 | LSP protocol, JSON-RPC |

## MCP ARCHITECTURE

Three-tier MCP system:
1. **Built-in**: `websearch` (Exa), `context7` (docs), `grep_app` (GitHub search)
2. **Claude Code compatible**: `.mcp.json` files with `${VAR}` expansion
3. **Skill-embedded**: YAML frontmatter in skills (e.g., playwright)

## CONFIG SYSTEM

- **Zod validation**: `src/config/schema.ts`
- **JSONC support**: Comments and trailing commas
- **Multi-level**: Project (`.opencode/`) -> User (`~/.config/opencode/`)
- **CLI doctor**: Validates config and reports errors

## NOTES

- **Testing**: Bun native test (`bun test`), BDD-style, 132 files (last run: 1642 pass, 1 skip, 0 fail; 4662 `expect()` calls)
- **OpenCode**: Requires >= 1.0.150
- **Multi-lang docs**: README.md (EN), README.ko.md (KO), README.ja.md (JA), README.zh-cn.md (ZH-CN)
- **Config**: `~/.config/opencode/oh-my-opencode.json` (user) or `.opencode/oh-my-opencode.json` (project)
- **Trusted deps**: @ast-grep/cli, @ast-grep/napi, @code-yeongyu/comment-checker
- **Claude Code Compat**: Full compatibility layer for settings.json hooks, commands, skills, agents, MCPs
- **Recent additions**: hashline-edit tool, `/handoff` command, runtime fallback hook stack, background session cascade cancel
- **Flaky tests**: 2 known flaky tests (ralph-loop CI timeout, session-state parallel pollution)
