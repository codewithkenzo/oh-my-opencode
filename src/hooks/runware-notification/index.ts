import { spawn } from "child_process"
import { RUNWARE_TOOL_PATTERN, NOTIFICATION_TITLES } from "./constants"
import type { RunwareNotificationHookInput, RunwareNotificationHookOutput } from "./types"

function extractUrl(output: string): string | null {
  const urlMatch = output.match(/URL:\s*(https?:\/\/[^\s]+)/i)
  return urlMatch?.[1] ?? null
}

function extractFilePath(output: string): string | null {
  const pathMatch = output.match(/saved to:\s*([^\s(]+)/i)
  return pathMatch?.[1] ?? null
}

function sendNotificationAsync(title: string, message: string, url?: string): void {
  try {
    let psCmd: string
    if (url) {
      psCmd = `New-BurntToastNotification -Text '${title}', '${message}' -Button (New-BTButton -Content 'View Image' -Arguments '${url}')`
    } else {
      psCmd = `New-BurntToastNotification -Text '${title}', '${message}'`
    }
    
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", psCmd], {
      stdio: "ignore",
      detached: true,
    })
    child.unref()
  } catch {
    // Notification is optional, fail silently
  }
}

export function createRunwareNotificationHook() {
  return {
    "tool.execute.after": async (
      input: RunwareNotificationHookInput,
      output: RunwareNotificationHookOutput
    ): Promise<void> => {
      if (!RUNWARE_TOOL_PATTERN.test(input.tool)) {
        return
      }

      if (input.tool === "runware_model_search") {
        return
      }

      const toolOutput = output.output
      if (!toolOutput || toolOutput.startsWith("Error:")) {
        return
      }

      const url = extractUrl(toolOutput)
      const filePath = extractFilePath(toolOutput)
      const title = NOTIFICATION_TITLES[input.tool] ?? "Runware"
      const message = filePath ? `Saved: ${filePath}` : "Complete"

      sendNotificationAsync(title, message, url ?? undefined)
    },
  }
}
