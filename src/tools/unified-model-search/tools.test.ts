import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { unified_model_search } from "./tools"

describe("unified_model_search tool", () => {
  let originalRunwareApiKey: string | undefined

  beforeEach(() => {
    originalRunwareApiKey = process.env.RUNWARE_API_KEY
    delete process.env.RUNWARE_API_KEY
  })

  afterEach(() => {
    if (originalRunwareApiKey === undefined) {
      delete process.env.RUNWARE_API_KEY
    } else {
      process.env.RUNWARE_API_KEY = originalRunwareApiKey
    }
  })

  it("exposes expected tool definition structure", () => {
    // #given
    const tool = unified_model_search

    // #when
    const args = tool.args as Record<string, unknown>

    // #then
    expect(typeof tool.description).toBe("string")
    expect(tool.description.length).toBeGreaterThan(0)
    expect(typeof tool.execute).toBe("function")
    expect(Object.keys(args).sort()).toEqual([
      "architecture",
      "category",
      "limit",
      "query",
      "source",
    ])
  })

  it("uses push-spread accumulation for both async result sources", () => {
    // #given
    const executeSource = unified_model_search.execute.toString()

    // #when
    const pushSpreads = executeSource.match(/allResults\.push\(\.\.\./g) ?? []

    // #then
    expect(pushSpreads).toHaveLength(2)
    expect(executeSource.includes("allResults = allResults.concat(")).toBe(false)
  })

  it("returns partial-results fallback when a source fails", async () => {
    // #given
    const tool = unified_model_search

    // #when
    const output = await tool.execute({ query: "portrait", source: "runware", limit: 1 }, {} as never)

    // #then
    expect(output).toContain("**Partial results**")
    expect(output).toContain("Runware: RUNWARE_API_KEY environment variable not set")
    expect(output).toContain("No models found matching your query.")
  })
})
