---
name: subagent-workflow
description: "Subagent orchestration workflow for parallel task execution. Covers agent selection, skill injection, session continuation, and result verification. Triggers: 'delegate', 'parallel', 'subagent', 'background task'."
---

# Subagent Orchestration Workflow

Workflow for efficiently delegating work to specialized subagents with proper skill injection, parallel execution, and result verification.

---

## WORKFLOW OVERVIEW

```
TASK ANALYSIS
     |
     v
AGENT SELECTION -----> Match task domain to agent
     |
     v
SKILL INJECTION -----> Load relevant skills for agent
     |
     v
DELEGATION -----> delegate_task() with 7-section prompt
     |
     +---> Background (parallel)? -----> Collect later with background_output()
     |
     v
RESULT VERIFICATION -----> NEVER trust self-reports
     |
     v
SESSION CONTINUATION -----> Resume same agent for follow-ups
```

---

## PHASE 1: Task Analysis

### 1.1 Classify Task Domain

| Domain | Signals | Recommended Agent |
|--------|---------|-------------------|
| Frontend/UI | .tsx, .css, styling, layout, animation | T4 - frontend builder |
| Backend/API | routes, database, validation, auth | D5 - backend builder |
| Exploration | "find", "where is", "how does X work" | X1 - explorer |
| Research | external docs, library usage, OSS examples | R2 - researcher |
| Architecture | design decisions, trade-offs, patterns | K9 - advisor |
| Debugging | errors, crashes, unexpected behavior | G5 - debugger |
| Documentation | README, API docs, guides | W7 - writer |
| Security | vulnerabilities, OWASP, code review | B3 - security |
| Bulk edits | multiple files, large refactors | H3 - bulk builder |
| Fast scaffolding | boilerplate, early-stage code | F1 - fast builder |
| Visual review | UI feedback, accessibility | M10 - critic |
| Design systems | tokens, visual language | S6 - designer |
| Complex problems | impossible bugs, Opus-level thinking | O9 - specialist |

### 1.2 Determine Execution Mode

```
BACKGROUND (parallel) if:
  - Task is independent (no immediate result needed)
  - Multiple tasks can run simultaneously
  - Exploration/research tasks
  - Result will be collected later

FOREGROUND (blocking) if:
  - Result needed immediately for next step
  - Sequential dependency on outcome
  - User waiting for response
  - Critical path item
```

---

## PHASE 2: Skill Discovery and Injection

### 2.1 Find Relevant Skills

```typescript
// Discover skills for the domain
find_skills({ category: "backend" })   // 6+ backend skills
find_skills({ category: "frontend" })  // 7+ frontend skills
find_skills({ category: "testing" })   // Testing skills
find_skills({ query: "react" })        // Search by keyword
```

### 2.2 Skill Categories

| Category | Example Skills |
|----------|----------------|
| frontend | frontend-stack, component-stack, motion-system |
| backend | hono-api, drizzle-sqlite, better-auth |
| testing | testing-stack, qa-test-planner, tdd-workflow |
| security | owasp-security, auth-implementation-patterns |
| ai | ai-sdk, prompt-engineering-patterns |
| database | drizzle-orm, database-query-optimization |
| devops | github-actions-workflow, docker-expert |

### 2.3 Mandatory Skill Injection

```typescript
// CRITICAL: Every delegate_task MUST include relevant skills
delegate_task({
  subagent_type: "T4 - frontend builder",
  skills: ["frontend-stack", "component-stack"],  // MANDATORY
  ...
})
```

---

## PHASE 3: Pre-Delegation Planning (MANDATORY)

### 3.1 Declare Reasoning Before Calling

**MANDATORY FORMAT - Output this BEFORE every delegate_task:**

```
I will use delegate_task with:
- **Agent**: [name]
- **Reason**: [why this agent fits the task]
- **Skills**: [skill names to inject]
- **Mode**: [background/foreground]
- **Expected Outcome**: [what success looks like]
```

### 3.2 Examples

**Frontend Task:**
```
I will use delegate_task with:
- **Agent**: T4 - frontend builder
- **Reason**: Task requires building responsive UI with animations
- **Skills**: ["frontend-stack", "component-stack", "motion-system"]
- **Mode**: foreground (need result for next step)
- **Expected Outcome**: Styled, accessible component with smooth transitions
```

**Parallel Exploration:**
```
I will use delegate_task with:
- **Agent**: X1 - explorer
- **Reason**: Need to find authentication patterns across codebase
- **Skills**: []
- **Mode**: background (can run in parallel)
- **Expected Outcome**: List of files containing auth implementations
```

---

## PHASE 4: Delegation Execution

### 4.1 The 7-Section Prompt Structure (MANDATORY)

Every delegation prompt MUST include ALL 7 sections:

```typescript
delegate_task({
  subagent_type: "[agent]",
  skills: ["skill-1", "skill-2"],
  run_in_background: false,
  description: "[5-word summary]",
  prompt: `
1. TASK: [Atomic, specific goal - one action per delegation]

2. EXPECTED OUTCOME: [Concrete deliverables with success criteria]

3. REQUIRED SKILLS: [Which skills from skills array to invoke]

4. REQUIRED TOOLS: [Explicit tool whitelist - prevents tool sprawl]
   - Use: Read, Edit, lsp_diagnostics, Bash
   - Avoid: [tools not needed]

5. MUST DO:
   - [Exhaustive requirement 1]
   - [Exhaustive requirement 2]
   - [Exhaustive requirement 3]
   - [Leave NOTHING implicit]

6. MUST NOT DO:
   - [Forbidden action 1]
   - [Forbidden action 2]
   - [Anticipate and block rogue behavior]

7. CONTEXT:
   - Files: [paths]
   - Patterns: [existing conventions]
   - Constraints: [limitations]
`
})
```

### 4.2 Parallel Execution Pattern

```typescript
// Fire multiple agents in parallel
delegate_task({
  subagent_type: "X1 - explorer",
  run_in_background: true,
  prompt: "Find all authentication implementations..."
})
// Returns: { task_id: "bg_abc123", session_id: "ses_xyz" }

delegate_task({
  subagent_type: "X1 - explorer", 
  run_in_background: true,
  prompt: "Find all error handling patterns..."
})
// Returns: { task_id: "bg_def456", session_id: "ses_uvw" }

delegate_task({
  subagent_type: "R2 - researcher",
  run_in_background: true,
  prompt: "Find official docs for [library]..."
})
// Returns: { task_id: "bg_ghi789", session_id: "ses_rst" }

// Continue with other work while agents run...

// Later, collect results:
background_output({ task_id: "bg_abc123" })
background_output({ task_id: "bg_def456" })
background_output({ task_id: "bg_ghi789" })
```

---

## PHASE 5: Result Verification (CRITICAL)

### 5.1 NEVER Trust Agent Self-Reports

```
AFTER EVERY DELEGATION, VERIFY:

[ ] Does it work as expected?
    - Run the code/tests
    - Check lsp_diagnostics
    
[ ] Does it follow codebase patterns?
    - Compare with existing similar code
    - Check naming conventions
    
[ ] Did expected output materialize?
    - Files created/modified as claimed?
    - Changes match what was requested?
    
[ ] Did agent follow MUST DO requirements?
    - Check each requirement explicitly
    
[ ] Did agent avoid MUST NOT DO items?
    - Verify no forbidden actions taken
```

### 5.2 Verification Commands

```typescript
// Check for errors
lsp_diagnostics({ filePath: "[changed file]", severity: "error" })

// Run tests
bash("bun test [test file]")

// Type check
bash("bun run typecheck")

// Read and verify output
read({ filePath: "[created/modified file]" })
```

---

## PHASE 6: Session Continuation

### 6.1 Resume Previous Agent Session

```typescript
// CRITICAL: Use resume to continue with FULL CONTEXT preserved

// First call - save session_id
const result = delegate_task({
  subagent_type: "T4 - frontend builder",
  skills: ["frontend-stack"],
  run_in_background: false,
  prompt: "Build login form..."
})
// Response includes: session_id: "ses_xxx"

// Continue same session for iterations:
delegate_task({
  resume: "ses_xxx",  // Same session, full context preserved
  prompt: "Add password visibility toggle"
})

delegate_task({
  resume: "ses_xxx",
  prompt: "Add loading spinner and error states"
})
```

### 6.2 When to Use Resume

| Situation | Action |
|-----------|--------|
| Task failed/incomplete | `resume` with "fix: [specific error]" |
| Need follow-up on result | `resume` with additional question |
| Iterative refinement | `resume` for each iteration |
| Add missing feature | `resume` instead of new task |
| Fix agent mistake | `resume` with correction |

### 6.3 Benefits of Session Continuation

- **Context preserved**: Agent remembers all previous work
- **Token efficient**: No need to re-explain context
- **Better results**: Incremental refinement produces higher quality
- **Faster**: Less setup overhead per iteration

---

## QUICK REFERENCE

### Agent Selection Matrix

| Need | Agent | Skills |
|------|-------|--------|
| React component | T4 - frontend builder | frontend-stack, component-stack |
| API endpoint | D5 - backend builder | hono-api, drizzle-sqlite |
| Find code | X1 - explorer | - |
| Find docs | R2 - researcher | - |
| Debug issue | G5 - debugger | systematic-debugging |
| Write docs | W7 - writer | - |
| Security review | B3 - security | owasp-security |
| Architecture decision | K9 - advisor | - |
| Bulk refactor | H3 - bulk builder | - |
| Fast scaffold | F1 - fast builder | - |

### Execution Checklist

```
[ ] Task domain identified
[ ] Agent selected with reason
[ ] Skills discovered and listed
[ ] Background/foreground decided
[ ] 7-section prompt written
[ ] Pre-delegation reasoning declared
[ ] delegate_task called
[ ] Result verified (NEVER trust self-report)
[ ] Session continued if iterating
```

### Anti-Patterns

| NEVER DO | WHY |
|----------|-----|
| Delegate without skills | Agent lacks domain knowledge |
| Skip pre-delegation reasoning | Unclear intent leads to wrong agent |
| Trust agent self-reports | Must verify independently |
| New session for iterations | Loses context, wastes tokens |
| Vague prompts | Missing sections = missing results |
| Sequential background tasks | Parallel saves time |
| Forget to collect background results | Work lost |
| Skip MUST DO/MUST NOT DO sections | Agent goes rogue |
