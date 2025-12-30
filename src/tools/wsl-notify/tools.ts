import { tool } from "@opencode-ai/plugin"
import { execSync } from "child_process"
import { TOOL_DESCRIPTION } from "./constants"

function isWSL(): boolean {
  try {
    const release = require("fs").readFileSync("/proc/version", "utf8")
    return release.toLowerCase().includes("microsoft")
  } catch {
    return false
  }
}

function tryBurntToast(title: string, message: string): boolean {
  try {
    execSync(`powershell.exe -NoProfile -Command "New-BurntToastNotification -Text '${title}', '${message}'"`, { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function tryMsgExe(title: string, message: string): boolean {
  try {
    const fullMessage = `${title}: ${message}`
    execSync(`msg.exe "%USERNAME%" /TIME:10 "${fullMessage.replace(/"/g, "'")}"`, { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function notifyWindows(title: string, message: string): void {
  if (tryBurntToast(title, message)) return
  if (tryMsgExe(title, message)) return
  throw new Error("No notification method available. Install BurntToast: powershell -Command \"Install-Module BurntToast -Force\"")
}

export const wslNotify = tool({
  description: TOOL_DESCRIPTION,
  args: {
    message: tool.schema.string().describe("Notification message (required)"),
  },
  execute: async (args) => {
    const message = args.message || "OpenCode notification"
    const title = "OpenCode"

    if (!isWSL()) {
      return `Not in WSL environment. Message: ${message}`
    }

    try {
      notifyWindows(title, message)
      return `Windows notification sent: "${message}"`
    } catch (error) {
      return `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  },
})
