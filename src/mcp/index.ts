import { websearch } from "./websearch"
import { context7 } from "./context7"
import { grep_app } from "./grep-app"
import type { McpName } from "./types"

export { McpNameSchema, type McpName } from "./types"

export type RemoteMcpConfig = {
  type: "remote"
  url: string
  enabled: boolean
  headers?: Record<string, string>
  oauth?: false
}

export type LocalMcpConfig = {
  type: "local"
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled: boolean
}

export type BuiltinMcpConfig = RemoteMcpConfig | LocalMcpConfig

const allBuiltinMcps: Record<McpName, BuiltinMcpConfig> = {
  websearch,
  context7,
  grep_app,
  runware: {
    type: "local",
    command: "bunx",
    args: ["oh-my-opencode-mcp-runware"],
    env: process.env.RUNWARE_API_KEY ? { RUNWARE_API_KEY: process.env.RUNWARE_API_KEY } : undefined,
    enabled: true,
  },
  civitai: {
    type: "local",
    command: "bunx",
    args: ["oh-my-opencode-mcp-civitai"],
    enabled: true,
  },
}

export function createBuiltinMcps(disabledMcps: string[] = []) {
  const mcps: Record<string, BuiltinMcpConfig> = {}

  for (const [name, config] of Object.entries(allBuiltinMcps)) {
    if (!disabledMcps.includes(name)) {
      mcps[name] = config
    }
  }

  return mcps
}
