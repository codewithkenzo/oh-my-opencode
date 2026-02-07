import type { ToolDefinition } from "@opencode-ai/plugin"

export interface LazyToolOptions {
  /** Human-readable tool name for logging */
  name: string
  /** Tool description (shown in tool list even before loading) */
  description: string
  /** Tool argument schema (shown in tool list even before loading) */
  args: ToolDefinition["args"]
  /** Factory that dynamically imports and returns the real ToolDefinition */
  loader: () => Promise<ToolDefinition>
  /** Optional callback when first load completes, receives load time in ms */
  onFirstLoad?: (name: string, loadTimeMs: number) => void
}

export function createLazyTool(opts: LazyToolOptions): ToolDefinition {
  let cached: ToolDefinition | null = null
  let loading: Promise<ToolDefinition> | null = null

  const loadTool = async (): Promise<ToolDefinition> => {
    if (cached) {
      return cached
    }
    if (loading) {
      return loading
    }

    loading = (async () => {
      const start = performance.now()
      try {
        const tool = await opts.loader()
        const elapsed = performance.now() - start
        cached = tool
        opts.onFirstLoad?.(opts.name, elapsed)
        return tool
      } finally {
        loading = null
      }
    })()

    return loading
  }

  return {
    description: opts.description,
    args: opts.args,
    execute: async (...executeArgs: Parameters<ToolDefinition["execute"]>) => {
      const tool = await loadTool()
      return tool.execute(...executeArgs)
    },
  } as ToolDefinition
}
