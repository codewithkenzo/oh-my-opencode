export const ALLOWED_AGENTS = [
  "X1 - explorer",
  "R2 - researcher",
  "H3 - bulk builder",
  "T4 - frontend builder",
  "D5 - backend builder",
  "F1 - fast builder",
  "S6 - designer",
  "G5 - debugger",
  "W7 - writer",
  "K9 - advisor",
  "M10 - critic",
  "B3 - router",
  "O9 - specialist",
  "Senshi - distributor",
  "Seichou - growth",
  "Tsunagi - networker",
] as const

export const CALL_OMO_AGENT_DESCRIPTION = `Spawn specialized agents. run_in_background REQUIRED (true=async, false=sync).

Available: {agents}

**Agent Selection Guide (by speed):**

⚡ FAST (grok-code/gemini-flash):
- **X1 - explorer**: Codebase search, pattern matching
- **R2 - researcher**: External docs, GitHub research
- **H3 - bulk builder**: Bulk edits, find/replace, simple transforms
- **F1 - fast builder**: Fast backend scaffolding, early-stage work
- **G5 - debugger**: Unified debugging (visual + backend)
- **W7 - writer**: Unified writer (docs + long-form)
- **M10 - critic**: Image/PDF analysis, visual review
- **Senshi - distributor**: Launch, social, distribution
- **Seichou - growth**: Growth experiments, marketing
- **Tsunagi - networker**: Outreach, community, networking

🔶 MEDIUM (MiniMax/gemini-pro):
- **T4 - frontend builder**: Frontend components, React, UI, animations
- **S6 - designer**: Design systems, visual language, tokens
- **B3 - router**: Builder dispatcher, routes to T4/D5/H3

🐢 SLOW (glm-4.7/opus):
- **D5 - backend builder**: Complex backend, APIs, databases (2-3 loops in)
- **K9 - advisor**: Architecture, code review (expensive)
- **O9 - specialist**: Deep analysis, security review, impossible bugs (Opus)

Prompts MUST be in English. Use \`background_output\` for async results.`
