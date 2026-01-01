# Blueprint: Supermemory/OMO Scope Separation Refactor

## Summary
Move compaction logic from supermemory to oh-my-opencode. Supermemory becomes memory-only (tool, APIs, profile injection). OMO owns all hooks including compaction and continuation. OMO calls supermemory APIs during compaction for memory context injection.

## Acceptance Criteria
- [ ] Supermemory's `services/compaction.ts` deleted entirely (540 lines)
- [ ] Supermemory exports memory API functions for OMO to call
- [ ] OMO's preemptive-compaction calls supermemory API for memory context
- [ ] No continuation config in supermemory (all in omo's todo-continuation-enforcer)
- [ ] Both plugins work independently (graceful degradation)
- [ ] User behavior unchanged (same memory injection during compaction)

## Technical Approach

### Chosen: Runtime Peer Dependency Pattern
OMO declares supermemory as optional peerDependency, attempts runtime import, degrades gracefully if not available.

### Rejected Alternatives
| Alternative | Why Rejected |
|-------------|--------------|
| Shared MCP tools | Overkill for 2 plugins, adds latency |
| OMO duplicates supermemory client | Code duplication, maintenance burden |
| Plugin communication bus | Too complex for current use case |

## Phase 1: Supermemory Cleanup (TRIVIAL)

### 1.1 Delete compaction.ts
- Remove `src/services/compaction.ts` entirely (540 lines)
- Remove import from `src/index.ts`
- Remove `compactionHook` creation and usage

### 1.2 Remove compaction config
File: `src/config.ts`
Remove from interface and defaults:
- `autoCompactionContinue`
- `continuationPrompt`
- `preserveAgentOnCompaction`

### 1.3 Create integration export
New file: `src/services/integration.ts`
```typescript
import { supermemoryClient } from "./client.js";
import { formatContextForPrompt } from "./context.js";
import { getTags } from "./tags.js";
import { isConfigured, CONFIG } from "../config.js";

export interface SupermemoryIntegration {
  isConfigured: () => boolean;
  fetchProjectMemories: (projectTag: string, limit?: number) => Promise<string[]>;
  formatContext: (profile: any, userMemories: any, projectMemories: any) => string;
  getTags: (directory: string) => { user: string; project: string };
  saveSummary: (content: string, projectTag: string) => Promise<{ id: string } | null>;
}

export function getSupermemoryAPI(): SupermemoryIntegration {
  return {
    isConfigured,
    fetchProjectMemories: async (projectTag: string, limit: number = 10) => {
      if (!isConfigured()) return [];
      try {
        const result = await supermemoryClient.listMemories(projectTag, limit);
        return (result.memories || []).map((m: any) => m.summary || m.content || "").filter(Boolean);
      } catch {
        return [];
      }
    },
    formatContext: formatContextForPrompt,
    getTags,
    saveSummary: async (content: string, projectTag: string) => {
      if (!isConfigured()) return null;
      return supermemoryClient.addMemory(`[Session Summary]\n${content}`, projectTag, { type: "conversation" });
    },
  };
}
```

### 1.4 Export from index.ts
Add to `src/index.ts`:
```typescript
export { getSupermemoryAPI, type SupermemoryIntegration } from "./services/integration.js";
```

## Phase 2: OMO Integration (SHORT)

### 2.1 Add supermemory to peerDependencies
File: `package.json`
```json
{
  "peerDependencies": {
    "opencode-supermemory": ">=1.0.0"
  },
  "peerDependenciesMeta": {
    "opencode-supermemory": { "optional": true }
  }
}
```

### 2.2 Create supermemory integration
New file: `src/hooks/preemptive-compaction/supermemory.ts`
```typescript
import { log } from "../../shared/logger";

interface SupermemoryIntegration {
  isConfigured: () => boolean;
  fetchProjectMemories: (projectTag: string, limit?: number) => Promise<string[]>;
  getTags: (directory: string) => { user: string; project: string };
  saveSummary: (content: string, projectTag: string) => Promise<{ id: string } | null>;
}

let integration: SupermemoryIntegration | null = null;
let loadAttempted = false;

export async function getSupermemoryIntegration(): Promise<SupermemoryIntegration | null> {
  if (loadAttempted) return integration;
  loadAttempted = true;

  try {
    const module = await import("opencode-supermemory");
    if (typeof module.getSupermemoryAPI === "function") {
      integration = module.getSupermemoryAPI();
      log("[preemptive-compaction] supermemory integration loaded");
    }
  } catch {
    log("[preemptive-compaction] supermemory not available, skipping memory injection");
  }

  return integration;
}

export function createMemoryInjectionPrompt(projectMemories: string[]): string {
  if (projectMemories.length === 0) return "";

  return `[COMPACTION CONTEXT - PROJECT MEMORY]

When summarizing this session, preserve the following project knowledge:

## Project Knowledge (from Supermemory)
${projectMemories.map(m => `- ${m}`).join('\n')}

This context is critical for maintaining continuity after compaction.
`;
}
```

### 2.3 Update preemptive-compaction hook
File: `src/hooks/preemptive-compaction/index.ts`

Add before `ctx.client.session.summarize()`:
```typescript
// Inject supermemory context if available
const supermemory = await getSupermemoryIntegration();
if (supermemory?.isConfigured()) {
  try {
    const tags = supermemory.getTags(ctx.directory);
    const memories = await supermemory.fetchProjectMemories(tags.project, 10);
    if (memories.length > 0) {
      const prompt = createMemoryInjectionPrompt(memories);
      // Inject as user message before summarize
      injectHookMessage(sessionID, prompt, { model: { providerID, modelID } });
      log("[preemptive-compaction] memory context injected", { memoriesCount: memories.length });
    }
  } catch (err) {
    log("[preemptive-compaction] failed to inject memory context", { error: String(err) });
  }
}
```

### 2.4 Add experimental config option
File: `src/config/schema.ts`
```typescript
inject_supermemory_context: z.boolean().optional().default(true),
```

## Phase 3: Testing

### Test Cases
1. OMO alone (no supermemory) → compaction works, no memory injection
2. Both plugins → compaction injects memory context
3. Supermemory not configured (no API key) → graceful degradation
4. Supermemory API error → compaction continues, logs error
5. Old supermemory config → shows deprecation warning (optional)

### Verification Commands
```bash
# Build both
cd ~/dev/opencode-supermemory && bun run build
cd ~/dev/oh-my-opencode && bun run build

# Test OMO alone
rm ~/.config/opencode/package.json  # Remove supermemory
opencode  # Should work, no errors

# Test together
# Re-add supermemory, trigger compaction at 85% context
# Check logs for "memory context injected"
```

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Runtime import fails | Low | Low | Graceful degradation, logged |
| Supermemory API slow | Medium | Medium | Don't await in critical path, use timeout |
| Version mismatch | Low | Medium | Use >=1.0.0 peer dependency range |
| Breaking change for users | Low | Medium | Add deprecation warnings, document migration |

## Open Questions
- Should we add `inject_supermemory_context` to experimental config or enable by default?
- Should supermemory's `saveSummary` be called after compaction completes to store the summary?

## Research Sources
- Ninja explorer analysis of supermemory/omo codebase
- Kenja advisor architecture recommendation
- Existing preemptive-compaction implementation

## Migration Notes
Users with old supermemory compaction config:
1. `autoCompactionContinue` → Use omo's `todo-continuation-enforcer` (already handles this)
2. `continuationPrompt` → Not needed, omo handles continuation
3. `preserveAgentOnCompaction` → Fixed in this session, agent preserved automatically

## Files to Modify

### Supermemory
| File | Action |
|------|--------|
| `src/services/compaction.ts` | DELETE |
| `src/services/integration.ts` | CREATE |
| `src/config.ts` | REMOVE 3 config options |
| `src/index.ts` | REMOVE compactionHook, ADD export |

### OMO
| File | Action |
|------|--------|
| `package.json` | ADD peerDependency |
| `src/hooks/preemptive-compaction/supermemory.ts` | CREATE |
| `src/hooks/preemptive-compaction/index.ts` | MODIFY - add memory injection |
| `src/config/schema.ts` | ADD experimental option |

## Effort Estimate
- Phase 1 (Supermemory cleanup): TRIVIAL (<1hr)
- Phase 2 (OMO integration): SHORT (1-2hr)
- Phase 3 (Testing): SHORT (1-2hr)
- **Total: SHORT (3-5hr)**
