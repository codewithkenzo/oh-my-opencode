import { describe, it, expect } from "bun:test"
import {
	buildSkillIndex,
	deduplicateSkills,
	sortSkillsDeterministic,
	getSkillMcpServerNames,
	formatSkillIndexSummary,
} from "./skill-index"
import type { LoadedSkill } from "./types"

function makeSkill(name: string, scope: LoadedSkill["scope"], mcpConfig?: LoadedSkill["mcpConfig"]): LoadedSkill {
	return {
		name,
		scope,
		definition: { name, description: `Test skill ${name}`, template: "" },
		mcpConfig,
	}
}

describe("buildSkillIndex", () => {
	it("should return empty index for empty array", () => {
		// #given: no loaded skills
		const skills: LoadedSkill[] = []

		// #when: building skill index
		const index = buildSkillIndex(skills)

		// #then: returns an empty index shape
		expect(index.entries).toEqual([])
		expect(index.totalCount).toBe(0)
		expect(index.mcpCount).toBe(0)
		expect(index.byName.size).toBe(0)
		expect(index.byScope.size).toBe(0)
		expect(index.withMcp).toEqual([])
	})

	it("should index skills with mixed scopes and MCP configs", () => {
		// #given: four skills across scopes with one MCP-enabled skill
		const skills = [
			makeSkill("builtin-a", "builtin"),
			makeSkill("builtin-b", "builtin"),
			makeSkill("opencode-with-mcp", "opencode", {
				playwright: { command: "npx", args: ["playwright"] },
			}),
			makeSkill("project-a", "project"),
		]

		// #when: building skill index
		const index = buildSkillIndex(skills)

		// #then: counts and lookups reflect source skills
		expect(index.totalCount).toBe(4)
		expect(index.mcpCount).toBe(1)
		expect(index.byScope.get("builtin")?.length).toBe(2)
		expect(index.byScope.get("opencode")?.length).toBe(1)
		expect(index.byScope.get("project")?.length).toBe(1)
		expect(index.withMcp.length).toBe(1)
		expect(index.withMcp[0]?.name).toBe("opencode-with-mcp")
		expect(index.byName.get("builtin-a")?.scope).toBe("builtin")
		expect(index.byName.get("opencode-with-mcp")?.mcpServerNames).toEqual(["playwright"])
	})
})

describe("deduplicateSkills", () => {
	it("should keep highest scope priority when names conflict", () => {
		// #given: duplicate skills with same name but different scope priority
		const skills = [makeSkill("my-skill", "builtin"), makeSkill("my-skill", "project")]

		// #when: deduplicating by skill name
		const deduplicated = deduplicateSkills(skills)

		// #then: keeps only highest-priority scope version
		expect(deduplicated.length).toBe(1)
		expect(deduplicated[0]?.name).toBe("my-skill")
		expect(deduplicated[0]?.scope).toBe("project")
	})

	it("should keep all skills with unique names", () => {
		// #given: unique skill names
		const skills = [makeSkill("alpha", "builtin"), makeSkill("beta", "opencode"), makeSkill("gamma", "project")]

		// #when: deduplicating by skill name
		const deduplicated = deduplicateSkills(skills)

		// #then: all skills are preserved
		expect(deduplicated.length).toBe(3)
		expect(deduplicated.map((s) => s.name).sort()).toEqual(["alpha", "beta", "gamma"])
	})
})

describe("sortSkillsDeterministic", () => {
	it("should sort by scope priority descending then name ascending", () => {
		// #given: unsorted skills with mixed scopes and names
		const skills = [
			makeSkill("zebra", "builtin"),
			makeSkill("alpha", "project"),
			makeSkill("beta", "opencode"),
			makeSkill("alpha", "opencode"),
		]

		// #when: sorting skills deterministically
		const sorted = sortSkillsDeterministic(skills)

		// #then: sorted by scope priority desc, then name asc
		expect(sorted.map((s) => `${s.scope}/${s.name}`)).toEqual([
			"project/alpha",
			"opencode/alpha",
			"opencode/beta",
			"builtin/zebra",
		])
	})

	it("should not mutate the input array", () => {
		// #given: source list in known order
		const skills = [makeSkill("b", "project"), makeSkill("a", "builtin")]
		const originalOrder = skills.map((s) => `${s.scope}/${s.name}`)

		// #when: sorting skills
		const sorted = sortSkillsDeterministic(skills)

		// #then: returns new sorted array and keeps original array order unchanged
		expect(skills.map((s) => `${s.scope}/${s.name}`)).toEqual(originalOrder)
		expect(sorted.map((s) => `${s.scope}/${s.name}`)).toEqual(["project/b", "builtin/a"])
		expect(sorted).not.toBe(skills)
	})
})

describe("getSkillMcpServerNames", () => {
	it("should extract and deduplicate server names", () => {
		// #given: index with overlapping MCP server names
		const skills = [
			makeSkill("skill-a", "opencode", {
				a: { command: "node", args: ["a"] },
				b: { command: "node", args: ["b"] },
			}),
			makeSkill("skill-b", "project", {
				b: { command: "node", args: ["b"] },
				c: { command: "node", args: ["c"] },
			}),
		]
		const index = buildSkillIndex(skills)

		// #when: extracting MCP server names from index
		const names = getSkillMcpServerNames(index)

		// #then: deduplicated names are returned sorted
		expect(names).toEqual(["a", "b", "c"])
	})

	it("should return empty array when no MCP skills", () => {
		// #given: index built from skills without MCP config
		const index = buildSkillIndex([makeSkill("a", "builtin"), makeSkill("b", "project")])

		// #when: extracting MCP server names
		const names = getSkillMcpServerNames(index)

		// #then: empty list is returned
		expect(names).toEqual([])
	})
})

describe("formatSkillIndexSummary", () => {
	it("should return readable summary with scope counts", () => {
		// #given: index with mixed scopes and MCP servers
		const index = buildSkillIndex([
			makeSkill("builtin-a", "builtin"),
			makeSkill("opencode-a", "opencode", {
				playwright: { command: "npx", args: ["playwright"] },
				context7: { command: "npx", args: ["context7"] },
			}),
			makeSkill("project-a", "project"),
		])

		// #when: formatting index summary
		const summary = formatSkillIndexSummary(index)

		// #then: summary includes headline, scope breakdown, and MCP servers
		expect(summary).toContain("Skill Index:")
		expect(summary).toContain("builtin(1)")
		expect(summary).toContain("opencode(1)")
		expect(summary).toContain("project(1)")
		expect(summary).toContain("MCP servers:")
		expect(summary).toContain("context7")
		expect(summary).toContain("playwright")
	})

	it("should omit MCP servers line when none exist", () => {
		// #given: index with no MCP-enabled skills
		const index = buildSkillIndex([makeSkill("builtin-a", "builtin"), makeSkill("project-a", "project")])

		// #when: formatting index summary
		const summary = formatSkillIndexSummary(index)

		// #then: summary does not include MCP servers line
		expect(summary).toContain("Skill Index:")
		expect(summary).not.toContain("MCP servers:")
	})
})
