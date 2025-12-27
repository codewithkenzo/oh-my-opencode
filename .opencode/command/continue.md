---
description: Resume work from saved blueprint and previous session state
---

# Continue: $ARGUMENTS

Resume work on an existing project from where we left off.

## Resume Process

### Step 1: Load Context

Read saved state:

```typescript
// Load blueprint
read("docs/dev/blueprint.md")

// Load recent sprint progress
glob("docs/dev/sprints/*.md")

// Check git status
bash("git status --short")
bash("git log --oneline -5")
```

### Step 2: Assess Current State

Check what's done and what's pending:

1. **Read blueprint** - What phases are complete?
2. **Check todos** - Any in-progress items?
3. **Git status** - Any uncommitted changes?
4. **Recent sprints** - What was last worked on?

### Step 3: Research Refresh (If Compacted)

If context was compacted or it's a new session:

```typescript
// Re-establish codebase understanding
background_task(agent="Ninja - explorer", prompt=`
  Explore the project structure:
  - What's in src/?
  - What's the tech stack?
  - What patterns are used?
`)

// If external libs involved, refresh docs
background_task(agent="Shisho - researcher", prompt=`
  Refresh knowledge on [libraries in use]:
  - Recent changes
  - Best practices
`)
```

### Step 4: Present Status

Show the user:

```markdown
## Session Resume

**Project**: [from AGENTS.md]
**Blueprint**: [phase X of Y]

**Completed**:
- [x] Phase 1: Foundation
- [x] Phase 2: Core features (partial)

**Current Sprint**:
| Task | Status | Notes |
|------|--------|-------|
| [Task 1] | completed | |
| [Task 2] | in_progress | 70% done |
| [Task 3] | pending | |

**Uncommitted Changes**:
- path/to/file.ts

**Recommended Next Steps**:
1. [Continue Task 2]
2. [Then Task 3]
```

### Step 5: Confirm Direction

Ask user:
1. "Continue with current sprint?"
2. "Any changes to priorities?"
3. "New requirements to add?"

### Step 6: Resume Work

If user confirms:
1. Load relevant skills for current work
2. Mark current task in_progress
3. Continue implementation

## Quick Resume (No Changes)

If user just says "/continue" with no arguments:

1. Read blueprint.md
2. Read recent todos
3. Find first incomplete task
4. Resume immediately

## Anti-Patterns

❌ Start fresh without reading saved state
❌ Ignore uncommitted changes
❌ Skip research refresh on long sessions
❌ Assume context from previous session
