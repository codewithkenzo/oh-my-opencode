import type { PluginInput } from "@opencode-ai/plugin";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { log } from "../../shared/logger";
import { BEADS_DIR, HOOK_NAME } from "./constants";
import type { BdReadyOutput } from "./types";
import {
  findNearestMessageWithFields,
  MESSAGE_STORAGE,
} from "../../features/hook-message-injector";

const promisifiedExec = (command: string): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

function parseBdJson(output: string): BdReadyOutput | null {
  try {
    return JSON.parse(output) as BdReadyOutput;
  } catch {
    return null;
  }
}

function getMessageDir(sessionID: string): string | null {
  if (!existsSync(MESSAGE_STORAGE)) return null;

  const directPath = join(MESSAGE_STORAGE, sessionID);
  if (existsSync(directPath)) return directPath;

  for (const dir of readdirSync(MESSAGE_STORAGE)) {
    const sessionPath = join(MESSAGE_STORAGE, dir, sessionID);
    if (existsSync(sessionPath)) return sessionPath;
  }

  return null;
}

export function createBeadsEnforcerHook(ctx: PluginInput) {
  const injectedSessions = new Set<string>();
  const beadsDir = join(ctx.directory, BEADS_DIR);

  const handleUserPromptSubmit = async (input: {
    sessionID: string;
    prompt?: { parts?: Array<{ type: string; text: string }> };
  }) => {
    if (injectedSessions.has(input.sessionID)) {
      return {};
    }

    if (!existsSync(beadsDir)) {
      return {};
    }

    try {
      log(`[${HOOK_NAME}] Checking for Beads issues`, { sessionID: input.sessionID });

      const { stdout, stderr } = await promisifiedExec("bd ready --json");

      if (stderr && stderr.trim().length > 0) {
        log(`[${HOOK_NAME}] bd ready stderr`, { sessionID: input.sessionID, stderr });
      }

      const result = parseBdJson(stdout);

      if (!result || !result.ready || result.ready.length === 0) {
        log(`[${HOOK_NAME}] No ready issues found`, { sessionID: input.sessionID });
        return {};
      }

      const issueCount = result.ready.length;
      const issueText = issueCount === 1
        ? "1 issue ready"
        : `${issueCount} issues ready`;

      const contextMsg = `[BEADS CONTEXT] ${issueText} for work: ${result.ready
        .map((issue) => `- ${issue.title} (${issue.id})`)
        .join("\n")}`;

      injectedSessions.add(input.sessionID);

      return {
        messages: [
          {
            type: "text",
            text: contextMsg,
          },
        ],
      };
    } catch (error) {
      log(`[${HOOK_NAME}] Error running bd ready`, { sessionID: input.sessionID, error: String(error) });
      return {};
    }
  };

  const handleSessionIdle = async (input: {
    sessionID: string;
  }) => {
    if (!existsSync(beadsDir)) {
      return {};
    }

    if (injectedSessions.has(input.sessionID)) {
      const reminderMsg =
        "[BEADS REMINDER] Before ending: Run `bd sync` and create issues for any remaining work discovered.";

      try {
        // Get previous message's agent info to respect agent mode
        const messageDir = getMessageDir(input.sessionID);
        const prevMessage = messageDir ? findNearestMessageWithFields(messageDir) : null;

        await ctx.client.session.prompt({
          path: { id: input.sessionID },
          body: {
            agent: prevMessage?.agent,
            parts: [{ type: "text", text: reminderMsg }],
          },
          query: { directory: ctx.directory },
        });
        log(`[${HOOK_NAME}] Reminder injected`, { sessionID: input.sessionID, agent: prevMessage?.agent });
      } catch (error) {
        log(`[${HOOK_NAME}] Failed to inject reminder`, { sessionID: input.sessionID, error: String(error) });
      }
    }
  };

  const handleSessionDeleted = async (input: { sessionID: string }) => {
    injectedSessions.delete(input.sessionID);
    log(`[${HOOK_NAME}] Session deleted, cleaned up tracking`, { sessionID: input.sessionID });
  };

  return {
    "prompt.submit": async (
      input: { sessionID: string },
      output: { parts: Array<{ type: string; text?: string }> }
    ) => {
      const result = await handleUserPromptSubmit(input);
      if (result.messages && result.messages.length > 0) {
        // Prepend beads context to the prompt
        output.parts.unshift(...result.messages.map(m => ({ type: m.type, text: m.text })));
      }
    },
    event: async ({ event }: { event: { type: string; properties?: unknown } }) => {
      const props = event.properties as { sessionID?: string; info?: { id?: string } } | undefined;
      const sessionID = props?.sessionID ?? props?.info?.id;

      if (event.type === "session.idle" && sessionID) {
        await handleSessionIdle({ sessionID });
      }

      if (event.type === "session.deleted" && sessionID) {
        await handleSessionDeleted({ sessionID });
      }
    },
  };
}
