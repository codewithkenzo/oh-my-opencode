---
name: project-scaffold
description: Create project structure with .opencode/, docs/dev/, and AGENTS.md files for each directory. Use when bootstrapping new projects or adding OpenCode structure to existing ones.
---

# Project Scaffold Skill

Scaffold a project with proper structure for AI agent collaboration.

## When to Load

- Starting a new project from scratch
- Adding OpenCode structure to existing project
- Setting up multi-agent workflow for a codebase

## Directory Structure

```
project/
├── docs/
│   └── dev/
│       ├── blueprint.md        # Technical architecture
│       ├── design-system.md    # Design tokens (if UI)
│       ├── AGENTS.md           # Dev workflow rules
│       └── sprints/
│           └── sprint-1.md     # Sprint tracking
├── src/
│   ├── app/
│   │   └── AGENTS.md           # Routing/pages context
│   ├── components/
│   │   └── AGENTS.md           # Component patterns
│   ├── lib/
│   │   └── AGENTS.md           # Utility conventions
│   ├── server/
│   │   └── AGENTS.md           # API patterns
│   └── db/
│       └── AGENTS.md           # Database conventions
├── .opencode/
│   ├── oh-my-opencode.json     # Project config (optional)
│   ├── skill/                   # Project-specific skills
│   └── command/                 # Project-specific commands
└── AGENTS.md                    # Root project context
```

## Scaffold Script

```bash
#!/bin/bash
# Run this to scaffold an OpenCode-ready project

# Create directory structure
mkdir -p docs/dev/sprints
mkdir -p src/{app,components,lib,server,db}
mkdir -p .opencode/{skill,command}

# Create root AGENTS.md
cat > AGENTS.md << 'EOF'
# PROJECT: [Project Name]

## Stack
- Runtime: Bun
- Framework: [Framework]
- UI: [UI Library]
- Database: [Database]

## Commands
- Dev: `bun run dev`
- Build: `bun run build`
- Test: `bun test`

## Conventions
- [Key patterns and rules]

## Agent Context
- Frontend work → Takumi - builder
- Backend work → Daiku - builder
- Design decisions → Shokunin - designer
- Debugging → Tantei (frontend) / Koji (backend)
EOF

# Create docs/dev/AGENTS.md
cat > docs/dev/AGENTS.md << 'EOF'
# Development Workflow

## Sprint Rules
- Tasks sized: TRIVIAL (<1hr), SMALL (1-2hr), MEDIUM (2-4hr), LARGE (4-8hr)
- Complete one sprint before starting next
- NO marking as done until tested AND user approved

## Todo States
| State | Meaning |
|-------|---------|
| pending | Not started |
| in_progress | Working (ONE at a time) |
| review | Agent done, needs verification |
| completed | User approved, tests pass |

## Verification Checklist
- [ ] `bun run build` passes
- [ ] `bun test` passes
- [ ] User approves (for UI changes)
- [ ] No type errors

## Research Protocol
- External libs → Fire Shisho first
- Codebase patterns → Fire Ninja first
- Don't guess, don't assume
EOF

# Create src/components/AGENTS.md
cat > src/components/AGENTS.md << 'EOF'
# Components Layer

## Patterns
- One component per file
- Co-locate tests with components
- Use Animate UI as base library

## Naming
- PascalCase for components: `UserCard.tsx`
- camelCase for hooks: `useAuth.ts`

## File Structure
```
ComponentName/
├── index.tsx        # Main component
├── types.ts         # Component types
└── ComponentName.test.tsx
```

## Do's
- Extract reusable logic to hooks
- Use Tailwind v4 for styling
- Add loading/error states

## Don'ts
- No inline styles
- No hardcoded colors (use design tokens)
- No logic in render functions
EOF

# Create src/server/AGENTS.md
cat > src/server/AGENTS.md << 'EOF'
# Server Layer

## Patterns
- Hono for routing
- Zod for input validation
- Effect-TS for error handling (optional)

## API Conventions
- REST endpoints: `/api/[resource]`
- Server functions: `src/server/fn/[name].ts`
- Always validate input with Zod

## Error Handling
- Return structured errors
- Log errors with context
- Never expose internal errors to client

## File Structure
```
server/
├── api/             # REST endpoints
├── fn/              # Server functions
├── middleware/      # Hono middleware
└── lib/             # Server utilities
```
EOF

# Create src/db/AGENTS.md
cat > src/db/AGENTS.md << 'EOF'
# Database Layer

## Patterns
- Drizzle ORM for queries
- SQLite for local dev
- Migrations in `db/migrations/`

## Conventions
- Schema in `db/schema.ts`
- One table per schema file (for large projects)
- Use `relations` for joins

## Commands
- Generate: `bunx drizzle-kit generate`
- Push: `bunx drizzle-kit push`
- Studio: `bunx drizzle-kit studio`

## Do's
- Use transactions for multi-step operations
- Add indexes for frequently queried columns
- Use `.with()` for eager loading

## Don'ts
- No raw SQL unless necessary
- No N+1 queries
- No schema changes without migration
EOF

# Create src/app/AGENTS.md
cat > src/app/AGENTS.md << 'EOF'
# App Layer (Routes/Pages)

## Patterns
- File-based routing
- Co-locate loaders with routes
- Use layouts for shared UI

## Naming
- Routes: `kebab-case`
- Route files: `route.tsx` or `index.tsx`

## Data Loading
- Loaders for initial data
- Server functions for mutations
- TanStack Query for client state

## Do's
- Keep routes thin (delegate to components)
- Handle loading/error states
- Use suspense boundaries

## Don'ts
- No business logic in routes
- No direct DB access (use server layer)
EOF

# Create src/lib/AGENTS.md
cat > src/lib/AGENTS.md << 'EOF'
# Lib Layer (Utilities)

## What Goes Here
- Shared utilities
- Type definitions
- Constants
- Helper functions

## Patterns
- Pure functions where possible
- No side effects
- Well-typed exports

## File Structure
```
lib/
├── utils.ts         # General utilities
├── types.ts         # Shared types
├── constants.ts     # App constants
└── [domain]/        # Domain-specific utils
```

## Do's
- Document complex functions
- Add unit tests for utilities
- Export from index.ts

## Don'ts
- No React components here
- No API calls
- No state management
EOF

echo "✅ Project scaffolded! Edit AGENTS.md files with project specifics."
```

## Quick Setup Commands

```bash
# One-liner to create structure
mkdir -p docs/dev/sprints src/{app,components,lib,server,db} .opencode/{skill,command}

# Create minimal AGENTS.md
echo "# PROJECT: [Name]\n\n## Stack\n- Bun + [Framework]\n\n## Commands\n- Dev: bun run dev\n- Test: bun test" > AGENTS.md
```

## Layer-Specific AGENTS.md Templates

### For Components (React/Frontend)
Focus on: component patterns, styling rules, state management

### For Server (API/Backend)
Focus on: route patterns, validation, error handling

### For Database
Focus on: schema conventions, migration workflow, query patterns

### For App (Routes)
Focus on: routing patterns, data loading, layout structure

## Integration with Agents

When scaffolding, inform agents of structure:

| Agent | Relevant AGENTS.md |
|-------|-------------------|
| Takumi - builder | components/, app/ |
| Daiku - builder | server/, db/, lib/ |
| Shokunin - designer | components/ |
| Hayai - builder | All (bulk operations) |

## Anti-Patterns

❌ Skip creating AGENTS.md files
❌ Put all rules in root only
❌ Forget docs/dev/ for development workflow
❌ Mix layer concerns (DB logic in components)
