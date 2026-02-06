# MCP KNOWLEDGE BASE

## OVERVIEW

3 built-in remote MCP servers: web search, documentation, code search. HTTP/SSE transport.

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
| websearch | mcp.exa.ai | Real-time web search | EXA_API_KEY |
| context7 | mcp.context7.com | Library docs | None |
| grep_app | mcp.grep.app | GitHub code search | None |

## CONFIG PATTERN

```typescript
export const mcp_name = {
  type: "remote" as const,
  url: "https://...",
  enabled: true,
  oauth: false as const,
}
```

## USAGE

```typescript
import { createBuiltinMcps } from "./mcp"

const mcps = createBuiltinMcps()              // Enable all
const mcps = createBuiltinMcps(["websearch"]) // Disable specific
```

## HOW TO ADD

1. Create `src/mcp/my-mcp.ts`
2. Add to `allBuiltinMcps` in `index.ts`
3. Add to `McpNameSchema` in `types.ts`

## v4 NOTE

Additional MCP tools (exa, context7, grep_app, zread) are also available as direct tool wrappers in `src/tools/`. The MCP versions here are the built-in remote servers; the tool versions provide richer integration with agent context.

## NOTES

- **Remote only**: HTTP/SSE, no stdio
- **Disable**: User can set `disabled_mcps: ["name"]`
- **Exa**: Requires `EXA_API_KEY` env var
