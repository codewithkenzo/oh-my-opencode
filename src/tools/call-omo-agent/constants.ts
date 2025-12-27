export const ALLOWED_AGENTS = ["Ninja - explorer", "Shisho - researcher", "Takumi - builder", "Daiku - builder"] as const

export const CALL_OMO_AGENT_DESCRIPTION = `Spawn specialized agents. run_in_background REQUIRED (true=async, false=sync).

Available: {agents}

**Agent Selection Guide:**
- **Daiku - builder**: General/backend work - TypeScript, APIs, databases, server logic
- **Takumi - builder**: Frontend ONLY - React components, UI, styling, animations
- **Ninja - explorer**: Fast codebase search and pattern matching
- **Shisho - researcher**: External docs, GitHub research, best practices

Prompts MUST be in English. Use \`background_output\` for async results.`
