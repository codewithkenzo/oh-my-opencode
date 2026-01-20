import { describe, test, expect } from "bun:test"
import { parseFrontmatter } from "../../shared/frontmatter"
import type { SkillMetadata } from "./types"

describe("SkillMetadata Claude Code fields", () => {
  test("parses disable-model-invocation field", () => {
    const content = `---
name: test-skill
disable-model-invocation: true
---
Skill content`
    
    const { data } = parseFrontmatter<SkillMetadata>(content)
    expect(data["disable-model-invocation"]).toBe(true)
  })

  test("parses user-invocable field", () => {
    const content = `---
name: test-skill
user-invocable: false
---
Skill content`
    
    const { data } = parseFrontmatter<SkillMetadata>(content)
    expect(data["user-invocable"]).toBe(false)
  })

  test("parses context field as union type", () => {
    const content = `---
name: test-skill
context: fork
---
Skill content`
    
    const { data } = parseFrontmatter<SkillMetadata>(content)
    expect(data.context).toBe("fork")
  })

  test("parses inline context", () => {
    const content = `---
name: test-skill
context: inline
---
Skill content`
    
    const { data } = parseFrontmatter<SkillMetadata>(content)
    expect(data.context).toBe("inline")
  })

  test("skill with only old fields loads unchanged", () => {
    const content = `---
name: old-skill
description: An old skill
model: gpt-4
---
Skill content`
    
    const { data } = parseFrontmatter<SkillMetadata>(content)
    expect(data.name).toBe("old-skill")
    expect(data.description).toBe("An old skill")
    expect(data["disable-model-invocation"]).toBeUndefined()
    expect(data["user-invocable"]).toBeUndefined()
    expect(data.context).toBeUndefined()
  })

  test("skill with both old and new fields loads correctly", () => {
    const content = `---
name: mixed-skill
description: A mixed skill
context: fork
disable-model-invocation: true
---
Skill content`
    
    const { data } = parseFrontmatter<SkillMetadata>(content)
    expect(data.name).toBe("mixed-skill")
    expect(data.description).toBe("A mixed skill")
    expect(data.context).toBe("fork")
    expect(data["disable-model-invocation"]).toBe(true)
  })
})
