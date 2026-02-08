import { dirname } from "node:path"
import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { TOOL_DESCRIPTION_NO_SKILLS, TOOL_DESCRIPTION_PREFIX, FUNDAMENTAL_SKILLS, SKILL_CATEGORIES } from "./constants"
import type { SkillArgs, SkillInfo, SkillLoadOptions, FindSkillsArgs } from "./types"
import type { LoadedSkill } from "../../features/opencode-skill-loader"
import { getAllSkills, extractSkillTemplate } from "../../features/opencode-skill-loader/skill-content"
import { injectGitMasterConfig } from "../../features/opencode-skill-loader/skill-content"
import { substituteSkillVariables } from "../../features/opencode-skill-loader/substitution"
import { markForkActive, clearForkActive, subagentSessions } from "../../features/claude-code-session-state/state"
import type { SkillMcpManager, SkillMcpClientInfo, SkillMcpServerContext } from "../../features/skill-mcp-manager"
import type { Tool, Resource, Prompt } from "@modelcontextprotocol/sdk/types.js"

function loadedSkillToInfo(skill: LoadedSkill): SkillInfo {
  return {
    name: skill.name,
    description: skill.definition.description || "",
    location: skill.path,
    scope: skill.scope,
    license: skill.license,
    compatibility: skill.compatibility,
    metadata: skill.metadata,
    allowedTools: skill.allowedTools,
  }
}

function formatSkillsXml(skills: SkillInfo[]): string {
  if (skills.length === 0) return ""

  const skillsXml = skills.map(skill => {
    const lines = [
      "  <skill>",
      `    <name>${skill.name}</name>`,
      `    <description>${skill.description}</description>`,
    ]
    if (skill.compatibility) {
      lines.push(`    <compatibility>${skill.compatibility}</compatibility>`)
    }
    lines.push("  </skill>")
    return lines.join("\n")
  }).join("\n")

  return `\n\n<available_skills>\n${skillsXml}\n</available_skills>`
}

async function extractSkillBody(skill: LoadedSkill): Promise<string> {
  if (skill.lazyContent) {
    const fullTemplate = await skill.lazyContent.load()
    const templateMatch = fullTemplate.match(/<skill-instruction>([\s\S]*?)<\/skill-instruction>/)
    return templateMatch ? templateMatch[1].trim() : fullTemplate
  }

  if (skill.path) {
    return extractSkillTemplate(skill)
  }

  const templateMatch = skill.definition.template?.match(/<skill-instruction>([\s\S]*?)<\/skill-instruction>/)
  return templateMatch ? templateMatch[1].trim() : skill.definition.template || ""
}

async function formatMcpCapabilities(
  skill: LoadedSkill,
  manager: SkillMcpManager,
  sessionID: string
): Promise<string | null> {
  if (!skill.mcpConfig || Object.keys(skill.mcpConfig).length === 0) {
    return null
  }

  const sections: string[] = ["", "## Available MCP Servers", ""]

  for (const [serverName, config] of Object.entries(skill.mcpConfig)) {
    const info: SkillMcpClientInfo = {
      serverName,
      skillName: skill.name,
      sessionID,
    }
    const context: SkillMcpServerContext = {
      config,
      skillName: skill.name,
    }

    sections.push(`### ${serverName}`)
    sections.push("")

    try {
      const [tools, resources, prompts] = await Promise.all([
        manager.listTools(info, context).catch(() => []),
        manager.listResources(info, context).catch(() => []),
        manager.listPrompts(info, context).catch(() => []),
      ])

      if (tools.length > 0) {
        sections.push("**Tools:**")
        sections.push("")
        for (const t of tools as Tool[]) {
          sections.push(`#### \`${t.name}\``)
          if (t.description) {
            sections.push(t.description)
          }
          sections.push("")
          sections.push("**inputSchema:**")
          sections.push("```json")
          sections.push(JSON.stringify(t.inputSchema, null, 2))
          sections.push("```")
          sections.push("")
        }
      }
      if (resources.length > 0) {
        sections.push(`**Resources**: ${resources.map((r: Resource) => r.uri).join(", ")}`)
      }
      if (prompts.length > 0) {
        sections.push(`**Prompts**: ${prompts.map((p: Prompt) => p.name).join(", ")}`)
      }

      if (tools.length === 0 && resources.length === 0 && prompts.length === 0) {
        sections.push("*No capabilities discovered*")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      sections.push(`*Failed to connect: ${errorMessage.split("\n")[0]}*`)
    }

    sections.push("")
    sections.push(`Use \`skill_mcp\` tool with \`mcp_name="${serverName}"\` to invoke.`)
    sections.push("")
  }

  return sections.join("\n")
}

const FORK_TIMEOUT_MS = 30 * 60 * 1000
const POLL_INTERVAL_MS = 2000
const STABILITY_THRESHOLD = 3

interface ForkMessage {
  info?: { role?: string }
  parts?: Array<{ type?: string; text?: string }>
}

async function waitForForkCompletion(
  client: NonNullable<SkillLoadOptions["client"]>,
  sessionId: string
): Promise<string> {
  let lastMsgCount = -1
  let stablePolls = 0
  const startedAt = Date.now()

  while (true) {
    if (Date.now() - startedAt > FORK_TIMEOUT_MS) {
      return `[FORK_TIMEOUT: Fork session ${sessionId} exceeded 30 minute timeout]`
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

    try {
      const messagesResult = await client.session.messages({
        path: { id: sessionId },
      })

      if (messagesResult.error) {
        return `[FORK_ERROR: Failed to poll fork session: ${messagesResult.error}]`
      }

      const messages = (messagesResult.data ?? []) as ForkMessage[]
      const currentMsgCount = messages.length

      if (lastMsgCount === currentMsgCount) {
        stablePolls++

        if (stablePolls >= STABILITY_THRESHOLD) {
          const statusResult = await client.session.status()
          const allStatuses = (statusResult.data ?? {}) as Record<string, { type: string }>
          const sessionStatus = allStatuses[sessionId]

          if (sessionStatus?.type !== "idle") {
            stablePolls = 0
            lastMsgCount = currentMsgCount
            continue
          }

          const assistantMessages = messages.filter(m => m.info?.role === "assistant")
          const lastAssistantMsg = assistantMessages[assistantMessages.length - 1]

          if (!lastAssistantMsg?.parts) {
            return "[FORK_COMPLETE: No response captured]"
          }

          const textParts = lastAssistantMsg.parts
            .filter(p => p.type === "text" && p.text)
            .map(p => p.text)
            .join("\n")

          return textParts || "[FORK_COMPLETE: Empty response]"
        }
      } else {
        stablePolls = 0
      }

      lastMsgCount = currentMsgCount
    } catch (error) {
      return `[FORK_ERROR: ${error instanceof Error ? error.message : String(error)}]`
    }
  }
}

export function createSkillTool(options: SkillLoadOptions = {}): ToolDefinition {
  let cachedSkills: LoadedSkill[] | null = null
  let cachedDescription: string | null = null

  const getSkills = async (): Promise<LoadedSkill[]> => {
    if (options.skills) return options.skills
    if (cachedSkills) return cachedSkills
    cachedSkills = await getAllSkills()
    return cachedSkills
  }

  const getDescription = async (): Promise<string> => {
    if (cachedDescription) return cachedDescription
    const skills = await getSkills()
    
    const fundamentalSet = new Set<string>(FUNDAMENTAL_SKILLS)
    const fundamentalSkills = skills.filter(s => fundamentalSet.has(s.name))
    const fundamentalInfos = fundamentalSkills.map(loadedSkillToInfo)
    
    if (skills.length === 0) {
      cachedDescription = TOOL_DESCRIPTION_NO_SKILLS
    } else {
      const extraCount = skills.length - fundamentalSkills.length
      const suffix = extraCount > 0
        ? `\n\n<note>+${extraCount} more skills available. Use find_skills tool to discover domain-specific skills by category or query.</note>`
        : ""
      cachedDescription = TOOL_DESCRIPTION_PREFIX + formatSkillsXml(fundamentalInfos) + suffix
    }
    return cachedDescription
  }

  getDescription()

  return tool({
    get description() {
      return cachedDescription ?? TOOL_DESCRIPTION_PREFIX
    },
    args: {
      name: tool.schema.string().describe("The skill identifier from available_skills (e.g., 'code-review')"),
    },
    async execute(args: SkillArgs) {
      const skills = await getSkills()
      const skill = skills.find(s => s.name === args.name)

      if (!skill) {
        const available = skills.map(s => s.name).join(", ")
        throw new Error(`Skill "${args.name}" not found. Available skills: ${available || "none"}`)
      }

      let body = await extractSkillBody(skill)

      if (args.name === "git-master") {
        body = injectGitMasterConfig(body, options.gitMasterConfig)
      }

      const dir = skill.path ? dirname(skill.path) : skill.resolvedPath || process.cwd()

      if (skill.context === "fork") {
        const currentSessionId = options.getSessionID?.()

        if (!currentSessionId) {
          throw new Error(`Skill "${args.name}" uses context:fork but no session ID available.`)
        }

        if (!options.client) {
          throw new Error(`Skill "${args.name}" uses context:fork but client is not available.`)
        }

        markForkActive(currentSessionId)

        try {
          const { client } = options
          const agentToUse = skill.definition.agent || "D5 - backend builder"

          const createResult = await client.session.create({
            body: {
              parentID: currentSessionId,
              title: `Fork: ${skill.name}`,
            },
            query: {
              directory: dir,
            },
          })

          if (createResult.error) {
            throw new Error(`Failed to create fork session: ${createResult.error}`)
          }

          const forkSessionID = createResult.data.id
          subagentSessions.add(forkSessionID)

          const forkBody = substituteSkillVariables(body, { sessionId: forkSessionID })

          await client.session.prompt({
            path: { id: forkSessionID },
            body: {
              agent: agentToUse,
              tools: {
                delegate_task: false,
                call_omo_agent: false,
              },
              parts: [{ type: "text", text: forkBody }],
            },
          })

          const result = await waitForForkCompletion(client, forkSessionID)

          return `## Skill Fork: ${skill.name}\n\n**Agent**: ${agentToUse}\n**Session**: ${forkSessionID}\n\n${result}`
        } finally {
          clearForkActive(currentSessionId)
        }
      }

      if (options.getSessionID) {
        body = substituteSkillVariables(body, { sessionId: options.getSessionID() })
      }

      const output = [
        `## Skill: ${skill.name}`,
        "",
        `**Base directory**: ${dir}`,
        "",
        body,
      ]

      if (options.mcpManager && options.getSessionID && skill.mcpConfig) {
        const mcpInfo = await formatMcpCapabilities(
          skill,
          options.mcpManager,
          options.getSessionID()
        )
        if (mcpInfo) {
          output.push(mcpInfo)
        }
      }

      return output.join("\n")
    },
  })
}

export const skill: ToolDefinition = createSkillTool()

const FIND_SKILLS_DESCRIPTION = `List all available skills in the project, personal, and superpowers skill libraries.

Use this to discover domain-specific skills beyond the fundamental ones shown in the skill tool.

Categories: ${Object.keys(SKILL_CATEGORIES).join(", ")}`

export function createFindSkillsTool(options: SkillLoadOptions = {}): ToolDefinition {
  const getSkills = async () => {
    if (options.skills) return options.skills
    return getAllSkills()
  }

  const CATEGORY_KEYS = Object.keys(SKILL_CATEGORIES) as [string, ...string[]]
  const SCOPE_KEYS = ["project", "user", "opencode", "opencode-project"] as [string, ...string[]]

  return tool({
    description: FIND_SKILLS_DESCRIPTION,
    args: {
      query: tool.schema.string().optional().describe("Search term to filter skills by name/description"),
      category: tool.schema.enum(CATEGORY_KEYS).optional().describe("Filter by skill category"),
      scope: tool.schema.enum(SCOPE_KEYS).optional().describe("Filter by skill scope"),
      limit: tool.schema.number().optional().describe("Max results to return (default: 20)"),
    },
    async execute(args: FindSkillsArgs) {
      const skills = await getSkills()
      let filtered = skills

      if (args.category && args.category in SKILL_CATEGORIES) {
        const categorySkillNames = SKILL_CATEGORIES[args.category as keyof typeof SKILL_CATEGORIES]
        const categorySkills = new Set<string>(categorySkillNames)
        filtered = filtered.filter(s => categorySkills.has(s.name))
      }

      if (args.query) {
        const q = args.query.toLowerCase()
        filtered = filtered.filter(s =>
          s.name.toLowerCase().includes(q) ||
          (s.definition.description?.toLowerCase().includes(q) ?? false)
        )
      }

      if (args.scope) {
        filtered = filtered.filter(s => s.scope === args.scope)
      }

      const limited = filtered.slice(0, args.limit || 20)
      const skillInfos = limited.map(loadedSkillToInfo)

      if (skillInfos.length === 0) {
        return "No skills found matching the criteria."
      }

      return formatSkillsXml(skillInfos)
    },
  })
}

export const find_skills: ToolDefinition = createFindSkillsTool()
