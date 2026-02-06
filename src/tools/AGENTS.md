# TOOLS KNOWLEDGE BASE

## OVERVIEW

27 tool directories: LSP (6), AST-Grep (2), Search (2), Session (4), Agent delegation (4), System (2), Skill (3), Custom integrations (10+).

## STRUCTURE

```
tools/
├── [tool-name]/
│   ├── index.ts      # Barrel export
│   ├── tools.ts      # ToolDefinition
│   ├── types.ts      # Zod schemas
│   └── constants.ts  # Fixed values
├── lsp/              # 6 tools: definition, references, symbols, diagnostics, rename, prepare-rename
├── ast-grep/         # 2 tools: search, replace (25 languages)
├── delegate-task/    # Category-based routing (1046 lines)
├── call-omo-agent/   # Direct agent invocation
├── background-task/  # background_output, background_cancel
├── session-manager/  # 4 tools: list, read, search, info
├── grep/             # Custom grep with timeout
├── glob/             # 60s timeout, 100 file limit
├── interactive-bash/ # Tmux session management
├── look-at/          # Multimodal PDF/image analysis
├── multiedit/        # Multi-edit single file
├── skill/            # Skill execution
├── skill-mcp/        # Skill MCP operations
├── slashcommand/     # Slash command dispatch
├── supermemory/      # Persistent memory (add, search, profile, list, forget)
├── ticket/           # File-based ticket system (create, list, show, start, close, dep)
├── raindrop/         # Raindrop.io bookmark management
├── syncthing/        # Syncthing file sync management
├── runware/          # AI image generation (Runware Sonic)
├── civitai/          # AI model search (Civitai)
├── system-notify/    # Desktop notifications
├── webfetch/         # URL content fetching
├── exa/              # Exa AI web search
├── codesearch/       # Exa code search
├── context7/         # Context7 library docs
├── grep-app/         # GitHub code search
└── zread/            # Z.AI repo search (search, file, structure)
```

## TOOL CATEGORIES

| Category | Tools | Purpose |
|----------|-------|---------|
| LSP | lsp_goto_definition, lsp_find_references, lsp_symbols, lsp_diagnostics, lsp_prepare_rename, lsp_rename | Semantic code intelligence |
| Search | ast_grep_search, ast_grep_replace, grep, glob | Pattern discovery |
| Session | session_list, session_read, session_search, session_info | History navigation |
| Agent | delegate_task, call_omo_agent, background_output, background_cancel | Task orchestration |
| System | interactive_bash, look_at, system_notify, multiedit | CLI, multimodal, editing |
| Skill | skill, skill_mcp, slashcommand | Skill execution |
| Memory | supermemory | Persistent memory across sessions |
| Tickets | ticket_list, ticket_show, ticket_create, ticket_start, ticket_close, ticket_dep, ticket_undep, ticket_ready, ticket_blocked | Project tracking |
| Research | exa_websearch, exa_codesearch, context7_resolve, context7_query, grep_app_search, zread_search, zread_file, zread_structure, webfetch | External knowledge |
| Integrations | raindrop (bookmarks), syncthing (file sync), runware (AI images), civitai (AI models) | External services |

## HOW TO ADD

1. Create `src/tools/[name]/` with standard files
2. Use `tool()` from `@opencode-ai/plugin/tool`
3. Export from `src/tools/index.ts`
4. Add to `builtinTools` object

## LSP SPECIFICS

- **Client**: `client.ts` manages stdio, JSON-RPC (596 lines)
- **Singleton**: `LSPServerManager` with ref counting
- **Capabilities**: definition, references, symbols, diagnostics, rename

## AST-GREP SPECIFICS

- **Engine**: `@ast-grep/napi` for 25+ languages
- **Patterns**: `$VAR` (single), `$$$` (multiple)

## ANTI-PATTERNS

- **Sequential bash**: Use `&&` or delegation
- **Raw file ops**: Never mkdir/touch in tool logic
- **Sleep**: Use polling loops
