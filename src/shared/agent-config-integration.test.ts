import { describe, test, expect } from "bun:test"
import { migrateAgentNames } from "./migration"
import { getAgentDisplayName } from "./agent-display-names"
import { AGENT_MODEL_REQUIREMENTS } from "./model-requirements"

describe("Agent Config Integration", () => {
  describe("Old format config migration", () => {
    test("migrates old format agent keys to v4 names", () => {
      // #given - config with old format keys
      const oldConfig = {
        Sisyphus: { model: "anthropic/claude-opus-4-5" },
        Atlas: { model: "anthropic/claude-opus-4-5" },
        "Prometheus (Planner)": { model: "anthropic/claude-opus-4-5" },
        // Note: "Metis (Plan Consultant)" and "Momus (Plan Reviewer)" are NOT in AGENT_NAME_MAP
        // Only lowercase "metis" and "momus" are mapped
      }

      // #when - migration is applied
      const result = migrateAgentNames(oldConfig)

      // #then - keys are migrated to v4 names
      expect(result.migrated).toHaveProperty("Musashi")
      expect(result.migrated).toHaveProperty("Musashi - boulder")
      expect(result.migrated).toHaveProperty("Musashi - plan")

      // #then - old keys are removed
      expect(result.migrated).not.toHaveProperty("Sisyphus")
      expect(result.migrated).not.toHaveProperty("Atlas")
      expect(result.migrated).not.toHaveProperty("Prometheus (Planner)")

      // #then - values are preserved
      expect(result.migrated.Musashi).toEqual({ model: "anthropic/claude-opus-4-5" })
      expect(result.migrated["Musashi - boulder"]).toEqual({ model: "anthropic/claude-opus-4-5" })
      expect(result.migrated["Musashi - plan"]).toEqual({ model: "anthropic/claude-opus-4-5" })
      
      // #then - changed flag is true
      expect(result.changed).toBe(true)
    })

    test("migrates legacy lowercase keys to v4 names", () => {
      // #given - config with legacy lowercase keys
      const config = {
        sisyphus: { model: "anthropic/claude-opus-4-5" },
        oracle: { model: "openai/gpt-5.2" },
        librarian: { model: "opencode/big-pickle" },
      }

      // #when - migration is applied
      const result = migrateAgentNames(config)

      // #then - keys are migrated to v4 names
      expect(result.migrated).toHaveProperty("Musashi")
      expect(result.migrated).toHaveProperty("K9 - advisor")
      expect(result.migrated).toHaveProperty("R2 - researcher")
      
      // #then - changed flag is true
      expect(result.changed).toBe(true)
    })

    test("handles mixed case config", () => {
      // #given - config with mixed old and new format
      const mixedConfig = {
        Sisyphus: { model: "anthropic/claude-opus-4-5" },
        oracle: { model: "openai/gpt-5.2" },
        "Prometheus (Planner)": { model: "anthropic/claude-opus-4-5" },
        librarian: { model: "opencode/big-pickle" },
      }

      // #when - migration is applied
      const result = migrateAgentNames(mixedConfig)

      // #then - all keys are migrated to v4 names
      expect(result.migrated).toHaveProperty("Musashi")
      expect(result.migrated).toHaveProperty("K9 - advisor")
      expect(result.migrated).toHaveProperty("Musashi - plan")
      expect(result.migrated).toHaveProperty("R2 - researcher")
      
      // #then - changed flag is true
      expect(result.changed).toBe(true)
    })
  })

  describe("Display name resolution", () => {
    test("returns correct display names for all builtin agents", () => {
      // #given - v4 config keys
      const agents = ["Musashi", "Musashi - boulder", "Musashi - plan", "K9 - advisor", "R2 - researcher", "X1 - explorer", "T4 - frontend builder", "D5 - backend builder"]

      // #when - display names are requested
      const displayNames = agents.map((agent) => getAgentDisplayName(agent))

      // #then - display names are correct
      expect(displayNames).toContain("Musashi (Orchestrator)")
      expect(displayNames).toContain("Musashi - boulder (Boulder Mode)")
      expect(displayNames).toContain("Musashi - plan (Planner)")
      expect(displayNames).toContain("K9 - advisor (Consultant)")
      expect(displayNames).toContain("R2 - researcher (Researcher)")
      expect(displayNames).toContain("X1 - explorer (Explorer)")
      expect(displayNames).toContain("T4 - frontend builder (Frontend)")
      expect(displayNames).toContain("D5 - backend builder (Backend)")
    })

    test("handles v4 keys case-insensitively", () => {
      // #given - various case formats of v4 keys
      const keys = ["Musashi", "musashi", "MUSASHI", "K9 - advisor", "k9 - advisor", "R2 - researcher"]

      // #when - display names are requested
      const displayNames = keys.map((key) => getAgentDisplayName(key))

      // #then - correct display names are returned
      expect(displayNames[0]).toBe("Musashi (Orchestrator)")
      expect(displayNames[1]).toBe("Musashi (Orchestrator)")
      expect(displayNames[2]).toBe("Musashi (Orchestrator)")
      expect(displayNames[3]).toBe("K9 - advisor (Consultant)")
      expect(displayNames[4]).toBe("K9 - advisor (Consultant)")
      expect(displayNames[5]).toBe("R2 - researcher (Researcher)")
    })

    test("returns original key for unknown agents", () => {
      // #given - unknown agent key
      const unknownKey = "custom-agent"

      // #when - display name is requested
      const displayName = getAgentDisplayName(unknownKey)

      // #then - original key is returned
      expect(displayName).toBe(unknownKey)
    })
  })

  describe("Model requirements integration", () => {
    test("AGENT_MODEL_REQUIREMENTS has v4 and legacy keys", () => {
      // #given - AGENT_MODEL_REQUIREMENTS object
      const agentKeys = Object.keys(AGENT_MODEL_REQUIREMENTS)

      // #when - checking key format
      // #then - has both v4 mixed-case keys and legacy lowercase keys
      expect(agentKeys).toContain("Musashi")
      expect(agentKeys).toContain("Musashi - plan")
      expect(agentKeys).toContain("Musashi - boulder")
      expect(agentKeys).toContain("K9 - advisor")
      expect(agentKeys).toContain("R2 - researcher")
      expect(agentKeys).toContain("X1 - explorer")
      // Legacy keys for backward compatibility
      expect(agentKeys).toContain("sisyphus")
      expect(agentKeys).toContain("oracle")
      expect(agentKeys).toContain("librarian")
    })

    test("model requirements include all v4 agents", () => {
      // #given - expected v4 agents
      const expectedAgents = ["Musashi", "Musashi - boulder", "Musashi - plan", "K9 - advisor", "R2 - researcher", "X1 - explorer"]

      // #when - checking AGENT_MODEL_REQUIREMENTS
      const agentKeys = Object.keys(AGENT_MODEL_REQUIREMENTS)

      // #then - all expected v4 agents are present
      for (const agent of expectedAgents) {
        expect(agentKeys).toContain(agent)
      }
    })

    test("v4 agent names have mixed case by design", () => {
      // #given - AGENT_MODEL_REQUIREMENTS object
      const agentKeys = Object.keys(AGENT_MODEL_REQUIREMENTS)

      // #when - checking for v4 mixed-case keys
      const v4Keys = agentKeys.filter((key) => key !== key.toLowerCase())

      // #then - v4 keys have mixed case (by design)
      expect(v4Keys).toContain("Musashi")
      expect(v4Keys).toContain("Musashi - boulder")
      expect(v4Keys).toContain("Musashi - plan")
      expect(v4Keys).toContain("K9 - advisor")
      expect(v4Keys).toContain("R2 - researcher")
      expect(v4Keys).toContain("X1 - explorer")
    })
  })

  describe("End-to-end config flow", () => {
    test("old config migrates and displays correctly", () => {
      // #given - old format config
      const oldConfig = {
        Sisyphus: { model: "anthropic/claude-opus-4-5", temperature: 0.1 },
        "Prometheus (Planner)": { model: "anthropic/claude-opus-4-5" },
      }

      // #when - config is migrated
      const result = migrateAgentNames(oldConfig)

      // #then - keys are migrated to v4 names
      expect(result.migrated).toHaveProperty("Musashi")
      expect(result.migrated).toHaveProperty("Musashi - plan")

      // #when - display names are retrieved
      const musashiDisplay = getAgentDisplayName("Musashi")
      const plannerDisplay = getAgentDisplayName("Musashi - plan")

      // #then - display names are correct
      expect(musashiDisplay).toBe("Musashi (Orchestrator)")
      expect(plannerDisplay).toBe("Musashi - plan (Planner)")

      // #then - config values are preserved
      expect(result.migrated.Musashi).toEqual({ model: "anthropic/claude-opus-4-5", temperature: 0.1 })
      expect(result.migrated["Musashi - plan"]).toEqual({ model: "anthropic/claude-opus-4-5" })
    })

    test("v4 config works without migration", () => {
      // #given - v4 format config
      const newConfig = {
        Musashi: { model: "anthropic/claude-opus-4-5" },
        "Musashi - boulder": { model: "anthropic/claude-opus-4-5" },
      }

      // #when - migration is applied (should be no-op for v4 names)
      const result = migrateAgentNames(newConfig)

      // #then - config is unchanged
      expect(result.migrated).toEqual(newConfig)
      
      // #then - changed flag is false
      expect(result.changed).toBe(false)

      // #when - display names are retrieved
      const musashiDisplay = getAgentDisplayName("Musashi")
      const boulderDisplay = getAgentDisplayName("Musashi - boulder")

      // #then - display names are correct
      expect(musashiDisplay).toBe("Musashi (Orchestrator)")
      expect(boulderDisplay).toBe("Musashi - boulder (Boulder Mode)")
    })
  })
})
