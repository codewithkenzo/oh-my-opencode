import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { parseFrontmatter } from "../../shared/frontmatter"

interface SkillMetadata {
  name?: string
  description?: string
  patterns?: string[]
  tools?: string[]
  tags?: string[]
}

export interface DiscoveredSkill {
  name: string
  path: string
  patterns: string[]
  tools: string[]
  tags: string[]
}

function discoverSkillsFromDir(skillsDir: string): DiscoveredSkill[] {
  if (!existsSync(skillsDir)) return []

  const skills: DiscoveredSkill[] = []
  const entries = readdirSync(skillsDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    if (!entry.isDirectory()) continue

    const skillPath = join(skillsDir, entry.name)
    const skillMdPath = join(skillPath, "SKILL.md")

    if (!existsSync(skillMdPath)) continue

    try {
      const content = readFileSync(skillMdPath, "utf-8")
      const { data } = parseFrontmatter<SkillMetadata>(content)

      skills.push({
        name: data.name || entry.name,
        path: skillPath,
        patterns: data.patterns || inferPatternsFromName(entry.name),
        tools: data.tools || [],
        tags: data.tags || inferTagsFromName(entry.name)
      })
    } catch {
      skills.push({
        name: entry.name,
        path: skillPath,
        patterns: inferPatternsFromName(entry.name),
        tools: [],
        tags: inferTagsFromName(entry.name)
      })
    }
  }

  return skills
}

function inferPatternsFromName(name: string): string[] {
  const inferences: Record<string, string[]> = {
    "frontend": ["**/*.tsx", "**/*.jsx", "**/components/**"],
    "animation": ["**/motion/**", "**/animation*/**", "**/*.motion.*"],
    "hono": ["**/api/**", "**/routes/**", "**/server/**"],
    "drizzle": ["**/db/**", "**/schema*", "**/drizzle*"],
    "effect": ["**/*.effect.ts", "**/effect/**"],
    "tdd": ["**/*.test.ts", "**/*.spec.ts"],
    "debug": []
  }

  for (const [key, patterns] of Object.entries(inferences)) {
    if (name.toLowerCase().includes(key)) return patterns
  }
  return []
}

function inferTagsFromName(name: string): string[] {
  const tags: string[] = []
  if (name.includes("frontend") || name.includes("ui")) tags.push("frontend")
  if (name.includes("api") || name.includes("hono")) tags.push("backend")
  if (name.includes("db") || name.includes("drizzle")) tags.push("database")
  if (name.includes("test") || name.includes("tdd")) tags.push("testing")
  if (name.includes("debug")) tags.push("debugging")
  return tags
}

export function discoverAllSkills(projectDir: string): DiscoveredSkill[] {
  const globalDir = join(homedir(), ".opencode", "skill")
  const projectOpenCodeDir = join(projectDir, ".opencode", "skill")
  const projectClaudeDir = join(projectDir, ".claude", "skills")

  return [
    ...discoverSkillsFromDir(globalDir),
    ...discoverSkillsFromDir(projectOpenCodeDir),
    ...discoverSkillsFromDir(projectClaudeDir),
  ]
}

export function matchSkillsForFile(skills: DiscoveredSkill[], filePath: string): DiscoveredSkill[] {
  const matches: DiscoveredSkill[] = []

  for (const skill of skills) {
    for (const pattern of skill.patterns) {
      if (simpleGlobMatch(pattern, filePath)) {
        matches.push(skill)
        break
      }
    }
  }

  return matches
}

export function getSkillsByTag(skills: DiscoveredSkill[], tag: string): DiscoveredSkill[] {
  return skills.filter(s => s.tags.includes(tag))
}

function simpleGlobMatch(pattern: string, filePath: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLESTAR}}/g, ".*")

  return new RegExp(regex).test(filePath)
}
