---
name: six-stage-workflow
description: "ZCF-inspired six-stage development workflow: Research -> Ideate -> Plan -> Execute -> Optimize -> Review. Full lifecycle with mandatory confirmations. Triggers: 'full workflow', 'six stage', 'complete lifecycle', 'structured development'."
---

# Six-Stage Development Workflow

Structured development process covering the complete software development lifecycle with mandatory stage confirmations and automatic document generation.

---

## WORKFLOW OVERVIEW

```
1. RESEARCH -----> Understand requirements, gather context
       |
       v
2. IDEATE -----> Generate multiple solutions
       |
       v
3. PLAN -----> Create detailed implementation plan
       |
       v
4. EXECUTE -----> Implement with TDD
       |
       v
5. OPTIMIZE -----> Refactor and improve
       |
       v
6. REVIEW -----> Verify and summarize
```

**CRITICAL**: User confirmation required after EACH stage before proceeding.

---

## STAGE 1: RESEARCH

### Goal
Deeply understand task requirements and background.

### Actions

```typescript
// 1. Search memory for existing context
supermemory({ 
  mode: "search", 
  query: "[task domain] architecture pattern decision",
  limit: 5 
})

// 2. Explore codebase for relevant patterns
delegate_task({
  subagent_type: "X1 - explorer",
  run_in_background: true,
  prompt: "Find existing implementations related to [task]"
})

// 3. Research external documentation if needed
delegate_task({
  subagent_type: "R2 - researcher",
  run_in_background: true,
  prompt: "Find best practices for [technology/pattern]"
})

// 4. Collect and analyze results
background_output({ task_id: "..." })
```

### Outputs
- Requirements analysis summary
- Technical research results
- Risk assessment
- Related existing code patterns

### Stage Output Format

```markdown
## RESEARCH COMPLETE

### Requirements Analysis
- Core requirement: [what user needs]
- Scope: [boundaries of the work]
- Success criteria: [how to know it's done]

### Technical Context
- Existing patterns: [what's already in codebase]
- Dependencies: [libraries/systems involved]
- Constraints: [limitations to work within]

### Risks Identified
1. [Risk 1] - Mitigation: [approach]
2. [Risk 2] - Mitigation: [approach]

### Questions for User (if any)
- [Clarification needed]

---
**Proceed to IDEATE stage?** [Awaiting confirmation]
```

---

## STAGE 2: IDEATE

### Goal
Generate multiple feasible solutions and evaluate.

### Actions

```typescript
// 1. Consult advisor for architecture options
delegate_task({
  subagent_type: "K9 - advisor",
  skills: [],
  run_in_background: false,
  prompt: `
Based on this research:
[Insert research summary]

Generate 2-3 different technical approaches to solve this.
For each approach, evaluate:
- Technical complexity
- Scalability
- Maintainability
- Risk level
- Time estimate
`
})
```

### Outputs
- 2-3 design solutions
- Pros/cons comparison
- Recommended solution with rationale

### Stage Output Format

```markdown
## IDEATE COMPLETE

### Solution A: [Name]
- Approach: [description]
- Pros: [advantages]
- Cons: [disadvantages]
- Complexity: [Low/Medium/High]
- Time estimate: [hours/days]

### Solution B: [Name]
- Approach: [description]
- Pros: [advantages]
- Cons: [disadvantages]
- Complexity: [Low/Medium/High]
- Time estimate: [hours/days]

### Solution C: [Name] (if applicable)
- ...

### Recommendation
**Solution [X]** because [specific reasons].

---
**Proceed to PLAN stage with Solution [X]?** [Awaiting confirmation]
```

---

## STAGE 3: PLAN

### Goal
Create detailed implementation plan with task breakdown.

### Actions

```typescript
// 1. Create ticket for the work
ticket_create({
  title: "[Feature/Task name]",
  description: "[Detailed description from research]",
  type: "feature",
  priority: 2
})

// 2. Break down into sub-tickets if complex
ticket_create({ title: "Step 1: [description]", ... })
ticket_create({ title: "Step 2: [description]", ... })
ticket_dep({ from: "step-2", to: "step-1" })

// 3. Create TODO list for immediate session
todowrite([
  { id: "plan-1", content: "[First task]", status: "pending", priority: "high" },
  { id: "plan-2", content: "[Second task]", status: "pending", priority: "high" },
  ...
])
```

### Outputs
- Detailed task breakdown
- Technical implementation plan
- Time estimates
- Dependency order
- Tickets created for tracking

### Stage Output Format

```markdown
## PLAN COMPLETE

### Task Breakdown

| Order | Task | Estimate | Dependencies |
|-------|------|----------|--------------|
| 1 | [Task description] | [time] | None |
| 2 | [Task description] | [time] | Task 1 |
| 3 | [Task description] | [time] | Task 2 |

### Technical Approach
- Architecture: [description]
- Files to create/modify: [list]
- Tests to write: [list]

### Tickets Created
- [TICKET-ID]: [Title]
- [TICKET-ID]: [Title] (depends on above)

### Risk Mitigations
- [Risk]: [Specific mitigation steps]

---
**Proceed to EXECUTE stage?** [Awaiting confirmation]
```

---

## STAGE 4: EXECUTE

### Goal
Implement according to plan using TDD.

### Actions

```typescript
// 1. Start ticket
ticket_start({ id: "[ticket-id]" })

// 2. For each task, follow TDD workflow
// RED: Write failing test
delegate_task({
  subagent_type: "D5 - backend builder",
  skills: ["backend-tdd-workflow", "testing-stack"],
  prompt: "Write failing test for [feature]..."
})

// GREEN: Implement minimum code
delegate_task({
  subagent_type: "D5 - backend builder", 
  skills: ["bun-hono-api"],
  prompt: "Implement minimum code to pass test..."
})

// Verify after each implementation
bash("bun test [test-file]")
lsp_diagnostics({ filePath: "[impl-file]" })

// 3. Update TODOs as you progress
todowrite([{ id: "plan-1", status: "completed", ... }])
```

### Outputs
- Implemented code
- Passing test cases
- Clean lsp_diagnostics

### Stage Output Format

```markdown
## EXECUTE PROGRESS

### Completed
- [x] Task 1: [description] - Tests passing
- [x] Task 2: [description] - Tests passing

### In Progress
- [ ] Task 3: [description]

### Files Changed
- `path/to/file.ts` - [what changed]
- `path/to/file.test.ts` - [tests added]

### Test Results
```
bun test v1.x.x
[test output showing passes]
```

---
**All tasks complete. Proceed to OPTIMIZE stage?** [Awaiting confirmation]
```

---

## STAGE 5: OPTIMIZE

### Goal
Improve code quality and performance while keeping tests green.

### Actions

```typescript
// 1. Check for code smells
lsp_diagnostics({ filePath: "[all changed files]", severity: "all" })

// 2. Delegate refactoring
delegate_task({
  subagent_type: "D5 - backend builder",
  skills: ["typescript-best-practices"],
  prompt: `
Refactor the implementation with these goals:
- Remove duplication
- Improve naming
- Extract functions if > 20 lines
- Ensure proper error handling

MUST: Run tests after each refactor step
MUST NOT: Change behavior (tests must stay green)
`
})

// 3. Security check for sensitive code
delegate_task({
  subagent_type: "B3 - security",
  skills: ["owasp-security"],
  run_in_background: true,
  prompt: "Review [files] for security issues..."
})

// 4. Verify tests still pass
bash("bun test")
```

### Outputs
- Refactored, cleaner code
- Performance improvements (if applicable)
- Security review results
- All tests still passing

### Stage Output Format

```markdown
## OPTIMIZE COMPLETE

### Refactorings Applied
1. [Refactoring description] - Tests: PASS
2. [Refactoring description] - Tests: PASS

### Security Review
- [Finding 1]: [Status/Mitigation]
- No critical issues found / [Issues and fixes]

### Code Quality
- lsp_diagnostics: [X] errors, [Y] warnings
- Test coverage: [if measurable]

### Final Test Results
```
bun test v1.x.x
[all tests passing]
```

---
**Proceed to REVIEW stage?** [Awaiting confirmation]
```

---

## STAGE 6: REVIEW

### Goal
Final evaluation, documentation, and knowledge capture.

### Actions

```typescript
// 1. Final verification
bash("bun test")
bash("bun run typecheck")
lsp_diagnostics({ filePath: "[all files]", severity: "error" })

// 2. Store learned patterns in memory
supermemory({
  mode: "add",
  type: "learned-pattern",
  content: "[DOMAIN]: [What was learned]. Pattern: [Reusable approach]."
})

// 3. Close ticket
ticket_close({
  id: "[ticket-id]",
  reason: "Implemented [feature]. Tests passing. Code reviewed."
})

// 4. Generate summary
```

### Outputs
- Implementation summary
- Lessons learned
- Tickets closed
- Memory updated

### Stage Output Format

```markdown
## REVIEW COMPLETE - WORKFLOW FINISHED

### Implementation Summary
- Feature: [What was built]
- Approach: [How it was built]
- Files changed: [Count] files

### Verification Results
- Tests: ALL PASSING
- Type check: CLEAN
- Diagnostics: NO ERRORS

### Tickets Closed
- [TICKET-ID]: [Title] - Completed

### Lessons Learned
1. [Insight that might help future work]
2. [Pattern discovered]

### Follow-up Recommendations
- [Optional improvements for later]
- [Technical debt noted]

### Knowledge Stored
- Pattern: [What was saved to supermemory]

---
**WORKFLOW COMPLETE** - Ready for commit if requested.
```

---

## QUICK REFERENCE

### Stage Flow

| Stage | Goal | Key Actions | Confirmation Required |
|-------|------|-------------|----------------------|
| 1. RESEARCH | Understand | Memory search, explore, research | YES |
| 2. IDEATE | Options | K9 advisor consultation | YES |
| 3. PLAN | Breakdown | Tickets, TODOs, estimates | YES |
| 4. EXECUTE | Implement | TDD cycle, delegation | YES |
| 5. OPTIMIZE | Improve | Refactor, security review | YES |
| 6. REVIEW | Complete | Verify, document, close | YES |

### Anti-Patterns

| NEVER DO | WHY |
|----------|-----|
| Skip stages | Incomplete process = poor quality |
| Skip confirmations | User loses control |
| Execute without plan | Undirected work |
| Optimize before execute complete | Premature optimization |
| Skip review | Missing documentation and learning |
