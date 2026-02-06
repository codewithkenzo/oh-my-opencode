import { describe, it, expect } from "bun:test"
import { AGENT_DISPLAY_NAMES, getAgentDisplayName } from "./agent-display-names"

describe("getAgentDisplayName", () => {
  it("returns display name for v4 config key", () => {
    // #given config key "Musashi"
    const configKey = "Musashi"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "Musashi (Orchestrator)"
    expect(result).toBe("Musashi (Orchestrator)")
  })

  it("returns display name for legacy config key (backward compatibility)", () => {
    // #given config key "sisyphus" (legacy format)
    const configKey = "sisyphus"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "Sisyphus (Ultraworker)" (legacy mapping)
    expect(result).toBe("Sisyphus (Ultraworker)")
  })

  it("returns original key for unknown agents (fallback)", () => {
    // #given config key "custom-agent"
    const configKey = "custom-agent"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "custom-agent" (original key unchanged)
    expect(result).toBe("custom-agent")
  })

  it("returns display name for Musashi - boulder", () => {
    // #given config key "Musashi - boulder"
    const configKey = "Musashi - boulder"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "Musashi - boulder (Boulder Mode)"
    expect(result).toBe("Musashi - boulder (Boulder Mode)")
  })

  it("returns display name for Musashi - plan", () => {
    // #given config key "Musashi - plan"
    const configKey = "Musashi - plan"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "Musashi - plan (Planner)"
    expect(result).toBe("Musashi - plan (Planner)")
  })

  it("returns display name for D5 - backend builder", () => {
    // #given config key "D5 - backend builder"
    const configKey = "D5 - backend builder"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "D5 - backend builder (Backend)"
    expect(result).toBe("D5 - backend builder (Backend)")
  })

  it("returns display name for K9 - advisor", () => {
    // #given config key "K9 - advisor"
    const configKey = "K9 - advisor"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "K9 - advisor (Consultant)"
    expect(result).toBe("K9 - advisor (Consultant)")
  })

  it("returns display name for R2 - researcher", () => {
    // #given config key "R2 - researcher"
    const configKey = "R2 - researcher"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "R2 - researcher (Researcher)"
    expect(result).toBe("R2 - researcher (Researcher)")
  })

  it("returns display name for X1 - explorer", () => {
    // #given config key "X1 - explorer"
    const configKey = "X1 - explorer"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "X1 - explorer (Explorer)"
    expect(result).toBe("X1 - explorer (Explorer)")
  })

  it("returns display name for T4 - frontend builder", () => {
    // #given config key "T4 - frontend builder"
    const configKey = "T4 - frontend builder"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "T4 - frontend builder (Frontend)"
    expect(result).toBe("T4 - frontend builder (Frontend)")
  })

  it("returns display name for legacy sisyphus (backward compat)", () => {
    // #given config key "sisyphus" (legacy)
    const configKey = "sisyphus"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "Sisyphus (Ultraworker)"
    expect(result).toBe("Sisyphus (Ultraworker)")
  })

  it("returns display name for legacy oracle (backward compat)", () => {
    // #given config key "oracle" (legacy)
    const configKey = "oracle"

    // #when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // #then returns "oracle"
    expect(result).toBe("oracle")
  })
})

describe("AGENT_DISPLAY_NAMES", () => {
  it("contains all expected v4 agent mappings", () => {
    // #given expected v4 mappings
    const expectedMappings = {
      Musashi: "Musashi (Orchestrator)",
      "Musashi - boulder": "Musashi - boulder (Boulder Mode)",
      "Musashi - plan": "Musashi - plan (Planner)",
      "K9 - advisor": "K9 - advisor (Consultant)",
      "R2 - researcher": "R2 - researcher (Researcher)",
      "X1 - explorer": "X1 - explorer (Explorer)",
      "T4 - frontend builder": "T4 - frontend builder (Frontend)",
      "D5 - backend builder": "D5 - backend builder (Backend)",
      // Legacy names for backward compatibility
      sisyphus: "Sisyphus (Ultraworker)",
      atlas: "Atlas (Plan Execution Orchestrator)",
      prometheus: "Prometheus (Plan Builder)",
      metis: "Metis (Plan Consultant)",
      momus: "Momus (Plan Reviewer)",
      oracle: "oracle",
      librarian: "librarian",
      explore: "explore",
      "multimodal-looker": "multimodal-looker",
    }

    // #when checking the constant
    // #then contains all expected mappings
    expect(AGENT_DISPLAY_NAMES).toEqual(expectedMappings)
  })
})