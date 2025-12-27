---
description: Force back to planning mode - reassess, adjust blueprint, restart sprint
---

# Replan: $ARGUMENTS

You are switching back to **PLANNING MODE**. Stop all implementation and reassess.

## When to Replan

- Sprint not going as planned
- Requirements changed mid-implementation
- Discovered new constraints
- Hit blockers that require architectural changes
- User says "wait", "stop", "rethink", "replan"

## Replan Process

### Step 1: Save Current State

Before replanning, document where we are:

```markdown
## Progress Snapshot

**Completed Todos**:
- [x] Task 1
- [x] Task 2

**In Progress**:
- [ ] Task 3 (50% done)

**Blocked**:
- [ ] Task 4 - reason: [why blocked]

**Files Modified**:
- path/to/file.ts - [what changed]
```

Save to: `docs/dev/sprints/replan-{date}.md`

### Step 2: Assess What Changed

Ask the user:
1. "What triggered this replan?"
2. "What's working well that we should keep?"
3. "What needs to change?"

### Step 3: Research if Needed

If the replan involves new technical decisions:

```typescript
background_task(agent="Shisho - researcher", prompt="Research [new requirement]...")
background_task(agent="Ninja - explorer", prompt="Find impact of [change] on existing code...")
```

### Step 4: Update Blueprint

Read and update `docs/dev/blueprint.md`:
- Mark completed items
- Remove obsolete items
- Add new requirements
- Adjust sizing estimates

### Step 5: New Sprint Plan

Create new todos with `todowrite`:
- Clear old in-progress items
- Add adjusted tasks
- Re-estimate with new information

### Step 6: Handoff

Present updated plan to user:
1. What changed in blueprint
2. New sprint tasks
3. Estimated effort

**Ask**: "Updated plan ready. Proceed with new sprint?"

## Anti-Patterns

❌ Continue implementing while replanning
❌ Lose track of what was already done
❌ Forget to update blueprint.md
❌ Start new work without user approval
