---
description: Start a new project with guided brainstorm, design, and blueprint creation
---

# New Project: $ARGUMENTS

You are starting a new project. Guide the user through a structured discovery and planning process.

## CRITICAL RULES

1. **ASK FIRST** - Never assume. Always clarify before proceeding.
2. **RESEARCH ALWAYS** - Use Shisho + Ninja for every phase, don't rely on assumptions
3. **SAVE EVERYTHING** - Blueprints go to `docs/dev/`, AGENTS.md to each directory
4. **NO IMPLEMENTATION** - This is planning only. Musashi executes later.

## Phase 1: Discovery (ASK USER)

Start by understanding the idea. Ask:

1. **What**: "Describe your idea in plain words. What problem does it solve?"
2. **Who**: "Who is the target user?"
3. **Scope**: "MVP or full product? What's the timeline?"
4. **Constraints**: "Any technical requirements? (Platform, integrations, performance)"
5. **References**: "Any existing apps to reference for UX/design?"

**Wait for answers before proceeding.**

## Phase 2: Research (PARALLEL AGENTS)

Fire research agents BEFORE making any decisions:

```typescript
// External research
background_task(agent="Shisho - researcher", prompt=`
  Research best practices for [project type]:
  - Recommended tech stacks for [use case]
  - Common architectural patterns
  - Potential pitfalls to avoid
  - Similar open source projects
`)

// If UI project, gather design inspiration
background_task(agent="Shisho - researcher", prompt=`
  Find UI/UX examples for [project type]:
  - Dribbble, Awwwards references
  - Common UI patterns for [feature]
  - Accessibility considerations
`)
```

Collect results before proceeding.

## Phase 3: Design Language (IF UI PROJECT)

Load design skills and establish visual direction:

```typescript
skill({ name: "ui-designer" })
skill({ name: "design-researcher" })

// Delegate to Shokunin for design direction
call_omo_agent({
  subagent_type: "Shokunin - designer",
  prompt: `
    LOAD SKILLS: ui-designer, design-researcher

    Create design direction for [project]:
    - Brand personality
    - Color palette
    - Typography
    - Component patterns

    Reference: [user's references]

    Output: Design Starter Pack as docs/dev/design-system.md
  `
})
```

## Phase 4: Architecture Blueprint

Load blueprint skill and create structured plan:

```typescript
skill({ name: "blueprint-architect" })
```

Create blueprint with:
- Stack decisions (with rationale)
- Directory structure
- Component inventory
- Implementation phases with sizing (TRIVIAL/SMALL/MEDIUM/LARGE)

**SAVE TO**: `docs/dev/blueprint.md`

## Phase 5: Project Scaffold

Create the project structure:

### Directory Structure
```
project/
├── docs/
│   └── dev/
│       ├── blueprint.md       # Technical plan
│       ├── design-system.md   # Design tokens (if UI)
│       ├── AGENTS.md          # Dev workflow rules
│       └── sprints/           # Sprint tracking
├── src/
│   ├── app/
│   │   └── AGENTS.md          # App layer context
│   ├── components/
│   │   └── AGENTS.md          # Component guidelines
│   ├── lib/
│   │   └── AGENTS.md          # Utility patterns
│   ├── server/
│   │   └── AGENTS.md          # API conventions
│   └── db/
│       └── AGENTS.md          # Database patterns
├── .opencode/
│   ├── skill/                  # Project-specific skills
│   └── command/                # Project-specific commands
└── AGENTS.md                   # Root project context
```

### docs/dev/AGENTS.md Content
```markdown
# Development Workflow

## Sprint Rules
- Tasks sized: TRIVIAL (<1hr), SMALL (1-2hr), MEDIUM (2-4hr), LARGE (4-8hr)
- Complete one sprint before starting next
- NO marking as done until tested AND user approved

## Todo States
- `pending` - Not started
- `in_progress` - Currently working (ONE at a time)
- `review` - Done by agent, needs user verification
- `completed` - User approved, tests pass

## Verification Checklist
- [ ] `bun run build` passes
- [ ] `bun test` passes
- [ ] User approves (for UI)
- [ ] Documented if complex
```

### Each AGENTS.md should contain:
- Layer-specific patterns
- File naming conventions
- Import patterns
- Do's and Don'ts for that layer

## Phase 6: Todo Preparation

Create todos for first sprint using `todowrite`:

| Task | Size | Agent | Files |
|------|------|-------|-------|
| [Task 1] | SMALL | Daiku | [...] |
| [Task 2] | MEDIUM | Takumi | [...] |

## Phase 7: Handoff Summary

Present to user:
1. Created: `docs/dev/blueprint.md`
2. Created: `docs/dev/design-system.md` (if UI)
3. Created: AGENTS.md in each directory
4. Created: Sprint 1 todos

**Ask**: "Blueprint complete. Ready to proceed with Sprint 1?"

When user says "proceed" or "go", Musashi takes over with execution.

## Agent Routing Guide

| Work Type | Agent | Skills to Load |
|-----------|-------|----------------|
| Design direction | Shokunin - designer | ui-designer, design-researcher |
| Component build | Takumi - builder | frontend-stack, animate-ui-expert |
| API/backend | Daiku - builder | hono-api, drizzle-orm |
| Bulk edits | Hayai - builder | (follows instructions) |
| Docs | Sakka - writer | - |

## Remember

- **Hayai is fast but dumb** - Give explicit instructions, don't expect creativity
- **Takumi is frontend specialist** - Component implementation, not design decisions
- **Daiku is backend specialist** - APIs, databases, TypeScript, NOT frontend
- **Shisho researches external** - Libraries, docs, best practices
- **Ninja searches internal** - Our codebase patterns
