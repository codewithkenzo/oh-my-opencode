import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { platform } from "node:os"
import { TOOL_DESCRIPTION } from "./constants"
import type { Platform } from "./types"

const TIMEOUT_MS = 10000

function detectPlatform(): Platform {
  const os = platform()
  if (os === "darwin") return "darwin"
  if (os === "win32") return "win32"
  if (os === "linux") {
    try {
      const release = readFileSync("/proc/version", "utf8")
      if (release.toLowerCase().includes("microsoft")) return "wsl"
    } catch {}
    return "linux"
  }
  return "unsupported"
}

function execCommand(cmd: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: "ignore", timeout: TIMEOUT_MS })
    proc.on("close", (code) => resolve(code === 0))
    proc.on("error", () => resolve(false))
  })
}

async function notifyLinux(title: string, message: string): Promise<boolean> {
  return execCommand("notify-send", [title, message])
}

async function notifyMac(title: string, message: string): Promise<boolean> {
  const script = `display notification "${message}" with title "${title}"`
  return execCommand("osascript", ["-e", script])
}

async function notifyWSL(title: string, message: string): Promise<boolean> {
  const escapedTitle = title.replace(/'/g, "''")
  const escapedMessage = message.replace(/'/g, "''")
  const burntToast = await execCommand("powershell.exe", [
    "-NoProfile", "-Command",
    `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'`
  ])
  if (burntToast) return true
  
  const fullMessage = `${title}: ${message}`.replace(/"/g, "'")
  return execCommand("msg.exe", ["%USERNAME%", "/TIME:10", fullMessage])
}

async function notifyWindows(title: string, message: string): Promise<boolean> {
  const escapedTitle = title.replace(/'/g, "''")
  const escapedMessage = message.replace(/'/g, "''")
  return execCommand("powershell", [
    "-NoProfile", "-Command",
    `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'`
  ])
}

export const system_notify = tool({
  description: TOOL_DESCRIPTION,
  args: {
    message: tool.schema.string().describe("Notification message"),
    title: tool.schema.string().optional().describe("Notification title (default: OpenCode)"),
  },
  execute: async ({ message, title = "OpenCode" }) => {
    const plat = detectPlatform()
    
    let success = false
    switch (plat) {
      case "linux":
        success = await notifyLinux(title, message)
        break
      case "darwin":
        success = await notifyMac(title, message)
        break
      case "wsl":
        success = await notifyWSL(title, message)
        break
      case "win32":
        success = await notifyWindows(title, message)
        break
      default:
        return `Unsupported platform: ${platform()}`
    }
    
    if (success) {
      return `Notification sent: "${title}: ${message}"`
    }
    return `Failed to send notification on ${plat}. Ensure notification tools are installed.`
  },
})
