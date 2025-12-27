import type { PluginInput } from "@opencode-ai/plugin";
import type { AgentsMdEnforcerState } from "./types";
import { AGENTS_MD_FILENAME, CREATION_REMINDER, MKDIR_REMINDER, ENFORCED_PATTERNS, SKIP_PATTERNS } from "./constants";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface ToolExecuteInput {
  tool: string;
  sessionID: string;
  callID: string;
}

interface ToolExecuteOutput {
  title: string;
  output: string;
  metadata: unknown;
}

interface EventInput {
  event: {
    type: string;
    properties?: unknown;
  };
}

function matchesGlob(dirPath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = new RegExp(
      "^" + pattern
        .replace(/\*\*/g, "[^/]+")
        .replace(/\*/g, ".*")
        .replace(/\?/g, "[^/]")
        .replace(/\./g, "\\.")
        .replace(/\.ts$/g, "\\.ts$")
        .replace(/\.tsx$/g, "\\.tsx$")
        .replace(/\.js$/g, "\\.js$")
        .replace(/\.jsx$/g, "\\.jsx$")
        + "$"
    );
    if (regex.test(dirPath)) {
      return true;
    }
  }
  return false;
}

function shouldSkipDirectory(dirPath: string): boolean {
  const normalizedPath = dirPath.replace(/\\/g, "/");
  for (const skipPattern of SKIP_PATTERNS) {
    if (normalizedPath.includes(skipPattern)) {
      return true;
    }
  }
  return false;
}

function hasAgentsMd(dirPath: string): boolean {
  return existsSync(resolve(dirPath, AGENTS_MD_FILENAME));
}

function extractDirectoryFromPath(filePath: string): string | null {
  if (!filePath) return null;
  return dirname(resolve(filePath));
}

function isMkdirCommand(command: string): boolean {
  const trimmed = command.trim();
  return trimmed.startsWith("mkdir ") ||
         trimmed.startsWith("mkdir -") ||
         trimmed.includes(" mkdir ");
}

export function createAgentsMdEnforcerHook(ctx: PluginInput) {
  const sessionStates = new Map<string, AgentsMdEnforcerState>();
  const MAX_REMINDERS = 2;

  function getOrCreateState(sessionID: string): AgentsMdEnforcerState {
    if (!sessionStates.has(sessionID)) {
      const state: AgentsMdEnforcerState = {
        sessionID,
        remindedDirectories: new Set(),
        lastReminder: 0,
        reminderCount: 0,
      };
      sessionStates.set(sessionID, state);
    }
    return sessionStates.get(sessionID)!;
  }

  function shouldShowReminder(state: AgentsMdEnforcerState, directory: string): boolean {
    if (state.remindedDirectories.has(directory)) {
      return false;
    }
    if (state.reminderCount >= MAX_REMINDERS) {
      return false;
    }
    const timeSinceLastReminder = Date.now() - state.lastReminder;
    if (timeSinceLastReminder < 60000) {
      return false;
    }
    return true;
  }

  function recordReminder(state: AgentsMdEnforcerState, directory: string): void {
    state.remindedDirectories.add(directory);
    state.lastReminder = Date.now();
    state.reminderCount++;
  }

  function showToast(title: string, message: string): void {
    ctx.client.tui.showToast?.({
      body: {
        title,
        message,
        variant: "info",
        duration: 4000,
      },
    }).catch(() => {});
  }

  const toolExecuteAfter = async (
    input: ToolExecuteInput,
    output: ToolExecuteOutput
  ) => {
    const { tool, sessionID } = input;
    const toolName = tool.toLowerCase();

    if (
      ![
        "read",
        "write",
        "edit",
        "glob",
        "ls",
        "list",
        "bash",
      ].includes(toolName)
    ) {
      return;
    }

    const state = getOrCreateState(sessionID);

    if (toolName === "bash") {
      const args = (input as any).args as { command?: string } | undefined;
      if (!args?.command) {
        return;
      }

      if (!isMkdirCommand(args.command)) {
        return;
      }

      const match = args.command.match(/mkdir\s+(?:-[^\s]+\s+)?(.+?)/);
      if (!match) {
        return;
      }

      const newDirPath = match[1].trim();
      if (!newDirPath) {
        return;
      }

      const resolvedDir = resolve(newDirPath);

      if (shouldSkipDirectory(resolvedDir)) {
        return;
      }

      if (!shouldShowReminder(state, resolvedDir)) {
        return;
      }

      output.output += MKDIR_REMINDER;
      recordReminder(state, resolvedDir);

      showToast(
        "New Directory Created",
        `Consider adding AGENTS.md to ${resolvedDir}`
      );

      return;
    }

    const filePath = (input as any).path as string | undefined;
    if (!filePath) {
      return;
    }

    const directory = extractDirectoryFromPath(filePath);
    if (!directory) {
      return;
    }

    if (shouldSkipDirectory(directory)) {
      return;
    }

    if (hasAgentsMd(directory)) {
      return;
    }

    if (!matchesGlob(directory, ENFORCED_PATTERNS)) {
      return;
    }

    if (!shouldShowReminder(state, directory)) {
      return;
    }

    output.output += CREATION_REMINDER;
    recordReminder(state, directory);

    showToast(
      "AGENTS.md Recommended",
      `Directory ${directory} lacks AGENTS.md - adding one improves context`
    );
  };

  const eventHandler = async ({ event }: EventInput) => {
    const props = event.properties as Record<string, unknown> | undefined;

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined;
      if (sessionInfo?.id) {
        sessionStates.delete(sessionInfo.id);
      }
    }

    if (event.type === "session.compacted") {
      const sessionID =
        (props?.sessionID ??
          (props?.info as { id?: string } | undefined)?.id) as string | undefined;
      if (sessionID) {
        sessionStates.delete(sessionID);
      }
    }
  };

  return {
    "tool.execute.after": toolExecuteAfter,
    event: eventHandler,
  };
}
