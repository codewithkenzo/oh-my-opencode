import { promises as fs } from "fs"
import { join, basename } from "path"
import { homedir } from "os"
import yaml from "js-yaml"
import { parseFrontmatter } from "../../shared/frontmatter"
import { sanitizeModelField } from "../../shared/model-sanitizer"
import { resolveSymlinkAsync, isMarkdownFile } from "../../shared/file-utils"
import { getClaudeConfigDir } from "../../shared"
import type { CommandDefinition } from "../claude-code-command-loader/types"
import type { SkillScope, SkillMetadata, LoadedSkill, LazyContentLoader } from "./types"
import type { SkillMcpConfig } from "../skill-mcp-manager/types"
import { collectMdFilesRecursive, parseAllowedTools, validateShellConfig } from "./utils"
import { preprocessShellCommands, executeShellBlock, substituteShellVariables } from "./shell-preprocessing"
import { discoverSupportingFiles, formatSize } from "./supporting-files"

function parseSkillMcpConfigFromFrontmatter(content: string): SkillMcpConfig | undefined {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatterMatch) return undefined

  try {
    const parsed = yaml.load(frontmatterMatch[1]) as Record<string, unknown>
    if (parsed && typeof parsed === "object" && "mcp" in parsed && parsed.mcp) {
      return parsed.mcp as SkillMcpConfig
    }
  } catch {
    return undefined
  }
  return undefined
}

async function loadMcpJsonFromDir(skillDir: string): Promise<SkillMcpConfig | undefined> {
  const mcpJsonPath = join(skillDir, "mcp.json")
  
  try {
    const content = await fs.readFile(mcpJsonPath, "utf-8")
    const parsed = JSON.parse(content) as Record<string, unknown>
    
    if (parsed && typeof parsed === "object" && "mcpServers" in parsed && parsed.mcpServers) {
      return parsed.mcpServers as SkillMcpConfig
    }
    
    if (parsed && typeof parsed === "object" && !("mcpServers" in parsed)) {
      const hasCommandField = Object.values(parsed).some(
        (v) => v && typeof v === "object" && "command" in (v as Record<string, unknown>)
      )
      if (hasCommandField) {
        return parsed as SkillMcpConfig
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

export async function loadSkillFromPath(
  skillPath: string,
  resolvedPath: string,
  defaultName: string,
  scope: SkillScope
): Promise<LoadedSkill | null> {
  try {
    const content = await fs.readFile(skillPath, "utf-8")
    const { data, body } = parseFrontmatter<SkillMetadata>(content)
    
    let shellVariables: Record<string, string> = {}
    if (validateShellConfig(data.shell)) {
      shellVariables = await executeShellBlock(data.shell, resolvedPath)
    }
    
    const processedBody = await preprocessShellCommands(body, resolvedPath)
    const substitutedBody = substituteShellVariables(processedBody, shellVariables)
    
    const frontmatterMcp = parseSkillMcpConfigFromFrontmatter(content)
    const mcpJsonMcp = await loadMcpJsonFromDir(resolvedPath)
    const mcpConfig = mcpJsonMcp || frontmatterMcp

    const subdirFiles = await collectMdFilesRecursive(resolvedPath, 0, 3, '')
    const mergedContent = subdirFiles.length > 0
      ? '\n\n<!-- Merged from subdirectories (alphabetical by path) -->\n\n' +
        subdirFiles.map(f => f.content).join('\n\n')
      : ''

    const supportingFiles = await discoverSupportingFiles(resolvedPath)
    const supportingFilesSection = supportingFiles.length > 0
      ? '\n<supporting-files>\n' +
        supportingFiles.map(f => `${f.relativePath} (${formatSize(f.sizeBytes)})`).join('\n') +
        '\n</supporting-files>\n\n'
      : ''

    const skillName = data.name || defaultName
    const originalDescription = data.description || ""
    const isOpencodeSource = scope === "opencode" || scope === "opencode-project"
    const formattedDescription = `(${scope} - Skill) ${originalDescription}`

    const templateContent = `<skill-instruction>
Base directory for this skill: ${resolvedPath}/
File references (@path) in this skill are relative to this directory.
${supportingFilesSection}${substitutedBody.trim()}${mergedContent}
</skill-instruction>

<user-request>
$ARGUMENTS
</user-request>`

    // RATIONALE: We read the file eagerly to ensure atomic consistency between
    // metadata and body. We maintain the LazyContentLoader interface for
    // compatibility, but the state is effectively eager.
    const eagerLoader: LazyContentLoader = {
      loaded: true,
      content: templateContent,
      load: async () => templateContent,
    }

    const definition: CommandDefinition = {
      name: skillName,
      description: formattedDescription,
      template: templateContent,
      model: sanitizeModelField(data.model, isOpencodeSource ? "opencode" : "claude-code"),
      agent: data.agent,
      subtask: data.subtask,
      argumentHint: data["argument-hint"],
    }

    return {
      name: skillName,
      path: skillPath,
      resolvedPath,
      definition,
      scope,
      license: data.license,
      compatibility: data.compatibility,
      metadata: data.metadata,
      allowedTools: parseAllowedTools(data["allowed-tools"]),
      mcpConfig,
      lazyContent: eagerLoader,
      disableModelInvocation: data["disable-model-invocation"],
      userInvocable: data["user-invocable"],
      context: data.context,
      hooks: data.hooks,
    }
  } catch {
    return null
  }
}

async function loadSkillsFromDir(skillsDir: string, scope: SkillScope): Promise<LoadedSkill[]> {
  const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => [])
  const skills: LoadedSkill[] = []

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue

    const entryPath = join(skillsDir, entry.name)

    if (entry.isDirectory() || entry.isSymbolicLink()) {
      const resolvedPath = await resolveSymlinkAsync(entryPath)
      const dirName = entry.name

      const skillMdPath = join(resolvedPath, "SKILL.md")
      try {
        await fs.access(skillMdPath)
        const skill = await loadSkillFromPath(skillMdPath, resolvedPath, dirName, scope)
        if (skill) skills.push(skill)
        continue
      } catch {
      }

      const namedSkillMdPath = join(resolvedPath, `${dirName}.md`)
      try {
        await fs.access(namedSkillMdPath)
        const skill = await loadSkillFromPath(namedSkillMdPath, resolvedPath, dirName, scope)
        if (skill) skills.push(skill)
        continue
      } catch {
      }

      continue
    }

    if (isMarkdownFile(entry)) {
      const skillName = basename(entry.name, ".md")
      const skill = await loadSkillFromPath(entryPath, skillsDir, skillName, scope)
      if (skill) skills.push(skill)
    }
  }

  return skills
}

function skillsToRecord(skills: LoadedSkill[]): Record<string, CommandDefinition> {
  const result: Record<string, CommandDefinition> = {}
  for (const skill of skills) {
    const { name: _name, argumentHint: _argumentHint, ...openCodeCompatible } = skill.definition
    result[skill.name] = openCodeCompatible as CommandDefinition
  }
  return result
}

export async function loadUserSkills(): Promise<Record<string, CommandDefinition>> {
  const userSkillsDir = join(getClaudeConfigDir(), "skills")
  const skills = await loadSkillsFromDir(userSkillsDir, "user")
  return skillsToRecord(skills)
}

export async function loadProjectSkills(): Promise<Record<string, CommandDefinition>> {
  const projectSkillsDir = join(process.cwd(), ".claude", "skills")
  const skills = await loadSkillsFromDir(projectSkillsDir, "project")
  return skillsToRecord(skills)
}

export async function loadOpencodeGlobalSkills(): Promise<Record<string, CommandDefinition>> {
  // Support both singular (oh-my-opencode convention) and plural (vercel-labs/add-skill convention)
  const skillsSingular = join(homedir(), ".config", "opencode", "skill")
  const skillsPlural = join(homedir(), ".config", "opencode", "skills")
  const [singular, plural] = await Promise.all([
    loadSkillsFromDir(skillsSingular, "opencode"),
    loadSkillsFromDir(skillsPlural, "opencode"),
  ])
  return skillsToRecord([...singular, ...plural])
}

export async function loadOpencodeProjectSkills(): Promise<Record<string, CommandDefinition>> {
  // Support both singular (oh-my-opencode convention) and plural (vercel-labs/add-skill convention)
  const skillsSingular = join(process.cwd(), ".opencode", "skill")
  const skillsPlural = join(process.cwd(), ".opencode", "skills")
  const [singular, plural] = await Promise.all([
    loadSkillsFromDir(skillsSingular, "opencode-project"),
    loadSkillsFromDir(skillsPlural, "opencode-project"),
  ])
  return skillsToRecord([...singular, ...plural])
}

export interface DiscoverSkillsOptions {
  includeClaudeCodePaths?: boolean
  forCommandListing?: boolean
}

export async function discoverAllSkills(): Promise<LoadedSkill[]> {
  const [opencodeProjectSkills, projectSkills, opencodeGlobalSkills, userSkills] = await Promise.all([
    discoverOpencodeProjectSkills(),
    discoverProjectClaudeSkills(),
    discoverOpencodeGlobalSkills(),
    discoverUserClaudeSkills(),
  ])

  return [...opencodeProjectSkills, ...projectSkills, ...opencodeGlobalSkills, ...userSkills]
}

export async function discoverSkills(options: DiscoverSkillsOptions = {}): Promise<LoadedSkill[]> {
  const { includeClaudeCodePaths = true, forCommandListing = false } = options

  const [opencodeProjectSkills, opencodeGlobalSkills] = await Promise.all([
    discoverOpencodeProjectSkills(),
    discoverOpencodeGlobalSkills(),
  ])

  let skills: LoadedSkill[]

  if (!includeClaudeCodePaths) {
    skills = [...opencodeProjectSkills, ...opencodeGlobalSkills]
  } else {
    const [projectSkills, userSkills] = await Promise.all([
      discoverProjectClaudeSkills(),
      discoverUserClaudeSkills(),
    ])
    skills = [...opencodeProjectSkills, ...projectSkills, ...opencodeGlobalSkills, ...userSkills]
  }

  if (forCommandListing) {
    skills = skills.filter(s => {
      if (s.scope === "builtin") return true
      return s.userInvocable !== false
    })
  }

  return skills
}

export async function getSkillByName(name: string, options: DiscoverSkillsOptions = {}): Promise<LoadedSkill | undefined> {
  const skills = await discoverSkills(options)
  return skills.find(s => s.name === name)
}

export async function discoverUserClaudeSkills(): Promise<LoadedSkill[]> {
  const userSkillsDir = join(getClaudeConfigDir(), "skills")
  return loadSkillsFromDir(userSkillsDir, "user")
}

export async function discoverProjectClaudeSkills(): Promise<LoadedSkill[]> {
  const projectSkillsDir = join(process.cwd(), ".claude", "skills")
  return loadSkillsFromDir(projectSkillsDir, "project")
}

export async function discoverOpencodeGlobalSkills(): Promise<LoadedSkill[]> {
  // Support both singular (oh-my-opencode convention) and plural (vercel-labs/add-skill convention)
  const skillsSingular = join(homedir(), ".config", "opencode", "skill")
  const skillsPlural = join(homedir(), ".config", "opencode", "skills")
  const [singular, plural] = await Promise.all([
    loadSkillsFromDir(skillsSingular, "opencode"),
    loadSkillsFromDir(skillsPlural, "opencode"),
  ])
  return [...singular, ...plural]
}

export async function discoverOpencodeProjectSkills(): Promise<LoadedSkill[]> {
  // Support both singular (oh-my-opencode convention) and plural (vercel-labs/add-skill convention)
  const skillsSingular = join(process.cwd(), ".opencode", "skill")
  const skillsPlural = join(process.cwd(), ".opencode", "skills")
  const [singular, plural] = await Promise.all([
    loadSkillsFromDir(skillsSingular, "opencode-project"),
    loadSkillsFromDir(skillsPlural, "opencode-project"),
  ])
  return [...singular, ...plural]
}
