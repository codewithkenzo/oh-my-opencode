# Blueprint: Align Beads Tools with bd CLI

## Summary
Align beads tool parameter descriptions with actual bd CLI types/statuses. Position beads as the technical depth layer complementing todowrite.

## Problem
Tool descriptions contain incorrect enums that cause creation failures:
- `beads_create` says `type: task, bug, feature, question` - wrong
- `beads_update` says `status: todo, in_progress, done, blocked` - wrong

## bd CLI Reference

### Types (from `bd create --help`)
```
bug | feature | task | epic | chore | merge-request | molecule | gate
```
Default: `task`

### Statuses (from `bd list --help`)
```
open | in_progress | blocked | deferred | closed
```

### Priorities
```
0 = P0 (critical)
1 = P1 (high)
2 = P2 (medium) - default
3 = P3 (low)
4 = P4 (nice-to-have)
```

## Changes Required

### 1. `src/tools/beads/tools.ts`

#### beads_create (line 70)
```diff
- type: tool.schema.string().optional().describe("Issue type: task, bug, feature, question"),
+ type: tool.schema.string().optional().describe("Issue type: task, bug, feature, epic, chore (default: task)"),
```

#### beads_list (line 31)
```diff
- status: tool.schema.string().optional().describe("Filter by status (e.g., todo, in_progress, done, blocked)"),
+ status: tool.schema.string().optional().describe("Filter by status: open, in_progress, blocked, deferred, closed"),
```

#### beads_update (line 93)
```diff
- status: tool.schema.string().optional().describe("New status: todo, in_progress, done, blocked"),
+ status: tool.schema.string().optional().describe("New status: open, in_progress, blocked, deferred, closed"),
```

### 2. Beads vs Todos Usage Pattern

| Use Case | Tool | Rationale |
|----------|------|-----------|
| Quick task tracking within session | `todowrite` | Ephemeral, visible in UI |
| Technical debt with dependencies | `beads_create` | Persistent, syncs to git |
| Bugs with reproduction steps | `beads_create` | Rich description, priority |
| Multi-session work handoff | `beads_create` | Survives compaction |
| Epic/feature breakdown | `beads_create` | Supports `epic` type, deps |
| Simple "do X then Y" lists | `todowrite` | Lightweight |

### 3. Agent Prompt Guidance (Optional Future)

Consider adding to agent prompts:
```
When to use beads vs todos:
- todowrite: Quick session tasks, visible progress
- beads: Technical issues, bugs, cross-session work, anything needing deps/priority
```

## Validation

After changes:
1. `bun run typecheck` - passes
2. `bun run build` - passes  
3. `bd create "test" -t feature` - works
4. `bd create "test" -t enhancement` - fails (expected, not valid type)

## Effort
~15 minutes. 3 string changes in tools.ts.
