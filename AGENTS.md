# PROJECT KNOWLEDGE BASE

**Generated:** 2025-12-26T00:00:00+09:00
**Commit:** 0172241
**Branch:** dev

## OVERVIEW

OpenCode plugin implementing Claude Code/AmpCode features. Multi-model agent orchestration (GPT-5.2, Claude, Gemini, Grok, MiniMax), LSP tools (11), AST-Grep search, MCP integrations (context7, websearch_exa, grep_app). "oh-my-zsh" for OpenCode.

## FORK-SPECIFIC CHANGES

This fork includes enhancements beyond upstream:

- **Memory hooks**: memory-capture and memory-injector for persistent context across sessions (requires Ollama with mxbai-embed-large)
- **Antigravity context tracking**: All google/* models now track Antigravity context for multi-account load balancing
- **Sisyphus enhancements**: Async/parallel task execution improvements, skill-awareness for detecting and using custom skills
- **Context notifications**: Notifies at 20/40/60/80% context window usage
- **UX improvements**: Fixed compaction toast display issues

## STRUCTURE

```
oh-my-opencode/
├── src/
│   ├── agents/        # AI agents (7): Sisyphus, oracle, librarian, explore, frontend, document-writer, multimodal-looker
│   ├── hooks/         # 21 lifecycle hooks - see src/hooks/AGENTS.md
│   ├── tools/         # LSP, AST-Grep, Grep, Glob, etc. - see src/tools/AGENTS.md
│   ├── mcp/           # MCP servers: context7, websearch_exa, grep_app
│   ├── features/      # Claude Code compatibility - see src/features/AGENTS.md
│   ├── config/        # Zod schema, TypeScript types
│   ├── auth/          # Google Antigravity OAuth (antigravity/)
│   ├── shared/        # Utilities: deep-merge, pattern-matcher, logger, etc.
│   └── index.ts       # Main plugin entry (OhMyOpenCodePlugin)
├── script/            # build-schema.ts, publish.ts, generate-changelog.ts
├── assets/            # JSON schema
└── dist/              # Build output (ESM + .d.ts)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add agent | `src/agents/` | Create .ts, add to builtinAgents in index.ts, update types.ts |
| Add hook | `src/hooks/` | Create dir with createXXXHook(), export from index.ts |
| Add tool | `src/tools/` | Dir with index/types/constants/tools.ts, add to builtinTools |
| Add MCP | `src/mcp/` | Create config, add to index.ts |
| LSP behavior | `src/tools/lsp/` | client.ts (connection), tools.ts (handlers) |
| AST-Grep | `src/tools/ast-grep/` | napi.ts for @ast-grep/napi binding |
| Google OAuth | `src/auth/antigravity/` | OAuth plugin for Google models |
| Config schema | `src/config/schema.ts` | Zod schema, run `bun run build:schema` after changes |
| Claude Code compat | `src/features/claude-code-*-loader/` | Command, skill, agent, mcp loaders |
| Background agents | `src/features/background-agent/` | manager.ts for task management |
| Interactive terminal | `src/tools/interactive-bash/` | tmux session management |

## CONVENTIONS

- **Package manager**: Bun only (`bun run`, `bun build`, `bunx`)
- **Types**: bun-types (not @types/node)
- **Build**: Dual output - `bun build` (ESM) + `tsc --emitDeclarationOnly`
- **Exports**: Barrel pattern - `export * from "./module"` in index.ts
- **Directory naming**: kebab-case (`ast-grep/`, `claude-code-hooks/`)
- **Tool structure**: index.ts, types.ts, constants.ts, tools.ts, utils.ts
- **Hook pattern**: `createXXXHook(input: PluginInput)` returning event handlers
- **Test style**: BDD comments `#given`, `#when`, `#then` (same as AAA)

## ANTI-PATTERNS (THIS PROJECT)

- **npm/yarn**: Use bun exclusively
- **@types/node**: Use bun-types
- **Bash file ops**: Never mkdir/touch/rm/cp/mv for file creation in code
- **Direct bun publish**: GitHub Actions workflow_dispatch only (OIDC provenance)
- **Local version bump**: Version managed by CI workflow
- **Year 2024**: NEVER use 2024 in code/prompts (use current year)
- **Rush completion**: Never mark tasks complete without verification
- **Over-exploration**: Stop searching when sufficient context found

## UNIQUE STYLES

- **Platform**: Union type `"darwin" | "linux" | "win32" | "unsupported"`
- **Optional props**: Extensive `?` for optional interface properties
- **Flexible objects**: `Record<string, unknown>` for dynamic configs
- **Error handling**: Consistent try/catch with async/await
- **Agent tools**: `tools: { include: [...] }` or `tools: { exclude: [...] }`
- **Temperature**: Most agents use `0.1` for consistency
- **Hook naming**: `createXXXHook` function convention

## AGENT MODELS

| Agent | Model | Purpose |
|-------|-------|---------|
| Sisyphus | anthropic/claude-opus-4-5 | Primary orchestrator |
| oracle | openai/gpt-5.2 | Strategic advisor, code review |
| librarian | anthropic/claude-sonnet-4-5 | Multi-repo analysis, docs |
| explore | opencode/grok-code | Fast codebase exploration |
| frontend-ui-ux-engineer | minimax/MiniMax-M2.1 | UI generation |
| document-writer | google/gemini-3-pro-preview | Technical docs |
| multimodal-looker | google/gemini-3-flash | PDF/image analysis |

## COMMANDS

```bash
bun run typecheck      # Type check
bun run build          # ESM + declarations + schema
bun run rebuild        # Clean + Build
bun run build:schema   # Schema only
bun test               # Run tests
```

## TESTING

```bash
bun test                         # Run all tests
bun test path/to/file.test.ts   # Run single test file
bun test --watch                 # Watch mode
```

## DEPLOYMENT

**GitHub Actions workflow_dispatch only**

1. Never modify package.json version locally
2. Commit & push changes
3. Trigger `publish` workflow: `gh workflow run publish -f bump=patch`

**Critical**: Never `bun publish` directly. Never bump version locally.

## CI PIPELINE

- **ci.yml**: Parallel test/typecheck, build verification, auto-commit schema on master
- **publish.yml**: Manual workflow_dispatch, version bump, changelog, OIDC npm publish

## KNOWN ISSUES

- Custom provider limits may not be read properly by OpenCode (use native providers)
- Memory hooks require Ollama running with mxbai-embed-large embedding model
- Antigravity context tracking requires opencode-antigravity-auth@1.2.6+

## NOTES

- **OpenCode**: Requires >= 1.0.150
- **Multi-lang docs**: README.md (EN), README.ko.md (KO), README.ja.md (JA), README.zh-cn.md (ZH-CN)
- **Config**: `~/.config/opencode/oh-my-opencode.json` (user) or `.opencode/oh-my-opencode.json` (project)
- **Trusted deps**: @ast-grep/cli, @ast-grep/napi, @code-yeongyu/comment-checker
