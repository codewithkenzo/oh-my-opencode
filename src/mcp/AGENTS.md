# BUILT-IN MCP CONFIGURATIONS

## OVERVIEW

3 remote MCP servers for web search, documentation, and code search. All use HTTP/SSE transport, no OAuth.

## STRUCTURE

```
mcp/
├── index.ts        # createBuiltinMcps() factory
├── websearch.ts    # Exa AI web search
├── context7.ts     # Library documentation
├── grep-app.ts     # GitHub code search
├── types.ts        # McpNameSchema
└── index.test.ts   # Tests
```

## MCP SERVERS

| Name | URL | Purpose | Auth |
|------|-----|---------|------|
| **websearch** | `mcp.exa.ai` | Real-time web search | `EXA_API_KEY` header |
| **context7** | `mcp.context7.com` | Official library docs | None |
| **grep_app** | `mcp.grep.app` | GitHub code search | None |

## CONFIG PATTERN

All MCPs follow identical structure:
```typescript
export const mcp_name = {
  type: "remote" as const,
  url: "https://...",
  enabled: true,
  oauth: false as const,  // Explicit disable
  headers?: { ... },      // Optional auth
}
```

## USAGE

```typescript
import { createBuiltinMcps } from "./mcp"

// Enable all
const mcps = createBuiltinMcps()

// Disable specific
const mcps = createBuiltinMcps(["websearch"])
```

## HOW TO ADD

1. Create `src/mcp/my-mcp.ts`:
   ```typescript
   export const my_mcp = {
     type: "remote" as const,
     url: "https://mcp.example.com",
     enabled: true,
     oauth: false as const,
   }
   ```
2. Add to `allBuiltinMcps` in `index.ts`
3. Add to `McpNameSchema` in `types.ts`

## NOTES

- **Remote only (this directory)**: Built-in MCPs in `src/mcp/` use HTTP/SSE
- **Local/stdio support**: Also supported via `src/features/skill-mcp-manager/` (skill-embedded MCP in SKILL.md YAML frontmatter or `mcp.json`)
- **Custom MCP discovery**: `src/tools/mcp-query/` supports project/user `.mcp.json` MCP servers
- **Disable config**: User can disable built-ins via `disabled_mcps: ["name"]`
- **Exa requires key**: Set `EXA_API_KEY` env var for websearch
