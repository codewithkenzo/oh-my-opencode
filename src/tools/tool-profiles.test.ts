import { describe, expect, it } from "bun:test"
import { TOOL_PROFILES, TOOL_TO_PROFILE, getToolProfile, getToolsForProfile } from "./tool-profiles"
import { builtinTools } from "./index"

describe("tool profiles", () => {
  it("classifies every builtin tool", () => {
    // #given
    const builtinNames = Object.keys(builtinTools)

    // #when
    const missing = builtinNames.filter((name) => TOOL_TO_PROFILE[name] === undefined)

    // #then
    if (missing.length > 0) {
      throw new Error(`Missing tool profile mappings for builtin tools: ${missing.join(", ")}`)
    }

    expect(missing).toEqual([])
  })

  it("has no duplicate tool names across profiles", () => {
    // #given
    const allTools = Object.values(TOOL_PROFILES).flat()

    // #when
    const seen = new Set<string>()
    const duplicates = new Set<string>()

    for (const tool of allTools) {
      if (seen.has(tool)) {
        duplicates.add(tool)
      }
      seen.add(tool)
    }

    // #then
    if (duplicates.size > 0) {
      throw new Error(`Duplicate tools across profiles: ${Array.from(duplicates).join(", ")}`)
    }

    expect(Array.from(duplicates)).toEqual([])
  })

  it("maps each profiled tool back to its profile", () => {
    // #given
    const entries = Object.entries(TOOL_PROFILES)

    // #when
    const mismatches: string[] = []
    for (const [profile, tools] of entries) {
      for (const toolName of tools) {
        if (TOOL_TO_PROFILE[toolName] !== profile) {
          mismatches.push(`${toolName} -> ${String(TOOL_TO_PROFILE[toolName])} (expected ${profile})`)
        }
      }
    }

    // #then
    if (mismatches.length > 0) {
      throw new Error(`Reverse mapping mismatches: ${mismatches.join("; ")}`)
    }

    expect(mismatches).toEqual([])
  })

  it("returns the correct profile for known and unknown tools", () => {
    // #given
    const coreTool = "grep"
    const externalApiTool = "runwareGenerate"
    const unknownTool = "does_not_exist"

    // #when
    const coreProfile = getToolProfile(coreTool)
    const externalApiProfile = getToolProfile(externalApiTool)
    const unknownProfile = getToolProfile(unknownTool)

    // #then
    expect(coreProfile).toBe("core")
    expect(externalApiProfile).toBe("external-api")
    expect(unknownProfile).toBeUndefined()
  })

  it("returns expected tools for a profile", () => {
    // #given
    const coreTools = getToolsForProfile("core")
    const browserTools = getToolsForProfile("browser")

    // #when
    const coreHasExpectedTools = coreTools.includes("grep") && coreTools.includes("glob")
    const browserHasExpectedTool = browserTools.includes("browser_open")

    // #then
    expect(coreHasExpectedTools).toBe(true)
    expect(browserHasExpectedTool).toBe(true)
  })

  it("returns a defensive copy for getToolsForProfile", () => {
    // #given
    const firstRead = getToolsForProfile("core")

    // #when
    firstRead.push("__mutated__")
    const secondRead = getToolsForProfile("core")

    // #then
    expect(secondRead).not.toContain("__mutated__")
  })

  it("ensures every profile has at least one tool", () => {
    // #given
    const profileEntries = Object.entries(TOOL_PROFILES)

    // #when
    const emptyProfiles = profileEntries
      .filter(([, tools]) => tools.length === 0)
      .map(([profile]) => profile)

    // #then
    expect(emptyProfiles).toEqual([])
  })
})
