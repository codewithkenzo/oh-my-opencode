---
name: ticket-driven-workflow
description: "Ticket-driven development workflow with dependency management, supermemory context, and multi-session persistence. Triggers: 'ticket', 'issue', 'task tracking', 'what should I work on'."
---

# Ticket-Driven Workflow

Structured development workflow using tickets for multi-session persistence, dependency tracking, and team coordination.

---

## WORKFLOW OVERVIEW

```
SESSION START
     |
     v
ticket_ready() -----> Pick highest priority unblocked ticket
     |                          |
     v                          v
No tickets? -----> ticket_create() for new work
     |
     v
ticket_start(id) -----> Work begins
     |
     v
[Development Loop]
     |
     +---> Blocker found? -----> ticket_create(blocker) + ticket_dep()
     |
     v
ticket_close(id, reason) -----> Work complete
     |
     v
supermemory -----> Store decisions/patterns learned
```

---

## PHASE 0: Session Start (MANDATORY)

### 0.1 Check for Ready Work

```typescript
// ALWAYS do this at session start
ticket_ready()  // Shows tickets with no blockers

// Response shows:
// | ID | Title | Priority | Type | Blockers |
// | T-001 | Implement auth | high | feature | none |
// | T-002 | Add tests | medium | task | none |
```

### 0.2 Claim Work

```typescript
// Pick the highest priority ticket
ticket_start({ id: "T-001" })

// Ticket status changes to "in_progress"
```

### 0.3 Search Memory for Context

```typescript
// Before starting, check for relevant context
supermemory({ 
  mode: "search", 
  query: "[ticket topic] architecture decision pattern",
  limit: 5 
})

// Check for past solutions
supermemory({ 
  mode: "search", 
  query: "[ticket topic] implementation error solution",
  limit: 3 
})
```

---

## PHASE 1: Planning

### 1.1 Break Down Ticket into TODOs

```typescript
// Create actionable steps for this session
todowrite([
  { id: "step-1", content: "[First actionable step]", status: "pending", priority: "high" },
  { id: "step-2", content: "[Second actionable step]", status: "pending", priority: "high" },
  { id: "step-3", content: "[Third actionable step]", status: "pending", priority: "medium" },
  { id: "verify", content: "Verify all changes work", status: "pending", priority: "high" }
])
```

### 1.2 Identify Dependencies

```typescript
// Check if this ticket depends on others
ticket_list({ status: "pending" })

// If you discover a blocker during planning:
ticket_create({
  title: "[Blocker description]",
  description: "This blocks T-001 because [reason]",
  type: "blocker",
  priority: 1  // High priority for blockers
})

// Link the dependency
ticket_dep({ from: "T-001", to: "BLOCKER-ID" })

// Now T-001 won't show in ticket_ready() until blocker is resolved
```

---

## PHASE 2: Execution

### 2.1 Work Loop

```typescript
// For each TODO item:
todowrite([{ id: "step-1", status: "in_progress", ... }])

// Do the work...
// Use appropriate agents for different domains

// Mark complete when done
todowrite([{ id: "step-1", status: "completed", ... }])
```

### 2.2 Handle Discovered Blockers

```typescript
// If during work you discover a blocker:

// 1. Create blocker ticket
const blockerId = ticket_create({
  title: "Need [X] before [Y] can work",
  description: "Discovered while working on T-001: [details]",
  type: "blocker",
  priority: 1
})

// 2. Link dependency
ticket_dep({ from: "T-001", to: blockerId })

// 3. Either:
//    - Switch to work on blocker if simple
//    - Or pause current ticket and report to user
```

### 2.3 Store Decisions and Patterns

```typescript
// When you make an important decision:
supermemory({
  mode: "add",
  type: "architecture",
  content: "[COMPONENT]: Decided to [decision]. Reason: [why]. Alternatives rejected: [what and why]."
})

// When you discover a useful pattern:
supermemory({
  mode: "add",
  type: "learned-pattern",
  content: "[DOMAIN]: [pattern description]. Use when: [conditions]. Example: [code snippet]."
})

// When you solve a tricky error:
supermemory({
  mode: "add",
  type: "error-solution",
  content: "[ERROR]: [solution]. Context: [when this happens]. Fix: [steps]."
})
```

---

## PHASE 3: Completion

### 3.1 Verify Work

```typescript
// Run verification
lsp_diagnostics({ filePath: "[changed files]" })
bash("bun test")
bash("bun run typecheck")

// Mark verification TODO complete
todowrite([{ id: "verify", status: "completed", ... }])
```

### 3.2 Close Ticket

```typescript
// Close with descriptive reason
ticket_close({
  id: "T-001",
  reason: "Implemented [feature]. Changes: [summary]. Tests: [passing/added]."
})
```

### 3.3 Check for Unblocked Work

```typescript
// Closing this ticket might unblock others
ticket_ready()  // Check if new tickets are now unblocked

// If user wants to continue, pick next ticket
```

---

## TICKET MANAGEMENT COMMANDS

### List All Tickets

```typescript
ticket_list()  // All tickets
ticket_list({ status: "in_progress" })  // Only active
ticket_list({ priority: 1 })  // Only high priority
ticket_list({ type: "bug" })  // Only bugs
```

### View Ticket Details

```typescript
ticket_show({ id: "T-001" })  // Full details including dependencies
```

### Check Blocked Tickets

```typescript
ticket_blocked()  // Tickets waiting on dependencies
```

### Manage Dependencies

```typescript
// Add dependency
ticket_dep({ from: "T-002", to: "T-001" })  // T-002 depends on T-001

// Remove dependency
ticket_undep({ from: "T-002", to: "T-001" })
```

---

## PRIORITY LEVELS

| Level | Meaning | Use For |
|-------|---------|---------|
| 0 | Critical | Production down, security issues |
| 1 | High | Blockers, urgent bugs |
| 2 | Medium (default) | Normal features, tasks |
| 3 | Low | Nice-to-have, minor improvements |
| 4 | Nice-to-have | Backlog items |

---

## TICKET TYPES

| Type | Use For |
|------|---------|
| `feature` | New functionality |
| `bug` | Something broken |
| `task` | Chores, maintenance |
| `blocker` | Dependency that blocks other work |
| `research` | Investigation, spike |

---

## INTEGRATION WITH OTHER WORKFLOWS

### With TDD Workflow

```typescript
// Start ticket
ticket_start({ id: "T-001" })

// Use TDD workflow for implementation
// (RED -> GREEN -> REFACTOR)

// Close ticket when TDD complete
ticket_close({ id: "T-001", reason: "TDD implementation complete" })
```

### With Subagent Workflow

```typescript
// For large tickets, delegate subtasks to agents
delegate_task({
  subagent_type: "D5 - backend builder",
  skills: ["backend-tdd-workflow"],
  prompt: "[specific subtask from ticket]"
})
```

### With Memory

```typescript
// Session start: Search for context
supermemory({ mode: "search", query: "[ticket topic]" })

// During work: Store decisions
supermemory({ mode: "add", type: "architecture", content: "[decision]" })

// Session end: Store lessons learned
supermemory({ mode: "add", type: "learned-pattern", content: "[pattern]" })
```

---

## QUICK REFERENCE

### Session Start Ritual

```typescript
// 1. Check ready work
ticket_ready()

// 2. Search memory for context
supermemory({ mode: "search", query: "[domain]" })

// 3. Claim ticket
ticket_start({ id: "[ticket-id]" })

// 4. Create TODOs
todowrite([...])
```

### Session End Ritual

```typescript
// 1. Verify work
lsp_diagnostics(...)
bash("bun test")

// 2. Close ticket (if complete)
ticket_close({ id: "[ticket-id]", reason: "[summary]" })

// 3. Store learnings
supermemory({ mode: "add", type: "learned-pattern", content: "[what learned]" })

// 4. Check what's next
ticket_ready()
```

### Anti-Patterns

| NEVER DO | WHY |
|----------|-----|
| Work without ticket | No tracking, no persistence |
| Skip ticket_ready() at session start | Might miss unblocked work |
| Create circular dependencies | System will catch but avoid |
| Close without verification | Broken code marked complete |
| Forget to store decisions | Lost context for future sessions |
