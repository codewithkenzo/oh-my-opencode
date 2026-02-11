import type { AgentPromptMetadata, BuiltinAgentName } from "./types"

export interface AvailableAgent {
  name: BuiltinAgentName
  description: string
  metadata: AgentPromptMetadata
}

export interface AvailableTool {
  name: string
  category: "lsp" | "ast" | "search" | "session" | "command" | "other"
}

export interface AvailableSkill {
  name: string
  description: string
  location: "user" | "project" | "plugin"
}

export interface AvailableCategory {
  name: string
  description: string
}

export function categorizeTools(toolNames: string[]): AvailableTool[] {
  return toolNames.map((name) => {
    let category: AvailableTool["category"] = "other"
    if (name.startsWith("lsp_")) {
      category = "lsp"
    } else if (name.startsWith("ast_grep")) {
      category = "ast"
    } else if (name === "grep" || name === "glob") {
      category = "search"
    } else if (name.startsWith("session_")) {
      category = "session"
    } else if (name === "slashcommand") {
      category = "command"
    }
    return { name, category }
  })
}

function formatToolsForPrompt(tools: AvailableTool[]): string {
  const lspTools = tools.filter((t) => t.category === "lsp")
  const astTools = tools.filter((t) => t.category === "ast")
  const searchTools = tools.filter((t) => t.category === "search")

  const parts: string[] = []

  if (searchTools.length > 0) {
    parts.push(...searchTools.map((t) => `\`${t.name}\``))
  }

  if (lspTools.length > 0) {
    parts.push("`lsp_*`")
  }

  if (astTools.length > 0) {
    parts.push("`ast_grep`")
  }

  return parts.join(", ")
}

function extractTriggerFromDescription(description: string): string {
  const triggerMatch = description.match(/Trigger[s]?[:\s]+([^.]+)/i)
  if (triggerMatch) return triggerMatch[1].trim()

  const activateMatch = description.match(/Activate when[:\s]+([^.]+)/i)
  if (activateMatch) return activateMatch[1].trim()

  const useWhenMatch = description.match(/Use (?:this )?when[:\s]+([^.]+)/i)
  if (useWhenMatch) return useWhenMatch[1].trim()

  return description.split(".")[0] || description
}

/**
 * Single canonical skill reference. Listed ONCE, referenced by all sections.
 */
export function buildSkillsReference(skills: AvailableSkill[]): string {
  if (skills.length === 0) return ""

  const rows = skills.map((s) => {
    const trigger = extractTriggerFromDescription(s.description)
    return `| \`${s.name}\` | ${trigger} |`
  })

  return `<Skills>
## Available Skills

**Skill-first**: Before ANY action, scan this table. If a skill matches → invoke via \`skill\` tool IMMEDIATELY.
When delegating via \`delegate_task()\`, include ALL matching skills in \`load_skills=[...]\`.

| Skill | Trigger / Domain |
|-------|------------------|
${rows.join("\n")}
</Skills>`
}

export function buildKeyTriggersSection(agents: AvailableAgent[], _skills: AvailableSkill[] = []): string {
  const keyTriggers = agents
    .filter((a) => a.metadata.keyTrigger)
    .map((a) => `- ${a.metadata.keyTrigger}`)

  if (keyTriggers.length === 0) return ""

  return `### Key Triggers (check BEFORE classification):

**BLOCKING: Check <Skills> table FIRST.** If a skill matches, invoke it IMMEDIATELY.

${keyTriggers.join("\n")}
- **GitHub mention (@mention in issue/PR)** → WORK REQUEST. Full cycle: investigate → implement → PR.
- **"Look into" + "create PR"** → Full implementation cycle, not just research.`
}

export function buildToolSelectionTable(
  agents: AvailableAgent[],
  tools: AvailableTool[] = [],
  _skills: AvailableSkill[] = []
): string {
  const rows: string[] = [
    "### Tool & Agent Selection:",
    "",
    "**Priority**: Skills (see <Skills>) → Direct Tools → Agents",
    "",
    "| Resource | Cost | When to Use |",
    "|----------|------|-------------|",
  ]

  if (tools.length > 0) {
    const toolsDisplay = formatToolsForPrompt(tools)
    rows.push(`| ${toolsDisplay} | FREE | Scope clear, not complex |`)
  }

  const costOrder = { FREE: 0, CHEAP: 1, EXPENSIVE: 2 }
  const sortedAgents = [...agents]
    .filter((a) => a.metadata.category !== "utility")
    .sort((a, b) => costOrder[a.metadata.cost] - costOrder[b.metadata.cost])

  for (const agent of sortedAgents) {
    const shortDesc = agent.description.split(".")[0] || agent.description
    rows.push(`| \`${agent.name}\` | ${agent.metadata.cost} | ${shortDesc} |`)
  }

  rows.push("")
  rows.push("**Default flow**: skill → X1/R2 (background) + tools → K9 (if stuck)")

  return rows.join("\n")
}

export function buildExploreSection(agents: AvailableAgent[]): string {
  const exploreAgent = agents.find((a) => a.name === "X1 - explorer")
  if (!exploreAgent) return ""

  const useWhen = exploreAgent.metadata.useWhen || []
  const avoidWhen = exploreAgent.metadata.avoidWhen || []

  return `### X1 = Contextual Grep (fire liberally)

| Direct Tools | X1 - explorer |
|--------------|---------------|
${avoidWhen.map((w) => `| ${w} |  |`).join("\n")}
${useWhen.map((w) => `|  | ${w} |`).join("\n")}`
}

export function buildResearcherSection(agents: AvailableAgent[]): string {
  const librarianAgent = agents.find((a) => a.name === "R2 - researcher")
  if (!librarianAgent) return ""

  const useWhen = librarianAgent.metadata.useWhen || []

  return `### R2 = Reference Grep (external docs, OSS)

| Internal (X1) | External (R2) |
|----------------|---------------|
| OUR codebase | Docs, OSS repos, web |
| Project patterns | Library APIs & best practices |

**Fire R2 immediately for**: ${useWhen.map((w) => `"${w}"`).join(", ")}`
}

export function buildDelegationTable(agents: AvailableAgent[]): string {
  const rows: string[] = [
    "### Delegation Routing:",
    "",
    "| Domain | Agent | Trigger |",
    "|--------|-------|---------|",
  ]

  for (const agent of agents) {
    for (const trigger of agent.metadata.triggers) {
      rows.push(`| ${trigger.domain} | \`${agent.name}\` | ${trigger.trigger} |`)
    }
  }

  return rows.join("\n")
}

export function buildFrontendSection(agents: AvailableAgent[]): string {
  const frontendAgent = agents.find((a) => a.name === "T4 - frontend builder")
  if (!frontendAgent) return ""

  return `### Frontend: VISUAL = HARD BLOCK

**ANY** styling/className/layout/animation keyword → DELEGATE to T4. Zero exceptions.

Keywords: \`style, className, tailwind, css, color, background, border, shadow, margin, padding, width, height, flex, grid, animation, transition, hover, responsive, font-size, icon, svg, image, layout, position, display, opacity, z-index, transform, gradient, theme\`

**Exception**: Pure logic only (API calls, state, event handlers, types) with ZERO visual keywords in diff.
Mixed changes → split logic (you) from visual (T4).`
}

export function buildAdvisorSection(agents: AvailableAgent[]): string {
  const oracleAgent = agents.find((a) => a.name === "K9 - advisor")
  if (!oracleAgent) return ""

  const useWhen = oracleAgent.metadata.useWhen || []
  const avoidWhen = oracleAgent.metadata.avoidWhen || []

  return `<Oracle_Usage>
## K9 Advisor — Read-Only Consultant

Expensive, high-quality reasoning model. Consultation only.

**Consult for**: ${useWhen.join("; ")}
**Skip for**: ${avoidWhen.join("; ")}

Announce "Consulting K9 for [reason]" before invocation (only case where you announce).
</Oracle_Usage>`
}

export function buildHardBlocksSection(agents: AvailableAgent[]): string {
  const frontendAgent = agents.find((a) => a.name === "T4 - frontend builder")

  const blocks = [
    "| Type suppression (`as any`, `@ts-ignore`) | Never |",
    "| Commit without explicit request | Never |",
    "| Speculate about unread code | Never |",
    "| Leave code broken after failures | Never |",
  ]

  if (frontendAgent) {
    blocks.unshift(
      "| Frontend VISUAL changes | **HARD BLOCK** — delegate to T4. Zero tolerance. |"
    )
  }

  return `## Hard Blocks

| Constraint | Exception |
|------------|-----------|
${blocks.join("\n")}`
}

export function buildAntiPatternsSection(agents: AvailableAgent[]): string {
  const frontendAgent = agents.find((a) => a.name === "T4 - frontend builder")

  const patterns = [
    "| **Type Safety** | `as any`, `@ts-ignore`, `@ts-expect-error` |",
    "| **Error Handling** | Empty catch blocks |",
    "| **Testing** | Deleting failing tests |",
    "| **Search** | Agents for single-line typos |",
    "| **Debugging** | Shotgun debugging |",
  ]

  if (frontendAgent) {
    patterns.splice(4, 0, "| **Frontend** | Direct visual/styling edits — DELEGATE |")
  }

  return `## Anti-Patterns (BLOCKING)

| Category | Forbidden |
|----------|-----------|
${patterns.join("\n")}`
}

export function buildUltraworkAgentSection(agents: AvailableAgent[]): string {
  if (agents.length === 0) return ""

  const ultraworkAgentPriority = ["X1 - explorer", "R2 - researcher", "plan", "K9 - advisor"]
  const sortedAgents = [...agents].sort((a, b) => {
    const aIdx = ultraworkAgentPriority.indexOf(a.name)
    const bIdx = ultraworkAgentPriority.indexOf(b.name)
    if (aIdx === -1 && bIdx === -1) return 0
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })

  const lines: string[] = []
  for (const agent of sortedAgents) {
    const shortDesc = agent.description.split(".")[0] || agent.description
    const suffix = (agent.name === "X1 - explorer" || agent.name === "R2 - researcher") ? " (multiple)" : ""
    lines.push(`- **${agent.name}${suffix}**: ${shortDesc}`)
  }

  return lines.join("\n")
}

export function buildCategorySkillsDelegationGuide(categories: AvailableCategory[], _skills: AvailableSkill[]): string {
  if (categories.length === 0) return ""

  const categoryRows = categories.map((c) => {
    const desc = c.description || c.name
    return `| \`${c.name}\` | ${desc} |`
  })

  return `### Delegation System

\`delegate_task()\` = category + skills for optimal routing.

#### Categories

| Category | Domain |
|----------|--------|
${categoryRows.join("\n")}

#### Skill Selection Protocol

1. **Select category** matching task domain
2. **Scan <Skills> table** — include ALL matching skills in \`load_skills=[...]\`
3. Subagents are STATELESS — missing a skill = suboptimal output

\`\`\`typescript
delegate_task(category="[name]", load_skills=["skill-1", "skill-2"], prompt="...")
\`\`\``
}
