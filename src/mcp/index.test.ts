import { describe, expect, test } from "bun:test"
import { createBuiltinMcps } from "./index"

describe("createBuiltinMcps", () => {
  test("should return all MCPs when disabled_mcps is empty", () => {
    //#given
    const disabledMcps: string[] = []

    //#when
    const result = createBuiltinMcps(disabledMcps)

    //#then
    expect(result).toHaveProperty("websearch")
    expect(result).toHaveProperty("context7")
    expect(result).toHaveProperty("grep_app")
    expect(result).toHaveProperty("runware")
    expect(result).toHaveProperty("civitai")
    expect(Object.keys(result)).toHaveLength(5)
  })

  test("should filter out disabled built-in MCPs", () => {
    //#given
    const disabledMcps = ["context7"]

    //#when
    const result = createBuiltinMcps(disabledMcps)

    //#then
    expect(result).toHaveProperty("websearch")
    expect(result).not.toHaveProperty("context7")
    expect(result).toHaveProperty("grep_app")
    expect(result).toHaveProperty("runware")
    expect(result).toHaveProperty("civitai")
    expect(Object.keys(result)).toHaveLength(4)
  })

  test("should filter out all built-in MCPs when all disabled", () => {
    //#given
    const disabledMcps = ["websearch", "context7", "grep_app", "runware", "civitai"]

    //#when
    const result = createBuiltinMcps(disabledMcps)

    //#then
    expect(result).not.toHaveProperty("websearch")
    expect(result).not.toHaveProperty("context7")
    expect(result).not.toHaveProperty("grep_app")
    expect(result).not.toHaveProperty("runware")
    expect(result).not.toHaveProperty("civitai")
    expect(Object.keys(result)).toHaveLength(0)
  })

  test("should ignore custom MCP names in disabled_mcps", () => {
    //#given
    const disabledMcps = ["context7", "playwright", "custom"]

    //#when
    const result = createBuiltinMcps(disabledMcps)

    //#then
    expect(result).toHaveProperty("websearch")
    expect(result).not.toHaveProperty("context7")
    expect(result).toHaveProperty("grep_app")
    expect(result).toHaveProperty("runware")
    expect(result).toHaveProperty("civitai")
    expect(Object.keys(result)).toHaveLength(4)
  })

  test("should handle empty disabled_mcps by default", () => {
    //#given
    //#when
    const result = createBuiltinMcps()

    //#then
    expect(result).toHaveProperty("websearch")
    expect(result).toHaveProperty("context7")
    expect(result).toHaveProperty("grep_app")
    expect(result).toHaveProperty("runware")
    expect(result).toHaveProperty("civitai")
    expect(Object.keys(result)).toHaveLength(5)
  })

  test("should only filter built-in MCPs, ignoring unknown names", () => {
    //#given
    const disabledMcps = ["playwright", "sqlite", "unknown-mcp"]

    //#when
    const result = createBuiltinMcps(disabledMcps)

    //#then
    expect(result).toHaveProperty("websearch")
    expect(result).toHaveProperty("context7")
    expect(result).toHaveProperty("grep_app")
    expect(result).toHaveProperty("runware")
    expect(result).toHaveProperty("civitai")
    expect(Object.keys(result)).toHaveLength(5)
  })

  test("should return local MCP configs with correct type discriminator", () => {
    //#given
    //#when
    const result = createBuiltinMcps()

    //#then
    const runware = result["runware"]
    expect(runware).toBeDefined()
    expect(runware.type).toBe("local")
    expect(runware.enabled).toBe(true)
    if (runware.type === "local") {
      expect(runware.command).toBe("bunx")
      expect(runware.args).toEqual(["oh-my-opencode-mcp-runware"])
    }

    const civitai = result["civitai"]
    expect(civitai).toBeDefined()
    expect(civitai.type).toBe("local")
    expect(civitai.enabled).toBe(true)
    if (civitai.type === "local") {
      expect(civitai.command).toBe("bunx")
      expect(civitai.args).toEqual(["oh-my-opencode-mcp-civitai"])
    }
  })

  test("should return remote MCP configs with correct type discriminator", () => {
    //#given
    //#when
    const result = createBuiltinMcps()

    //#then
    const websearch = result["websearch"]
    expect(websearch).toBeDefined()
    expect(websearch.type).toBe("remote")
    if (websearch.type === "remote") {
      expect(websearch.url).toContain("mcp.exa.ai")
    }
  })
})
