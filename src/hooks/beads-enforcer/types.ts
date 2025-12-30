import type { PluginInput } from "@opencode-ai/plugin";

export interface BeadsIssue {
  id: string;
  title: string;
  status: string;
  priority?: string;
}

export interface BdReadyOutput {
  ready: BeadsIssue[];
}
