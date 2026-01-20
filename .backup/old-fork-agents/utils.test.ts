import { describe, test, expect } from "bun:test"
import { createBuiltinAgents } from "./utils"

describe("createBuiltinAgents with model overrides", () => {
  test("Musashi with default model has thinking config", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then
    expect(agents["Musashi"].model).toBe("google/claude-opus-4-5-thinking")
    expect(agents["Musashi"].thinking).toEqual({ type: "enabled", budgetTokens: 32000 })
    expect(agents["Musashi"].reasoningEffort).toBeUndefined()
  })

  test("Musashi with GPT model override has reasoningEffort, no thinking", () => {
    // #given
    const overrides = {
      "Musashi": { model: "openai/gpt-4o" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides)

    // #then
    expect(agents["Musashi"].model).toBe("openai/gpt-4o")
    expect(agents["Musashi"].reasoningEffort).toBe("medium")
    expect(agents["Musashi"].thinking).toBeUndefined()
  })

  test("Musashi with non-GPT model override has thinking, no reasoningEffort", () => {
    // #given
    const overrides = {
      "Musashi": { model: "zai-coding-plan/glm-4.7" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides)

    // #then
    expect(agents["Musashi"].model).toBe("zai-coding-plan/glm-4.7")
    expect(agents["Musashi"].thinking).toEqual({ type: "enabled", budgetTokens: 32000 })
    expect(agents["Musashi"].reasoningEffort).toBeUndefined()
  })

  test("Musashi with systemDefaultModel GPT has reasoningEffort, no thinking", () => {
    // #given
    const systemDefaultModel = "openai/gpt-4o"

    // #when
    const agents = createBuiltinAgents([], {}, undefined, systemDefaultModel)

    // #then
    expect(agents["Musashi"].model).toBe("openai/gpt-4o")
    expect(agents["Musashi"].reasoningEffort).toBe("medium")
    expect(agents["Musashi"].thinking).toBeUndefined()
  })

  test("K9 - advisor with default model (zai) has thinking enabled", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then - zai-coding-plan/glm-4.7 is NOT a GPT model, so gets thinking
    expect(agents["K9 - advisor"].model).toBe("zai-coding-plan/glm-4.7")
    expect(agents["K9 - advisor"].thinking).toEqual({ type: "enabled", budgetTokens: 32000 })
    expect(agents["K9 - advisor"].reasoningEffort).toBeUndefined()
    expect(agents["K9 - advisor"].textVerbosity).toBeUndefined()
  })

  test("K9 - advisor with GPT model override has reasoningEffort", () => {
    // #given
    const overrides = {
      "K9 - advisor": { model: "openai/gpt-4o" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides)

    // #then
    expect(agents["K9 - advisor"].model).toBe("openai/gpt-4o")
    expect(agents["K9 - advisor"].reasoningEffort).toBe("medium")
    expect(agents["K9 - advisor"].textVerbosity).toBe("high")
    expect(agents["K9 - advisor"].thinking).toBeUndefined()
  })

  test("K9 - advisor with Gemini model override has thinking enabled", () => {
    // #given
    const overrides = {
      "K9 - advisor": { model: "google/gemini-3-flash" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides)

    // #then
    expect(agents["K9 - advisor"].model).toBe("google/gemini-3-flash")
    expect(agents["K9 - advisor"].thinking).toEqual({ type: "enabled", budgetTokens: 32000 })
    expect(agents["K9 - advisor"].reasoningEffort).toBeUndefined()
    expect(agents["K9 - advisor"].textVerbosity).toBeUndefined()
  })

  test("non-model overrides are still applied after factory rebuild", () => {
    // #given
    const overrides = {
      "Musashi": { model: "openai/gpt-4o", temperature: 0.5 },
    }

    // #when
    const agents = createBuiltinAgents([], overrides)

    // #then
    expect(agents["Musashi"].model).toBe("openai/gpt-4o")
    expect(agents["Musashi"].temperature).toBe(0.5)
  })
})
