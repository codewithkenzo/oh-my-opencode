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
  "Miru - critic",
  "Senshi - distributor",
  "Seichou - growth",
  "Tsunagi - networker",
  "Bunshi - writer",
] as const

export const CALL_OMO_AGENT_DESCRIPTION = `Spawn specialized agents. run_in_background REQUIRED (true=async, false=sync).

Available: {agents}

**Agent Selection Guide (by speed):**

⚡ FAST (grok-code/gemini-flash):
- **Ninja - explorer**: Codebase search, pattern matching
- **Shisho - researcher**: External docs, GitHub research
- **Hayai - builder**: Bulk edits, find/replace, simple transforms
- **Tantei - debugger**: Visual/CSS debugging with screenshots
- **Koji - debugger**: Backend/API debugging, logs, errors
- **Sakka - writer**: Docs, README, technical writing
- **Miru - critic**: Image/PDF analysis, visual review
- **Senshi - distributor**: Launch, social, distribution
- **Seichou - growth**: Growth experiments, marketing
- **Tsunagi - networker**: Outreach, community, networking

🔶 MEDIUM (MiniMax/gemini-pro):
- **Takumi - builder**: Frontend components, React, UI, animations
- **Shokunin - designer**: Design systems, visual language, tokens

🐢 SLOW (glm-4.7/gemini-pro):
- **Daiku - builder**: Complex backend, APIs, databases
- **Kenja - advisor**: Architecture, code review (expensive)
- **Bunshi - writer**: Long-form content, narratives

Prompts MUST be in English. Use \`background_output\` for async results.`
