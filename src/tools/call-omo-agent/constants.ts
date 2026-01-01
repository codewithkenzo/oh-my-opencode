export const ALLOWED_AGENTS = [
  "Ninja - explorer",
  "Shisho - researcher",
  "Takumi - builder",
  "Daiku - builder",
  "Kenja - advisor",
  "Shokunin - designer",
  "Hayai - builder",
  "Tantei - debugger",
  "Koji - debugger",
  "Sakka - writer",
  "Miru - observer",
  "Senshi - distributor",
  "Seichou - growth",
  "Tsunagi - networker",
] as const

export const CALL_OMO_AGENT_DESCRIPTION = `Spawn specialized agents. run_in_background REQUIRED (true=async, false=sync).

Available: {agents}

**Agent Selection Guide:**
- **Daiku - builder**: General/backend work - TypeScript, APIs, databases, server logic
- **Takumi - builder**: Frontend ONLY - React components, UI, styling, animations
- **Ninja - explorer**: Fast codebase search and pattern matching
- **Shisho - researcher**: External docs, GitHub research, best practices
- **Kenja - advisor**: Architecture decisions, code analysis, strategic guidance
- **Koji - debugger**: Backend debugging - APIs, databases, server issues
- **Tantei - debugger**: Visual/frontend debugging with screenshots

Prompts MUST be in English. Use \`background_output\` for async results.`
