import type { PluginInput } from "@opencode-ai/plugin";

export interface Memory {
  content: string;
  collection: string;
}

export type MemoryCollection =
  | "rules"
  | "tools"
  | "workflows"
  | "errors"
  | "context";

export interface ToolMetrics {
  calls: number;
  successes: number;
  failures: number;
}

export interface SessionMetrics {
  tools: Map<string, ToolMetrics>;
  skills: Set<string>;
  agents: Map<string, number>;
  filesModified: Set<string>;
  workingDirectory: string | null;
  projectContext: Set<string>;
  toolSequence: Array<{ tool: string; timestamp: number }>;
  decisionsCaptured: boolean;
}
