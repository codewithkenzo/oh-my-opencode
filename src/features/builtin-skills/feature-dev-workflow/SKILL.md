---
name: feature-dev-workflow
description: "Feature development workflow with requirements, solution planning, UI/UX support, and implementation planning. For new feature design with agent collaboration. Triggers: 'new feature', 'feature planning', 'feature design', 'implement feature'."
---

# Feature Development Workflow

Focused workflow for new feature design and implementation with built-in Planner and UI/UX agent collaboration.

---

## WORKFLOW OVERVIEW

```
1. REQUIREMENTS -----> Deep understanding of feature needs
       |
       v
2. SOLUTION PLANNING -----> Multiple technical approaches
       |
       v
3. UI/UX SUPPORT -----> Interface design (if applicable)
       |
       v
4. IMPLEMENTATION PLAN -----> Detailed task breakdown
       |
       v
[Hand off to TDD workflow for execution]
```

---

## STAGE 1: REQUIREMENTS CONFIRMATION

### Goal
Deep understanding of feature requirements and business scenarios.

### Actions

```typescript
// 1. Search memory for related context
supermemory({
  mode: "search",
  query: "[feature domain] requirements pattern",
  limit: 5
})

// 2. Explore existing similar features
delegate_task({
  subagent_type: "X1 - explorer",
  run_in_background: true,
  description: "Find related features",
  prompt: "Find existing implementations of [related functionality]"
})

// 3. Research external examples if needed
delegate_task({
  subagent_type: "R2 - researcher",
  run_in_background: true,
  description: "Research feature patterns",
  prompt: "Find best practices for [feature type] in [technology]"
})
```

### Output Format

```markdown
## REQUIREMENTS CONFIRMED

### Feature Scope
- **Name**: [Feature name]
- **Description**: [What it does]
- **User roles**: [Who uses it]

### User Stories
1. As a [role], I want [action] so that [benefit]
2. As a [role], I want [action] so that [benefit]

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Out of Scope
- [What this feature does NOT include]

### Questions (if any)
- [Clarification needed from user]

---
**Proceed to SOLUTION PLANNING?** [Awaiting confirmation]
```

---

## STAGE 2: SOLUTION PLANNING

### Goal
Generate multiple technical solutions and recommend the best approach.

### Actions

```typescript
// Consult architecture advisor
delegate_task({
  subagent_type: "K9 - advisor",
  skills: [],
  run_in_background: false,
  description: "Architecture consultation",
  prompt: `
Feature requirements:
[Insert requirements from Stage 1]

Generate 2-3 technical approaches.
For each:
- Architecture overview
- Technology choices
- Complexity assessment (Low/Medium/High)
- Scalability considerations
- Estimated effort
- Risk factors

Recommend the best approach with clear reasoning.
`
})
```

### Output Format

```markdown
## SOLUTION PLANNING COMPLETE

### Solution A: [Descriptive Name]
**Architecture**: [High-level description]
**Technologies**: [Stack choices]
**Pros**:
- [Advantage 1]
- [Advantage 2]
**Cons**:
- [Disadvantage 1]
**Complexity**: [Low/Medium/High]
**Effort**: [Time estimate]

### Solution B: [Descriptive Name]
**Architecture**: [High-level description]
**Technologies**: [Stack choices]
**Pros**:
- [Advantage 1]
**Cons**:
- [Disadvantage 1]
- [Disadvantage 2]
**Complexity**: [Low/Medium/High]
**Effort**: [Time estimate]

### Recommendation
**Solution [X]** is recommended because:
1. [Reason 1]
2. [Reason 2]

---
**Proceed with Solution [X]?** [Awaiting confirmation]
```

---

## STAGE 3: UI/UX SUPPORT (If Applicable)

### Goal
Design user interface and interaction patterns.

**Skip this stage if feature is backend-only or has no UI components.**

### Actions

```typescript
// 1. Check for existing design patterns
delegate_task({
  subagent_type: "X1 - explorer",
  run_in_background: true,
  description: "Find UI patterns",
  prompt: "Find existing UI components and patterns in [component directory]"
})

// 2. Consult designer for UI approach
delegate_task({
  subagent_type: "S6 - designer",
  skills: ["ui-designer", "visual-assets"],
  run_in_background: false,
  description: "UI design consultation",
  prompt: `
Feature: [Feature name]
Requirements: [User stories]
Existing patterns: [From explorer results]

Design:
1. UI layout suggestions
2. Interaction flow (step by step)
3. Component recommendations
4. Responsive considerations
5. Accessibility requirements
`
})

// 3. Visual review if mockup exists
delegate_task({
  subagent_type: "M10 - critic",
  skills: ["visual-debug"],
  run_in_background: false,
  description: "UI review",
  prompt: "Review this UI design for [issues to check]"
})
```

### Output Format

```markdown
## UI/UX DESIGN COMPLETE

### Layout Design
[Description of layout approach]

### Interaction Flow
1. User [action] -> System [response]
2. User [action] -> System [response]
3. [Continue flow...]

### Component Recommendations
| Component | Purpose | Existing/New |
|-----------|---------|--------------|
| [Name] | [What it does] | [Reuse existing / Create new] |

### Wireframe Description
```
+------------------+
|     Header       |
+------------------+
|  [Component A]   |
|  [Component B]   |
+------------------+
|     Footer       |
+------------------+
```

### Responsive Behavior
- Mobile: [Approach]
- Tablet: [Approach]
- Desktop: [Approach]

### Accessibility Requirements
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast compliance

---
**Proceed to IMPLEMENTATION PLAN?** [Awaiting confirmation]
```

---

## STAGE 4: IMPLEMENTATION PLAN

### Goal
Create detailed, actionable implementation plan.

### Actions

```typescript
// 1. Create main ticket
const mainTicket = ticket_create({
  title: "[Feature name]",
  description: "[Full description from stages 1-3]",
  type: "feature",
  priority: 2
})

// 2. Break down into sub-tickets
const tickets = [
  { title: "Setup: [Infrastructure/Schema]", depends: null },
  { title: "Backend: [API/Logic]", depends: "setup" },
  { title: "Frontend: [UI Components]", depends: "backend" },
  { title: "Tests: [Test coverage]", depends: "frontend" },
  { title: "Integration: [End-to-end]", depends: "tests" }
]

// Create tickets with dependencies
for (const t of tickets) {
  const id = ticket_create({ title: t.title, type: "task" })
  if (t.depends) {
    ticket_dep({ from: id, to: t.depends })
  }
}

// 3. Create immediate TODOs
TodoWrite([
  { id: "impl-1", content: "[First implementation step]", status: "pending", priority: "high" },
  { id: "impl-2", content: "[Second implementation step]", status: "pending", priority: "high" },
  // ...
])
```

### Output Format

```markdown
## IMPLEMENTATION PLAN COMPLETE

### Task Breakdown

| # | Task | Type | Estimate | Dependencies |
|---|------|------|----------|--------------|
| 1 | [Database schema changes] | Backend | 1h | None |
| 2 | [API endpoint creation] | Backend | 2h | Task 1 |
| 3 | [Business logic implementation] | Backend | 3h | Task 2 |
| 4 | [UI component development] | Frontend | 4h | Task 3 |
| 5 | [Unit tests] | Testing | 2h | Task 3 |
| 6 | [Integration tests] | Testing | 1h | Task 4 |
| 7 | [E2E tests] | Testing | 1h | Task 6 |

### Technical Details

**Files to Create**:
- `src/routes/[feature].ts` - API route
- `src/services/[feature].ts` - Business logic
- `src/components/[Feature].tsx` - UI component
- `src/[feature].test.ts` - Tests

**Files to Modify**:
- `src/db/schema.ts` - Add [table/columns]
- `src/routes/index.ts` - Register new route

### Development Approach
- **Methodology**: TDD (Test-Driven Development)
- **Branch**: `feature/[feature-name]`
- **Review**: Self-review + lsp_diagnostics

### Tickets Created
- [TICKET-001]: [Main feature ticket]
  - [TICKET-002]: [Sub-task 1]
  - [TICKET-003]: [Sub-task 2] (depends on TICKET-002)

### Ready to Execute
Use `/backend-tdd-workflow` or `/six-stage-workflow` to begin implementation.

---
**FEATURE PLANNING COMPLETE** - Ready for execution phase.
```

---

## INTEGRATION WITH OTHER WORKFLOWS

### Handoff to TDD Workflow

```typescript
// After feature-dev-workflow completes Stage 4,
// use backend-tdd-workflow for each implementation task

// Load the TDD workflow
skill("backend-tdd-workflow")

// Start with first ticket
ticket_start({ id: "[first-task-ticket]" })

// Follow TDD: RED -> GREEN -> REFACTOR
```

### Handoff to Six-Stage Workflow

```typescript
// For complex features, use six-stage-workflow
// which includes full EXECUTE -> OPTIMIZE -> REVIEW

skill("six-stage-workflow")

// Six-stage will handle:
// - Implementation with TDD
// - Optimization and refactoring
// - Final review and documentation
```

---

## QUICK REFERENCE

### Stage Summary

| Stage | Goal | Agents Used | Confirmation |
|-------|------|-------------|--------------|
| 1. Requirements | Understand needs | X1-explorer, R2-researcher | YES |
| 2. Solution | Design approach | K9-advisor | YES |
| 3. UI/UX | Interface design | S6-designer, M10-critic | YES (if applicable) |
| 4. Implementation | Task breakdown | - (ticket creation) | Plan delivered |

### When to Use This Workflow

| Scenario | Use feature-dev-workflow? |
|----------|---------------------------|
| New feature with UI | YES - full workflow |
| New feature backend-only | YES - skip Stage 3 |
| Bug fix | NO - use TDD workflow directly |
| Refactoring | NO - use refactor command |
| Simple task | NO - just create ticket and execute |

### Anti-Patterns

| NEVER DO | WHY |
|----------|-----|
| Skip requirements stage | Building wrong thing |
| Skip solution comparison | Missing better approaches |
| Jump to coding | No plan = wasted effort |
| Ignore UI/UX for user-facing features | Poor user experience |
| Giant monolithic plan | Break into manageable tickets |
