export const HOOK_NAME = "agents-md-enforcer";

export const AGENTS_MD_FILENAME = "AGENTS.md";

export const ENFORCED_PATTERNS = [
  "src/",
  "src/*/",
  "src/*/*/",
  "packages/*/src/",
  "apps/*/src/",
  "lib/",
  "components/",
  "hooks/",
  "tools/",
  "features/",
  "agents/",
];

export const SKIP_PATTERNS = [
  "node_modules",
  "dist",
  ".git",
  "build",
  "coverage",
  ".next",
  ".cache"
];

export const CREATION_REMINDER = `
[AGENTS.MD REQUIRED]
This directory lacks an AGENTS.md file. For optimal AI assistance:
1. Create AGENTS.md with: purpose, conventions, key files, anti-patterns
2. This improves context for all future sessions in this directory

Template:
\`\`\`markdown
# [DIRECTORY_NAME] KNOWLEDGE BASE

## PURPOSE
Brief description of what this module/layer does.

## KEY FILES
| File | Purpose |
|------|---------|
| ... | ... |

## CONVENTIONS
- Convention 1
- Convention 2

## ANTI-PATTERNS
- Don't do X
- Avoid Y
\`\`\`
`;

export const MKDIR_REMINDER = `
[NEW DIRECTORY CREATED]
You created a new directory. Consider adding AGENTS.md for future context.
`;
