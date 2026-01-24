---
name: backend-tdd-workflow
description: "TDD workflow for backend development. RED-GREEN-REFACTOR with ticket integration, supermemory patterns, and subagent delegation. Triggers: 'backend feature', 'api endpoint', 'tdd', 'test first'."
---

# Backend TDD Workflow

Test-Driven Development workflow for backend features with ticket tracking, memory persistence, and intelligent delegation.

---

## WORKFLOW OVERVIEW

```
TICKET -> RED (failing test) -> GREEN (minimal impl) -> REFACTOR -> VERIFY -> CLOSE TICKET
    |           |                    |                     |            |
    v           v                    v                     v            v
 supermemory  D5-backend         D5-backend            lsp_diagnostics  ticket_close
 ticket_start  delegate           delegate              bun test
```

---

## PHASE 0: Initialization (MANDATORY)

### 0.1 Check for Active Ticket

```typescript
// First, check if work is ticket-driven
ticket_ready()  // List unblocked tickets

// If ticket exists for this work:
ticket_start({ id: "TICKET-123" })

// If no ticket, create one:
ticket_create({
  title: "Implement [feature name]",
  description: "TDD implementation of [details]",
  type: "feature",
  priority: 2
})
```

### 0.2 Search Memory for Patterns

```typescript
// Before implementing, check for existing patterns
supermemory({ 
  mode: "search", 
  query: "[feature domain] implementation pattern convention",
  limit: 5 
})

// Check for past solutions to similar problems
supermemory({ 
  mode: "search", 
  query: "[similar feature] error solution",
  limit: 3 
})
```

### 0.3 Create TODO List

```typescript
TodoWrite([
  { id: "tdd-1", content: "Write failing test for [feature]", status: "pending", priority: "high" },
  { id: "tdd-2", content: "Implement minimum code to pass", status: "pending", priority: "high" },
  { id: "tdd-3", content: "Refactor while keeping tests green", status: "pending", priority: "medium" },
  { id: "tdd-4", content: "Run full test suite + lsp_diagnostics", status: "pending", priority: "high" },
  { id: "tdd-5", content: "Update ticket and memory", status: "pending", priority: "medium" }
])
```

---

## PHASE 1: RED - Write Failing Test First

### 1.1 Delegate Test Creation to D5-backend

```typescript
// Mark TODO in_progress
TodoWrite([{ id: "tdd-1", status: "in_progress", ... }])

delegate_task({
  subagent_type: "D5 - backend builder",
  skills: ["testing-stack", "bun-hono-api"],
  run_in_background: false,
  description: "Write failing test",
  prompt: `
TASK: Write a failing test for [FEATURE DESCRIPTION]

EXPECTED OUTCOME:
- Test file at [path].test.ts
- Test describes expected behavior using BDD comments (#given, #when, #then)
- Test MUST FAIL when run (no implementation exists yet)

MUST DO:
- Use Bun test runner (import { describe, it, expect } from "bun:test")
- Follow existing test patterns in the codebase
- Test the PUBLIC interface, not implementation details
- Include edge cases and error scenarios

MUST NOT DO:
- Write implementation code
- Write tests that pass without implementation
- Use mocks unless absolutely necessary

CONTEXT:
- Related files: [list relevant files]
- Existing patterns: [describe patterns from codebase]

OUTPUT: The test file path and confirmation it fails.
`
})
```

### 1.2 Verify Test Fails

```bash
bun test [test-file-path]
# MUST see failure - if it passes, the test is wrong
```

### 1.3 Complete RED Phase

```typescript
// Mark complete
TodoWrite([{ id: "tdd-1", status: "completed", ... }])
```

---

## PHASE 2: GREEN - Minimum Implementation

### 2.1 Delegate Implementation to D5-backend

```typescript
// Mark TODO in_progress
TodoWrite([{ id: "tdd-2", status: "in_progress", ... }])

delegate_task({
  subagent_type: "D5 - backend builder",
  skills: ["bun-hono-api", "drizzle-sqlite", "effect-ts-expert"],
  run_in_background: false,
  description: "Implement to pass test",
  prompt: `
TASK: Implement MINIMUM code to make the test pass

EXPECTED OUTCOME:
- Implementation at [path]
- All tests pass (bun test [test-file])
- No extra features beyond what tests require

MUST DO:
- Write the simplest code that passes the test
- Follow existing codebase patterns
- Add types (no any, no ts-ignore)
- Handle errors properly (no empty catch blocks)

MUST NOT DO:
- Add features not covered by tests
- Optimize prematurely
- Refactor existing code (that's Phase 3)
- Add excessive comments

CONTEXT:
- Test file: [test-file-path]
- Related implementation files: [list]
- Database schema (if applicable): [schema location]

OUTPUT: Implementation file path and test results.
`
})
```

### 2.2 Verify Tests Pass

```bash
bun test [test-file-path]
# MUST see all tests passing
```

### 2.3 Complete GREEN Phase

```typescript
TodoWrite([{ id: "tdd-2", status: "completed", ... }])
```

---

## PHASE 3: REFACTOR - Improve While Green

### 3.1 Check for Refactoring Opportunities

```typescript
// Mark TODO in_progress
TodoWrite([{ id: "tdd-3", status: "in_progress", ... }])

// Check diagnostics before refactoring
lsp_diagnostics({ filePath: "[implementation-file]" })
```

### 3.2 Delegate Refactoring (if needed)

```typescript
delegate_task({
  subagent_type: "D5 - backend builder",
  skills: ["typescript-best-practices"],
  run_in_background: false,
  description: "Refactor implementation",
  prompt: `
TASK: Refactor the implementation while keeping tests green

EXPECTED OUTCOME:
- Cleaner, more maintainable code
- All tests STILL pass after each change
- No functional changes

REFACTOR CHECKLIST:
- [ ] Remove duplication (DRY)
- [ ] Extract helper functions if > 20 lines
- [ ] Improve naming (variables, functions)
- [ ] Add/remove necessary types
- [ ] Remove dead code

MUST DO:
- Run tests after EACH refactoring step
- Keep commits atomic (one refactor per commit)
- Use LSP rename for safe renames

MUST NOT DO:
- Change behavior (tests must stay green)
- Add new features
- Skip test verification between changes

CONTEXT:
- Implementation: [file-path]
- Test: [test-file-path]

OUTPUT: List of refactorings applied and test results.
`
})
```

### 3.3 Verify Tests Still Pass

```bash
bun test [test-file-path]
# MUST still pass after refactoring
```

### 3.4 Complete REFACTOR Phase

```typescript
TodoWrite([{ id: "tdd-3", status: "completed", ... }])
```

---

## PHASE 4: Verification

### 4.1 Full Verification Suite

```typescript
// Mark TODO in_progress
TodoWrite([{ id: "tdd-4", status: "in_progress", ... }])

// Run full test suite
bash("bun test")

// Check diagnostics on all changed files
lsp_diagnostics({ filePath: "[impl-file]", severity: "error" })
lsp_diagnostics({ filePath: "[test-file]", severity: "error" })

// Type check
bash("bun run typecheck")
```

### 4.2 Store Learned Patterns

```typescript
// If you learned something new, store it
supermemory({
  mode: "add",
  type: "learned-pattern",
  content: "[DOMAIN]: [what was learned]. Context: [why it matters]. Pattern: [code pattern]."
})

// If you solved an error, store the solution
supermemory({
  mode: "add", 
  type: "error-solution",
  content: "[ERROR MESSAGE]: [solution]. Context: [when this happens]."
})
```

### 4.3 Complete Verification

```typescript
TodoWrite([{ id: "tdd-4", status: "completed", ... }])
```

---

## PHASE 5: Completion

### 5.1 Close Ticket

```typescript
// Mark TODO in_progress
TodoWrite([{ id: "tdd-5", status: "in_progress", ... }])

// Close the ticket
ticket_close({
  id: "TICKET-123",
  reason: "Implemented [feature] with TDD. Tests passing."
})

// Complete final TODO
TodoWrite([{ id: "tdd-5", status: "completed", ... }])
```

### 5.2 Commit (if requested)

```typescript
// Use git-master skill for atomic commits
delegate_task({
  category: "quick",
  skills: ["git-master"],
  prompt: "Commit the TDD implementation: test + implementation files"
})
```

---

## QUICK REFERENCE

### TDD Cycle Summary

| Phase | Action | Verification | Agent |
|-------|--------|--------------|-------|
| RED | Write failing test | `bun test` FAILS | D5-backend |
| GREEN | Minimum impl | `bun test` PASSES | D5-backend |
| REFACTOR | Improve code | `bun test` STILL PASSES | D5-backend |
| VERIFY | Full suite | All green | - |
| COMPLETE | Close ticket | - | - |

### Integration Points

| System | When | Action |
|--------|------|--------|
| Tickets | Start/End | `ticket_start`, `ticket_close` |
| Memory | Before impl, after learning | `supermemory search/add` |
| Subagents | Each phase | `delegate_task` to D5-backend |
| LSP | Verification | `lsp_diagnostics` |
| Todos | Throughout | Track progress |

### Anti-Patterns

| NEVER DO | WHY |
|----------|-----|
| Write impl before test | Defeats TDD purpose |
| Skip RED phase | Tests might not test anything |
| Refactor while RED | Fix failing test first |
| Skip verification | Broken code gets committed |
| Giant commits | Split test + impl into atomics |
