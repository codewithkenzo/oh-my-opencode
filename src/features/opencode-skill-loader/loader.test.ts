import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mkdirSync, writeFileSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { loadSkillFromPath } from "./loader"

const TEST_DIR = join(tmpdir(), "skill-loader-test-" + Date.now())
const SKILLS_DIR = join(TEST_DIR, ".opencode", "skill")

function createTestSkill(name: string, content: string, mcpJson?: object): string {
  const skillDir = join(SKILLS_DIR, name)
  mkdirSync(skillDir, { recursive: true })
  const skillPath = join(skillDir, "SKILL.md")
  writeFileSync(skillPath, content)
  if (mcpJson) {
    writeFileSync(join(skillDir, "mcp.json"), JSON.stringify(mcpJson, null, 2))
  }
  return skillDir
}

describe("skill loader MCP parsing", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  describe("parseSkillMcpConfig", () => {
    it("parses skill with nested MCP config", async () => {
      // #given
      const skillContent = `---
name: test-skill
description: A test skill with MCP
mcp:
  sqlite:
    command: uvx
    args:
      - mcp-server-sqlite
      - --db-path
      - ./data.db
  memory:
    command: npx
    args: [-y, "@anthropic-ai/mcp-server-memory"]
---
This is the skill body.
`
      createTestSkill("test-mcp-skill", skillContent)

      // #when
      const { discoverSkills } = await import("./loader")
      const originalCwd = process.cwd()
      process.chdir(TEST_DIR)

      try {
        const skills = await discoverSkills({ includeClaudeCodePaths: false })
        const skill = skills.find(s => s.name === "test-skill")

        // #then
        expect(skill).toBeDefined()
        expect(skill?.mcpConfig).toBeDefined()
        expect(skill?.mcpConfig?.sqlite).toBeDefined()
        expect(skill?.mcpConfig?.sqlite?.command).toBe("uvx")
        expect(skill?.mcpConfig?.sqlite?.args).toEqual([
          "mcp-server-sqlite",
          "--db-path",
          "./data.db"
        ])
        expect(skill?.mcpConfig?.memory).toBeDefined()
        expect(skill?.mcpConfig?.memory?.command).toBe("npx")
      } finally {
        process.chdir(originalCwd)
      }
    })

    it("returns undefined mcpConfig for skill without MCP", async () => {
      // #given
      const skillContent = `---
name: simple-skill
description: A simple skill without MCP
---
This is a simple skill.
`
      createTestSkill("simple-skill", skillContent)

      // #when
      const { discoverSkills } = await import("./loader")
      const originalCwd = process.cwd()
      process.chdir(TEST_DIR)

      try {
        const skills = await discoverSkills({ includeClaudeCodePaths: false })
        const skill = skills.find(s => s.name === "simple-skill")

        // #then
        expect(skill).toBeDefined()
        expect(skill?.mcpConfig).toBeUndefined()
      } finally {
        process.chdir(originalCwd)
      }
    })

    it("preserves env var placeholders without expansion", async () => {
      // #given
      const skillContent = `---
name: env-skill
mcp:
  api-server:
    command: node
    args: [server.js]
    env:
      API_KEY: "\${API_KEY}"
      DB_PATH: "\${HOME}/data.db"
---
Skill with env vars.
`
      createTestSkill("env-skill", skillContent)

      // #when
      const { discoverSkills } = await import("./loader")
      const originalCwd = process.cwd()
      process.chdir(TEST_DIR)

      try {
        const skills = await discoverSkills({ includeClaudeCodePaths: false })
        const skill = skills.find(s => s.name === "env-skill")

        // #then
        expect(skill?.mcpConfig?.["api-server"]?.env?.API_KEY).toBe("${API_KEY}")
        expect(skill?.mcpConfig?.["api-server"]?.env?.DB_PATH).toBe("${HOME}/data.db")
      } finally {
        process.chdir(originalCwd)
      }
    })

    it("handles malformed YAML gracefully", async () => {
      // #given - malformed YAML causes entire frontmatter to fail parsing
      const skillContent = `---
name: bad-yaml
mcp: [this is not valid yaml for mcp
---
Skill body.
`
      createTestSkill("bad-yaml-skill", skillContent)

      // #when
      const { discoverSkills } = await import("./loader")
      const originalCwd = process.cwd()
      process.chdir(TEST_DIR)

      try {
        const skills = await discoverSkills({ includeClaudeCodePaths: false })
        // #then - when YAML fails, skill uses directory name as fallback
        const skill = skills.find(s => s.name === "bad-yaml-skill")

        expect(skill).toBeDefined()
        expect(skill?.mcpConfig).toBeUndefined()
      } finally {
        process.chdir(originalCwd)
      }
    })
  })

  describe("mcp.json file loading (AmpCode compat)", () => {
    it("loads MCP config from mcp.json with mcpServers format", async () => {
      // #given
      const skillContent = `---
name: ampcode-skill
description: Skill with mcp.json
---
Skill body.
`
      const mcpJson = {
        mcpServers: {
          playwright: {
            command: "npx",
            args: ["@playwright/mcp@latest"]
          }
        }
      }
      createTestSkill("ampcode-skill", skillContent, mcpJson)

      // #when
      const { discoverSkills } = await import("./loader")
      const originalCwd = process.cwd()
      process.chdir(TEST_DIR)

      try {
        const skills = await discoverSkills({ includeClaudeCodePaths: false })
        const skill = skills.find(s => s.name === "ampcode-skill")

        // #then
        expect(skill).toBeDefined()
        expect(skill?.mcpConfig).toBeDefined()
        expect(skill?.mcpConfig?.playwright).toBeDefined()
        expect(skill?.mcpConfig?.playwright?.command).toBe("npx")
        expect(skill?.mcpConfig?.playwright?.args).toEqual(["@playwright/mcp@latest"])
      } finally {
        process.chdir(originalCwd)
      }
    })

    it("mcp.json takes priority over YAML frontmatter", async () => {
      // #given
      const skillContent = `---
name: priority-skill
mcp:
  from-yaml:
    command: yaml-cmd
    args: [yaml-arg]
---
Skill body.
`
      const mcpJson = {
        mcpServers: {
          "from-json": {
            command: "json-cmd",
            args: ["json-arg"]
          }
        }
      }
      createTestSkill("priority-skill", skillContent, mcpJson)

      // #when
      const { discoverSkills } = await import("./loader")
      const originalCwd = process.cwd()
      process.chdir(TEST_DIR)

      try {
        const skills = await discoverSkills({ includeClaudeCodePaths: false })
        const skill = skills.find(s => s.name === "priority-skill")

        // #then - mcp.json should take priority
        expect(skill?.mcpConfig?.["from-json"]).toBeDefined()
        expect(skill?.mcpConfig?.["from-yaml"]).toBeUndefined()
      } finally {
        process.chdir(originalCwd)
      }
    })

    it("supports direct format without mcpServers wrapper", async () => {
      // #given
      const skillContent = `---
name: direct-format
---
Skill body.
`
      const mcpJson = {
        sqlite: {
          command: "uvx",
          args: ["mcp-server-sqlite"]
        }
      }
      createTestSkill("direct-format", skillContent, mcpJson)

      // #when
      const { discoverSkills } = await import("./loader")
      const originalCwd = process.cwd()
      process.chdir(TEST_DIR)

      try {
        const skills = await discoverSkills({ includeClaudeCodePaths: false })
        const skill = skills.find(s => s.name === "direct-format")

        // #then
        expect(skill?.mcpConfig?.sqlite).toBeDefined()
        expect(skill?.mcpConfig?.sqlite?.command).toBe("uvx")
      } finally {
        process.chdir(originalCwd)
      }
    })
  })
})

describe("skill loader - recursive merge", () => {
  const FIXTURES_DIR = join(__dirname, "__fixtures__")

  it("merges single subdir .md files", async () => {
    const skillPath = join(FIXTURES_DIR, "multi-file-skill", "SKILL.md")
    const resolvedPath = join(FIXTURES_DIR, "multi-file-skill")

    const skill = await loadSkillFromPath(skillPath, resolvedPath, "multi-file-skill", "opencode-project")

    expect(skill).not.toBeNull()
    const template = skill!.definition.template

    // Should include SKILL.md content
    expect(template).toContain("Base content here")

    // Should include merged subdir content
    expect(template).toContain("API content here")
    expect(template).toContain("Auth content here")

    // Should have merge comment (partial match - .toContain() is forgiving)
    expect(template).toContain("<!-- Merged from subdirectories")
  })

  it("merges nested subdirs up to depth 3", async () => {
    const skillPath = join(FIXTURES_DIR, "nested-skill", "SKILL.md")
    const resolvedPath = join(FIXTURES_DIR, "nested-skill")

    const skill = await loadSkillFromPath(skillPath, resolvedPath, "nested-skill", "opencode-project")

    expect(skill).not.toBeNull()
    const template = skill!.definition.template

    // Should include SKILL.md content
    expect(template).toContain("# Nested Main")

    // Depth 1: rules/base.md
    expect(template).toContain("Base rules")

    // Depth 2: rules/auth/advanced.md
    expect(template).toContain("Advanced auth")

    // Depth 3: rules/auth/oauth/spec.md
    expect(template).toContain("OAuth spec")
  })

  it("excludes files beyond depth 3", async () => {
    const skillPath = join(FIXTURES_DIR, "depth-exceeded-skill", "SKILL.md")
    const resolvedPath = join(FIXTURES_DIR, "depth-exceeded-skill")

    const skill = await loadSkillFromPath(skillPath, resolvedPath, "depth-exceeded-skill", "opencode-project")

    expect(skill).not.toBeNull()
    const template = skill!.definition.template

    // Should include SKILL.md content
    expect(template).toContain("# Depth Test")

    // Depth 4 file should NOT be included
    expect(template).not.toContain("This should NOT appear")
  })

  it("excludes root README.md but includes subdir files", async () => {
    const skillPath = join(FIXTURES_DIR, "excluded-files-skill", "SKILL.md")
    const resolvedPath = join(FIXTURES_DIR, "excluded-files-skill")

    const skill = await loadSkillFromPath(skillPath, resolvedPath, "excluded-files-skill", "opencode-project")

    expect(skill).not.toBeNull()
    const template = skill!.definition.template

    // Valid subdir file should be included
    expect(template).toContain("Valid rule")

    // Root README.md should NOT be included
    expect(template).not.toContain("This is README - should NOT appear")

    // Hidden files should NOT be included
    expect(template).not.toContain("Hidden - should NOT appear")
  })

  it("strips frontmatter from subdir files", async () => {
    const skillPath = join(FIXTURES_DIR, "frontmatter-subdir-skill", "SKILL.md")
    const resolvedPath = join(FIXTURES_DIR, "frontmatter-subdir-skill")

    const skill = await loadSkillFromPath(skillPath, resolvedPath, "frontmatter-subdir-skill", "opencode-project")

    expect(skill).not.toBeNull()
    const template = skill!.definition.template

    // Body content should appear
    expect(template).toContain("Only this body should appear")

    // Frontmatter keys should NOT appear in output
    expect(template).not.toContain("ignored: true")
  })

  it("handles empty subdirs gracefully", async () => {
    const skillPath = join(FIXTURES_DIR, "empty-subdir-skill", "SKILL.md")
    const resolvedPath = join(FIXTURES_DIR, "empty-subdir-skill")

    const skill = await loadSkillFromPath(skillPath, resolvedPath, "empty-subdir-skill", "opencode-project")

    expect(skill).not.toBeNull()
    const template = skill!.definition.template

    // SKILL.md content should be there
    expect(template).toContain("# Empty Test")

    // No merge comment should appear for empty subdirs
    expect(template).not.toContain("<!-- Merged from subdirectories")
  })

  it("preserves single-file skills unchanged (backward compat)", async () => {
    const skillPath = join(FIXTURES_DIR, "single-file-skill", "SKILL.md")
    const resolvedPath = join(FIXTURES_DIR, "single-file-skill")

    const skill = await loadSkillFromPath(skillPath, resolvedPath, "single-file-skill", "opencode-project")

    expect(skill).not.toBeNull()
    const template = skill!.definition.template

    // SKILL.md content should be there
    expect(template).toContain("# Single")
    expect(template).toContain("No subdirs here")

    // No merge comment for single-file skills
    expect(template).not.toContain("<!-- Merged from subdirectories")
  })
})