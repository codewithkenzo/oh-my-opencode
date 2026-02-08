# TOOLS KNOWLEDGE BASE

## OVERVIEW

102 tools across 7 lazy-loaded profiles: core (23), research (9), browser (18), native-search (2), external-api (23), local-service (15), orchestration (12). High-performance C++ bindings via @ast-grep/napi.

## STRUCTURE

```
tools/
├── [tool-name]/
│   ├── index.ts      # Barrel export
│   ├── def.ts        # Lightweight metadata (description + args schema)
│   ├── tools.ts      # Business logic, ToolDefinition (imports from def.ts)
│   ├── types.ts      # Zod schemas
│   └── constants.ts  # Fixed values, descriptions
├── lsp/              # 11 tools: goto_definition, references, symbols, diagnostics, rename
├── ast-grep/         # 2 tools: search, replace (25 languages via NAPI)
├── delegate-task/    # Category-based agent routing (761 lines)
├── session-manager/  # 4 tools: list, read, search, info
├── grep/             # Custom grep with timeout/truncation
├── glob/             # Custom glob with 60s timeout, 100 file limit
├── interactive-bash/ # Tmux session management
├── look-at/          # Multimodal PDF/image analysis
├── skill/            # Skill execution
├── skill-mcp/        # Skill MCP operations
├── mcp-query/        # Custom MCP (.mcp.json) discovery/query tool
├── slashcommand/     # Slash command dispatch
├── call-omo-agent/   # Direct agent invocation
└── background-task/  # background_output, background_cancel
```

## TOOL CATEGORIES

| Category | Tools | Purpose |
|----------|-------|---------|
| **LSP** | lsp_goto_definition, lsp_find_references, lsp_symbols, lsp_diagnostics, lsp_prepare_rename, lsp_rename | Semantic code intelligence |
| **Search** | ast_grep_search, ast_grep_replace, grep, glob | Pattern discovery |
| **Session** | session_list, session_read, session_search, session_info | History navigation |
| **Agent** | delegate_task, call_omo_agent, background_output, background_cancel | Task orchestration |
| **System** | interactive_bash, look_at | CLI, multimodal |
| **MCP/Skill** | skill, skill_mcp, mcp_query, slashcommand | Skill execution + custom MCP discovery |

## TOOL PROFILES

Tools are grouped into 7 profiles for lazy loading (`src/tools/tool-profiles.ts`):

| Profile | Count | Purpose |
|---------|-------|---------|
| core | 23 | LSP, grep, glob, session, tickets - always loaded |
| research | 9 | Exa, Context7, grep_app, zread - web/docs search |
| browser | 18 | Playwright browser automation |
| native-search | 2 | AST-Grep search/replace |
| external-api | 23 | Runware, Civitai, Ripple - external APIs |
| local-service | 15 | Syncthing - local service integration |
| orchestration | 12 | delegate_task, background, skills, interactive_bash |

## HOW TO ADD

1. Create `src/tools/[name]/` with standard files
2. Use `tool()` from `@opencode-ai/plugin/tool`:
   ```typescript
   export const myTool: ToolDefinition = tool({
     description: "...",
     args: { param: tool.schema.string() },
     execute: async (args) => { /* ... */ }
   })
   ```
2b. For lazy-loadable tools, extract metadata to `def.ts`:
   ```typescript
   import { tool } from "@opencode-ai/plugin/tool"

   export const myToolDef = {
     description: "...",
     args: { param: tool.schema.string() },
   }
   ```
   Then spread in `tools.ts`:
   ```typescript
   import { myToolDef } from "./def"

   export const myTool: ToolDefinition = tool({
     ...myToolDef,
     execute: async (args) => { /* ... */ }
   })
   ```
3. Export from `src/tools/index.ts`
4. Add to `builtinTools` object

### Lazy Loading (createLazyTool)

For tools that should only load their implementation on first use:
```typescript
import { createLazyTool } from "../lazy-tool-wrapper"
import { myToolDef } from "./def"

export const myTool = createLazyTool({
  name: "my_tool",
  description: myToolDef.description,
  args: myToolDef.args,
  loader: () => import("./tools").then((m) => m.myTool),
})
```

### Hybrid Tools (createHybridTool)

For tools that prefer MCP but fall back to builtin:
```typescript
import { createHybridTool } from "../hybrid-router"

export const myTool = createHybridTool({
  mcpName: "my-mcp",
  mcpToolName: "my_tool",
  builtinDef: myToolDef,
  builtinLoader: () => import("./tools"),
})
```

### Lazy Loading (def.ts Pattern)

- Split lightweight metadata (`description`, `args`) into `def.ts`, keep execution in `tools.ts`.
- This enables true lazy loading by avoiding heavy implementation imports during tool discovery.
- Current adopters: `agent-browser`, `ast-grep`, `civitai`, `raindrop`, `runware`, `syncthing`, `ticket`, `unified-model-search`.

## LSP SPECIFICS

- **Client**: `client.ts` manages stdio lifecycle, JSON-RPC
- **Singleton**: `LSPServerManager` with ref counting
- **Protocol**: Standard LSP methods mapped to tool responses
- **Capabilities**: definition, references, symbols, diagnostics, rename

## AST-GREP SPECIFICS

- **Engine**: `@ast-grep/napi` for 25+ languages
- **Patterns**: Meta-variables `$VAR` (single), `$$$` (multiple)
- **Performance**: Rust/C++ layer for structural matching

## ANTI-PATTERNS

- **Sequential bash**: Use `&&` or delegation, not loops
- **Raw file ops**: Never mkdir/touch in tool logic
- **Sleep**: Use polling loops, tool-specific wait flags
- **Heavy sync**: Keep PreToolUse light, computation in tools.ts
