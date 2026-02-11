import { describe, it, expect } from "bun:test"
import { builtinTools, createBuiltinToolsWithLazyLoading, TOOL_PROFILES, ALL_PROFILES } from "./index"
import type { ToolProfile } from "./tool-profiles"

const EAGER_TOOLS = [
  "lsp_goto_definition", "lsp_find_references", "lsp_symbols",
  "lsp_diagnostics", "lsp_prepare_rename", "lsp_rename",
  "grep", "glob", "multiedit",
  "session_list", "session_read", "session_search", "session_info",
  "system_notify",
] as const

const LAZY_TOOL_SAMPLES = {
  browser: ["browser_open", "browser_snapshot", "browser_click", "browser_close"],
  runware: ["runwareGenerate", "runwareRemoveBg", "runwareUpscale"],
  raindrop: ["ripple_collections", "ripple_search", "ripple_get"],
  syncthing: ["syncthing_status", "syncthing_folders", "syncthing_devices"],
  ticket: ["ticket_list", "ticket_show", "ticket_create"],
  civitai: ["civitai_search", "civitai_get", "civitai_tags"],
  astGrep: ["ast_grep_search", "ast_grep_replace"],
  unifiedModelSearch: ["unified_model_search"],
  research: [
    "exa_websearch", "exa_codesearch",
    "context7_resolve_library_id", "context7_query_docs",
    "grep_app_searchGitHub",
    "zread_search", "zread_file", "zread_structure",
    "webfetch",
  ],
} as const

describe("lazy loading integration", () => {
  describe("builtinTools", () => {
    it("contains all eager tools", () => {
      // #given builtinTools export
      // #when checking eager tool names
      // #then all should be present
      for (const name of EAGER_TOOLS) {
        expect(builtinTools[name]).toBeDefined()
      }
    })

    it("contains all lazy tool groups", () => {
      // #given builtinTools export
      // #when checking sample tools from each lazy group
      // #then all should be present
      for (const [group, tools] of Object.entries(LAZY_TOOL_SAMPLES)) {
        for (const name of tools) {
          expect(builtinTools[name]).toBeDefined()
        }
      }
    })

    it("every tool has description, args, and execute", () => {
      // #given all builtin tools
      // #when inspecting each tool
      // #then all should have required properties
      for (const [name, tool] of Object.entries(builtinTools)) {
        expect(typeof tool.description).toBe("string")
        expect(tool.description.length).toBeGreaterThan(0)
        expect(tool.args).toBeDefined()
        expect(typeof tool.execute).toBe("function")
      }
    })
  })

  describe("createBuiltinToolsWithLazyLoading", () => {
    it("returns all tools with metadata available immediately", () => {
      // #given lazy loading enabled
      const tools = createBuiltinToolsWithLazyLoading()

      // #when checking tool properties
      // #then metadata should be available without executing
      for (const [name, tool] of Object.entries(tools)) {
        expect(typeof tool.description).toBe("string")
        expect(tool.description.length).toBeGreaterThan(0)
        expect(tool.args).toBeDefined()
        expect(typeof tool.execute).toBe("function")
      }
    })

    it("returns same tool names as builtinTools when all profiles active", () => {
      // #given both tool sources with all profiles enabled
      const allProfiles = Object.keys(TOOL_PROFILES) as ToolProfile[]
      const lazyTools = createBuiltinToolsWithLazyLoading({ activeProfiles: allProfiles })
      const builtinNames = new Set(Object.keys(builtinTools))
      const lazyNames = new Set(Object.keys(lazyTools))

      // #when comparing
      // #then should have identical tool sets
      expect(lazyNames).toEqual(builtinNames)
    })

    it("returns only core tools when no profiles specified", () => {
      // #given lazy loading with default (core only) profiles
      const coreTools = createBuiltinToolsWithLazyLoading()
      const coreToolNames = new Set(Object.keys(coreTools))

      // #when checking tool names
      // #then should only contain eager (core) tools, not lazy browser/runware/research/etc
      expect(coreToolNames.has("lsp_goto_definition")).toBe(true)
      expect(coreToolNames.has("grep")).toBe(true)
      expect(coreToolNames.has("browser_open")).toBe(false)
      expect(coreToolNames.has("runwareGenerate")).toBe(false)
      expect(coreToolNames.has("civitai_search")).toBe(false)
      // research tools are now profile-gated, not eager
      expect(coreToolNames.has("exa_websearch")).toBe(false)
      expect(coreToolNames.has("context7_resolve_library_id")).toBe(false)
      expect(coreToolNames.has("grep_app_searchGitHub")).toBe(false)
      expect(coreToolNames.has("zread_search")).toBe(false)
      expect(coreToolNames.has("webfetch")).toBe(false)
    })

    it("includes research tools when research profile is active", () => {
      // #given lazy loading with research profile enabled
      const tools = createBuiltinToolsWithLazyLoading({ activeProfiles: ["core", "research"] })
      const toolNames = new Set(Object.keys(tools))

      // #when checking research tool names
      // #then all research tools should be present
      expect(toolNames.has("exa_websearch")).toBe(true)
      expect(toolNames.has("exa_codesearch")).toBe(true)
      expect(toolNames.has("context7_resolve_library_id")).toBe(true)
      expect(toolNames.has("context7_query_docs")).toBe(true)
      expect(toolNames.has("grep_app_searchGitHub")).toBe(true)
      expect(toolNames.has("zread_search")).toBe(true)
      expect(toolNames.has("zread_file")).toBe(true)
      expect(toolNames.has("zread_structure")).toBe(true)
      expect(toolNames.has("webfetch")).toBe(true)
      // non-research tools should still be excluded
      expect(toolNames.has("browser_open")).toBe(false)
    })

    it("includes all profile tools when ALL_PROFILES used", () => {
      // #given lazy loading with all profiles enabled
      const tools = createBuiltinToolsWithLazyLoading({ activeProfiles: ALL_PROFILES })
      const toolNames = new Set(Object.keys(tools))

      // #when checking tools from each profile
      // #then all profiles should be represented
      expect(toolNames.has("exa_websearch")).toBe(true)
      expect(toolNames.has("browser_open")).toBe(true)
      expect(toolNames.has("ast_grep_search")).toBe(true)
      expect(toolNames.has("runwareGenerate")).toBe(true)
      expect(toolNames.has("syncthing_status")).toBe(true)
      expect(toolNames.has("civitai_search")).toBe(true)
    })

    it("fires onFirstLoad callback", async () => {
      // #given a lazy tool with onFirstLoad callback and all profiles active
      const allProfiles = Object.keys(TOOL_PROFILES) as ToolProfile[]
      const loads: Array<{ name: string; ms: number }> = []
      const tools = createBuiltinToolsWithLazyLoading({
        activeProfiles: allProfiles,
        onFirstLoad: (name, ms) => loads.push({ name, ms }),
      })

      // #when executing a lazy tool (ast_grep_search is safe — will fail gracefully)
      const tool = tools.ast_grep_search
      expect(tool).toBeDefined()

      try {
        await tool.execute({ pattern: "test", lang: "typescript" }, {} as never)
      } catch {
        // expected — no sg binary in test env
      }

      // #then onFirstLoad should have fired for ast_grep_search
      const astGrepLoad = loads.find(l => l.name === "ast_grep_search")
      expect(astGrepLoad).toBeDefined()
      expect(astGrepLoad!.ms).toBeGreaterThanOrEqual(0)
    })
  })
})
