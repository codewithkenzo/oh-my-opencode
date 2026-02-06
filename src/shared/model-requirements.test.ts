import { describe, expect, test } from "bun:test"
import {
  AGENT_MODEL_REQUIREMENTS,
  CATEGORY_MODEL_REQUIREMENTS,
  type FallbackEntry,
  type ModelRequirement,
} from "./model-requirements"

describe("AGENT_MODEL_REQUIREMENTS", () => {
  test("K9 - advisor has valid fallbackChain with gpt-5.2 as primary", () => {
    // #given - K9 - advisor agent requirement
    const advisor = AGENT_MODEL_REQUIREMENTS["K9 - advisor"]

    // #when - accessing K9 - advisor requirement
    // #then - fallbackChain exists with gpt-5.2 as first entry
    expect(advisor).toBeDefined()
    expect(advisor.fallbackChain).toBeArray()
    expect(advisor.fallbackChain.length).toBeGreaterThan(0)

    const primary = advisor.fallbackChain[0]
    expect(primary.providers).toContain("openai")
    expect(primary.model).toBe("gpt-5.2")
    expect(primary.variant).toBe("high")
  })

  test("Musashi has valid fallbackChain with claude-opus-4-5 as primary", () => {
    // #given - Musashi agent requirement
    const musashi = AGENT_MODEL_REQUIREMENTS["Musashi"]

    // #when - accessing Musashi requirement
    // #then - fallbackChain exists with claude-opus-4-5 as first entry
    expect(musashi).toBeDefined()
    expect(musashi.fallbackChain).toBeArray()
    expect(musashi.fallbackChain.length).toBeGreaterThan(0)

    const primary = musashi.fallbackChain[0]
    expect(primary.providers[0]).toBe("anthropic")
    expect(primary.model).toBe("claude-opus-4-5")
    expect(primary.variant).toBe("max")
  })

  test("R2 - researcher has valid fallbackChain with glm-4.7 as primary", () => {
    // #given - R2 - researcher agent requirement
    const researcher = AGENT_MODEL_REQUIREMENTS["R2 - researcher"]

    // #when - accessing R2 - researcher requirement
    // #then - fallbackChain exists with glm-4.7 as first entry
    expect(researcher).toBeDefined()
    expect(researcher.fallbackChain).toBeArray()
    expect(researcher.fallbackChain.length).toBeGreaterThan(0)

    const primary = researcher.fallbackChain[0]
    expect(primary.providers[0]).toBe("zai-coding-plan")
    expect(primary.model).toBe("glm-4.7")
  })

  test("X1 - explorer has valid fallbackChain with claude-haiku-4-5 as primary", () => {
    // #given - X1 - explorer agent requirement
    const explorer = AGENT_MODEL_REQUIREMENTS["X1 - explorer"]

    // #when - accessing X1 - explorer requirement
    // #then - fallbackChain exists with claude-haiku-4-5 as first entry
    expect(explorer).toBeDefined()
    expect(explorer.fallbackChain).toBeArray()
    expect(explorer.fallbackChain.length).toBeGreaterThan(0)

    const primary = explorer.fallbackChain[0]
    expect(primary.providers).toContain("anthropic")
    expect(primary.model).toBe("claude-haiku-4-5")
  })

  test("T4 - frontend builder is not in AGENT_MODEL_REQUIREMENTS (uses category fallback)", () => {
    // #given - T4 - frontend builder is configured via category, not direct model requirements
    // #when - checking AGENT_MODEL_REQUIREMENTS
    // #then - T4 - frontend builder is not directly in AGENT_MODEL_REQUIREMENTS
    expect(AGENT_MODEL_REQUIREMENTS["T4 - frontend builder"]).toBeUndefined()
    expect(AGENT_MODEL_REQUIREMENTS["multimodal-looker"]).toBeUndefined()
  })

  test("Musashi - plan has valid fallbackChain with claude-opus-4-5 as primary", () => {
    // #given - Musashi - plan agent requirement
    const planner = AGENT_MODEL_REQUIREMENTS["Musashi - plan"]

    // #when - accessing Musashi - plan requirement
    // #then - fallbackChain exists with claude-opus-4-5 as first entry
    expect(planner).toBeDefined()
    expect(planner.fallbackChain).toBeArray()
    expect(planner.fallbackChain.length).toBeGreaterThan(0)

    const primary = planner.fallbackChain[0]
    expect(primary.model).toBe("claude-opus-4-5")
    expect(primary.providers[0]).toBe("anthropic")
    expect(primary.variant).toBe("max")
  })

  test("Musashi - boulder has valid fallbackChain with claude-sonnet-4-5 as primary", () => {
    // #given - Musashi - boulder agent requirement
    const boulder = AGENT_MODEL_REQUIREMENTS["Musashi - boulder"]

    // #when - accessing Musashi - boulder requirement
    // #then - fallbackChain exists with claude-sonnet-4-5 as first entry
    expect(boulder).toBeDefined()
    expect(boulder.fallbackChain).toBeArray()
    expect(boulder.fallbackChain.length).toBeGreaterThan(0)

    const primary = boulder.fallbackChain[0]
    expect(primary.model).toBe("claude-sonnet-4-5")
    expect(primary.providers[0]).toBe("anthropic")
  })

  test("legacy momus entry has valid fallbackChain with gpt-5.2 as primary", () => {
    // #given - legacy momus agent requirement
    const momus = AGENT_MODEL_REQUIREMENTS["momus"]

    // #when - accessing Momus requirement
    // #then - fallbackChain exists with gpt-5.2 as first entry, variant medium
    expect(momus).toBeDefined()
    expect(momus.fallbackChain).toBeArray()
    expect(momus.fallbackChain.length).toBeGreaterThan(0)

    const primary = momus.fallbackChain[0]
    expect(primary.model).toBe("gpt-5.2")
    expect(primary.variant).toBe("medium")
    expect(primary.providers[0]).toBe("openai")
  })

  test("legacy atlas entry has valid fallbackChain with claude-sonnet-4-5 as primary", () => {
    // #given - legacy atlas agent requirement
    const atlas = AGENT_MODEL_REQUIREMENTS["atlas"]

    // #when - accessing Atlas requirement
    // #then - fallbackChain exists with claude-sonnet-4-5 as first entry
    expect(atlas).toBeDefined()
    expect(atlas.fallbackChain).toBeArray()
    expect(atlas.fallbackChain.length).toBeGreaterThan(0)

    const primary = atlas.fallbackChain[0]
    expect(primary.model).toBe("claude-sonnet-4-5")
    expect(primary.providers[0]).toBe("anthropic")
  })

  test("all v4 and legacy agents have valid fallbackChain arrays", () => {
    // #given - list of v4 and legacy agent names (13 total: 6 v4 + 7 legacy)
    const expectedAgents = [
      // v4 agents
      "Musashi",
      "Musashi - boulder",
      "Musashi - plan",
      "K9 - advisor",
      "R2 - researcher",
      "X1 - explorer",
      // legacy agents for backward compatibility
      "sisyphus",
      "oracle",
      "librarian",
      "explore",
      "metis",
      "momus",
      "atlas",
    ]

    // #when - checking AGENT_MODEL_REQUIREMENTS
    const definedAgents = Object.keys(AGENT_MODEL_REQUIREMENTS)

    // #then - all agents present with valid fallbackChain (13 total)
    expect(definedAgents).toHaveLength(13)
    for (const agent of expectedAgents) {
      const requirement = AGENT_MODEL_REQUIREMENTS[agent]
      expect(requirement).toBeDefined()
      expect(requirement.fallbackChain).toBeArray()
      expect(requirement.fallbackChain.length).toBeGreaterThan(0)

      for (const entry of requirement.fallbackChain) {
        expect(entry.providers).toBeArray()
        expect(entry.providers.length).toBeGreaterThan(0)
        expect(typeof entry.model).toBe("string")
        expect(entry.model.length).toBeGreaterThan(0)
      }
    }
  })
})

describe("CATEGORY_MODEL_REQUIREMENTS", () => {
  test("ultrabrain has valid fallbackChain with gpt-5.2-codex as primary", () => {
    // #given - ultrabrain category requirement
    const ultrabrain = CATEGORY_MODEL_REQUIREMENTS["ultrabrain"]

    // #when - accessing ultrabrain requirement
    // #then - fallbackChain exists with gpt-5.2-codex as first entry
    expect(ultrabrain).toBeDefined()
    expect(ultrabrain.fallbackChain).toBeArray()
    expect(ultrabrain.fallbackChain.length).toBeGreaterThan(0)

    const primary = ultrabrain.fallbackChain[0]
    expect(primary.variant).toBe("xhigh")
    expect(primary.model).toBe("gpt-5.2-codex")
    expect(primary.providers[0]).toBe("openai")
  })

  test("visual-engineering has valid fallbackChain with gemini-3-pro as primary", () => {
    // #given - visual-engineering category requirement
    const visualEngineering = CATEGORY_MODEL_REQUIREMENTS["visual-engineering"]

    // #when - accessing visual-engineering requirement
    // #then - fallbackChain exists with gemini-3-pro as first entry
    expect(visualEngineering).toBeDefined()
    expect(visualEngineering.fallbackChain).toBeArray()
    expect(visualEngineering.fallbackChain.length).toBeGreaterThan(0)

    const primary = visualEngineering.fallbackChain[0]
    expect(primary.providers[0]).toBe("google")
    expect(primary.model).toBe("gemini-3-pro")
  })

  test("quick has valid fallbackChain with claude-haiku-4-5 as primary", () => {
    // #given - quick category requirement
    const quick = CATEGORY_MODEL_REQUIREMENTS["quick"]

    // #when - accessing quick requirement
    // #then - fallbackChain exists with claude-haiku-4-5 as first entry
    expect(quick).toBeDefined()
    expect(quick.fallbackChain).toBeArray()
    expect(quick.fallbackChain.length).toBeGreaterThan(0)

    const primary = quick.fallbackChain[0]
    expect(primary.model).toBe("claude-haiku-4-5")
    expect(primary.providers[0]).toBe("anthropic")
  })

  test("unspecified-low has valid fallbackChain with claude-sonnet-4-5 as primary", () => {
    // #given - unspecified-low category requirement
    const unspecifiedLow = CATEGORY_MODEL_REQUIREMENTS["unspecified-low"]

    // #when - accessing unspecified-low requirement
    // #then - fallbackChain exists with claude-sonnet-4-5 as first entry
    expect(unspecifiedLow).toBeDefined()
    expect(unspecifiedLow.fallbackChain).toBeArray()
    expect(unspecifiedLow.fallbackChain.length).toBeGreaterThan(0)

    const primary = unspecifiedLow.fallbackChain[0]
    expect(primary.model).toBe("claude-sonnet-4-5")
    expect(primary.providers[0]).toBe("anthropic")
  })

  test("unspecified-high has valid fallbackChain with claude-opus-4-5 as primary", () => {
    // #given - unspecified-high category requirement
    const unspecifiedHigh = CATEGORY_MODEL_REQUIREMENTS["unspecified-high"]

    // #when - accessing unspecified-high requirement
    // #then - fallbackChain exists with claude-opus-4-5 as first entry
    expect(unspecifiedHigh).toBeDefined()
    expect(unspecifiedHigh.fallbackChain).toBeArray()
    expect(unspecifiedHigh.fallbackChain.length).toBeGreaterThan(0)

    const primary = unspecifiedHigh.fallbackChain[0]
    expect(primary.model).toBe("claude-opus-4-5")
    expect(primary.variant).toBe("max")
    expect(primary.providers[0]).toBe("anthropic")
  })

  test("artistry has valid fallbackChain with gemini-3-pro as primary", () => {
    // #given - artistry category requirement
    const artistry = CATEGORY_MODEL_REQUIREMENTS["artistry"]

    // #when - accessing artistry requirement
    // #then - fallbackChain exists with gemini-3-pro as first entry
    expect(artistry).toBeDefined()
    expect(artistry.fallbackChain).toBeArray()
    expect(artistry.fallbackChain.length).toBeGreaterThan(0)

    const primary = artistry.fallbackChain[0]
    expect(primary.model).toBe("gemini-3-pro")
    expect(primary.variant).toBe("max")
    expect(primary.providers[0]).toBe("google")
  })

  test("writing has valid fallbackChain with gemini-3-flash as primary", () => {
    // #given - writing category requirement
    const writing = CATEGORY_MODEL_REQUIREMENTS["writing"]

    // #when - accessing writing requirement
    // #then - fallbackChain exists with gemini-3-flash as first entry
    expect(writing).toBeDefined()
    expect(writing.fallbackChain).toBeArray()
    expect(writing.fallbackChain.length).toBeGreaterThan(0)

    const primary = writing.fallbackChain[0]
    expect(primary.model).toBe("gemini-3-flash")
    expect(primary.providers[0]).toBe("google")
  })

  test("all 7 categories have valid fallbackChain arrays", () => {
    // #given - list of 7 category names
    const expectedCategories = [
      "visual-engineering",
      "ultrabrain",
      "artistry",
      "quick",
      "unspecified-low",
      "unspecified-high",
      "writing",
    ]

    // #when - checking CATEGORY_MODEL_REQUIREMENTS
    const definedCategories = Object.keys(CATEGORY_MODEL_REQUIREMENTS)

    // #then - all categories present with valid fallbackChain
    expect(definedCategories).toHaveLength(7)
    for (const category of expectedCategories) {
      const requirement = CATEGORY_MODEL_REQUIREMENTS[category]
      expect(requirement).toBeDefined()
      expect(requirement.fallbackChain).toBeArray()
      expect(requirement.fallbackChain.length).toBeGreaterThan(0)

      for (const entry of requirement.fallbackChain) {
        expect(entry.providers).toBeArray()
        expect(entry.providers.length).toBeGreaterThan(0)
        expect(typeof entry.model).toBe("string")
        expect(entry.model.length).toBeGreaterThan(0)
      }
    }
  })
})

describe("FallbackEntry type", () => {
  test("FallbackEntry structure is correct", () => {
    // #given - a valid FallbackEntry object
    const entry: FallbackEntry = {
      providers: ["anthropic", "github-copilot", "opencode"],
      model: "claude-opus-4-5",
      variant: "high",
    }

    // #when - accessing properties
    // #then - all properties are accessible
    expect(entry.providers).toEqual(["anthropic", "github-copilot", "opencode"])
    expect(entry.model).toBe("claude-opus-4-5")
    expect(entry.variant).toBe("high")
  })

  test("FallbackEntry variant is optional", () => {
    // #given - a FallbackEntry without variant
    const entry: FallbackEntry = {
      providers: ["opencode", "anthropic"],
      model: "big-pickle",
    }

    // #when - accessing variant
    // #then - variant is undefined
    expect(entry.variant).toBeUndefined()
  })
})

describe("ModelRequirement type", () => {
  test("ModelRequirement structure with fallbackChain is correct", () => {
    // #given - a valid ModelRequirement object
    const requirement: ModelRequirement = {
      fallbackChain: [
        { providers: ["anthropic", "github-copilot"], model: "claude-opus-4-5", variant: "max" },
        { providers: ["openai", "github-copilot"], model: "gpt-5.2", variant: "high" },
      ],
    }

    // #when - accessing properties
    // #then - fallbackChain is accessible with correct structure
    expect(requirement.fallbackChain).toBeArray()
    expect(requirement.fallbackChain).toHaveLength(2)
    expect(requirement.fallbackChain[0].model).toBe("claude-opus-4-5")
    expect(requirement.fallbackChain[1].model).toBe("gpt-5.2")
  })

  test("ModelRequirement variant is optional", () => {
    // #given - a ModelRequirement without top-level variant
    const requirement: ModelRequirement = {
      fallbackChain: [{ providers: ["opencode"], model: "big-pickle" }],
    }

    // #when - accessing variant
    // #then - variant is undefined
    expect(requirement.variant).toBeUndefined()
  })

  test("no model in fallbackChain has provider prefix", () => {
    // #given - all agent and category requirements
    const allRequirements = [
      ...Object.values(AGENT_MODEL_REQUIREMENTS),
      ...Object.values(CATEGORY_MODEL_REQUIREMENTS),
    ]

    // #when - checking each model in fallbackChain
    // #then - none contain "/" (provider prefix)
    for (const req of allRequirements) {
      for (const entry of req.fallbackChain) {
        expect(entry.model).not.toContain("/")
      }
    }
  })

  test("all fallbackChain entries have non-empty providers array", () => {
    // #given - all agent and category requirements
    const allRequirements = [
      ...Object.values(AGENT_MODEL_REQUIREMENTS),
      ...Object.values(CATEGORY_MODEL_REQUIREMENTS),
    ]

    // #when - checking each entry in fallbackChain
    // #then - all have non-empty providers array
    for (const req of allRequirements) {
      for (const entry of req.fallbackChain) {
        expect(entry.providers).toBeArray()
        expect(entry.providers.length).toBeGreaterThan(0)
      }
    }
  })
})
