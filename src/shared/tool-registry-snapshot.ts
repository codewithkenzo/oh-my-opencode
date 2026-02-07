import { log } from "./logger"

export type ToolRegistrySnapshot = {
  toolNames: string[]
  count: number
  timestamp: string
}

export function getToolRegistrySnapshot(tools: Record<string, unknown>): ToolRegistrySnapshot {
  const toolNames = Object.keys(tools).sort((left, right) => left.localeCompare(right))

  return {
    toolNames,
    count: toolNames.length,
    timestamp: new Date().toISOString(),
  }
}

export function logToolRegistrySnapshot(tools: Record<string, unknown>, context?: string): void {
  const snapshot = getToolRegistrySnapshot(tools)

  log("[tool-registry] snapshot", {
    context,
    count: snapshot.count,
    tools: snapshot.toolNames,
  })
}
