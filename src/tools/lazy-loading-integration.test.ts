import { describe, it, expect } from "bun:test"
import { builtinTools, createBuiltinToolsWithLazyLoading } from "./index"

const EAGER_TOOLS = [
  "lsp_goto_definition", "lsp_find_references", "lsp_symbols",
  "lsp_diagnostics", "lsp_prepare_rename", "lsp_rename",
  "grep", "glob", "multiedit",
  "session_list", "session_read", "session_search", "session_info",
  "zread_search", "zread_file", "zread_structure",
  "exa_websearch", "exa_codesearch",
  "context7_resolve_library_id", "context7_query_docs",
  "grep_app_searchGitHub", "webfetch",
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

    it("returns same tool names as builtinTools", () => {
      // #given both tool sources
      const lazyTools = createBuiltinToolsWithLazyLoading()
      const builtinNames = new Set(Object.keys(builtinTools))
      const lazyNames = new Set(Object.keys(lazyTools))

      // #when comparing
      // #then should have identical tool sets
      expect(lazyNames).toEqual(builtinNames)
    })

    it("fires onFirstLoad callback", async () => {
      // #given a lazy tool with onFirstLoad callback
      const loads: Array<{ name: string; ms: number }> = []
      const tools = createBuiltinToolsWithLazyLoading({
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
