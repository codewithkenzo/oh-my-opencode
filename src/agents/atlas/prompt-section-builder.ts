import type { CategoryConfig } from "../../config/schema"
import { CATEGORY_DESCRIPTIONS } from "../../tools/delegate-task/constants"
import { mergeCategories } from "../../shared/merge-categories"
import type { AvailableAgent, AvailableSkill } from "../dynamic-agent-prompt-builder"

function extractTriggerFromDescription(description: string): string {
  const triggerMatch = description.match(/Trigger[s]?:\s+([^.]+)/i)
  if (triggerMatch) return triggerMatch[1].trim()

  const activateMatch = description.match(/Activate when:\s+([^.]+)/i)
  if (activateMatch) return activateMatch[1].trim()

  const useWhenMatch = description.match(/Use (?:this )?when:\s+([^.]+)/i)
  if (useWhenMatch) return useWhenMatch[1].trim()

  return description.split(".")[0] || description
}

export function getCategoryDescription(name: string, userCategories?: Record<string, CategoryConfig>): string {
  return userCategories?.[name]?.description ?? CATEGORY_DESCRIPTIONS[name] ?? "General tasks"
}

export function buildAgentSelectionSection(agents: AvailableAgent[]): string {
  if (agents.length === 0) {
    return `##### Option B: Use AGENT directly

No agents available.`
  }

  const rows = agents.map((a) => {
    const shortDesc = a.description.split(".")[0] || a.description
    return `| \`${a.name}\` | ${shortDesc} |`
  })

  return `##### Option B: Use AGENT directly

| Agent | Best For |
|-------|----------|
${rows.join("\n")}`
}

export function buildCategorySection(userCategories?: Record<string, CategoryConfig>): string {
  const allCategories = mergeCategories(userCategories)
  const categoryRows = Object.entries(allCategories).map(([name, config]) => {
    const temp = config.temperature ?? 0.5
    return `| \`${name}\` | ${temp} | ${getCategoryDescription(name, userCategories)} |`
  })

  return `##### Option A: Use CATEGORY

| Category | Temp | Best For |
|----------|------|----------|
${categoryRows.join("\n")}

\`\`\`typescript
delegate_task(category="[name]", load_skills=[...], prompt="...")
\`\`\``
}

export function buildSkillsSection(skills: AvailableSkill[]): string {
  if (skills.length === 0) return ""

  const rows = skills.map((s) => {
    const trigger = extractTriggerFromDescription(s.description)
    return `| \`${s.name}\` | ${trigger} |`
  })

  return `<Skills>
## Available Skills

**Skill-first**: Before ANY action, scan this table. If a skill matches -> invoke via \`skill\` tool IMMEDIATELY.
When delegating via \`delegate_task()\`, include ALL matching skills in \`load_skills=[...]\`.
**kenzo-* skills take priority** when multiple skills match - they encode battle-tested project-specific patterns.

| Skill | Trigger / Domain |
|-------|------------------|
${rows.join("\n")}
</Skills>`
}

export function buildDecisionMatrix(agents: AvailableAgent[], userCategories?: Record<string, CategoryConfig>): string {
  const allCategories = mergeCategories(userCategories)

  const categoryRows = Object.entries(allCategories).map(([name]) => {
    return `| ${getCategoryDescription(name, userCategories)} | \`category="${name}", load_skills=[...]\` |`
  })

  const agentRows = agents.map((a) => {
    const shortDesc = a.description.split(".")[0] || a.description
    return `| ${shortDesc} | \`agent="${a.name}"\` |`
  })

  return `##### Decision Matrix

| Task Domain | Use |
|-------------|-----|
${categoryRows.join("\n")}
${agentRows.join("\n")}

**NEVER provide both category AND agent - mutually exclusive.**`
}
