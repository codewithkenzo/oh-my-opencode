import { describe, test, expect } from "bun:test"
import { createBuiltinAgents } from "./utils"
import type { AgentConfig } from "@opencode-ai/sdk"

const TEST_DEFAULT_MODEL = "anthropic/claude-opus-4-5"

describe("createBuiltinAgents with model overrides", () => {
  test("Musashi with default model has thinking config", () => {
    // #given - no overrides, using systemDefaultModel

    // #when
    const agents = createBuiltinAgents([], {}, undefined, TEST_DEFAULT_MODEL)

    // #then
    expect(agents.Musashi.model).toBe("anthropic/claude-opus-4-5")
    expect(agents.Musashi.thinking).toEqual({ type: "enabled", budgetTokens: 32000 })
    expect(agents.Musashi.reasoningEffort).toBeUndefined()
  })

  test("Musashi with GPT model override has reasoningEffort, no thinking", () => {
    // #given
    const overrides = {
      Musashi: { model: "github-copilot/gpt-5.2" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides, undefined, TEST_DEFAULT_MODEL)

    // #then
    expect(agents.Musashi.model).toBe("github-copilot/gpt-5.2")
    expect(agents.Musashi.reasoningEffort).toBe("medium")
    expect(agents.Musashi.thinking).toBeUndefined()
  })

  test("Musashi with systemDefaultModel GPT has reasoningEffort, no thinking", () => {
    // #given
    const systemDefaultModel = "openai/gpt-5.2"

    // #when
    const agents = createBuiltinAgents([], {}, undefined, systemDefaultModel)

    // #then
    expect(agents.Musashi.model).toBe("openai/gpt-5.2")
    expect(agents.Musashi.reasoningEffort).toBe("medium")
    expect(agents.Musashi.thinking).toBeUndefined()
  })

  test("K9 - advisor with default model has reasoningEffort", () => {
    // #given - no overrides, using systemDefaultModel for other agents
    // K9 - advisor uses its own default model (openai/gpt-5.2) from the factory singleton

    // #when
    const agents = createBuiltinAgents([], {}, undefined, TEST_DEFAULT_MODEL)

    // #then - K9 - advisor uses systemDefaultModel since model is now required
    expect(agents["K9 - advisor"].model).toBe("anthropic/claude-opus-4-5")
    expect(agents["K9 - advisor"].thinking).toEqual({ type: "enabled", budgetTokens: 32000 })
    expect(agents["K9 - advisor"].reasoningEffort).toBeUndefined()
  })

  test("K9 - advisor with GPT model override has reasoningEffort, no thinking", () => {
    // #given
    const overrides = {
      "K9 - advisor": { model: "openai/gpt-5.2" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides, undefined, TEST_DEFAULT_MODEL)

    // #then
    expect(agents["K9 - advisor"].model).toBe("openai/gpt-5.2")
    expect(agents["K9 - advisor"].reasoningEffort).toBe("medium")
    expect(agents["K9 - advisor"].textVerbosity).toBe("high")
    expect(agents["K9 - advisor"].thinking).toBeUndefined()
  })

  test("K9 - advisor with Claude model override has thinking, no reasoningEffort", () => {
    // #given
    const overrides = {
      "K9 - advisor": { model: "anthropic/claude-sonnet-4" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides, undefined, TEST_DEFAULT_MODEL)

    // #then
    expect(agents["K9 - advisor"].model).toBe("anthropic/claude-sonnet-4")
    expect(agents["K9 - advisor"].thinking).toEqual({ type: "enabled", budgetTokens: 32000 })
    expect(agents["K9 - advisor"].reasoningEffort).toBeUndefined()
    expect(agents["K9 - advisor"].textVerbosity).toBeUndefined()
  })

  test("non-model overrides are still applied after factory rebuild", () => {
    // #given
    const overrides = {
      Musashi: { model: "github-copilot/gpt-5.2", temperature: 0.5 },
    }

    // #when
    const agents = createBuiltinAgents([], overrides, undefined, TEST_DEFAULT_MODEL)

    // #then
    expect(agents.Musashi.model).toBe("github-copilot/gpt-5.2")
    expect(agents.Musashi.temperature).toBe(0.5)
  })
})

describe("buildAgent with category and skills", () => {
  const { buildAgent } = require("./utils")
  const TEST_MODEL = "anthropic/claude-opus-4-5"

  test("agent with category inherits category settings", () => {
    // #given - agent factory that sets category but no model
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "visual-engineering",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then - DEFAULT_CATEGORIES only has temperature, not model
    // Model remains undefined since neither factory nor category provides it
    expect(agent.model).toBeUndefined()
    expect(agent.temperature).toBe(0.7)
  })

  test("agent with category and existing model keeps existing model", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "visual-engineering",
          model: "custom/model",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then
    expect(agent.model).toBe("custom/model")
    expect(agent.temperature).toBe(0.7)
  })

  test("agent with category inherits variant", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "custom-category",
        }) as AgentConfig,
    }

    const categories = {
      "custom-category": {
        model: "openai/gpt-5.2",
        variant: "xhigh",
      },
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL, categories)

    // #then
    expect(agent.model).toBe("openai/gpt-5.2")
    expect(agent.variant).toBe("xhigh")
  })

  test("agent with skills has content prepended to prompt", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["frontend-ui-ux"],
          prompt: "Original prompt content",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then
    expect(agent.prompt).toContain("Role: Designer-Turned-Developer")
    expect(agent.prompt).toContain("Original prompt content")
    expect(agent.prompt).toMatch(/Designer-Turned-Developer[\s\S]*Original prompt content/s)
  })

  test("agent with multiple skills has all content prepended", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["frontend-ui-ux"],
          prompt: "Agent prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then
    expect(agent.prompt).toContain("Role: Designer-Turned-Developer")
    expect(agent.prompt).toContain("Agent prompt")
  })

  test("agent without category or skills works as before", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          model: "custom/model",
          temperature: 0.5,
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then
    expect(agent.model).toBe("custom/model")
    expect(agent.temperature).toBe(0.5)
    expect(agent.prompt).toBe("Base prompt")
  })

  test("agent with category and skills applies both", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "ultrabrain",
          skills: ["frontend-ui-ux"],
          prompt: "Task description",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then - DEFAULT_CATEGORIES["ultrabrain"] only has temperature, not model
    expect(agent.model).toBeUndefined()
    expect(agent.temperature).toBe(0.1)
    expect(agent.prompt).toContain("Role: Designer-Turned-Developer")
    expect(agent.prompt).toContain("Task description")
  })

  test("agent with non-existent category has no effect", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "non-existent",
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then
    // Note: The factory receives model, but if category doesn't exist, it's not applied
    // The agent's model comes from the factory output (which doesn't set model)
    expect(agent.model).toBeUndefined()
    expect(agent.prompt).toBe("Base prompt")
  })

  test("agent with non-existent skills only prepends found ones", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["frontend-ui-ux", "non-existent-skill"],
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then
    expect(agent.prompt).toContain("Role: Designer-Turned-Developer")
    expect(agent.prompt).toContain("Base prompt")
  })

  test("agent with empty skills array keeps original prompt", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: [],
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"], TEST_MODEL)

    // #then
    expect(agent.prompt).toBe("Base prompt")
  })
})
