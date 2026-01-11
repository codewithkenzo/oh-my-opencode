import { tool } from "@opencode-ai/plugin"
import type { ToolDefinition } from "@opencode-ai/plugin/tool"
import { TOOL_DESCRIPTION } from "./constants"
import { detectPlatform, execCommand, openPath, convertToWindowsPath } from "./utils"

async function notifyLinux(title: string, message: string, imagePath?: string): Promise<boolean> {
  const args = [title, message]
  if (imagePath) {
    args.unshift("-i", imagePath)
  }
  return execCommand("notify-send", args)
}

async function notifyMac(title: string, message: string): Promise<boolean> {
  const escapedTitle = title.replace(/"/g, '\\"')
  const escapedMessage = message.replace(/"/g, '\\"')
  const script = `display notification "${escapedMessage}" with title "${escapedTitle}"`
  return execCommand("osascript", ["-e", script])
}

async function notifyWSL(title: string, message: string, imagePath?: string): Promise<boolean> {
  const escapedTitle = title.replace(/'/g, "''")
  const escapedMessage = message.replace(/'/g, "''")
  
  let psCommand = `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'`
  if (imagePath) {
    const winPath = convertToWindowsPath(imagePath)
    psCommand = `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}' -HeroImage '${winPath}'`
  }
  
  const burntToast = await execCommand("powershell.exe", ["-NoProfile", "-Command", psCommand])
  if (burntToast) return true
  
  const fullMessage = `${title}: ${message}`.replace(/"/g, "'")
  return execCommand("msg.exe", ["%USERNAME%", "/TIME:10", fullMessage])
}

async function notifyWindows(title: string, message: string, imagePath?: string): Promise<boolean> {
  const escapedTitle = title.replace(/'/g, "''")
  const escapedMessage = message.replace(/'/g, "''")
  
  let psCommand = `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'`
  if (imagePath) {
    psCommand = `New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}' -HeroImage '${imagePath}'`
  }
  
  return execCommand("powershell", ["-NoProfile", "-Command", psCommand])
}

export const system_notify: ToolDefinition = tool({
  description: TOOL_DESCRIPTION,
  args: {
    message: tool.schema.string().describe("Notification message"),
    title: tool.schema.string().optional().describe("Notification title (default: OpenCode)"),
    image_path: tool.schema.string().optional().describe("Path to image file to display in notification (Linux: -i flag, Windows: HeroImage)"),
    open_path: tool.schema.string().optional().describe("File path or URL to open after notification (opens in default app/browser)"),
  },
  execute: async ({ message, title = "OpenCode", image_path, open_path }) => {
    const plat = detectPlatform()
    
    let success = false
    switch (plat) {
      case "linux":
        success = await notifyLinux(title, message, image_path)
        break
      case "darwin":
        success = await notifyMac(title, message)
        break
      case "wsl":
        success = await notifyWSL(title, message, image_path)
        break
      case "win32":
        success = await notifyWindows(title, message, image_path)
        break
      default:
        return `Unsupported platform: ${plat}`
    }
    
    let openResult = ""
    if (open_path && success) {
      const opened = await openPath(open_path, plat)
      openResult = opened ? ` Opened: ${open_path}` : ` Failed to open: ${open_path}`
    }
    
    if (success) {
      return `Notification sent: "${title}: ${message}"${openResult}`
    }
    return `Failed to send notification on ${plat}. Ensure notification tools are installed.`
  },
})
