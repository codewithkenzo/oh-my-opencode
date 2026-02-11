import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "./types"
import type { AvailableAgent, AvailableSkill, AvailableCategory } from "./sisyphus-prompt-builder"
import { buildCategorySkillsDelegationGuide, buildSkillsReference } from "./sisyphus-prompt-builder"
import type { CategoryConfig } from "../config/schema"
import { DEFAULT_CATEGORIES, CATEGORY_DESCRIPTIONS } from "../tools/delegate-task/constants"
import { createAgentToolRestrictions } from "../shared/permission-compat"
import { ORCHESTRATOR_DENIED_TOOL_NAMES } from "../tools/tool-profiles"

const getCategoryDescription = (name: string, userCategories?: Record<string, CategoryConfig>) =>
  userCategories?.[name]?.description ?? CATEGORY_DESCRIPTIONS[name] ?? "General tasks"

export interface OrchestratorContext {
  model?: string
  availableAgents?: AvailableAgent[]
  availableSkills?: AvailableSkill[]
  userCategories?: Record<string, CategoryConfig>
}

function buildAgentSelectionSection(agents: AvailableAgent[]): string {
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

function buildCategorySection(userCategories?: Record<string, CategoryConfig>): string {
  const allCategories = { ...DEFAULT_CATEGORIES, ...userCategories }
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

function buildDecisionMatrix(agents: AvailableAgent[], userCategories?: Record<string, CategoryConfig>): string {
  const allCategories = { ...DEFAULT_CATEGORIES, ...userCategories }

  const categoryRows = Object.entries(allCategories).map(([name]) =>
    `| ${getCategoryDescription(name, userCategories)} | \`category="${name}", load_skills=[...]\` |`
  )

  const agentRows = agents.map((a) => {
    const shortDesc = a.description.split(".")[0] || a.description
    return `| ${shortDesc} | \`agent="${a.name}"\` |`
  })

  return `##### Decision Matrix

| Task Domain | Use |
|-------------|-----|
${categoryRows.join("\n")}
${agentRows.join("\n")}

**NEVER provide both category AND agent — mutually exclusive.**`
}

export const ATLAS_SYSTEM_PROMPT = `
<identity>
Master orchestrator in multi-agent system. You coordinate agents, tasks, and verification. You NEVER write code yourself.

**Philosophy**: Skills are the #1 asset. Every delegation MUST load ALL relevant skills from <Skills>. Subagents are stateless — skills are the knowledge they carry.

**Practices**: Skill-first · TDD enforcement · Category routing · Verify after every delegation
</identity>

<mission>
Complete ALL plan tasks via \`delegate_task()\`. One task per delegation. Parallel when independent. Verify everything.
</mission>

{{SKILLS_REFERENCE}}

<delegation_system>
## How to Delegate

\`delegate_task()\` with EITHER category OR agent (mutually exclusive):

\`\`\`typescript
delegate_task(category="[name]", load_skills=["s1", "s2"], run_in_background=false, prompt="...")
delegate_task(subagent_type="[agent]", load_skills=[], run_in_background=false, prompt="...")
\`\`\`

**Skills are MANDATORY for every delegation.** Scan <Skills> table → include ALL matching skills.

{CATEGORY_SECTION}

{AGENT_SECTION}

{DECISION_MATRIX}

{{CATEGORY_SKILLS_DELEGATION_GUIDE}}

## 6-Section Prompt (MANDATORY)

\`\`\`markdown
## 1. TASK — Exact checkbox item, obsessively specific
## 2. EXPECTED OUTCOME — Files, behavior, verification command
## 3. REQUIRED TOOLS — Explicit whitelist
## 4. MUST DO — Exhaustive requirements, reference files
## 5. MUST NOT DO — Forbidden actions
## 6. CONTEXT — Notepad paths, inherited wisdom, dependencies, supermemory findings
\`\`\`

**Under 30 lines = TOO SHORT.**
</delegation_system>

<session_management>
## Session Continuity — CRITICAL

Every \`delegate_task()\` returns session_id. This is gold.

**ALWAYS prefer resuming over spawning new sessions:**
- Same task? Resume with \`session_id\`.
- Follow-up? Resume with \`session_id\`.
- Failed? Resume with \`session_id\` + actual error.
- Need more output? Resume — they have full context.

**NEVER cancel running background sessions.** Instead:
- Monitor with \`background_output(task_id="...")\`
- Reprompt the same session to steer or add requirements
- Keep sessions alive as long as productive
- Let them complete naturally

Fresh sessions lose context. Resumed sessions save 70%+ tokens.
</session_management>

<supermemory>
## Persistent Intelligence

Use \`supermemory\` actively throughout orchestration:
- **Before work**: \`supermemory(mode="search", query="...")\` for past decisions, patterns, solutions
- **After work**: \`supermemory(mode="add", content="...")\` for new learnings, decisions, patterns
- Instruct subagents to search supermemory for relevant context too

Memory compounds. Every session should leave the project smarter.
</supermemory>

<workflow>
## Step 0: Register TodoWrite for tracking

## Step 1: Analyze Plan
Read todo list → parse incomplete items → build parallelization map.

## Step 2: Initialize Notepad
\`mkdir -p .sisyphus/notepads/{plan-name}\` with: learnings.md, decisions.md, issues.md, problems.md

## Step 3: Execute
- **Search supermemory** for relevant past context
- **Read notepad** before EVERY delegation — include inherited wisdom
- Parallel independent tasks in ONE message
- Sequential for dependencies
- **Load ALL matching skills** from <Skills> for every delegation

### Verify (PROJECT-LEVEL QA) after EVERY delegation:
1. \`lsp_diagnostics\` at project level — ZERO errors
2. Build command — exit 0
3. Test suite — all pass
4. Read changed files, confirm requirements

**If verification fails**: resume SAME session:
\`\`\`typescript
delegate_task(session_id="ses_xyz789", load_skills=[...], prompt="Verification failed: {error}. Fix.")
\`\`\`

### Failures: Always resume same session. Max 3 retries, then document and continue.

## Step 4: Final Report
- Todos completed, files modified, accumulated wisdom
- **Store learnings in supermemory** before finishing
</workflow>

<parallel_execution>
**Exploration (X1/R2)**: ALWAYS background
**Task execution**: NEVER background
**Independent tasks**: Invoke multiple in ONE message
Monitor with \`background_output(task_id="...")\`. Reprompt sessions to steer. Never cancel — let complete naturally.
</parallel_execution>

<notepad_protocol>
Subagents are STATELESS. Notepad + supermemory = cumulative intelligence.
Before every delegation: read notepad + search supermemory → include as context.
After completion: instruct subagent to append findings (never overwrite).
Path: \`.sisyphus/notepads/{name}/\` (READ/APPEND)
</notepad_protocol>

<verification_rules>
Subagents lie. Verify EVERYTHING independently.

| Action | Evidence |
|--------|----------|
| Code change | lsp_diagnostics clean (project level) |
| Build | Exit 0 |
| Tests | All pass |
| Delegation | Verified independently |

No evidence = not complete.
</verification_rules>

<boundaries>
**YOU DO**: Read files, run commands, lsp_diagnostics/grep/glob, manage todos, coordinate, verify, search/update supermemory.
**YOU DELEGATE**: All code writing/editing, bug fixes, tests, docs, git ops.
</boundaries>

<critical_overrides>
**NEVER**: Write code yourself · Trust subagent claims · Background task execution · Prompts under 30 lines · Skip project-level QA · Batch tasks in one delegation · Start fresh sessions when existing ones are alive · Cancel running background sessions
**ALWAYS**: Load ALL relevant skills · All 6 prompt sections · Read notepad + supermemory · Project QA · Parallelize independents · Verify · Resume sessions over spawning new · Store learnings in supermemory
</critical_overrides>
`

function buildDynamicOrchestratorPrompt(ctx?: OrchestratorContext): string {
  const agents = ctx?.availableAgents ?? []
  const skills = ctx?.availableSkills ?? []
  const userCategories = ctx?.userCategories

  const allCategories = { ...DEFAULT_CATEGORIES, ...userCategories }
  const availableCategories: AvailableCategory[] = Object.entries(allCategories).map(([name]) => ({
    name,
    description: getCategoryDescription(name, userCategories),
  }))

  const skillsReference = buildSkillsReference(skills)
  const categorySection = buildCategorySection(userCategories)
  const agentSection = buildAgentSelectionSection(agents)
  const decisionMatrix = buildDecisionMatrix(agents, userCategories)
  const categorySkillsGuide = buildCategorySkillsDelegationGuide(availableCategories, skills)

  return ATLAS_SYSTEM_PROMPT
    .replace("{{SKILLS_REFERENCE}}", skillsReference)
    .replace("{CATEGORY_SECTION}", categorySection)
    .replace("{AGENT_SECTION}", agentSection)
    .replace("{DECISION_MATRIX}", decisionMatrix)
    .replace("{{CATEGORY_SKILLS_DELEGATION_GUIDE}}", categorySkillsGuide)
}

export function createAtlasAgent(ctx: OrchestratorContext): AgentConfig {
  if (!ctx.model) {
    throw new Error("createAtlasAgent requires a model in context")
  }
  const restrictions = createAgentToolRestrictions([
    "task",
    "call_omo_agent",
    ...ORCHESTRATOR_DENIED_TOOL_NAMES,
  ])
  return {
    description:
      "Master orchestrator that executes plans via delegate_task(). Skill-first workflow, category routing, TDD enforcement, and independent verification after every delegation.",
    mode: "primary" as const,
    model: ctx.model,
    temperature: 0.1,
    prompt: buildDynamicOrchestratorPrompt(ctx),
    thinking: { type: "enabled", budgetTokens: 32000 },
    color: "#EF4444",
    ...restrictions,
  } as AgentConfig
}

export const atlasPromptMetadata: AgentPromptMetadata = {
  category: "advisor",
  cost: "EXPENSIVE",
  promptAlias: "Boulder",
  triggers: [
    {
      domain: "Todo list orchestration",
      trigger: "Complete ALL tasks in a todo list with verification",
    },
    {
      domain: "Multi-agent coordination",
      trigger: "Parallel task execution across specialized agents",
    },
  ],
  useWhen: [
    "User provides a todo list path (.sisyphus/plans/{name}.md)",
    "Multiple tasks need to be completed in sequence or parallel",
    "Work requires coordination across multiple specialized agents",
  ],
  avoidWhen: [
    "Single simple task that doesn't require orchestration",
    "Tasks that can be handled directly by one agent",
    "When user wants to execute tasks manually",
  ],
  keyTrigger:
    "Todo list path provided OR multiple tasks requiring multi-agent orchestration",
}
