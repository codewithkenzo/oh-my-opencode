import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import type { HybridToolOptions, ToolRoutePolicy } from "./types"

export interface HybridToolResult {
  tool: ToolDefinition
  getRouteState: () => { policy: ToolRoutePolicy; lastRoute: "builtin" | "mcp" | "none" }
}

export function createHybridTool(options: HybridToolOptions): HybridToolResult {
  let lastRoute: "builtin" | "mcp" | "none" = "none"

  const tool: ToolDefinition = {
    description: options.builtinTool.description,
    args: options.builtinTool.args,
    execute: async (...args: Parameters<ToolDefinition["execute"]>) => {
      const { policy } = options.route

      if (policy === "builtin-only") {
        lastRoute = "builtin"
        return options.builtinTool.execute(...args)
      }

      if (policy === "mcp-first" || policy === "mcp-only") {
        const mcpAvailable = options.checkMcpAvailable
          ? await options.checkMcpAvailable().catch(() => false)
          : false

        if (mcpAvailable) {
          lastRoute = "mcp"
          return options.builtinTool.execute(...args)
        }

        if (policy === "mcp-only") {
          lastRoute = "none"
          throw new Error(
            `Tool "${options.name}" is configured as mcp-only but MCP server "${options.route.mcpServerName}" is not available`,
          )
        }

        lastRoute = "builtin"
        return options.builtinTool.execute(...args)
      }

      lastRoute = "builtin"
      return options.builtinTool.execute(...args)
    },
  } as ToolDefinition

  return {
    tool,
    getRouteState: () => ({ policy: options.route.policy, lastRoute }),
  }
}
