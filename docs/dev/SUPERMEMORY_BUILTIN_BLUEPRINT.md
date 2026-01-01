# Supermemory Built-in Tool Blueprint

**Status:** Draft  
**Created:** 2026-01-01  
**Author:** Musashi (orchestrated)

## Overview

Port supermemory from external plugin (`opencode-supermemory`) to built-in oh-my-opencode tool.

## Motivation

1. **Debugging complexity** - External plugin makes debugging compaction issues harder
2. **Dependency management** - Single codebase easier to maintain
3. **Internal access** - Built-in tool can access oh-my-opencode internal state
4. **Reliability** - No plugin loading race conditions

## Current State

### External Plugin Structure (opencode-supermemory)

```
~/dev/opencode-supermemory/src/
├── index.ts           # Plugin entry + tool definition (~450 lines)
├── config.ts          # Config loading (~70 lines)
├── cli.ts             # CLI (not needed)
├── types/index.ts     # Type definitions (~40 lines)
└── services/
    ├── client.ts      # Supermemory API client (~180 lines)
    ├── integration.ts # oh-my-opencode integration API (~85 lines)
    ├── context.ts     # Prompt formatting (~65 lines)
    ├── tags.ts        # Container tag generation (~37 lines)
    ├── privacy.ts     # PII stripping (~13 lines)
    └── logger.ts      # Logging
```

**Total:** ~900 lines of code

### Dependencies

- `supermemory` npm package (Supermemory SDK)
- `SUPERMEMORY_API_KEY` env var or `~/.config/opencode/supermemory.json`

### Integration Points in oh-my-opencode

1. `src/hooks/preemptive-compaction/supermemory.ts` - Dynamic import wrapper
2. `src/hooks/preemptive-compaction/index.ts` - Memory injection during compaction
3. `src/config/schema.ts` - `experimental.inject_supermemory_context` option
4. 12 agent prompts reference the `supermemory` tool

## Proposed Structure

```
src/tools/supermemory/
├── index.ts           # Export tool + createSupermemoryTool
├── types.ts           # MemoryScope, MemoryType, etc.
├── constants.ts       # Config defaults, API URL
├── tools.ts           # Tool handlers (add, search, profile, list, forget)
├── client.ts          # SupermemoryClient class
├── formatters.ts      # Output formatters
└── utils.ts           # Tags, privacy, context helpers
```

## Implementation Phases

### Phase 1: Port Core Tool (2-3 hours)

1. Create `src/tools/supermemory/` directory structure
2. Port types from `types/index.ts`
3. Port client from `services/client.ts`
4. Port tool handlers from `index.ts`
5. Add to `src/tools/index.ts` exports
6. Add `supermemory` to builtinTools

### Phase 2: Port Integration API (1 hour)

1. Port `services/integration.ts` to `utils.ts`
2. Update `src/hooks/preemptive-compaction/supermemory.ts` to use built-in
3. Remove dynamic import - use direct import

### Phase 3: Config Integration (30 min)

1. Add supermemory config to `OhMyOpenCodeConfigSchema`
2. Merge config loading with existing oh-my-opencode config
3. Add to JSON schema

### Phase 4: Remove Plugin Dependency (30 min)

1. Remove `opencode-supermemory` from package.json
2. Update AGENTS.md documentation
3. Update README with new config location

## Config Schema Addition

```typescript
export const SupermemoryConfigSchema = z.object({
  apiKey: z.string().optional(),
  similarityThreshold: z.number().min(0).max(1).default(0.6),
  maxMemories: z.number().default(5),
  maxProjectMemories: z.number().default(10),
  maxProfileItems: z.number().default(5),
  injectProfile: z.boolean().default(true),
  containerTagPrefix: z.string().default("opencode"),
  filterPrompt: z.string().optional(),
})
```

## Tool API (unchanged)

```typescript
supermemory({
  mode: "add" | "search" | "profile" | "list" | "forget" | "help",
  content?: string,       // for add
  query?: string,         // for search
  type?: MemoryType,      // project-config, architecture, etc.
  scope?: MemoryScope,    // user | project
  memoryId?: string,      // for forget
  limit?: number          // for search/list
})
```

## Migration Path

### For Users

No breaking changes - tool API stays the same. Config moves from:
- `~/.config/opencode/supermemory.json` → `~/.config/opencode/oh-my-opencode.json` under `supermemory` key

### For oh-my-opencode

1. Add `supermemory` npm package to dependencies
2. Port code as described
3. Update compaction hook to use built-in
4. Remove dynamic import fallback

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supermemory SDK breaking changes | Tool breaks | Pin version, wrap in adapter |
| API key management | Config confusion | Support both env var and config file |
| Code bloat | Larger bundle | Minimal - ~900 lines, no heavy deps |
| Dual maintenance | Extra work | Plugin can be deprecated |

## Decision Points

1. **Keep plugin as fallback?** - Recommend NO, clean break
2. **Chat.message injection?** - Port the memory injection on first message
3. **Memory nudge detection?** - Port the "remember this" keyword detection

## Success Criteria

- [ ] All 6 tool modes work (add, search, profile, list, forget, help)
- [ ] Compaction memory injection works
- [ ] First-message context injection works (optional)
- [ ] Config loads from oh-my-opencode.json
- [ ] Tests pass
- [ ] Build succeeds

## Effort Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Core Tool | 2-3 hours |
| Phase 2: Integration | 1 hour |
| Phase 3: Config | 30 min |
| Phase 4: Cleanup | 30 min |
| **Total** | **4-5 hours** |

## Next Steps

1. Approve this blueprint
2. Start Phase 1 implementation
3. Test incrementally
4. Deploy and monitor
