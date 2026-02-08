import type { LoadedSkill, SkillScope } from "./types"
import { SCOPE_PRIORITY } from "./constants"

export interface SkillIndexEntry {
	name: string
	scope: SkillScope
	hasMcp: boolean
	mcpServerNames: string[]
	priority: number
}

export interface SkillIndex {
	entries: SkillIndexEntry[]
	byName: Map<string, SkillIndexEntry>
	byScope: Map<SkillScope, SkillIndexEntry[]>
	withMcp: SkillIndexEntry[]
	totalCount: number
	mcpCount: number
}

function extractMcpServerNames(skill: LoadedSkill): string[] {
	if (!skill.mcpConfig) return []
	return Object.keys(skill.mcpConfig).sort()
}

function skillToIndexEntry(skill: LoadedSkill): SkillIndexEntry {
	const mcpServerNames = extractMcpServerNames(skill)
	return {
		name: skill.name,
		scope: skill.scope,
		hasMcp: mcpServerNames.length > 0,
		mcpServerNames,
		priority: SCOPE_PRIORITY[skill.scope] ?? 0,
	}
}

export function buildSkillIndex(skills: LoadedSkill[]): SkillIndex {
	const entries = skills.map(skillToIndexEntry)

	const byName = new Map<string, SkillIndexEntry>()
	for (const entry of entries) {
		byName.set(entry.name, entry)
	}

	const byScope = new Map<SkillScope, SkillIndexEntry[]>()
	for (const entry of entries) {
		const list = byScope.get(entry.scope) ?? []
		list.push(entry)
		byScope.set(entry.scope, list)
	}

	const withMcp = entries.filter((e) => e.hasMcp)

	return {
		entries,
		byName,
		byScope,
		withMcp,
		totalCount: entries.length,
		mcpCount: withMcp.length,
	}
}

export function deduplicateSkills(skills: LoadedSkill[]): LoadedSkill[] {
	const seen = new Map<string, LoadedSkill>()
	for (const skill of skills) {
		const existing = seen.get(skill.name)
		if (!existing || SCOPE_PRIORITY[skill.scope] > SCOPE_PRIORITY[existing.scope]) {
			seen.set(skill.name, skill)
		}
	}
	return Array.from(seen.values())
}

export function sortSkillsDeterministic(skills: LoadedSkill[]): LoadedSkill[] {
	return [...skills].sort((a, b) => {
		const priorityDiff = SCOPE_PRIORITY[b.scope] - SCOPE_PRIORITY[a.scope]
		if (priorityDiff !== 0) return priorityDiff
		return a.name.localeCompare(b.name)
	})
}

export function getSkillMcpServerNames(index: SkillIndex): string[] {
	const names = new Set<string>()
	for (const entry of index.withMcp) {
		for (const name of entry.mcpServerNames) {
			names.add(name)
		}
	}
	return [...names].sort()
}

export function formatSkillIndexSummary(index: SkillIndex): string {
	const scopeOrder: SkillScope[] = ["builtin", "config", "user", "opencode", "project", "opencode-project"]
	const scopeParts = scopeOrder
		.map((scope) => {
			const count = index.byScope.get(scope)?.length ?? 0
			return count > 0 ? `${scope}(${count})` : null
		})
		.filter(Boolean)
		.join(", ")

	const mcpNames = getSkillMcpServerNames(index)
	const mcpLine = mcpNames.length > 0 ? `\nMCP servers: ${mcpNames.join(", ")}` : ""

	return `Skill Index: ${index.totalCount} skills (${index.mcpCount} with MCP)\nBy scope: ${scopeParts}${mcpLine}`
}
