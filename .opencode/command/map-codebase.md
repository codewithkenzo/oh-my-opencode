---
description: Map and understand the codebase structure
---

# Map Codebase

Analyze and document the codebase structure for quick orientation.

## Steps

1. **Directory Structure**: Read the top-level directories and key files
2. **Entry Points**: Find main entry files (index.ts, main.ts, app.ts, etc.)
3. **Config Files**: Identify package.json, tsconfig, build configs
4. **Architecture**: Determine patterns (monorepo, modular, layered)

## Output Format

Provide a concise map:

```
PROJECT_NAME/
├── src/           # Source code
│   ├── [layer]/   # Description
│   └── ...
├── tests/         # Test files
├── config/        # Configuration
└── [key files]    # Purpose
```

## Key Questions to Answer

- What's the tech stack?
- Where's the main entry point?
- How is code organized (by feature, layer, domain)?
- What are the key modules/components?
- Are there AGENTS.md or README files with context?

## Approach

Fire 2-3 Ninja explorers in parallel:
1. Find entry points and exports
2. Find AGENTS.md and README files
3. Analyze directory structure

Synthesize into a clear mental map.
